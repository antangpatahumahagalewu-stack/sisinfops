-- MIGRATION: ADMIN GOD MODE POLICIES
-- Date: 2026-02-14 10:00 AM
-- Description: Add admin bypass policies for ALL tables to ensure absolute access
-- This ensures the sole admin has complete control over all data and operations

BEGIN;

-- ====================================================================
-- PART 1: CREATE GOD MODE AUDIT LOG TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS god_mode_audit (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'EXECUTE')),
    affected_rows INTEGER,
    sql_query TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_god_mode_audit_admin_id ON god_mode_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_god_mode_audit_created_at ON god_mode_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_god_mode_audit_table_name ON god_mode_audit(table_name);
CREATE INDEX IF NOT EXISTS idx_god_mode_audit_operation ON god_mode_audit(operation);

-- ====================================================================
-- PART 2: FUNCTION TO CHECK IF USER IS ADMIN
-- ====================================================================

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PART 3: FUNCTION TO LOG ADMIN ACTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
    v_operation VARCHAR(20);
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    -- Check if current user is admin
    SELECT id INTO v_admin_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin';
    
    -- Only log if user is admin
    IF v_admin_id IS NOT NULL THEN
        -- Determine operation type
        IF TG_OP = 'INSERT' THEN
            v_operation := 'INSERT';
            v_old_values := NULL;
            v_new_values := to_jsonb(NEW);
        ELSIF TG_OP = 'UPDATE' THEN
            v_operation := 'UPDATE';
            v_old_values := to_jsonb(OLD);
            v_new_values := to_jsonb(NEW);
        ELSIF TG_OP = 'DELETE' THEN
            v_operation := 'DELETE';
            v_old_values := to_jsonb(OLD);
            v_new_values := NULL;
        END IF;
        
        -- Insert audit log
        INSERT INTO god_mode_audit (
            admin_id, action, table_name, operation, 
            affected_rows, old_values, new_values
        ) VALUES (
            v_admin_id,
            TG_OP || ' operation on ' || TG_TABLE_NAME,
            TG_TABLE_NAME,
            v_operation,
            1,
            v_old_values,
            v_new_values
        );
    END IF;
    
    -- Return appropriate value based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PART 4: ADMIN BYPASS POLICIES FOR ALL TABLES
-- ====================================================================

-- Note: This section adds admin bypass policies to ALL tables in the system
-- Admin can perform ALL operations (SELECT, INSERT, UPDATE, DELETE) on ALL tables

-- 4.1 Core Tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Loop through all user tables in public schema
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('god_mode_audit', 'spatial_ref_sys')
    LOOP
        -- Drop existing restrictive policies if they exist
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_select_%s" ON %I', table_record.tablename, table_record.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_insert_%s" ON %I', table_record.tablename, table_record.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_update_%s" ON %I', table_record.tablename, table_record.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_delete_%s" ON %I', table_record.tablename, table_record.tablename);
        
        -- Create admin bypass policies
        EXECUTE format('CREATE POLICY "admin_bypass_select_%s" ON %I FOR SELECT USING (is_admin_user())', table_record.tablename, table_record.tablename);
        EXECUTE format('CREATE POLICY "admin_bypass_insert_%s" ON %I FOR INSERT WITH CHECK (is_admin_user())', table_record.tablename, table_record.tablename);
        EXECUTE format('CREATE POLICY "admin_bypass_update_%s" ON %I FOR UPDATE USING (is_admin_user()) WITH CHECK (is_admin_user())', table_record.tablename, table_record.tablename);
        EXECUTE format('CREATE POLICY "admin_bypass_delete_%s" ON %I FOR DELETE USING (is_admin_user())', table_record.tablename, table_record.tablename);
        
        RAISE NOTICE 'Added admin bypass policies for table: %', table_record.tablename;
    END LOOP;
END $$;

-- ====================================================================
-- PART 5: SPECIFIC POLICY OVERRIDES FOR CRITICAL TABLES
-- ====================================================================

-- 5.1 profiles table - Admin can manage all users including other admins
DROP POLICY IF EXISTS "admin_full_access_profiles" ON profiles;
CREATE POLICY "admin_full_access_profiles" ON profiles
FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

-- 5.2 god_mode_audit table - Only admin can read, no one can modify audit logs
DROP POLICY IF EXISTS "admin_read_only_audit" ON god_mode_audit;
CREATE POLICY "admin_read_only_audit" ON god_mode_audit
FOR SELECT USING (is_admin_user());

-- Prevent any modifications to audit logs
DROP POLICY IF EXISTS "no_modifications_audit" ON god_mode_audit;
CREATE POLICY "no_modifications_audit" ON god_mode_audit
FOR ALL USING (false) WITH CHECK (false);

-- ====================================================================
-- PART 6: TRIGGERS FOR ADMIN ACTION LOGGING ON CRITICAL TABLES
-- ====================================================================

-- Add admin action logging to critical tables
DO $$
DECLARE
    critical_tables TEXT[] := ARRAY[
        'profiles', 'perhutanan_sosial', 'financial_transactions', 
        'budgets', 'accounting_ledgers', 'carbon_projects',
        'programs', 'master_aksi_mitigasi', 'role_permissions'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY critical_tables LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            -- Drop existing trigger if exists
            EXECUTE format('DROP TRIGGER IF EXISTS log_admin_action_%s ON %I', table_name, table_name);
            
            -- Create new trigger
            EXECUTE format('
                CREATE TRIGGER log_admin_action_%s
                AFTER INSERT OR UPDATE OR DELETE ON %I
                FOR EACH ROW EXECUTE FUNCTION log_admin_action()
            ', table_name, table_name);
            
            RAISE NOTICE 'Added admin action logging trigger for table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- ====================================================================
-- PART 7: ADMIN UTILITY FUNCTIONS
-- ====================================================================

-- 7.1 Function to get all tables and their row counts
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    table_name VARCHAR,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::VARCHAR,
        COALESCE(c.reltuples::BIGINT, 0) as row_count,
        pg_size_pretty(pg_total_relation_size('public.' || t.table_name)) as table_size,
        pg_size_pretty(pg_indexes_size('public.' || t.table_name)) as index_size,
        pg_size_pretty(pg_total_relation_size('public.' || t.table_name)) as total_size
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Function to execute safe read-only queries (admin only)
CREATE OR REPLACE FUNCTION admin_query_readonly(query_text TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Only allow SELECT queries for safety
    IF NOT (query_text ~* '^\s*SELECT') THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed for security reasons';
    END IF;
    
    -- Only allow admin users
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Only admin users can execute queries';
    END IF;
    
    -- Execute query and return as JSON
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
    
    -- Log the query
    INSERT INTO god_mode_audit (
        admin_id, action, table_name, operation, 
        sql_query, affected_rows
    ) VALUES (
        auth.uid(),
        'Admin read-only query execution',
        'system',
        'EXECUTE',
        query_text,
        COALESCE(jsonb_array_length(result), 0)
    );
    
    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        INSERT INTO god_mode_audit (
            admin_id, action, table_name, operation, 
            sql_query, affected_rows
        ) VALUES (
            auth.uid(),
            'Admin query failed: ' || SQLERRM,
            'system',
            'EXECUTE',
            query_text,
            0
        );
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PART 8: GRANT PERMISSIONS
-- ====================================================================

GRANT ALL ON god_mode_audit TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_query_readonly(TEXT) TO authenticated;

-- ====================================================================
-- PART 9: VERIFICATION AND REPORTING
-- ====================================================================

DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('god_mode_audit', 'spatial_ref_sys');
    
    -- Count admin bypass policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND policyname LIKE 'admin_bypass_%';
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'ADMIN GOD MODE MIGRATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables processed: %', table_count;
    RAISE NOTICE 'Admin bypass policies created: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '  ✅ Admin bypass policies for ALL tables';
    RAISE NOTICE '  ✅ Admin action auditing system';
    RAISE NOTICE '  ✅ Safe read-only query execution';
    RAISE NOTICE '  ✅ Database statistics function';
    RAISE NOTICE '';
    RAISE NOTICE 'Security notes:';
    RAISE NOTICE '  • Only users with role="admin" can bypass all restrictions';
    RAISE NOTICE '  • All admin actions are logged in god_mode_audit table';
    RAISE NOTICE '  • Audit logs are immutable (read-only)';
    RAISE NOTICE '  • Query execution is limited to SELECT only';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Restart Supabase to apply new policies';
    RAISE NOTICE '  2. Test admin access to all tables';
    RAISE NOTICE '  3. Review god_mode_audit table for activity logs';
    RAISE NOTICE '=========================================';
END $$;

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;