-- Ensure correct RLS policies for lembaga_pengelola table
-- This migration drops all existing policies and recreates them with check_user_role

-- First, ensure RLS is enabled
ALTER TABLE lembaga_pengelola ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on lembaga_pengelola to start fresh
DROP POLICY IF EXISTS "lembaga_pengelola readable by authenticated users" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lembaga_pengelola insertable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lembaga_pengelola updatable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lembaga_pengelola deletable by admin only" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lphd readable by authenticated users" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lphd insertable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lphd updatable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lphd deletable by admin only" ON lembaga_pengelola;

-- Create new policies using check_user_role function
-- Readable by all authenticated users
CREATE POLICY "lembaga_pengelola readable by authenticated users" ON lembaga_pengelola
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insertable only by admin and monev
CREATE POLICY "lembaga_pengelola insertable by admin and monev" ON lembaga_pengelola
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

-- Updatable only by admin and monev
CREATE POLICY "lembaga_pengelola updatable by admin and monev" ON lembaga_pengelola
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

-- Deletable only by admin
CREATE POLICY "lembaga_pengelola deletable by admin only" ON lembaga_pengelola
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'lembaga_pengelola'
ORDER BY policyname;

-- Test note: After applying these policies, try editing lembaga data again.
-- Check debug_log table for any logs from check_user_role function:
-- SELECT * FROM debug_log ORDER BY timestamp DESC LIMIT 10;
