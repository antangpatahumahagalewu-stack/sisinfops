-- Fix profiles role constraint to include finance_approver
-- This fixes the PL/pgSQL block that failed during migration

-- First drop existing constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Recreate constraint with all roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'program_planner', 'finance_approver', 'finance_manager', 'viewer'));

-- Add a default finance_approver user for testing (optional)
-- First check if we have any user to assign finance_approver role
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get first admin user
    SELECT id INTO test_user_id 
    FROM profiles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- If found, update one to finance_approver for testing
    IF test_user_id IS NOT NULL THEN
        UPDATE profiles 
        SET role = 'finance_approver'
        WHERE id = test_user_id;
        
        RAISE NOTICE 'Updated user % to finance_approver role for testing', test_user_id;
    ELSE
        RAISE NOTICE 'No admin user found to update to finance_approver';
    END IF;
END $$;

-- Verify the fix
SELECT DISTINCT role FROM profiles WHERE role IS NOT NULL ORDER BY role;