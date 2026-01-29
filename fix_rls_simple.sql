-- SIMPLE FIX: RLS Policies for Finance Manager
-- Short policy names to avoid PostgreSQL 63-character limit
-- Run this AFTER fixing profiles table RLS

-- ============================================
-- 1. FIRST, FIX PROFILES TABLE RLS (CRITICAL)
-- ============================================

-- Drop existing policies with shorter names
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read for authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- Create simple profile read policy
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (auth.uid() = id);

-- ============================================
-- 2. FIX FINANCIAL TRANSACTIONS (MOST IMPORTANT)
-- ============================================

-- Drop existing policies with any name pattern
DROP POLICY IF EXISTS "Financial tx manageable by admin and carbon" ON financial_transactions;
DROP POLICY IF EXISTS "Financial tx admin carbon finance" ON financial_transactions;
DROP POLICY IF EXISTS "Financial tx creatable by program" ON financial_transactions;

-- Create simple policies
CREATE POLICY "finance_tx_select" ON financial_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'carbon_specialist',
                 'finance_manager', 'finance_operational', 'finance_project_carbon',
                 'finance_project_implementation', 'finance_project_social')
  )
);

CREATE POLICY "finance_tx_insert" ON financial_transactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'carbon_specialist', 'program_implementer',
                 'finance_manager', 'finance_operational', 'finance_project_carbon',
                 'finance_project_implementation', 'finance_project_social')
  )
);

CREATE POLICY "finance_tx_update" ON financial_transactions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'carbon_specialist',
                 'finance_manager', 'finance_operational', 'finance_project_carbon',
                 'finance_project_implementation', 'finance_project_social')
  )
);

-- ============================================
-- 3. FIX FINANCIAL REPORTS
-- ============================================

DROP POLICY IF EXISTS "Financial reports admin carbon monev finance" ON financial_reports;
DROP POLICY IF EXISTS "Financial reports investor read" ON financial_reports;

CREATE POLICY "finance_reports_select" ON financial_reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'carbon_specialist', 'monev_officer',
                 'finance_manager', 'finance_operational', 'finance_project_carbon',
                 'finance_project_implementation', 'finance_project_social', 'investor')
  )
);

-- ============================================
-- 4. FIX BUDGETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Budgets admin planner carbon finance" ON budgets;

CREATE POLICY "budgets_select" ON budgets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'program_planner', 'carbon_specialist',
                 'finance_manager', 'finance_operational', 'finance_project_carbon',
                 'finance_project_implementation', 'finance_project_social')
  )
);

-- ============================================
-- 5. TEST AND VERIFY
-- ============================================

DO $$
BEGIN
  -- Test if finance_manager can access
  RAISE NOTICE 'Testing RLS policies...';
  
  -- Count policies
  RAISE NOTICE 'Current policies:';
  
  FOR policy IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE tablename IN ('profiles', 'financial_transactions', 'financial_reports', 'budgets')
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE '  %: %', policy.tablename, policy.policyname;
  END LOOP;
  
  -- Test finance user access
  RAISE NOTICE '';
  RAISE NOTICE 'To test finance access:';
  RAISE NOTICE '1. Logout and login again';
  RAISE NOTICE '2. Access: /id/dashboard/finance';
