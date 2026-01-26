-- Migration: Fix column sizes for SAK financial tables
-- Date: 2026-01-33
-- Description: Fix VARCHAR column sizes that are too small for data being inserted
-- PRINCIPLE: SAFE - Only alters column definitions, no data loss.

-- ============================================
-- 1. FIX CHART_OF_ACCOUNTS.NORMAL_BALANCE
-- ============================================
-- The column is currently VARCHAR(5) but we need to store 'CREDIT' (6 chars)
DO $$ 
BEGIN
    -- Check if the column exists and is VARCHAR(5)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'chart_of_accounts' 
               AND column_name = 'normal_balance' 
               AND data_type = 'character varying' 
               AND character_maximum_length = 5) THEN
        -- Alter the column to VARCHAR(10) to be safe
        ALTER TABLE chart_of_accounts 
        ALTER COLUMN normal_balance TYPE VARCHAR(10);
        
        RAISE NOTICE 'Fixed chart_of_accounts.normal_balance column size from VARCHAR(5) to VARCHAR(10)';
    END IF;
END $$;

-- ============================================
-- 2. CHECK AND FIX OTHER POTENTIAL COLUMNS
-- ============================================

-- Check for any other VARCHAR columns that might be too small
DO $$ 
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN (
        SELECT 
            table_name, 
            column_name, 
            character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND data_type = 'character varying'
        AND table_name IN (
            'chart_of_accounts',
            'accounting_ledgers', 
            'financial_budgets',
            'accounting_journal_entries',
            'journal_entry_lines',
            'financial_transactions'
        )
        AND character_maximum_length IS NOT NULL
        AND character_maximum_length < 20  -- Check only small columns
    ) LOOP
        RAISE NOTICE 'Table: %, Column: %, Max Length: %', 
            col_record.table_name, 
            col_record.column_name, 
            col_record.character_maximum_length;
    END LOOP;
END $$;

-- ============================================
-- 3. SPECIFIC FIXES FOR KNOWN ISSUES
-- ============================================

-- Fix journal_entry_lines.account_code if it's too small (should be same as chart_of_accounts.account_code)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'journal_entry_lines' 
               AND column_name = 'account_code' 
               AND data_type = 'character varying' 
               AND character_maximum_length < 20) THEN
        -- Make it match chart_of_accounts.account_code size
        ALTER TABLE journal_entry_lines 
        ALTER COLUMN account_code TYPE VARCHAR(20);
        
        RAISE NOTICE 'Fixed journal_entry_lines.account_code column size to VARCHAR(20)';
    END IF;
END $$;

-- Fix financial_transactions.debit_account_code and credit_account_code
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'financial_transactions' 
               AND column_name = 'debit_account_code' 
               AND data_type = 'character varying' 
               AND character_maximum_length < 20) THEN
        ALTER TABLE financial_transactions 
        ALTER COLUMN debit_account_code TYPE VARCHAR(20);
        
        RAISE NOTICE 'Fixed financial_transactions.debit_account_code column size to VARCHAR(20)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'financial_transactions' 
               AND column_name = 'credit_account_code' 
               AND data_type = 'character varying' 
               AND character_maximum_length < 20) THEN
        ALTER TABLE financial_transactions 
        ALTER COLUMN credit_account_code TYPE VARCHAR(20);
        
        RAISE NOTICE 'Fixed financial_transactions.credit_account_code column size to VARCHAR(20)';
    END IF;
END $$;

-- Fix accounting_ledgers.ledger_code if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounting_ledgers' 
               AND column_name = 'ledger_code' 
               AND data_type = 'character varying' 
               AND character_maximum_length < 20) THEN
        ALTER TABLE accounting_ledgers 
        ALTER COLUMN ledger_code TYPE VARCHAR(20);
        
        RAISE NOTICE 'Fixed accounting_ledgers.ledger_code column size to VARCHAR(20)';
    END IF;
END $$;

-- ============================================
-- 4. VALIDATION FUNCTION TO CHECK COLUMN SIZES
-- ============================================
CREATE OR REPLACE FUNCTION validate_column_sizes()
RETURNS TABLE (table_name TEXT, column_name TEXT, current_size INTEGER, recommended_size INTEGER, status TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.table_name::TEXT,
        c.column_name::TEXT,
        c.character_maximum_length::INTEGER as current_size,
        CASE 
            WHEN c.column_name = 'normal_balance' THEN 10
            WHEN c.column_name LIKE '%account_code' THEN 20
            WHEN c.column_name LIKE '%ledger_code' THEN 20
            WHEN c.column_name LIKE '%budget_code' THEN 50
            ELSE c.character_maximum_length
        END as recommended_size,
        CASE 
            WHEN c.character_maximum_length < 
                CASE 
                    WHEN c.column_name = 'normal_balance' THEN 10
                    WHEN c.column_name LIKE '%account_code' THEN 20
                    WHEN c.column_name LIKE '%ledger_code' THEN 20
                    WHEN c.column_name LIKE '%budget_code' THEN 50
                    ELSE c.character_maximum_length
                END 
            THEN 'TOO SMALL'
            ELSE 'OK'
        END as status
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.data_type = 'character varying'
    AND c.table_name IN (
        'chart_of_accounts',
        'accounting_ledgers', 
        'financial_budgets',
        'accounting_journal_entries',
        'journal_entry_lines',
        'financial_transactions'
    )
    AND c.character_maximum_length IS NOT NULL
    ORDER BY c.table_name, c.column_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration fixes column size issues that caused the error:
-- "value too long for type character varying(5)"
-- 
-- Primary fix: chart_of_accounts.normal_balance from VARCHAR(5) to VARCHAR(10)
-- Additional fixes: Other account_code and ledger_code columns to appropriate sizes
-- 
-- To validate after migration, run:
-- SELECT * FROM validate_column_sizes();
-- 
-- All operations are safe and idempotent.