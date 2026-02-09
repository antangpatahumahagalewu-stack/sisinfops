-- Disable RLS temporarily for testing
-- Run this in Supabase SQL Editor

-- 1. Disable RLS on all core tables
ALTER TABLE kabupaten DISABLE ROW LEVEL SECURITY;
ALTER TABLE perhutanan_sosial DISABLE ROW LEVEL SECURITY;
ALTER TABLE potensi DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- 2. Also disable on other tables if they exist
DO $$ 
BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS carbon_projects DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS carbon_credits DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS financial_transactions DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS programs DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS program_activities DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS financial_accounts DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS budgets DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS price_list DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS financial_reports DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS monev_indicators DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS monev_results DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS activity_log DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS audit_trail DISABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors if tables don't exist
END $$;

-- 3. Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions')
ORDER BY tablename;

-- 4. Test that access works
SELECT 'kabupaten' as table, COUNT(*) as count FROM kabupaten
UNION ALL
SELECT 'perhutanan_sosial', COUNT(*) FROM perhutanan_sosial
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions;

-- 5. Message
SELECT '✅ RLS TEMPORARILY DISABLED: Tables should now be accessible via API' as status;

-- IMPORTANT: To re-enable RLS later, run:
-- ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;
-- Then recreate policies with: CREATE POLICY ...