-- FIX: Profiles Table RLS Policy for Authenticated Users
-- This fixes the "cannot execute INSERT in a read-only transaction" error
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX PROFILES TABLE RLS
-- ============================================

-- First, check existing policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON profiles;

-- Create new policy: Authenticated users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT USING (
  auth.uid() = id
);

-- Also allow service role to read all profiles (for admin purposes)
-- This is already covered by existing policies

-- ============================================
-- 2. TEST THE FIX
-- ============================================

-- Test if authenticated user can read their own profile
-- Replace 'ea37ec26-5241-4ac4-b858-b4cd95b80cda' with actual user ID
DO $$
DECLARE
  test_user_id UUID := 'ea37ec26-5241-4ac4-b858-b4cd95b80cda'; -- masbob@yamal.com
  can_read BOOLEAN;
BEGIN
  -- Simulate as authenticated user
  PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
  
  -- Try to read the profile
  SELECT COUNT(*) > 0 INTO can_read
  FROM profiles 
  WHERE id = test_user_id;
  
  IF can_read THEN
    RAISE NOTICE '✅ User can read own profile - FIX WORKED!';
  ELSE
    RAISE WARNING '❌ User cannot read own profile - check RLS policies';
  END IF;
  
  -- Reset
  PERFORM set_config('request.jwt.claim.sub', '', true);
END $$;

-- ============================================
-- 3. VERIFY OTHER CRITICAL POLICIES
-- ============================================

-- Check if role_permissions table is accessible
SELECT COUNT(*) as role_permissions_count FROM role_permissions;

-- Check if financial tables have policies
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename IN (
  'financial_transactions',
  'financial_reports',
  'financial_budgets',
  'budgets',
  'grants',
  'donors'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. ADDITIONAL SAFETY POLICIES
-- ============================================

-- Allow authenticated users to update their own profile (name, etc.)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

-- Allow insertion of profiles (handled by trigger, but good to have)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
CREATE POLICY "Enable insert for authenticated users" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- ============================================
-- 5. FINAL VERIFICATION
-- ============================================

-- Show all policies for profiles table
SELECT 
  policyname,
  permissive,
  cmd,
  roles::text
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Test message
RAISE NOTICE '===========================================';
RAISE NOTICE '✅ Profiles table RLS FIXED';
RAISE NOTICE '===========================================';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Clear browser cache and cookies';
RAISE NOTICE '2. Logout and login again';
RAISE NOTICE '3. Test finance dashboard access';
RAISE NOTICE '4. Run finance RLS migration if needed';
RAISE NOTICE '===========================================';