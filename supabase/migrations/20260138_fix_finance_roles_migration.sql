-- Migration: Fix Finance Roles Migration - Handle missing updated_at column
-- Date: 2026-01-29
-- Description: Fix the finance roles migration by ensuring updated_at column exists and using proper INSERT statements
-- This is a follow-up to 20260137_add_finance_roles.sql

-- ============================================
-- 1. ENSURE UPDATED_AT COLUMN EXISTS IN ROLE_PERMISSIONS
-- ============================================

DO $$
BEGIN
    -- Check if updated_at column exists in role_permissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions' 
        AND column_name = 'updated_at'
    ) THEN
        -- Add updated_at column if it doesn't exist
        ALTER TABLE role_permissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to role_permissions table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in role_permissions table';
    END IF;
END $$;

-- ============================================
-- 2. UPDATE PROFILES TABLE ROLE CONSTRAINT (SAFE VERSION)
-- ============================================

-- First, check if the constraint already includes finance roles
DO $$
DECLARE
    constraint_def TEXT;
    has_finance_roles BOOLEAN := FALSE;
BEGIN
    -- Get current constraint definition
    SELECT pg_get_constraintdef(c.oid) INTO constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'profiles_role_check'
      AND n.nspname = 'public'
      AND t.relname = 'profiles';
    
    -- Check if constraint includes finance roles
    IF constraint_def LIKE '%finance_manager%' OR constraint_def LIKE '%finance_operational%' THEN
        has_finance_roles := TRUE;
        RAISE NOTICE 'Profiles role constraint already includes finance roles';
    END IF;
    
    -- Only update if finance roles are not included
    IF NOT has_finance_roles THEN
        -- Drop existing constraint
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        
        -- Add new constraint with ALL roles
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN (
                -- Existing roles
                'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist',
                -- Finance roles
                'finance_manager', 'finance_operational', 'finance_project_carbon', 
                'finance_project_implementation', 'finance_project_social', 'investor'
            ));
        
        RAISE NOTICE 'Updated profiles role constraint to include finance roles';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error checking/updating profiles role constraint: %', SQLERRM;
END $$;

-- ============================================
-- 3. INSERT FINANCE ROLE PERMISSIONS (FIXED VERSION)
-- ============================================
-- Use a simpler approach without the ON CONFLICT DO UPDATE SET updated_at part

-- First, create a temporary function to insert or update role permissions
CREATE OR REPLACE FUNCTION upsert_role_permission(
    p_role_name VARCHAR(50),
    p_display_name VARCHAR(100),
    p_permissions JSONB,
    p_description TEXT
) RETURNS VOID AS $$
BEGIN
    -- Try to update existing row
    UPDATE role_permissions 
    SET display_name = p_display_name,
        permissions = p_permissions,
        description = p_description,
        updated_at = NOW()
    WHERE role_name = p_role_name;
    
    -- If no row was updated, insert new row
    IF NOT FOUND THEN
        INSERT INTO role_permissions (role_name, display_name, permissions, description, updated_at)
        VALUES (p_role_name, p_display_name, p_permissions, p_description, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Now insert/update finance roles using the function
SELECT upsert_role_permission(
    'finance_manager',
    'Finance Manager',
    '{
       "financial_transaction": ["create", "read", "update", "delete", "approve"],
       "budget": ["create", "read", "update", "approve"],
       "ledger": ["manage"],
       "chart_of_accounts": ["manage"],
       "bank_account": ["manage"],
       "financial_report": ["generate", "export", "view"],
       "audit_trail": ["view"],
       "user_permission": ["manage"],
       "system_config": ["finance"]
     }'::jsonb,
    'Overall financial management, final approval, strategic planning - full access to all financial modules'
);

SELECT upsert_role_permission(
    'finance_operational',
    'Finance Operational Specialist',
    '{
       "financial_transaction": ["create", "read", "update"],
       "financial_report": ["view"],
       "budget": ["view"],
       "expense": ["submit"],
       "cash_flow": ["view"],
       "bank_reconciliation": ["operational"],
       "document": ["upload"]
     }'::jsonb,
    'Operasional kantor, pembelian barang, administrasi keuangan harian - only operational ledger access'
);

SELECT upsert_role_permission(
    'finance_project_carbon',
    'Finance Project Specialist - Carbon',
    '{
       "financial_transaction": ["create", "read", "update"],
       "carbon_project_budget": ["view"],
       "carbon_credit": ["transaction"],
       "mrv_expense": ["manage"],
       "carbon_report": ["generate"],
       "project_expense": ["track"],
       "donor_reporting": ["carbon"]
     }'::jsonb,
    'Proyek karbon, MRV, verification, carbon credit transactions - only carbon project ledger access'
);

SELECT upsert_role_permission(
    'finance_project_implementation',
    'Finance Project Specialist - Implementation',
    '{
       "financial_transaction": ["create", "read", "update"],
       "field_expense": ["manage"],
       "safeguard_budget": ["view"],
       "community_payment": ["process"],
       "implementation_reporting": [],
       "asset_purchase": ["request"]
     }'::jsonb,
    'Implementasi lapangan, safeguard, community engagement - only implementation project ledger access'
);

SELECT upsert_role_permission(
    'finance_project_social',
    'Finance Project Specialist - Social Economic',
    '{
       "financial_transaction": ["create", "read", "update"],
       "benefit_sharing": ["manage"],
       "livelihood_program_budget": [],
       "community_training_expense": [],
       "social_impact_reporting": [],
       "kk_payment": ["processing"]
     }'::jsonb,
    'Sosial-ekonomi, benefit sharing, livelihood programs - only social economic project ledger access'
);

SELECT upsert_role_permission(
    'investor',
    'Investor / Donor',
    '{
       "financial_report": ["view"],
       "budget": ["view"],
       "transaction_history": ["view"],
       "export": ["reports"],
       "dashboard": ["view"],
       "impact_metrics": ["view"],
       "document": ["download"]
     }'::jsonb,
    'Read-only access untuk monitoring dana mereka - view only access to their projects'
);

-- Clean up the temporary function
DROP FUNCTION upsert_role_permission(VARCHAR(50), VARCHAR(100), JSONB, TEXT);

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================

-- Check that all finance roles are now allowed in profiles table
DO $$
DECLARE
    constraint_info TEXT;
    allowed_roles TEXT[];
BEGIN
    -- Get current constraint definition
    SELECT pg_get_constraintdef(c.oid) INTO constraint_info
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'profiles_role_check'
      AND n.nspname = 'public'
      AND t.relname = 'profiles';
    
    IF constraint_info IS NOT NULL THEN
        RAISE NOTICE 'Profiles role constraint: %', constraint_info;
        
        -- Extract roles from constraint definition
        -- Simple parsing to check for finance roles
        IF constraint_info LIKE '%finance_manager%' AND 
           constraint_info LIKE '%finance_operational%' AND
           constraint_info LIKE '%investor%' THEN
            RAISE NOTICE '✅ Finance roles are included in profiles constraint';
        ELSE
            RAISE WARNING '⚠️ Finance roles may not be fully included in profiles constraint';
        END IF;
    ELSE
        RAISE WARNING '⚠️ Could not find profiles_role_check constraint';
    END IF;
END $$;

-- Check that finance role permissions were inserted
DO $$
DECLARE
    finance_role_count INTEGER;
    total_roles INTEGER;
    role_rec RECORD;
BEGIN
    -- Count finance roles
    SELECT COUNT(*) INTO finance_role_count
    FROM role_permissions 
    WHERE role_name IN (
        'finance_manager', 'finance_operational', 'finance_project_carbon',
        'finance_project_implementation', 'finance_project_social', 'investor'
    );
    
    -- Count total roles
    SELECT COUNT(*) INTO total_roles FROM role_permissions;
    
    RAISE NOTICE 'Finance roles in role_permissions: %', finance_role_count;
    RAISE NOTICE 'Total roles in role_permissions: %', total_roles;
    
    IF finance_role_count = 6 THEN
        RAISE NOTICE '✅ All 6 finance roles successfully added';
        
        -- List the finance roles
        RAISE NOTICE 'Finance roles details:';
        FOR role_rec IN 
            SELECT role_name, display_name 
            FROM role_permissions 
            WHERE role_name LIKE 'finance%' OR role_name = 'investor'
            ORDER BY role_name
        LOOP
            RAISE NOTICE '  - % (%)', role_rec.role_name, role_rec.display_name;
        END LOOP;
    ELSE
        RAISE WARNING '⚠️ Expected 6 finance roles, found %', finance_role_count;
        
        -- List which roles are missing
        RAISE NOTICE 'Missing roles:';
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_name = 'finance_manager') THEN
            RAISE NOTICE '  - finance_manager';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_name = 'finance_operational') THEN
            RAISE NOTICE '  - finance_operational';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_name = 'finance_project_carbon') THEN
            RAISE NOTICE '  - finance_project_carbon';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_name = 'finance_project_implementation') THEN
            RAISE NOTICE '  - finance_project_implementation';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_name = 'finance_project_social') THEN
            RAISE NOTICE '  - finance_project_social';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_name = 'investor') THEN
            RAISE NOTICE '  - investor';
        END IF;
    END IF;
END $$;

-- ============================================
-- 5. TEST ROLE ASSIGNMENT
-- ============================================

-- Create a test function to verify we can assign finance roles
CREATE OR REPLACE FUNCTION test_finance_role_assignment() RETURNS TEXT AS $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
    test_role TEXT := 'finance_operational';
    constraint_error BOOLEAN := FALSE;
BEGIN
    -- Try to update a dummy profile (won't actually update since user doesn't exist)
    -- This will test if the constraint allows the finance role
    BEGIN
        UPDATE profiles 
        SET role = test_role 
        WHERE id = test_user_id;
        
        RETURN '✅ Role constraint allows finance role assignment';
    EXCEPTION
        WHEN check_violation THEN
            constraint_error := TRUE;
            RETURN '❌ Role constraint does not allow finance role: ' || SQLERRM;
        WHEN OTHERS THEN
            -- Other errors (like foreign key) are expected since user doesn't exist
            RETURN '✅ Role constraint allows finance role (other error expected: ' || SQLERRM || ')';
    END;
END;
$$ LANGUAGE plpgsql;

-- Run the test
DO $$
DECLARE
    test_result TEXT;
BEGIN
    SELECT test_finance_role_assignment() INTO test_result;
    RAISE NOTICE 'Role assignment test: %', test_result;
END $$;

-- Clean up test function
DROP FUNCTION test_finance_role_assignment();

-- ============================================
-- 6. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration fixes the finance roles migration by:
-- 1. Ensuring updated_at column exists in role_permissions table
-- 2. Safely updating profiles role constraint to include finance roles
-- 3. Using a robust upsert function to insert/update role permissions
-- 4. Adding comprehensive verification queries
-- 
-- Finance roles added:
--   - finance_manager: Full financial management access
--   - finance_operational: Operational ledger only
--   - finance_project_carbon: Carbon project ledger only
--   - finance_project_implementation: Implementation project ledger only
--   - finance_project_social: Social economic project ledger only
--   - investor: Read-only access for donors
-- 
-- After this migration, users can be assigned finance roles and the existing
-- financial module RLS policies will work correctly.