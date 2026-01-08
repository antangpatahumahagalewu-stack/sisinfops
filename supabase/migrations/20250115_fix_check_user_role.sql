-- Fix check_user_role function to use current_setting for JWT claims
-- This may resolve issues where auth.uid() doesn't return the correct user ID in certain contexts
--
-- Supported roles: 'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'
-- This function checks if the current user's role is in the provided array of required roles

CREATE OR REPLACE FUNCTION check_user_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
  jwt_sub TEXT;
BEGIN
  -- Try to get user ID from JWT claim first
  -- This is more reliable in certain contexts (e.g., RLS policies, triggers)
  BEGIN
    jwt_sub := current_setting('request.jwt.claim.sub', true);
    IF jwt_sub IS NOT NULL AND jwt_sub != '' THEN
      user_id := jwt_sub::UUID;
    ELSE
      -- Fall back to auth.uid()
      user_id := auth.uid();
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error, fall back to auth.uid()
      user_id := auth.uid();
  END;
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user role directly from profiles table
  -- SECURITY DEFINER allows this function to bypass RLS to check roles
  -- This prevents infinite recursion in RLS policies
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Check if user role is in the required roles array
  -- Return false if role is NULL (user has no profile)
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user's role matches any of the required roles
  -- Supported roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist
  RETURN user_role = ANY(required_roles);
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return false for security (fail-safe)
    -- Log the error for debugging
    RAISE WARNING 'Error in check_user_role: user_id=%, error=%', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_role(TEXT[]) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION check_user_role(TEXT[]) IS 
  'Checks if the current authenticated user has one of the required roles.
   Supported roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist.
   Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.
   Returns false if user is not authenticated, has no profile, or role check fails.';

-- Example usage:
-- SELECT check_user_role(ARRAY['admin', 'monev']); -- Returns true if user is admin or monev
-- SELECT check_user_role(ARRAY['admin']); -- Returns true only if user is admin
-- Note: This test must be run manually with the user's JWT token, not in migration
