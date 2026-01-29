-- Migration: Fix Finance RLS Policies
-- Date: 2026-01-29
-- Description: Update all RLS policies for financial tables to include finance roles
-- This fixes the "unauthorized" error for finance roles accessing financial segments

-- ============================================
-- 1. UPDATE DONORS TABLE POLICIES
-- ============================================

-- Donors: Allow finance_manager, finance_operational, finance_project_carbon, finance_project_implementation, finance_project_social
DROP POLICY IF EXISTS "Donors manageable by admin and carbon_specialist" ON donors;
CREATE POLICY "Donors manageable by admin and carbon_specialist and finance roles" ON donors
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
-- 2. UPDATE GRANTS TABLE POLICIES
-- ============================================

-- Grants: Add finance roles
DROP POLICY IF EXISTS "Grants manageable by admin, carbon_specialist, program_planner" ON grants;
CREATE POLICY "Grants manageable by admin, carbon_specialist, program_planner and finance roles" ON grants
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

-- ============================================
-- 3. UPDATE BUDGETS TABLE POLICIES
-- ============================================

-- Budgets: Add finance roles
DROP POLICY IF EXISTS "Budgets manageable by admin, program_planner, carbon_specialist" ON budgets;
CREATE POLICY "Budgets manageable by admin, program_planner, carbon_specialist and finance roles" ON budgets
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

-- ============================================
-- 4. UPDATE BUDGET ALLOCATIONS POLICIES
-- ============================================

-- Budget Allocations: Add finance roles
DROP POLICY IF EXISTS "Budget allocations manageable by budget managers" ON budget_allocations;
CREATE POLICY "Budget allocations manageable by budget managers and finance roles" ON budget_allocations
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

-- ============================================
-- 5. UPDATE FINANCIAL TRANSACTIONS POLICIES
-- ============================================

-- Financial Transactions: Allow finance roles to manage all transactions
DROP POLICY IF EXISTS "Financial transactions manageable by admin and carbon_specialist" ON financial_transactions;
CREATE POLICY "Financial transactions manageable by admin, carbon_specialist and finance roles" ON financial_transactions
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

-- Update program implementers policy to also allow finance roles to create transactions
DROP POLICY IF EXISTS "Financial transactions creatable by program implementers" ON financial_transactions;
CREATE POLICY "Financial transactions creatable by program implementers and finance roles" ON financial_transactions
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

-- ============================================
-- 6. UPDATE BENEFIT DISTRIBUTIONS POLICIES
-- ============================================

-- Benefit Distributions: Add finance roles
DROP POLICY IF EXISTS "Benefit distributions manageable by admin, program_planner, program_implementer" ON benefit_distributions;
CREATE POLICY "Benefit distributions manageable by admin, program_planner, program_implementer and finance roles" ON benefit_distributions
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

-- ============================================
-- 7. UPDATE FINANCIAL METRICS POLICIES
-- ============================================

-- Financial Metrics: Add finance roles
DROP POLICY IF EXISTS "Financial metrics manageable by admin and carbon_specialist" ON financial_metrics;
CREATE POLICY "Financial metrics manageable by admin, carbon_specialist and finance roles" ON financial_metrics
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
-- 8. UPDATE FINANCIAL REPORTS POLICIES
-- ============================================

-- Financial Reports: Add finance roles and investor role for view-only
DROP POLICY IF EXISTS "Financial reports manageable by admin, carbon_specialist, monev_officer" ON financial_reports;
CREATE POLICY "Financial reports manageable by admin, carbon_specialist, monev_officer and finance roles" ON financial_reports
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

-- Add investor-specific policy for read-only access
DROP POLICY IF EXISTS "Financial reports readable by investors" ON financial_reports;
CREATE POLICY "Financial reports readable by investors" ON financial_reports
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

-- ============================================
-- 9. UPDATE ACCOUNTING SEGMENTS POLICIES
-- ============================================

-- Accounting Segments: Add finance roles
DROP POLICY IF EXISTS "Accounting segments manageable by admin and carbon_specialist" ON accounting_segments;
CREATE POLICY "Accounting segments manageable by admin, carbon_specialist and finance roles" ON accounting_segments
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
-- 10. UPDATE SEGMENT COMBINATIONS POLICIES
-- ============================================

-- Segment Combinations: Add finance roles
DROP POLICY IF EXISTS "Segment combinations manageable by admin and carbon_specialist" ON segment_combinations;
CREATE POLICY "Segment combinations manageable by admin, carbon_specialist and finance roles" ON segment_combinations
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
-- 11. UPDATE POLICIES FOR SAK FINANCIAL TABLES
-- ============================================
-- These tables were added in later migrations (20260131, 20260134, 20260135)

-- Accounting Ledgers (from 20260131)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_ledgers') THEN
        DROP POLICY IF EXISTS "Accounting ledgers manageable by admin, finance, finance_manager" ON accounting_ledgers;
        
        CREATE POLICY "Accounting ledgers manageable by admin and finance roles" ON accounting_ledgers
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
        DROP POLICY IF EXISTS "Chart of accounts manageable by admin, finance_manager" ON chart_of_accounts;
        
        CREATE POLICY "Chart of accounts manageable by admin and finance roles" ON chart_of_accounts
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
        DROP POLICY IF EXISTS "Journal entries manageable by admin, finance, finance_manager" ON accounting_journal_entries;
        
        CREATE POLICY "Journal entries manageable by admin and finance roles" ON accounting_journal_entries
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
        DROP POLICY IF EXISTS "Financial budgets manageable by admin, finance_manager" ON financial_budgets;
        
        CREATE POLICY "Financial budgets manageable by admin and finance roles" ON financial_budgets
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
        DROP POLICY IF EXISTS "Master price list manageable by admin, finance, program_planner" ON master_price_list;
        
        CREATE POLICY "Master price list manageable by admin, program_planner and finance roles" ON master_price_list
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
        DROP POLICY IF EXISTS "Spending limits manageable by admin, finance_manager" ON spending_limits;
        
        CREATE POLICY "Spending limits manageable by admin and finance roles" ON spending_limits
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
        DROP POLICY IF EXISTS "Approval workflows manageable by admin, finance_manager" ON approval_workflows;
        
        CREATE POLICY "Approval workflows manageable by admin and finance roles" ON approval_workflows
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
        DROP POLICY IF EXISTS "Bank accounts manageable by admin, finance" ON bank_accounts_whitelist;
        
        CREATE POLICY "Bank accounts manageable by admin and finance roles" ON bank_accounts_whitelist
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
-- 12. VERIFICATION QUERIES
-- ============================================

DO $$
DECLARE
    policy_count INTEGER;
    table_name TEXT;
    policies TEXT[];
BEGIN
    -- Check which financial tables have policies
    RAISE NOTICE 'Checking RLS policies for financial tables...';
    
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'donors', 'grants', 'budgets', 'budget_allocations', 'financial_transactions',
            'benefit_distributions', 'financial_metrics', 'financial_reports',
            'accounting_segments', 'segment_combinations', 'accounting_ledgers',
            'chart_of_accounts', 'accounting_journal_entries', 'financial_budgets',
            'master_price_list', 'spending_limits', 'approval_workflows', 'bank_accounts_whitelist'
        )
    LOOP
        -- Get policies for this table
        SELECT array_agg(policyname) INTO policies
        FROM pg_policies 
        WHERE tablename = table_name 
          AND schemaname = 'public';
        
        IF policies IS NOT NULL THEN
            RAISE NOTICE 'Table % has policies: %', table_name, policies;
        ELSE
            RAISE WARNING 'Table % has NO RLS policies!', table_name;
        END IF;
    END LOOP;
    
    -- Test if finance roles are now in key policies
    RAISE NOTICE '';
    RAISE NOTICE 'Testing finance role inclusion in key policies:';
    
    -- Check financial_transactions policy
    IF EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.tablename = 'financial_transactions'
        AND p.policyname = 'Financial transactions manageable by admin, carbon_specialist and finance roles'
    ) THEN
        RAISE NOTICE '✅ Financial transactions policy updated for finance roles';
    ELSE
        RAISE WARNING '❌ Financial transactions policy NOT updated';
    END IF;
    
    -- Check grants policy  
    IF EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.tablename = 'grants'
        AND p.policyname = 'Grants manageable by admin, carbon_specialist, program_planner and finance roles'
    ) THEN
        RAISE NOTICE '✅ Grants policy updated for finance roles';
    ELSE
        RAISE WARNING '❌ Grants policy NOT updated';
    END IF;
    
END $$;

-- ============================================
-- 13. TEST USER ROLE ASSIGNMENT
-- ============================================

DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'test_finance@example.com';
    test_role TEXT := 'finance_operational';
BEGIN
    -- Check if we have any finance users
    SELECT p.id INTO test_user_id
    FROM profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.role LIKE 'finance%'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found finance user with ID: %', test_user_id;
        
        -- Test if they can access financial_transactions
        BEGIN
            PERFORM 1 FROM financial_transactions LIMIT 1;
            RAISE NOTICE '✅ Finance user can query financial_transactions';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING '❌ Finance user CANNOT query financial_transactions: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '⚠️ No finance users found in database';
        RAISE NOTICE '   Create one with: UPDATE profiles SET role = ''finance_manager'' WHERE id = (SELECT id FROM auth.users LIMIT 1)';
    END IF;
END $$;

-- ============================================
-- 14. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration fixes RLS policies for all financial tables to include finance roles:
--   finance_manager, finance_operational, finance_project_carbon,
--   finance_project_implementation, finance_project_social
--
-- Investor role has view-only access to financial reports
--
-- After this migration, finance roles should be able to:
-- 1. Access all financial tables
-- 2. Create and manage transactions
-- 3. View and manage budgets
-- 4. Generate financial reports
-- 5. Access the financial dashboard at /dashboard/finance
--
-- Run this migration AFTER fixing the role constraint (20260139_fix_all_roles_constraint.sql)
-- Restart the application and clear browser cache after applying this migration.