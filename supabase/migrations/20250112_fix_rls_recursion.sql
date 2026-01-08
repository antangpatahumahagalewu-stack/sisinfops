-- Fix infinite recursion in RLS policies by creating a security definer function
-- This function bypasses RLS to check user roles without triggering recursion
--
-- IMPORTANT: After running this migration, ensure your user has a profile entry
-- with role 'admin' or 'monev' in the profiles table to be able to insert/update
-- data in lembaga_pengelola table.
--
-- To verify your role, run:
-- SELECT id, role FROM profiles WHERE id = auth.uid();
--
-- To test the function, run:
-- SELECT check_user_role(ARRAY['admin', 'monev']);

CREATE OR REPLACE FUNCTION check_user_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user role directly from profiles table
  -- SECURITY DEFINER allows this function to bypass RLS
  -- We use a direct query that should bypass RLS due to SECURITY DEFINER
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Check if user role is in the required roles array
  -- Return false if role is NULL (user has no profile)
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN user_role = ANY(required_roles);
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return false for security
    -- Log the error for debugging (optional, can be removed in production)
    RAISE WARNING 'Error in check_user_role: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_role(TEXT[]) TO authenticated;

-- Update lembaga_pengelola policies to use the new function
DROP POLICY IF EXISTS "lembaga_pengelola insertable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lembaga_pengelola updatable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lembaga_pengelola deletable by admin only" ON lembaga_pengelola;

CREATE POLICY "lembaga_pengelola insertable by admin and monev" ON lembaga_pengelola
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "lembaga_pengelola updatable by admin and monev" ON lembaga_pengelola
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "lembaga_pengelola deletable by admin only" ON lembaga_pengelola
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- Also fix the profiles "Admin can view all profiles" policy to avoid recursion
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

CREATE POLICY "Admin can view all profiles" ON profiles
    FOR SELECT USING (check_user_role(ARRAY['admin']));

