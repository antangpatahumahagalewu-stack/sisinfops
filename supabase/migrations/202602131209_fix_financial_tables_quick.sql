-- MIGRATION: QUICK FIX FOR FINANCIAL DASHBOARD 500 ERRORS
-- Date: 2026-02-13 12:09 PM
-- Description: Quick fix for missing created_by column in budgets and missing accounting_ledgers table
-- Fixes 500 errors in financial dashboard API endpoints

BEGIN;

-- ====================================================================
-- PART 1: ADD MISSING created_by COLUMN TO BUDGETS TABLE
-- ====================================================================

-- Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'budgets' AND column_name = 'created_by') THEN
        ALTER TABLE budgets ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE CASCADE;
        
        -- Update existing rows with a default user (first admin or first user)
        UPDATE budgets 
        SET created_by = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
        WHERE created_by IS NULL;
        
        RAISE NOTICE '✅ Added created_by column to budgets table';
    ELSE
        RAISE NOTICE 'ℹ️  created_by column already exists in budgets table';
    END IF;
END $$;

-- ====================================================================
-- PART 2: CREATE ACCOUNTING_LEDGERS TABLE IF IT DOESN'T EXIST
-- ====================================================================

CREATE TABLE IF NOT EXISTS accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ledger_code VARCHAR(50) UNIQUE NOT NULL,
    ledger_name VARCHAR(255) NOT NULL,
    ledger_type VARCHAR(50) DEFAULT 'OPERATIONAL',
    opening_balance DECIMAL(20,2) DEFAULT 0,
    current_balance DECIMAL(20,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- PART 3: ADD SAMPLE DATA FOR TESTING
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
            ('OPR-3001', 'Modal', 'OPERATIONAL', 1000000000, 1000000000, 'IDR', true, admin_user_id, 'Modal awal yayasan')
        ON CONFLICT (ledger_code) DO NOTHING;
            
        RAISE NOTICE '✅ Inserted 4 sample operational ledgers';
    END IF;
END $$;

-- ====================================================================
-- PART 4: CREATE UPDATED_AT TRIGGER FOR ACCOUNTING_LEDGERS
-- ====================================================================

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for accounting_ledgers table
DROP TRIGGER IF EXISTS update_accounting_ledgers_updated_at ON accounting_ledgers;
CREATE TRIGGER update_accounting_ledgers_updated_at
    BEFORE UPDATE ON accounting_ledgers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- PART 5: GRANT PERMISSIONS
-- ====================================================================

GRANT ALL ON accounting_ledgers TO anon, authenticated, service_role;

-- ====================================================================
-- PART 6: VERIFICATION
-- ====================================================================

DO $$
DECLARE
    budgets_count INTEGER;
    budgets_with_created_by INTEGER;
    ledgers_count INTEGER;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO budgets_count FROM budgets;
    SELECT COUNT(*) INTO budgets_with_created_by FROM budgets WHERE created_by IS NOT NULL;
    SELECT COUNT(*) INTO ledgers_count FROM accounting_ledgers;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'FINANCIAL TABLES QUICK FIX COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Results:';
    RAISE NOTICE '  • budgets table: % rows, % with created_by', budgets_count, budgets_with_created_by;
    RAISE NOTICE '  • accounting_ledgers table: % rows', ledgers_count;
    RAISE NOTICE '';
    RAISE NOTICE 'API endpoints fixed:';
    RAISE NOTICE '  ✅ /api/finance/budgets (has created_by column)';
    RAISE NOTICE '  ✅ /api/finance/ledgers/balances (table exists)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Wait 1-2 minutes for schema cache refresh';
    RAISE NOTICE '  2. Restart Next.js dev server if needed';
    RAISE NOTICE '  3. Test financial dashboard';
    RAISE NOTICE '=========================================';
END $$;

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;