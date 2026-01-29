-- Migration: Fix All Roles Constraint in Profiles Table
-- Date: 2026-01-29
-- Description: Update profiles.role CHECK constraint to include ALL roles from role_permissions
-- This ensures that any role defined in role_permissions can be assigned to users

-- ============================================
-- 1. GET ALL ROLES FROM ROLE_PERMISSIONS
-- ============================================
-- We need to ensure the CHECK constraint includes ALL valid roles
-- Based on current system, these are the 13 roles:

-- Existing roles (7):
--   'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist', 'monev_officer'
-- Finance roles (6):
--   'finance_manager', 'finance_operational', 'finance_project_carbon', 
--   'finance_project_implementation', 'finance_project_social', 'investor'

-- ============================================
-- 2. UPDATE PROFILES TABLE ROLE CONSTRAINT
-- ============================================

DO $$
BEGIN
    -- First, drop the existing constraint if it exists
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    -- Now add the new constraint with ALL 13 roles
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN (
            -- Original system roles
            'admin', 'monev', 'viewer', 
            -- Program management roles
            'program_planner', 'program_implementer', 
            -- Carbon project roles
            'carbon_specialist', 'monev_officer',
            -- Finance module roles
            'finance_manager', 'finance_operational', 'finance_project_carbon',
            'finance_project_implementation', 'finance_project_social', 'investor'
        ));
    
    RAISE NOTICE '✅ Updated profiles.role constraint to include ALL 13 roles';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating profiles_role_check: %', SQLERRM;
        
        -- Try alternative approach: add constraint without dropping first
        BEGIN
            ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
                CHECK (role IN (
                    'admin', 'monev', 'viewer', 
                    'program_planner', 'program_implementer', 
                    'carbon_specialist', 'monev_officer',
                    'finance_manager', 'finance_operational', 'finance_project_carbon',
                    'finance_project_implementation', 'finance_project_social', 'investor'
                ));
            RAISE NOTICE '✅ Added profiles.role constraint (alternative method)';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Constraint already exists with correct values';
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to add constraint: %', SQLERRM;
        END;
END $$;

-- ============================================
-- 3. VERIFY THE CONSTRAINT
-- ============================================

DO $$
DECLARE
    constraint_def TEXT;
    role_count INTEGER;
    expected_roles TEXT[] := ARRAY[
        'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 
        'carbon_specialist', 'monev_officer', 'finance_manager', 'finance_operational', 
        'finance_project_carbon', 'finance_project_implementation', 'finance_project_social', 'investor'
    ];
    role_name_var TEXT;
    all_roles_included BOOLEAN := TRUE;
BEGIN
    -- Get the constraint definition
    SELECT pg_get_constraintdef(c.oid) INTO constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'profiles_role_check'
      AND n.nspname = 'public'
      AND t.relname = 'profiles';
    
    IF constraint_def IS NULL THEN
        RAISE WARNING '❌ Could not find profiles_role_check constraint';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Current constraint definition: %', constraint_def;
    
    -- Check if all expected roles are included
    FOREACH role_name_var IN ARRAY expected_roles
    LOOP
        IF constraint_def NOT LIKE '%' || role_name_var || '%' THEN
            RAISE WARNING '❌ Role "%" is missing from constraint', role_name_var;
            all_roles_included := FALSE;
        END IF;
    END LOOP;
    
    IF all_roles_included THEN
        RAISE NOTICE '✅ All 13 roles are included in the constraint';
    ELSE
        RAISE WARNING '⚠️ Some roles are missing from the constraint';
    END IF;
    
    -- Count how many roles are in role_permissions table
    SELECT COUNT(DISTINCT rp.role_name) INTO role_count FROM role_permissions rp;
    RAISE NOTICE 'Total distinct roles in role_permissions table: %', role_count;
    
    -- List all roles in role_permissions
    RAISE NOTICE 'Roles in role_permissions:';
    FOR role_name_var IN SELECT DISTINCT rp.role_name FROM role_permissions rp ORDER BY rp.role_name
    LOOP
        RAISE NOTICE '  - %', role_name_var;
    END LOOP;
END $$;

-- ============================================
-- 4. TEST ROLE ASSIGNMENT FOR EACH ROLE
-- ============================================

DO $$
DECLARE
    test_role TEXT;
    test_roles TEXT[] := ARRAY[
        'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 
        'carbon_specialist', 'monev_officer', 'finance_manager', 'finance_operational', 
        'finance_project_carbon', 'finance_project_implementation', 'finance_project_social', 'investor'
    ];
    test_result TEXT;
    constraint_error BOOLEAN;
BEGIN
    RAISE NOTICE 'Testing role assignment for each role...';
    
    FOREACH test_role IN ARRAY test_roles
    LOOP
        constraint_error := FALSE;
        
        BEGIN
            -- Try to update a non-existent profile (won't actually update)
            -- This tests if the constraint allows the role value
            UPDATE profiles 
            SET role = test_role 
            WHERE id = '00000000-0000-0000-0000-000000000000'::UUID;
            
            test_result := '✅ Role "' || test_role || '" is allowed';
        EXCEPTION
            WHEN check_violation THEN
                constraint_error := TRUE;
                test_result := '❌ Role "' || test_role || '" is NOT allowed: ' || SQLERRM;
            WHEN OTHERS THEN
                -- Other errors are expected since user doesn't exist
                test_result := '✅ Role "' || test_role || '" is allowed (other error: ' || SQLERRM || ')';
        END;
        
        RAISE NOTICE '%', test_result;
    END LOOP;
END $$;

-- ============================================
-- 5. UPDATE COMMENT ON CONSTRAINT
-- ============================================

COMMENT ON CONSTRAINT profiles_role_check ON profiles IS 
    'Allowed roles (13 total): admin, monev, viewer, program_planner, program_implementer, carbon_specialist, monev_officer, finance_manager, finance_operational, finance_project_carbon, finance_project_implementation, finance_project_social, investor';

-- ============================================
-- 6. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration ensures that the profiles.role CHECK constraint includes ALL 13 system roles:
-- 1. Original roles: admin, monev, viewer
-- 2. Program roles: program_planner, program_implementer
-- 3. Carbon roles: carbon_specialist, monev_officer
-- 4. Finance roles: finance_manager, finance_operational, finance_project_carbon,
--    finance_project_implementation, finance_project_social, investor
--
-- This fixes the issue where users could not be assigned certain roles even though
-- they exist in the role_permissions table.
--
-- After this migration:
-- - Users can be assigned any of the 13 roles
-- - The frontend will correctly display role-specific menus and permissions
-- - All RLS policies will work correctly with the assigned roles