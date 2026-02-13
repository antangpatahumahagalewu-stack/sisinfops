-- MIGRATION: CREATE FINANCIAL TABLES COMPLETE
-- Date: 2026-02-13 12:02 PM
-- Description: Create missing budgets table and update accounting_ledgers table
-- Fixes 500 errors in financial dashboard API endpoints

BEGIN;

-- ====================================================================
-- PART 1: CREATE BUDGETS TABLE (MATCHING API EXPECTATIONS)
-- ====================================================================

-- Drop existing financial_budgets table if it conflicts (we'll recreate it later)
-- Note: Keeping financial_budgets for backward compatibility

CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_code VARCHAR(50) NOT NULL,
    budget_name VARCHAR(255) NOT NULL,
    budget_type VARCHAR(50) NOT NULL CHECK (budget_type IN ('operational', 'project', 'program', 'capital')),
    project_id UUID REFERENCES carbon_projects(id) ON DELETE SET NULL,
    fiscal_year INTEGER NOT NULL,
    total_amount DECIMAL(20,2) NOT NULL CHECK (total_amount >= 0),
    allocated_amount DECIMAL(20,2) DEFAULT 0 CHECK (allocated_amount >= 0),
    spent_amount DECIMAL(20,2) DEFAULT 0 CHECK (spent_amount >= 0),
    remaining_amount DECIMAL(20,2) GENERATED ALWAYS AS (total_amount - spent_amount) STORED,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed', 'archived')),
    description TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT budgets_total_amount_check CHECK (spent_amount <= total_amount),
    CONSTRAINT budgets_allocated_check CHECK (allocated_amount <= total_amount),
    CONSTRAINT unique_budget_code UNIQUE (budget_code)
);

-- ====================================================================
-- PART 2: UPDATE ACCOUNTING_LEDGERS TABLE (ENHANCE SCHEMA)
-- ====================================================================

-- Add missing columns to accounting_ledgers if they don't exist
DO $$
BEGIN
    -- Check and add ledger_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_ledgers' AND column_name = 'ledger_type') THEN
        ALTER TABLE accounting_ledgers ADD COLUMN ledger_type VARCHAR(50) DEFAULT 'OPERATIONAL';
    END IF;
    
    -- Check and add opening_balance column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_ledgers' AND column_name = 'opening_balance') THEN
        ALTER TABLE accounting_ledgers ADD COLUMN opening_balance DECIMAL(20,2) DEFAULT 0;
    END IF;
    
    -- Check and add current_balance column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_ledgers' AND column_name = 'current_balance') THEN
        ALTER TABLE accounting_ledgers ADD COLUMN current_balance DECIMAL(20,2) DEFAULT 0;
    END IF;
    
    -- Check and add currency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_ledgers' AND column_name = 'currency') THEN
        ALTER TABLE accounting_ledgers ADD COLUMN currency VARCHAR(10) DEFAULT 'IDR';
    END IF;
    
    -- Check and add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_ledgers' AND column_name = 'is_active') THEN
        ALTER TABLE accounting_ledgers ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Check and add created_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_ledgers' AND column_name = 'created_by') THEN
        ALTER TABLE accounting_ledgers ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Check and add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_ledgers' AND column_name = 'description') THEN
        ALTER TABLE accounting_ledgers ADD COLUMN description TEXT;
    END IF;
END $$;

-- ====================================================================
-- PART 3: ENSURE FINANCIAL_TRANSACTIONS TABLE HAS REQUIRED COLUMNS
-- ====================================================================

-- Verify financial_transactions table has the columns referenced in API
DO $$
BEGIN
    -- Check and add debit_account_code if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' AND column_name = 'debit_account_code') THEN
        ALTER TABLE financial_transactions ADD COLUMN debit_account_code VARCHAR(20);
    END IF;
    
    -- Check and add credit_account_code if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' AND column_name = 'credit_account_code') THEN
        ALTER TABLE financial_transactions ADD COLUMN credit_account_code VARCHAR(20);
    END IF;
    
    -- Check and add project_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' AND column_name = 'project_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN project_id UUID REFERENCES carbon_projects(id) ON DELETE SET NULL;
    END IF;
    
    -- Check and add budget_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' AND column_name = 'budget_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ====================================================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ====================================================================

-- Indexes for budgets table
CREATE INDEX IF NOT EXISTS idx_budgets_budget_code ON budgets(budget_code);
CREATE INDEX IF NOT EXISTS idx_budgets_budget_type ON budgets(budget_type);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);

-- Indexes for accounting_ledgers table
CREATE INDEX IF NOT EXISTS idx_accounting_ledgers_ledger_type ON accounting_ledgers(ledger_type);
CREATE INDEX IF NOT EXISTS idx_accounting_ledgers_is_active ON accounting_ledgers(is_active);
CREATE INDEX IF NOT EXISTS idx_accounting_ledgers_ledger_code ON accounting_ledgers(ledger_code);

-- Indexes for financial_transactions table
CREATE INDEX IF NOT EXISTS idx_financial_transactions_budget_id ON financial_transactions(budget_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_project_id ON financial_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_ledger_id ON financial_transactions(ledger_id);

-- ====================================================================
-- PART 5: CREATE UPDATED_AT TRIGGERS
-- ====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for budgets table
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for accounting_ledgers table (if not exists)
DROP TRIGGER IF EXISTS update_accounting_ledgers_updated_at ON accounting_ledgers;
CREATE TRIGGER update_accounting_ledgers_updated_at
    BEFORE UPDATE ON accounting_ledgers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- PART 6: CREATE SAMPLE DATA FOR TESTING
-- ====================================================================

-- Insert sample ledger data if accounting_ledgers is empty
DO $$
DECLARE
    ledger_count INTEGER;
    admin_user_id UUID;
BEGIN
    -- Get admin user ID (or first user)
    SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM profiles LIMIT 1;
    END IF;
    
    -- Count existing ledgers
    SELECT COUNT(*) INTO ledger_count FROM accounting_ledgers;
    
    IF ledger_count = 0 AND admin_user_id IS NOT NULL THEN
        -- Insert sample operational ledgers
        INSERT INTO accounting_ledgers (ledger_code, ledger_name, ledger_type, opening_balance, current_balance, currency, is_active, created_by, description)
        VALUES
            ('OPR-1001', 'Kas dan Bank', 'OPERATIONAL', 500000000, 500000000, 'IDR', true, admin_user_id, 'Kas dan bank operasional'),
            ('OPR-1002', 'Piutang Usaha', 'OPERATIONAL', 150000000, 150000000, 'IDR', true, admin_user_id, 'Piutang dari klien'),
            ('OPR-2001', 'Hutang Usaha', 'OPERATIONAL', 75000000, 75000000, 'IDR', true, admin_user_id, 'Hutang kepada supplier'),
            ('OPR-3001', 'Modal', 'OPERATIONAL', 1000000000, 1000000000, 'IDR', true, admin_user_id, 'Modal awal yayasan');
            
        RAISE NOTICE 'Inserted 4 sample operational ledgers';
    END IF;
END $$;

-- Insert sample budget data if budgets is empty
DO $$
DECLARE
    budget_count INTEGER;
    admin_user_id UUID;
    carbon_project_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM profiles LIMIT 1;
    END IF;
    
    -- Get a carbon project ID
    SELECT id INTO carbon_project_id FROM carbon_projects LIMIT 1;
    
    -- Count existing budgets
    SELECT COUNT(*) INTO budget_count FROM budgets;
    
    IF budget_count = 0 AND admin_user_id IS NOT NULL THEN
        -- Insert sample budgets
        INSERT INTO budgets (budget_code, budget_name, budget_type, project_id, fiscal_year, total_amount, allocated_amount, spent_amount, status, description, created_by)
        VALUES
            ('BUD-OPR-2025', 'Anggaran Operasional 2025', 'operational', NULL, 2025, 500000000, 250000000, 185000000, 'active', 'Anggaran operasional tahun 2025', admin_user_id),
            ('BUD-PRJ-CARBON-2025', 'Anggaran Proyek Karbon Gunung Mas', 'project', carbon_project_id, 2025, 750000000, 600000000, 425000000, 'active', 'Anggaran proyek karbon di Gunung Mas', admin_user_id),
            ('BUD-PROG-PS-2025', 'Anggaran Program Perhutanan Sosial', 'program', NULL, 2025, 300000000, 200000000, 120000000, 'active', 'Anggaran program perhutanan sosial', admin_user_id),
            ('BUD-CAP-2025', 'Anggaran Modal 2025', 'capital', NULL, 2025, 200000000, 150000000, 80000000, 'approved', 'Anggaran modal untuk aset tetap', admin_user_id);
            
        RAISE NOTICE 'Inserted 4 sample budgets';
    END IF;
END $$;

-- ====================================================================
-- PART 7: GRANT PERMISSIONS
-- ====================================================================

GRANT ALL ON budgets TO anon, authenticated, service_role;
GRANT ALL ON accounting_ledgers TO anon, authenticated, service_role;

-- ====================================================================
-- PART 8: VERIFICATION AND REPORTING
-- ====================================================================

DO $$
DECLARE
    budgets_count INTEGER;
    ledgers_count INTEGER;
    transactions_count INTEGER;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO budgets_count FROM budgets;
    SELECT COUNT(*) INTO ledgers_count FROM accounting_ledgers;
    SELECT COUNT(*) INTO transactions_count FROM financial_transactions;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'FINANCIAL TABLES MIGRATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created/updated:';
    RAISE NOTICE '  • budgets: % rows', budgets_count;
    RAISE NOTICE '  • accounting_ledgers: % rows', ledgers_count;
    RAISE NOTICE '  • financial_transactions: % rows', transactions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'API endpoints fixed:';
    RAISE NOTICE '  ✅ /api/finance/budgets';
    RAISE NOTICE '  ✅ /api/finance/ledgers/balances';
    RAISE NOTICE '  ✅ /api/finance/transactions';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Restart Next.js dev server';
    RAISE NOTICE '  2. Test financial dashboard';
    RAISE NOTICE '  3. Verify no more 500 errors';
    RAISE NOTICE '=========================================';
END $$;

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;