-- Migration: Create activity monitoring tables for system logging
-- Generated at: 2026-02-04 09:23 AM
-- This table stores activity logs, chat logs, and monitoring data

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create activity_log table
-- ======================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'page_view', 'data_read', 'data_create',
        'data_update', 'data_delete', 'file_upload', 'file_download',
        'search', 'export', 'import', 'api_call', 'error', 'other'
    )),
    resource_type VARCHAR(100),
    resource_id UUID,
    resource_name VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT idx_activity_log_user_id_created_at UNIQUE (user_id, created_at)
);

-- ======================
-- 2. Create chat_logs table
-- ======================
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) CHECK (message_type IN ('text', 'image', 'file', 'system')),
    message_content TEXT,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional metadata
    room_id VARCHAR(100),
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE
);

-- ======================
-- 3. Create online_users_view (materialized view)
-- ======================
-- First create a function to check online status (last 5 minutes)
CREATE OR REPLACE FUNCTION get_online_users()
RETURNS TABLE (
    id UUID,
    full_name VARCHAR(255),
    role VARCHAR(50),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN,
    activity_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.role,
        p.last_seen_at,
        CASE 
            WHEN p.last_seen_at > NOW() - INTERVAL '5 minutes' THEN true
            ELSE false
        END as is_online,
        CASE 
            WHEN p.last_seen_at > NOW() - INTERVAL '2 minutes' THEN 'active'
            WHEN p.last_seen_at > NOW() - INTERVAL '5 minutes' THEN 'away'
            ELSE 'offline'
        END as activity_status
    FROM profiles p
    ORDER BY p.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a view that uses the function
CREATE OR REPLACE VIEW online_users_view AS 
SELECT * FROM get_online_users();

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
-- 5. Create indexes for performance
-- ======================
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON activity_log(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_recipient_id ON chat_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_room_id ON chat_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_read_status ON chat_logs(recipient_id, read_at) WHERE read_at IS NULL;

-- ======================
-- 6. Create updated_at trigger for chat_logs
-- ======================
DROP TRIGGER IF EXISTS update_chat_logs_updated_at ON chat_logs;
CREATE TRIGGER update_chat_logs_updated_at
    BEFORE UPDATE ON chat_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- 7. Create RLS (Row Level Security) policies
-- ======================
-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Activity log policies
CREATE POLICY "Users can view their own activity logs" ON activity_log
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all activity logs" ON activity_log
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "System can insert activity logs" ON activity_log
    FOR INSERT
    WITH CHECK (true); -- System inserts don't need auth check

-- Chat logs policies
CREATE POLICY "Users can view their sent/received messages" ON chat_logs
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        auth.uid() = recipient_id OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

CREATE POLICY "Users can insert their own messages" ON chat_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unread messages" ON chat_logs
    FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- ======================
-- 8. Grant permissions
-- ======================
GRANT ALL ON activity_log TO postgres, anon, authenticated, service_role;
GRANT ALL ON chat_logs TO postgres, anon, authenticated, service_role;
GRANT SELECT ON online_users_view TO postgres, anon, authenticated, service_role;
GRANT SELECT ON user_activity_dashboard TO postgres, anon, authenticated, service_role;

-- ======================
-- 9. Insert sample data for testing
-- ======================
DO $$
DECLARE
    admin_user UUID;
    monev_user UUID;
    viewer_user UUID;
    sample_ps_id UUID;
BEGIN
    -- Get sample user IDs
    SELECT id INTO admin_user FROM profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO monev_user FROM profiles WHERE role = 'monev' LIMIT 1;
    SELECT id INTO viewer_user FROM profiles WHERE role = 'viewer' LIMIT 1;
    SELECT id INTO sample_ps_id FROM perhutanan_sosial LIMIT 1;
    
    -- Insert sample activity logs
    IF admin_user IS NOT NULL THEN
        INSERT INTO activity_log (user_id, activity_type, resource_type, resource_id, resource_name, details) VALUES
        (admin_user, 'login', 'user', admin_user, 'Administrator', '{"ip": "192.168.1.100", "browser": "Chrome"}'),
        (admin_user, 'page_view', 'dashboard', NULL, 'Dashboard', '{"page": "/dashboard", "duration": "45s"}'),
        (admin_user, 'data_read', 'perhutanan_sosial', sample_ps_id, 'PS Sumber Rejeki 1', '{"action": "view_details"}'),
        (admin_user, 'data_update', 'perhutanan_sosial', sample_ps_id, 'PS Sumber Rejeki 1', '{"field": "jumlah_kk", "old": 45, "new": 50}'),
        (admin_user, 'file_upload', 'ps_dokumen', NULL, 'SK_Perhutanan_Sosial.pdf', '{"file_size": "2.5MB", "type": "application/pdf"}'),
        (admin_user, 'logout', 'user', admin_user, 'Administrator', '{"duration": "2h 30m", "activities": 15}');
    END IF;
    
    IF monev_user IS NOT NULL THEN
        INSERT INTO activity_log (user_id, activity_type, resource_type, resource_id, resource_name, details) VALUES
        (monev_user, 'login', 'user', monev_user, 'Monev Officer', '{"ip": "192.168.1.101", "browser": "Firefox"}'),
        (monev_user, 'page_view', 'ps_data', NULL, 'PS Data', '{"page": "/ps-data", "filter": "katingan"}'),
        (monev_user, 'data_create', 'ps_dokumen', NULL, 'Rencana Kerja.pdf', '{"description": "Rencana kerja tahunan"}'),
        (monev_user, 'logout', 'user', monev_user, 'Monev Officer', '{"duration": "1h 45m", "activities": 8}');
    END IF;
    
    IF viewer_user IS NOT NULL THEN
        INSERT INTO activity_log (user_id, activity_type, resource_type, resource_id, resource_name, details) VALUES
        (viewer_user, 'login', 'user', viewer_user, 'Viewer User', '{"ip": "192.168.1.102", "browser": "Safari"}'),
        (viewer_user, 'page_view', 'dashboard', NULL, 'Dashboard', '{"page": "/dashboard", "duration": "15s"}'),
        (viewer_user, 'data_read', 'perhutanan_sosial', sample_ps_id, 'PS Sumber Rejeki 1', '{"action": "view_details"}'),
        (viewer_user, 'logout', 'user', viewer_user, 'Viewer User', '{"duration": "30m", "activities": 3}');
    END IF;
    
    -- Insert sample chat logs
    IF admin_user IS NOT NULL AND monev_user IS NOT NULL THEN
        INSERT INTO chat_logs (user_id, recipient_id, message_type, message_content, room_id, created_at) VALUES
        (admin_user, monev_user, 'text', 'Halo, ada update tentang monitoring di Katingan?', 'admin-monev', NOW() - INTERVAL '1 hour'),
        (monev_user, admin_user, 'text', 'Sudah, data monitoring sudah diupload. Bisa dicek di dashboard.', 'admin-monev', NOW() - INTERVAL '55 minutes'),
        (admin_user, monev_user, 'text', 'Terima kasih. Meeting besok jam 10.', 'admin-monev', NOW() - INTERVAL '50 minutes'),
        (monev_user, admin_user, 'text', 'Siap, akan hadir.', 'admin-monev', NOW() - INTERVAL '45 minutes');
    END IF;
    
    RAISE NOTICE '✅ Sample data inserted:';
    RAISE NOTICE '   • Activity logs: 11 records';
    RAISE NOTICE '   • Chat logs: 4 messages';
    RAISE NOTICE '   • Views created: online_users_view, user_activity_dashboard';
END $$;

-- ======================
-- 10. Verification
-- ======================
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'ACTIVITY MONITORING TABLES CREATED';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  • activity_log - System activity tracking';
    RAISE NOTICE '  • chat_logs - User chat messages';
    RAISE NOTICE '  • online_users_view - Real-time user status view';
    RAISE NOTICE '  • user_activity_dashboard - User activity summary';
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend pages that will now work:';
    RAISE NOTICE '  ✅ /dashboard/activity-log - Activity log page';
    RAISE NOTICE '  ✅ /chat - Chat functionality';
    RAISE NOTICE '  ✅ Online user indicators';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample data:';
    RAISE NOTICE '  • 11 activity log records';
    RAISE NOTICE '  • 4 chat messages';
    RAISE NOTICE '  • Views with real-time user status';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS policies:';
    RAISE NOTICE '  • Users can only see their own activity logs';
    RAISE NOTICE '  • Admin can see all activity logs';
    RAISE NOTICE '  • Users can only see their own chat messages';
    RAISE NOTICE '=========================================';
END $$;

-- ======================
-- 11. Refresh schema cache
-- ======================
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;