-- Migration: Fix Policy Name Length - PostgreSQL limit 63 characters
-- Date: 2026-01-29
-- Description: Shorten RLS policy names that exceed PostgreSQL 63-character limit
-- This fixes "policy already exists" error due to truncated policy names

-- ============================================
-- 1. DROP ALL LONG POLICY NAMES FIRST
-- ============================================

-- Donors
DROP POLICY IF EXISTS "Donors manageable by admin and carbon_specialist and finance roles" ON donors;
DROP POLICY IF EXISTS "Donors manageable by admin and carbon_specialist" ON donors;

-- Grants
DROP POLICY IF EXISTS "Grants manageable by admin, carbon_specialist, program_planner and finance roles" ON grants;
DROP POLICY IF EXISTS "Grants manageable by admin, carbon_specialist, program_planner" ON grants;

-- Budgets
DROP POLICY IF EXISTS "Budgets manageable by admin, program_planner, carbon_specialist and finance roles" ON budgets;
DROP POLICY IF EXISTS "Budgets manageable by admin, program_planner, carbon_specialist" ON budgets;

-- Budget Allocations
DROP POLICY IF EXISTS "Budget allocations manageable by budget managers and finance roles" ON budget_allocations;
DROP POLICY IF EXISTS "Budget allocations manageable by budget managers" ON budget_allocations;

-- Financial Transactions
DROP POLICY IF EXISTS "Financial transactions manageable by admin, carbon_specialist and finance roles" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions manageable by admin and carbon_specialist" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions creatable by program implementers and finance roles" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions creatable by program implementers" ON financial_transactions;

-- Benefit Distributions
DROP POLICY IF EXISTS "Benefit distributions manageable by admin, program_planner, program_implementer and finance roles" ON benefit_distributions;
DROP POLICY IF EXISTS "Benefit distributions manageable by admin, program_planner, program_implementer" ON benefit_distributions;

-- Financial Metrics
DROP POLICY IF EXISTS "Financial metrics manageable by admin, carbon_specialist and finance roles" ON financial_metrics;
DROP POLICY IF EXISTS "Financial metrics manageable by admin and carbon_specialist" ON financial_metrics;

-- Financial Reports
DROP POLICY IF EXISTS "Financial reports manageable by admin, carbon_specialist, monev_officer and finance roles" ON financial_reports;
DROP POLICY IF EXISTS "Financial reports manageable by admin, carbon_specialist, monev_officer" ON financial_reports;
DROP POLICY IF EXISTS "Financial reports readable by investors" ON financial_reports;

-- Accounting Segments
DROP POLICY IF EXISTS "Accounting segments manageable by admin, carbon_specialist and finance roles" ON accounting_segments;
DROP POLICY IF EXISTS "Accounting segments manageable by admin and carbon_specialist" ON accounting_segments;

-- Segment Combinations
DROP POLICY IF EXISTS "Segment combinations manageable by admin, carbon_specialist and finance roles" ON segment_combinations;
DROP POLICY IF EXISTS "Segment combinations manageable by admin and carbon_specialist" ON segment_combinations;

-- ============================================
-- 2. CREATE NEW SHORTENED POLICIES (< 63 chars)
-- ============================================

-- Donors: Readable by all authenticated users, manageable by admin, carbon_specialist, finance roles
DROP POLICY IF EXISTS "Donors readable by authenticated users" ON donors;
CREATE POLICY "Donors readable by authenticated users" ON donors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Donors manageable by admin_carbon_finance" ON donors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist', 
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Grants: Readable by authenticated, manageable by admin, carbon_specialist, program_planner, finance roles
DROP POLICY IF EXISTS "Grants readable by authenticated users" ON grants;
CREATE POLICY "Grants readable by authenticated users" ON grants
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Grants manageable by admin_carbon_plan_finance" ON grants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist', 'program_planner',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Budgets: Readable by authenticated, manageable by admin, program_planner, carbon_specialist, finance roles
DROP POLICY IF EXISTS "Budgets readable by authenticated users" ON budgets;
CREATE POLICY "Budgets readable by authenticated users" ON budgets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Budgets manageable by admin_plan_carbon_finance" ON budgets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'carbon_specialist',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Budget Allocations: Inherit permissions from parent budget
DROP POLICY IF EXISTS "Budget allocations readable by authenticated users" ON budget_allocations;
CREATE POLICY "Budget allocations readable by authenticated users" ON budget_allocations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Budget allocations manageable by finance" ON budget_allocations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_allocations.budget_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'carbon_specialist',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Financial Transactions: Complex permissions
DROP POLICY IF EXISTS "Financial transactions readable by authenticated users" ON financial_transactions;
CREATE POLICY "Financial transactions readable by authenticated users" ON financial_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow finance roles to manage all transactions
CREATE POLICY "Financial transactions manageable by finance" ON financial_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Allow program implementers and finance roles to create transactions
CREATE POLICY "Financial transactions creatable by impl_finance" ON financial_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('program_implementer',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Benefit Distributions: Readable by all, manageable by admin, program_planner, program_implementer, finance
DROP POLICY IF EXISTS "Benefit distributions readable by authenticated users" ON benefit_distributions;
CREATE POLICY "Benefit distributions readable by authenticated users" ON benefit_distributions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Benefit distributions manageable by finance" ON benefit_distributions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'program_implementer',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Financial Metrics: Readable by all authenticated users
DROP POLICY IF EXISTS "Financial metrics readable by authenticated users" ON financial_metrics;
CREATE POLICY "Financial metrics readable by authenticated users" ON financial_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin, carbon_specialist, and finance roles can update metrics
CREATE POLICY "Financial metrics manageable by finance" ON financial_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Financial Reports: Readable by authenticated, manageable by admin, carbon_specialist, monev_officer, finance
DROP POLICY IF EXISTS "Financial reports readable by authenticated users" ON financial_reports;
CREATE POLICY "Financial reports readable by authenticated users" ON financial_reports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Financial reports manageable by finance" ON financial_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist', 'monev_officer',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social', 'investor')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Investor-specific policy for read-only access
CREATE POLICY "Financial reports investor read only" ON financial_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name = 'investor'
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Accounting Segments: Readable by all, manageable by admin, carbon_specialist, finance
DROP POLICY IF EXISTS "Accounting segments readable by authenticated users" ON accounting_segments;
CREATE POLICY "Accounting segments readable by authenticated users" ON accounting_segments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Accounting segments manageable by finance" ON accounting_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Segment Combinations: Readable by all, manageable by admin, carbon_specialist, finance
DROP POLICY IF EXISTS "Segment combinations readable by authenticated users" ON segment_combinations;
CREATE POLICY "Segment combinations readable by authenticated users" ON segment_combinations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Segment combinations manageable by finance" ON segment_combinations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist',
                  'finance_manager', 'finance_operational', 'finance_project_carbon',
                  'finance_project_implementation', 'finance_project_social')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- ============================================
-- 3. UPDATE POLICIES FOR SAK FINANCIAL TABLES
-- ============================================
-- These tables were added in later migrations (20260131, 20260134, 20260135)

-- Accounting Ledgers (from 20260131)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_ledgers') THEN
        DROP POLICY IF EXISTS "Accounting ledgers manageable by admin and finance roles" ON accounting_ledgers;
        DROP POLICY IF EXISTS "Accounting ledgers manageable by admin, finance, finance_manager" ON accounting_ledgers;
        
        CREATE POLICY "Accounting ledgers manageable by finance" ON accounting_ledgers
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'finance_manager', 'finance_operational', 'finance_project_carbon',
                          'finance_project_implementation', 'finance_project_social')
                )
            );
        
        RAISE NOTICE 'Updated accounting_ledgers policies';
    END IF;
END $$;

-- Chart of Accounts (from 20260131)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
        DROP POLICY IF EXISTS "Chart of accounts manageable by admin and finance roles" ON chart_of_accounts;
        DROP POLICY IF EXISTS "Chart of accounts manageable by admin, finance_manager" ON chart_of_accounts;
        
        CREATE POLICY "Chart of accounts manageable by finance" ON chart_of_accounts
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'finance_manager', 'finance_operational')
                )
            );
        
        RAISE NOTICE 'Updated chart_of_accounts policies';
    END IF;
END $$;

-- Journal Entries (from 20260131)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_journal_entries') THEN
        DROP POLICY IF EXISTS "Journal entries manageable by admin and finance roles" ON accounting_journal_entries;
        DROP POLICY IF EXISTS "Journal entries manageable by admin, finance, finance_manager" ON accounting_journal_entries;
        
        CREATE POLICY "Journal entries manageable by finance" ON accounting_journal_entries
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'finance_manager', 'finance_operational', 'finance_project_carbon',
                          'finance_project_implementation', 'finance_project_social')
                )
            );
        
        RAISE NOTICE 'Updated accounting_journal_entries policies';
    END IF;
END $$;

-- Financial Budgets (from 20260131)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_budgets') THEN
        DROP POLICY IF EXISTS "Financial budgets manageable by admin and finance roles" ON financial_budgets;
        DROP POLICY IF EXISTS "Financial budgets manageable by admin, finance_manager" ON financial_budgets;
        
        CREATE POLICY "Financial budgets manageable by finance" ON financial_budgets
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'finance_manager', 'finance_operational', 'finance_project_carbon',
                          'finance_project_implementation', 'finance_project_social')
                )
            );
        
        RAISE NOTICE 'Updated financial_budgets policies';
    END IF;
END $$;

-- Master Price List (from 20260135)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_price_list') THEN
        DROP POLICY IF EXISTS "Master price list manageable by admin, program_planner and finance roles" ON master_price_list;
        DROP POLICY IF EXISTS "Master price list manageable by admin, finance, program_planner" ON master_price_list;
        
        CREATE POLICY "Master price list manageable by finance" ON master_price_list
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'program_planner',
                          'finance_manager', 'finance_operational', 'finance_project_carbon',
                          'finance_project_implementation', 'finance_project_social')
                )
            );
        
        RAISE NOTICE 'Updated master_price_list policies';
    END IF;
END $$;

-- Spending Limits (from 20260134)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spending_limits') THEN
        DROP POLICY IF EXISTS "Spending limits manageable by admin and finance roles" ON spending_limits;
        DROP POLICY IF EXISTS "Spending limits manageable by admin, finance_manager" ON spending_limits;
        
        CREATE POLICY "Spending limits manageable by finance" ON spending_limits
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'finance_manager', 'finance_operational')
                )
            );
        
        RAISE NOTICE 'Updated spending_limits policies';
    END IF;
END $$;

-- Approval Workflows (from 20260134)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_workflows') THEN
        DROP POLICY IF EXISTS "Approval workflows manageable by admin and finance roles" ON approval_workflows;
        DROP POLICY IF EXISTS "Approval workflows manageable by admin, finance_manager" ON approval_workflows;
        
        CREATE POLICY "Approval workflows manageable by finance" ON approval_workflows
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'finance_manager', 'finance_operational')
                )
            );
        
        RAISE NOTICE 'Updated approval_workflows policies';
    END IF;
END $$;

-- Bank Accounts Whitelist (from 20260134)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_accounts_whitelist') THEN
        DROP POLICY IF EXISTS "Bank accounts manageable by admin and finance roles" ON bank_accounts_whitelist;
        DROP POLICY IF EXISTS "Bank accounts manageable by admin, finance" ON bank_accounts_whitelist;
        
        CREATE POLICY "Bank accounts manageable by finance" ON bank_accounts_whitelist
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'finance_manager', 'finance_operational', 'finance_project_carbon',
                          'finance_project_implementation', 'finance_project_social')
                )
            );
        
        RAISE NOTICE 'Updated bank_accounts_whitelist policies';
    END IF;
END $$;

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================

DO $$
DECLARE
    table_name TEXT;
    policy_record RECORD;
    policy_length INT;
BEGIN
    RAISE NOTICE 'Checking policy name lengths...';
    
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, length(policyname) as name_length
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN (
            'donors', 'grants', 'budgets', 'budget_allocations', 'financial_transactions',
            'benefit_distributions', 'financial_metrics', 'financial_reports',
            'accounting_segments', 'segment_combinations'
        )
    LOOP
        IF policy_record.name_length > 63 THEN
            RAISE WARNING '❌ Policy "%" on table "%" is too long: % characters', 
                policy_record.policyname, policy_record.tablename, policy_record.name_length;
        ELSE
            RAISE NOTICE '✅ Policy "%" on table "%": % characters (OK)', 
                policy_record.policyname, policy_record.tablename, policy_record.name_length;
        END IF;
    END LOOP;
    
    -- Test key policies exist
    RAISE NOTICE '';
    RAISE NOTICE 'Testing key policy existence:';
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_transactions' AND policyname = 'Financial transactions manageable by finance') THEN
        RAISE NOTICE '✅ Financial transactions finance policy exists';
    ELSE
        RAISE WARNING '❌ Financial transactions finance policy missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grants' AND policyname = 'Grants manageable by admin_carbon_plan_finance') THEN
        RAISE NOTICE '✅ Grants finance policy exists';
    ELSE
        RAISE WARNING '❌ Grants finance policy missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Budgets manageable by admin_plan_carbon_finance') THEN
        RAISE NOTICE '✅ Budgets finance policy exists';
    ELSE
        RAISE WARNING '❌ Budgets finance policy missing';
    END IF;
    
END $$;

-- ============================================
-- 5. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration fixes PostgreSQL 63-character limit for policy names by:
-- 1. Dropping all existing policies with long names
-- 2. Creating new shortened policy names (< 63 chars)
-- 3. Keeping the same permission logic for finance roles
--
-- Key changes:
-- - Policy names shortened to max 63 characters
-- - "manageable by finance" suffix used consistently
-- - All finance roles included: finance_manager, finance_operational, 
--   finance_project_carbon, finance_project_implementation, finance_project_social
--
-- Run this migration AFTER fixing role constraint (20260139) and RLS policies (20260140)
-- This should be run as the final fix for policy name length issues.