-- Debug check_user_role function with logging
-- Create debug log table

CREATE TABLE IF NOT EXISTS debug_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    function_name TEXT,
    user_id UUID,
    message TEXT,
    data JSONB
);

-- Create or replace check_user_role with detailed logging
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
  -- Log entry
  INSERT INTO debug_log (function_name, message, data)
  VALUES ('check_user_role', 'Function called', jsonb_build_object('required_roles', required_roles));
  
  -- Try to get user ID from JWT claim first
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
  
  -- Log user_id
  INSERT INTO debug_log (function_name, user_id, message, data)
  VALUES ('check_user_role', user_id, 'User ID determined', jsonb_build_object('user_id', user_id));
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    INSERT INTO debug_log (function_name, message, data)
    VALUES ('check_user_role', 'No user ID - returning false', '{}'::jsonb);
    
    RETURN FALSE;
  END IF;
  
  -- Get user role directly from profiles table
  -- SECURITY DEFINER allows this function to bypass RLS
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Log profile query result
  INSERT INTO debug_log (function_name, user_id, message, data)
  VALUES ('check_user_role', user_id, 'Profile query result', 
          jsonb_build_object('user_role', user_role, 'has_profile', user_role IS NOT NULL));
  
  -- Check if user role is in the required roles array
  -- Return false if role is NULL (user has no profile)
  IF user_role IS NULL THEN
    INSERT INTO debug_log (function_name, user_id, message, data)
    VALUES ('check_user_role', user_id, 'No profile found - returning false', '{}'::jsonb);
    
    RETURN FALSE;
  END IF;
  
  result := user_role = ANY(required_roles);
  
  -- Log final result
  INSERT INTO debug_log (function_name, user_id, message, data)
  VALUES ('check_user_role', user_id, 'Function result', 
          jsonb_build_object('result', result, 'user_role', user_role, 'required_roles', required_roles));
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return false for security
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

-- Test the function for the specific user with admin role
-- Note: This will only work if run with the user's JWT context
-- SELECT check_user_role(ARRAY['admin', 'monev']);

-- Create a helper function to view recent debug logs
CREATE OR REPLACE FUNCTION get_recent_debug_logs(limit_count INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    timestamp TIMESTAMP WITH TIME ZONE,
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
