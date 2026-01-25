-- Migration: Create activity_log table for comprehensive user activity tracking
-- Date: 2026-01-25
-- Description: Tracks all user activities and provides a unified view for admins.

-- 1. Buat Tabel activity_log
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_role VARCHAR(50), 
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'page_view', 'data_read', 'data_create', 
        'data_update', 'data_delete', 'file_upload', 'file_download',
        'search', 'export', 'import', 'api_call', 'error', 'other'
    )),
    resource_type VARCHAR(100), 
    resource_id UUID, 
    details JSONB DEFAULT '{}'::jsonb, 
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Indeks untuk Performa Query
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource_type ON activity_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_role ON activity_log(user_role);

-- 3. Konfigurasi Keamanan (RLS)
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admin bisa melihat semua
DROP POLICY IF EXISTS "Admins have full access" ON activity_log;
CREATE POLICY "Admins have full access" ON activity_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Policy: User bisa input log mereka sendiri (biasanya via trigger/service role)
DROP POLICY IF EXISTS "Users can insert own activities" ON activity_log;
CREATE POLICY "Users can insert own activities" ON activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Trigger Updated At
DROP TRIGGER IF EXISTS update_activity_log_updated_at ON activity_log;
CREATE TRIGGER update_activity_log_updated_at
    BEFORE UPDATE ON activity_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Helper Function: log_activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_resource_type VARCHAR(100) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_log_id UUID;
BEGIN
    -- Ambil role terakhir user dari tabel profiles
    SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
    
    INSERT INTO activity_log (
        user_id, user_role, activity_type, resource_type, 
        resource_id, details, ip_address, user_agent
    ) VALUES (
        p_user_id, v_user_role, p_activity_type, p_resource_type, 
        p_resource_id, p_details, p_ip_address, p_user_agent
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Logging failed: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Unified Audit View (Perbaikan Error UUID/TEXT)
CREATE OR REPLACE VIEW combined_audit_view AS
SELECT 
    'audit' as log_type,
    id,
    table_name as resource_type,
    record_id::TEXT as resource_id, -- Di-cast ke TEXT untuk kompatibilitas UNION
    operation as activity_type,
    user_id,
    NULL::VARCHAR as user_role,
    old_data,
    new_data,
    created_at,
    NULL::JSONB as details,
    NULL::INET as ip_address,
    NULL::TEXT as user_agent
FROM audit_log
UNION ALL
SELECT
    'activity' as log_type,
    id,
    resource_type,
    resource_id::TEXT as resource_id, -- Diselaraskan menjadi TEXT
    activity_type,
    user_id,
    user_role,
    NULL::JSONB as old_data,
    NULL::JSONB as new_data,
    created_at,
    details,
    ip_address,
    user_agent
FROM activity_log;

-- 7. Izin Akses
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT SELECT ON combined_audit_view TO authenticated;
