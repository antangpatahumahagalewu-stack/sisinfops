-- Simple migration to create activity monitoring tables without complex constraints
-- Fixes for: activity_log, chat_logs, online_users_view, user_activity_dashboard

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create activity_log table (simplified - remove unique constraint on user_id+created_at)
-- ======================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    resource_name VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 2. Create chat_logs table (simplified)
-- ======================
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text',
    message_content TEXT,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    room_id VARCHAR(100),
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE
);

-- ======================
-- 3. Create online_users_view (simple view)
-- ======================
CREATE OR REPLACE VIEW online_users_view AS 
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.last_seen_at,
    p.is_online,
    p.online_status,
    CASE 
        WHEN p.last_seen_at > NOW() - INTERVAL '5 minutes' THEN true
        ELSE false
    END as is_currently_online,
    CASE 
        WHEN p.last_seen_at > NOW() - INTERVAL '2 minutes' THEN 'active'
        WHEN p.last_seen_at > NOW() - INTERVAL '5 minutes' THEN 'away'
        ELSE 'offline'
    END as current_activity_status
FROM profiles p
ORDER BY p.last_seen_at DESC;

-- ======================
-- 4. Create user_activity_dashboard view
-- ======================
CREATE OR REPLACE VIEW user_activity_dashboard AS 
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.last_seen_at,
    p.is_online,
    p.online_status,
    COALESCE(a.total_activities, 0) as total_activities,
    COALESCE(a.today_activities, 0) as today_activities,
    COALESCE(c.unread_messages, 0) as unread_messages
FROM profiles p
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_activities
    FROM activity_log
    GROUP BY user_id
) a ON p.id = a.user_id
LEFT JOIN (
    SELECT 
        recipient_id,
        COUNT(*) FILTER (WHERE read_at IS NULL) as unread_messages
    FROM chat_logs
    GROUP BY recipient_id
) c ON p.id = c.recipient_id
ORDER BY p.last_seen_at DESC;

-- ======================
-- 5. Create indexes for performance (basic ones only)
-- ======================
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);

CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_recipient_id ON chat_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_room_id ON chat_logs(room_id);

-- ======================
-- 6. Enable RLS but with simple policies
-- ======================
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_logs ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies - allow all for now, can be restricted later
CREATE POLICY "Allow all operations on activity_log for testing" ON activity_log
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on chat_logs for testing" ON chat_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ======================
-- 7. Grant permissions
-- ======================
GRANT ALL ON activity_log TO postgres, anon, authenticated, service_role;
GRANT ALL ON chat_logs TO postgres, anon, authenticated, service_role;
GRANT SELECT ON online_users_view TO postgres, anon, authenticated, service_role;
GRANT SELECT ON user_activity_dashboard TO postgres, anon, authenticated, service_role;

-- ======================
-- 8. Insert minimal sample data only if tables are empty
-- ======================
DO $$
DECLARE
    admin_user UUID;
    monev_user UUID;
    activity_count INTEGER;
    chat_count INTEGER;
BEGIN
    -- Get sample user IDs
    SELECT id INTO admin_user FROM profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO monev_user FROM profiles WHERE role = 'monev' LIMIT 1;
    
    -- Check if activity_log has data
    SELECT COUNT(*) INTO activity_count FROM activity_log;
    
    -- Only insert sample data if table is empty
    IF admin_user IS NOT NULL AND activity_count = 0 THEN
        INSERT INTO activity_log (user_id, activity_type, resource_type, details) VALUES
        (admin_user, 'login', 'user', '{"ip": "192.168.1.100", "browser": "Chrome"}'::jsonb),
        (admin_user, 'page_view', 'dashboard', '{"page": "/dashboard", "duration": "45s"}'::jsonb)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Check if chat_logs has data
    SELECT COUNT(*) INTO chat_count FROM chat_logs;
    
    -- Only insert sample chat data if table is empty and both users exist
    IF admin_user IS NOT NULL AND monev_user IS NOT NULL AND chat_count = 0 THEN
        INSERT INTO chat_logs (user_id, recipient_id, message_type, message_content, room_id) VALUES
        (admin_user, monev_user, 'text', 'Halo, sistem aktivitas sudah berjalan.', 'admin-monev'),
        (monev_user, admin_user, 'text', 'Baik, terima kasih.', 'admin-monev')
        ON CONFLICT DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Sample data conditionally inserted:';
    RAISE NOTICE '  • Activity logs: % new records', CASE WHEN activity_count = 0 AND admin_user IS NOT NULL THEN 2 ELSE 0 END;
    RAISE NOTICE '  • Chat logs: % new messages', CASE WHEN chat_count = 0 AND admin_user IS NOT NULL AND monev_user IS NOT NULL THEN 2 ELSE 0 END;
END $$;

-- ======================
-- 9. Verification
-- ======================
DO $$
DECLARE
    activity_table_exists BOOLEAN;
    chat_table_exists BOOLEAN;
    activity_count INTEGER;
    chat_count INTEGER;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_log'
    ) INTO activity_table_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_logs'
    ) INTO chat_table_exists;
    
    -- Get row counts
    SELECT COUNT(*) INTO activity_count FROM activity_log;
    SELECT COUNT(*) INTO chat_count FROM chat_logs;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'SIMPLE ACTIVITY TABLES MIGRATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables status:';
    RAISE NOTICE '  • activity_log: % (% rows)', 
        CASE WHEN activity_table_exists THEN 'EXISTS' ELSE 'MISSING' END,
        activity_count;
    RAISE NOTICE '  • chat_logs: % (% rows)', 
        CASE WHEN chat_table_exists THEN 'EXISTS' ELSE 'MISSING' END,
        chat_count;
    RAISE NOTICE '  • online_users_view: VIEW CREATED';
    RAISE NOTICE '  • user_activity_dashboard: VIEW CREATED';
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend pages that should now work:';
    RAISE NOTICE '  ✅ /dashboard/activity-log - Activity log page';
    RAISE NOTICE '  ✅ /chat - Chat functionality';
    RAISE NOTICE '  ✅ Online user indicators';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS: Simple policies enabled (allow all for testing)';
    RAISE NOTICE '=========================================';
END $$;

-- ======================
-- 10. Refresh schema cache
-- ======================
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;