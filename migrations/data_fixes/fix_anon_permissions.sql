-- FIX ANON ROLE PERMISSIONS FOR SUPABASE
-- This should fix the "permission denied for table kabupaten" error

-- Check current grants
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
ORDER BY table_name, privilege_type;

-- 1. First, ensure anon role exists and can connect
DO $$
BEGIN
    -- Check if anon role exists
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOINHERIT;
        RAISE NOTICE 'Created anon role';
    END IF;
    
    -- Grant login capability (for Supabase)
    ALTER ROLE anon WITH NOLOGIN;  -- Supabase anon role should not have login
    RAISE NOTICE 'Ensured anon role exists';
END $$;

-- 2. Grant schema permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA auth TO anon;

-- 3. Grant table permissions on ALL tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;

-- 4. Grant sequence permissions (for auto-increment columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 5. Grant function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- 6. Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

-- 7. Specifically grant permissions on core tables (just to be sure)
GRANT ALL ON TABLE kabupaten TO anon;
GRANT ALL ON TABLE perhutanan_sosial TO anon;
GRANT ALL ON TABLE potensi TO anon;
GRANT ALL ON TABLE profiles TO anon;
GRANT ALL ON TABLE role_permissions TO anon;

-- 8. Check auth schema tables (if needed)
GRANT SELECT ON TABLE auth.users TO anon;

-- 9. Verify the grants
SELECT 
    grantee,
    table_schema,
    table_name,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_schema = 'public'
GROUP BY grantee, table_schema, table_name
ORDER BY table_name;

-- 10. Test anon access by creating a test view
CREATE OR REPLACE VIEW public.test_anon_access AS
SELECT 
    'kabupaten' as table_name,
    COUNT(*) as row_count
FROM kabupaten
UNION ALL
SELECT 
    'perhutanan_sosial',
    COUNT(*)
FROM perhutanan_sosial;

GRANT SELECT ON public.test_anon_access TO anon;

-- 11. Message
SELECT '✅ Anon permissions granted. Test REST API now.' as message;