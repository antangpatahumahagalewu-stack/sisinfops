-- Auto-create profile trigger for new users
-- This trigger automatically creates a profile entry when a new user signs up
-- Production-safe implementation with error handling
-- 
-- Supported roles: 'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'
-- Default role for new users: 'viewer'

-- First, update the profiles table constraint to include all 6 roles
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  -- Add new constraint with all 6 roles
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'));
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or other error, try to add it
    BEGIN
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'));
    EXCEPTION
      WHEN duplicate_object THEN
        -- Constraint already exists with correct values, ignore
        NULL;
    END;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new profile with default role 'viewer'
  -- Supported roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'viewer', -- Default role for new users
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING; -- Handle case where profile already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    -- In production, you might want to log this to a monitoring system
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger that fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a profile entry with role ''viewer'' when a new user signs up. 
   Supported roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist.
   This ensures all authenticated users have a profile for RLS policies to work correctly.';

