-- Debug check_user_role function with logging
-- This version includes detailed logging for troubleshooting role checking issues
-- 
-- Supported roles: 'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'
-- 
-- WARNING: This is a debug version with extensive logging. 
-- Consider using the production version (20250115_fix_check_user_role.sql) for production environments.

-- Create debug log table for tracking function calls
CREATE TABLE IF NOT EXISTS debug_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    function_name TEXT,
    user_id UUID,
    message TEXT,
    data JSONB
);

-- Create or replace check_user_role with detailed logging
-- This debug version logs every step of the role checking process
-- Supported roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist
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
  result BOOLEAN;
BEGIN
  -- Log function entry with required roles
  INSERT INTO debug_log (function_name, message, data)
  VALUES ('check_user_role', 'Function called', jsonb_build_object('required_roles', required_roles));
  
  -- Try to get user ID from JWT claim first
  -- This is more reliable in certain contexts (e.g., RLS policies, triggers)
  BEGIN
    jwt_sub := current_setting('request.jwt.claim.sub', true);
    
    INSERT INTO debug_log (function_name, message, data)
    VALUES ('check_user_role', 'JWT sub extracted', jsonb_build_object('jwt_sub', jwt_sub));
    
    IF jwt_sub IS NOT NULL AND jwt_sub != '' THEN
      user_id := jwt_sub::UUID;
    ELSE
      -- Fall back to auth.uid()
      user_id := auth.uid();
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error, fall back to auth.uid()
      INSERT INTO debug_log (function_name, message, data)
      VALUES ('check_user_role', 'Exception getting JWT', jsonb_build_object('error', SQLERRM));
      
      user_id := auth.uid();
  END;
  
  -- Log determined user_id
  INSERT INTO debug_log (function_name, user_id, message, data)
  VALUES ('check_user_role', user_id, 'User ID determined', jsonb_build_object('user_id', user_id));
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    INSERT INTO debug_log (function_name, message, data)
    VALUES ('check_user_role', 'No user ID - returning false', '{}'::jsonb);
    
    RETURN FALSE;
  END IF;
  
  -- Get user role directly from profiles table
  -- SECURITY DEFINER allows this function to bypass RLS to check roles
  -- This prevents infinite recursion in RLS policies
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Log profile query result
  INSERT INTO debug_log (function_name, user_id, message, data)
  VALUES ('check_user_role', user_id, 'Profile query result', 
          jsonb_build_object('user_role', user_role, 'has_profile', user_role IS NOT NULL));
  
  -- Check if user role is in the required roles array
  -- Supported roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist
  -- Return false if role is NULL (user has no profile)
  IF user_role IS NULL THEN
    INSERT INTO debug_log (function_name, user_id, message, data)
    VALUES ('check_user_role', user_id, 'No profile found - returning false', '{}'::jsonb);
    
    RETURN FALSE;
  END IF;
  
  -- Check if user's role matches any of the required roles
  result := user_role = ANY(required_roles);
  
  -- Log final result with all relevant information
  INSERT INTO debug_log (function_name, user_id, message, data)
  VALUES ('check_user_role', user_id, 'Function result', 
          jsonb_build_object(
            'result', result, 
            'user_role', user_role, 
            'required_roles', required_roles,
            'role_matched', result
          ));
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return false for security (fail-safe)
    -- Log the error for debugging
    INSERT INTO debug_log (function_name, message, data)
    VALUES ('check_user_role', 'Exception in function', 
            jsonb_build_object('error', SQLERRM, 'user_id', user_id));
    
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_role(TEXT[]) TO authenticated;

-- Grant permissions on debug_log table
GRANT INSERT ON debug_log TO authenticated;
GRANT SELECT ON debug_log TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION check_user_role(TEXT[]) IS 
  'DEBUG VERSION: Checks if the current authenticated user has one of the required roles.
   Supported roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist.
   This version includes extensive logging to debug_log table for troubleshooting.
   Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.
   Returns false if user is not authenticated, has no profile, or role check fails.';

-- Example usage:
-- SELECT check_user_role(ARRAY['admin', 'monev']); -- Returns true if user is admin or monev
-- SELECT check_user_role(ARRAY['admin']); -- Returns true only if user is admin
-- Note: This will only work if run with the user's JWT context

-- Create a helper function to view recent debug logs
-- Useful for troubleshooting role checking issues
CREATE OR REPLACE FUNCTION get_recent_debug_logs(limit_count INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    "timestamp" TIMESTAMP WITH TIME ZONE,
    function_name TEXT,
    user_id UUID,
    message TEXT,
    data JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, timestamp, function_name, user_id, message, data
    FROM debug_log
    ORDER BY timestamp DESC
    LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_recent_debug_logs(INT) TO authenticated;

COMMENT ON FUNCTION get_recent_debug_logs(INT) IS 
  'Helper function to retrieve recent debug logs from check_user_role function.
   Useful for troubleshooting role checking issues.';
