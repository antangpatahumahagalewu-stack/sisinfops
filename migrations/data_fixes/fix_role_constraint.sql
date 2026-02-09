-- Fix Role Constraint in profiles table
-- Make it match the 12 roles in the provided schema

-- First, check current constraint (PostgreSQL 12+ compatible)
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

-- Drop existing constraint if exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add correct constraint with 12 roles (matching provided schema)
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role::text IN (
    'admin', 'monev', 'viewer', 'program_planner', 'program_implementer',
    'carbon_specialist', 'finance_manager', 'finance_operational',
    'finance_project_carbon', 'finance_project_implementation', 
    'finance_project_social', 'investor'
  ));

-- Verify constraint is applied (PostgreSQL 12+ compatible)
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

-- Test constraint by trying to insert each valid role
DO $$
DECLARE
    test_roles TEXT[] := ARRAY[
        'admin', 'monev', 'viewer', 'program_planner', 'program_implementer',
        'carbon_specialist', 'finance_manager', 'finance_operational',
        'finance_project_carbon', 'finance_project_implementation', 
        'finance_project_social', 'investor'
    ];
    test_role TEXT;
BEGIN
    FOREACH test_role IN ARRAY test_roles
    LOOP
        BEGIN
            INSERT INTO profiles (id, role) 
            VALUES (gen_random_uuid(), test_role)
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE '✅ Role "%" is valid', test_role;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Role "%" failed: %', test_role, SQLERRM;
        END;
    END LOOP;
    
    -- Clean up test inserts
    DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
END $$;

-- Show current profiles and their roles
SELECT id, role, full_name 
FROM profiles 
ORDER BY role;
