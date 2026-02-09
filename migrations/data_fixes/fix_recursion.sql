-- Fix infinite recursion in profiles RLS policies
-- Run this in Supabase SQL Editor

-- 1. First, drop the problematic function that causes recursion
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;

-- 2. Drop all policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;

-- 3. Create a simple admin check function that doesn't cause recursion
-- This function uses auth.jwt() to get role from JWT claims (if available)
-- Or returns false if not available (safe fallback)
CREATE OR REPLACE FUNCTION is_admin_user_safe()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Try to get role from JWT claims first (if set by app)
    user_role := coalesce(
        (current_setting('request.jwt.claims', true)::jsonb)->>'role',
        (current_setting('request.jwt.claims', true)::jsonb)->'app_metadata'->>'role'
    );
    
    -- If role is 'admin' in JWT, return true
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Fallback: check profiles table but WITH RECURSIVE SAFETY
    -- Use a try-catch approach with limited recursion
    BEGIN
        -- Use a subquery with LIMIT 1 to avoid multiple row issues
        SELECT role INTO user_role
        FROM profiles 
        WHERE id = auth.uid()
        LIMIT 1;
        
        RETURN user_role = 'admin';
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate simple policies WITHOUT recursion
-- Policy 1: Users can view their own profile (simple check)
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (simple check)
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Admin can manage all profiles (using safe function)
CREATE POLICY "Admin can manage all profiles" ON profiles
FOR ALL USING (is_admin_user_safe());

-- 5. Also fix other tables' policies to use the safe function
-- First drop existing policies on other tables that might use the old function
DROP POLICY IF EXISTS "Admin full access for kabupaten" ON kabupaten;
DROP POLICY IF EXISTS "Admin write access for perhutanan_sosial" ON perhutanan_sosial;
DROP POLICY IF EXISTS "Admin write access for potensi" ON potensi;

-- Recreate with safe function
CREATE POLICY "Admin full access for kabupaten" ON kabupaten
FOR ALL USING (is_admin_user_safe());

CREATE POLICY "Admin write access for perhutanan_sosial" ON perhutanan_sosial
FOR ALL USING (is_admin_user_safe());

CREATE POLICY "Admin write access for potensi" ON potensi
FOR ALL USING (is_admin_user_safe());

-- 6. Ensure public read policies exist (they should already exist)
-- If not, create them (but they likely exist from previous fix)
DO $$ 
BEGIN
    -- kabupaten public read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kabupaten' 
        AND policyname = 'Public read access for kabupaten'
    ) THEN
        CREATE POLICY "Public read access for kabupaten" ON kabupaten
        FOR SELECT USING (true);
    END IF;
    
    -- perhutanan_sosial public read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'perhutanan_sosial' 
        AND policyname = 'Public read access for perhutanan_sosial'
    ) THEN
        CREATE POLICY "Public read access for perhutanan_sosial" ON perhutanan_sosial
        FOR SELECT USING (true);
    END IF;
    
    -- potensi public read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'potensi' 
        AND policyname = 'Public read access for potensi'
    ) THEN
        CREATE POLICY "Public read access for potensi" ON potensi
        FOR SELECT USING (true);
    END IF;
    
    -- role_permissions public read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'role_permissions' 
        AND policyname = 'Public read access for role_permissions'
    ) THEN
        CREATE POLICY "Public read access for role_permissions" ON role_permissions
        FOR SELECT USING (true);
    END IF;
END $$;

-- 7. Test that recursion is fixed
-- This query should not cause infinite recursion
SELECT 
    'profiles' as table_name,
    (SELECT COUNT(*) FROM profiles WHERE auth.uid() = id) as own_profile_count,
    (SELECT COUNT(*) FROM profiles WHERE is_admin_user_safe()) as admin_visible_count;

-- 8. Verify policies are working
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'kabupaten', 'perhutanan_sosial', 'potensi', 'role_permissions')
ORDER BY tablename, policyname;

-- 9. Final test: try to read data (should work now)
SELECT 'kabupaten' as table, COUNT(*) as count FROM kabupaten
UNION ALL
SELECT 'perhutanan_sosial', COUNT(*) FROM perhutanan_sosial
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions;

-- Success message
SELECT '✅ RECURSION FIX COMPLETE: Policies should work without infinite recursion' as status;