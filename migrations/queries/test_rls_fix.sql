-- Test RLS Fix Script
-- Run this directly in Supabase SQL Editor to fix RLS issues

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions')
ORDER BY tablename, policyname;

-- Disable RLS temporarily to test
ALTER TABLE kabupaten DISABLE ROW LEVEL SECURITY;
ALTER TABLE perhutanan_sosial DISABLE ROW LEVEL SECURITY;
ALTER TABLE potensi DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- Enable RLS again
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE potensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DROP POLICY IF EXISTS "Public read access for kabupaten" ON kabupaten;
DROP POLICY IF EXISTS "Admin full access for kabupaten" ON kabupaten;
DROP POLICY IF EXISTS "Public read access for perhutanan_sosial" ON perhutanan_sosial;
DROP POLICY IF EXISTS "Admin and monev write access for perhutanan_sosial" ON perhutanan_sosial;
DROP POLICY IF EXISTS "Public read access for potensi" ON potensi;
DROP POLICY IF EXISTS "Admin and monev write access for potensi" ON potensi;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Public read access for role_permissions" ON role_permissions;

-- Recreate SIMPLE policies
-- kabupaten: Public read, Admin write
CREATE POLICY "Public read access for kabupaten" ON kabupaten
FOR SELECT USING (true);

CREATE POLICY "Admin full access for kabupaten" ON kabupaten
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- perhutanan_sosial: Public read, Admin write
CREATE POLICY "Public read access for perhutanan_sosial" ON perhutanan_sosial
FOR SELECT USING (true);

CREATE POLICY "Admin write access for perhutanan_sosial" ON perhutanan_sosial
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- potensi: Public read, Admin write
CREATE POLICY "Public read access for potensi" ON potensi
FOR SELECT USING (true);

CREATE POLICY "Admin write access for potensi" ON potensi
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- profiles: Users can view/update own, Admin can manage all
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can manage all profiles" ON profiles
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- role_permissions: Public read only
CREATE POLICY "Public read access for role_permissions" ON role_permissions
FOR SELECT USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions')
ORDER BY tablename, policyname;

-- Test counts
SELECT 'kabupaten' as table_name, COUNT(*) as row_count FROM kabupaten
UNION ALL
SELECT 'perhutanan_sosial', COUNT(*) FROM perhutanan_sosial
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions;

-- Message
SELECT '✅ RLS FIX COMPLETE: Tables should now be accessible' as status;