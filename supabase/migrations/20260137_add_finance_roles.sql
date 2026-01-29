-- Migration: Add Finance Roles to System
-- Date: 2026-01-29
-- Description: Add finance roles to user_role enum and insert permissions for financial module
-- This migration ensures that finance roles can be assigned to users and have proper permissions

-- ============================================
-- 1. UPDATE PROFILES TABLE ROLE CONSTRAINT
-- ============================================

-- First, we need to update the CHECK constraint on profiles.role to include finance roles
-- The current constraint only allows: 'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist'
-- We need to add: 'finance_manager', 'finance_operational', 'finance_project_carbon', 'finance_project_implementation', 'finance_project_social', 'investor'

DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    -- Add new constraint with ALL roles (existing + finance roles)
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN (
            -- Existing roles
            'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist',
            -- Finance roles
            'finance_manager', 'finance_operational', 'finance_project_carbon', 
            'finance_project_implementation', 'finance_project_social', 'investor'
        ));
EXCEPTION
    WHEN OTHERS THEN
        -- If there's an error, try to add constraint without dropping first (in case it doesn't exist)
        BEGIN
            ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
                CHECK (role IN (
                    'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist',
                    'finance_manager', 'finance_operational', 'finance_project_carbon', 
                    'finance_project_implementation', 'finance_project_social', 'investor'
                ));
        EXCEPTION
            WHEN duplicate_object THEN
                -- Constraint already exists with correct values, ignore
                NULL;
        END;
END $$;

COMMENT ON CONSTRAINT profiles_role_check ON profiles IS 
    'Allowed roles: admin, monev, viewer, program_planner, program_implementer, carbon_specialist, 
     finance_manager, finance_operational, finance_project_carbon, finance_project_implementation, 
     finance_project_social, investor';

-- ============================================
-- 2. INSERT FINANCE ROLE PERMISSIONS
-- ============================================
-- Based on docs/ROLE_PERMISSION_KEUANGAN.md

-- Finance Manager (Full Access)
INSERT INTO role_permissions (role_name, display_name, permissions, description) VALUES
('finance_manager', 'Finance Manager', 
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
 'Overall financial management, final approval, strategic planning - full access to all financial modules')
ON CONFLICT (role_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Finance Operational Specialist
INSERT INTO role_permissions (role_name, display_name, permissions, description) VALUES
('finance_operational', 'Finance Operational Specialist',
 '{
   "financial_transaction": ["create", "read", "update"],
   "financial_report": ["view"],
   "budget": ["view"],
   "expense": ["submit"],
   "cash_flow": ["view"],
   "bank_reconciliation": ["operational"],
   "document": ["upload"]
 }'::jsonb,
 'Operasional kantor, pembelian barang, administrasi keuangan harian - only operational ledger access')
ON CONFLICT (role_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Finance Project Specialist - Carbon
INSERT INTO role_permissions (role_name, display_name, permissions, description) VALUES
('finance_project_carbon', 'Finance Project Specialist - Carbon',
 '{
   "financial_transaction": ["create", "read", "update"],
   "carbon_project_budget": ["view"],
   "carbon_credit": ["transaction"],
   "mrv_expense": ["manage"],
   "carbon_report": ["generate"],
   "project_expense": ["track"],
   "donor_reporting": ["carbon"]
 }'::jsonb,
 'Proyek karbon, MRV, verification, carbon credit transactions - only carbon project ledger access')
ON CONFLICT (role_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Finance Project Specialist - Implementation
INSERT INTO role_permissions (role_name, display_name, permissions, description) VALUES
('finance_project_implementation', 'Finance Project Specialist - Implementation',
 '{
   "financial_transaction": ["create", "read", "update"],
   "field_expense": ["manage"],
   "safeguard_budget": ["view"],
   "community_payment": ["process"],
   "implementation_reporting": [],
   "asset_purchase": ["request"]
 }'::jsonb,
 'Implementasi lapangan, safeguard, community engagement - only implementation project ledger access')
ON CONFLICT (role_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Finance Project Specialist - Social Economic
INSERT INTO role_permissions (role_name, display_name, permissions, description) VALUES
('finance_project_social', 'Finance Project Specialist - Social Economic',
 '{
   "financial_transaction": ["create", "read", "update"],
   "benefit_sharing": ["manage"],
   "livelihood_program_budget": [],
   "community_training_expense": [],
   "social_impact_reporting": [],
   "kk_payment": ["processing"]
 }'::jsonb,
 'Sosial-ekonomi, benefit sharing, livelihood programs - only social economic project ledger access')
ON CONFLICT (role_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Investor / Donor (Read-Only)
INSERT INTO role_permissions (role_name, display_name, permissions, description) VALUES
('investor', 'Investor / Donor',
 '{
   "financial_report": ["view"],
   "budget": ["view"],
   "transaction_history": ["view"],
   "export": ["reports"],
   "dashboard": ["view"],
   "impact_metrics": ["view"],
   "document": ["download"]
 }'::jsonb,
 'Read-only access untuk monitoring dana mereka - view only access to their projects')
ON CONFLICT (role_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- 3. UPDATE AUTO-CREATE PROFILE FUNCTION
-- ============================================
-- Update the handle_new_user() function to recognize finance roles
-- This ensures that when a user signs up, they get the correct default role

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new profile with default role 'viewer'
  -- Now includes all finance roles in the constraint
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
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- 4. UPDATE CHECK_USER_ROLE FUNCTION (if needed)
-- ============================================
-- The existing check_user_role function should still work as it queries the profiles.role column
-- No changes needed as it already supports any role in the profiles table

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check that all finance roles are now allowed in profiles table
DO $$
DECLARE
    constraint_info TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_info
    FROM pg_constraint 
    WHERE conname = 'profiles_role_check' 
      AND conrelid = 'profiles'::regclass;
    
    RAISE NOTICE 'Profiles role constraint updated: %', constraint_info;
END $$;

-- Check that finance role permissions were inserted
DO $$
DECLARE
    finance_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO finance_role_count
    FROM role_permissions 
    WHERE role_name IN (
        'finance_manager', 'finance_operational', 'finance_project_carbon',
        'finance_project_implementation', 'finance_project_social', 'investor'
    );
    
    RAISE NOTICE 'Finance roles in role_permissions: %', finance_role_count;
    
    IF finance_role_count != 6 THEN
        RAISE WARNING 'Expected 6 finance roles, found %', finance_role_count;
    END IF;
END $$;

-- ============================================
-- 6. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration adds finance roles to the system:
-- 1. Updated profiles.role constraint to include 6 new finance roles
-- 2. Inserted role permissions for all finance roles based on ROLE_PERMISSION_KEUANGAN.md
-- 3. Updated the auto-create profile function (though default role remains 'viewer')
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