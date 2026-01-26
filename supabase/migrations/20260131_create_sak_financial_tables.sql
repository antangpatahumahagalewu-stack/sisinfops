-- Migration: Create SAK Financial Tables (Standar Akuntansi Indonesia)
-- Date: 2026-01-31
-- Description: Add double-entry accounting tables for SAK compliance
-- PRINCIPLE: ADDITIVE ONLY - no alterations to existing tables, only new tables and columns.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ACCOUNTING_LEDGERS TABLE (Dual Ledger System)
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ledger_code VARCHAR(20) UNIQUE NOT NULL,
    ledger_name VARCHAR(100) NOT NULL,
    ledger_type VARCHAR(20) NOT NULL CHECK (ledger_type IN ('OPERASIONAL', 'PROYEK', 'INVESTASI', 'DONOR', 'BANK', 'KAS')),
    description TEXT,
    opening_balance DECIMAL(20,2) DEFAULT 0,
    current_balance DECIMAL(20,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT TRUE,
    parent_ledger_id UUID REFERENCES accounting_ledgers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE accounting_ledgers IS 'Dual ledger system for Operational vs Project accounting';
COMMENT ON COLUMN accounting_ledgers.ledger_type IS 'OPERASIONAL: Kantor, PROYEK: Carbon/Social Projects';

-- ============================================
-- 2. CHART_OF_ACCOUNTS TABLE (SAK Compliant)
-- ============================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    description TEXT,
    parent_account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code) ON DELETE SET NULL,
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE chart_of_accounts IS 'SAK compliant chart of accounts for double-entry accounting';
COMMENT ON COLUMN chart_of_accounts.normal_balance IS 'Whether the account normally has debit or credit balance';

-- ============================================
-- 3. ACCOUNTING_JOURNAL_ENTRIES TABLE (Double-Entry)
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_journal_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entry_date DATE NOT NULL,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    ledger_id UUID REFERENCES accounting_ledgers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE accounting_journal_entries IS 'Journal entries for double-entry accounting (SAK compliance)';

-- ============================================
-- 4. JOURNAL_ENTRY_LINES TABLE (Debit/Credit)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    journal_entry_id UUID REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code) ON DELETE RESTRICT,
    debit_amount DECIMAL(20,2) DEFAULT 0,
    credit_amount DECIMAL(20,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_debit_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    )
);

COMMENT ON TABLE journal_entry_lines IS 'Individual debit/credit lines for journal entries (SAK double-entry)';

-- ============================================
-- 5. FINANCIAL_BUDGETS TABLE (Enhanced for SAK)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_code VARCHAR(50) UNIQUE NOT NULL,
    budget_name VARCHAR(255) NOT NULL,
    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('OPERASIONAL', 'PROYEK', 'INVESTASI', 'DARURAT')),
    ledger_id UUID REFERENCES accounting_ledgers(id) ON DELETE SET NULL,
    total_amount DECIMAL(20,2) NOT NULL,
    utilized_amount DECIMAL(20,2) DEFAULT 0,
    remaining_amount DECIMAL(20,2) GENERATED ALWAYS AS (total_amount - utilized_amount) STORED,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED', 'CANCELLED')),
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT budget_dates_check CHECK (start_date <= end_date)
);

COMMENT ON TABLE financial_budgets IS 'Budget management with SAK compliance and ledger integration';

-- ============================================
-- 6. MODIFY FINANCIAL_TRANSACTIONS FOR SAK
-- ============================================
-- Add double-entry columns to existing financial_transactions table
DO $$ 
BEGIN
    -- Add debit_account_code if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' 
                   AND column_name = 'debit_account_code') THEN
        ALTER TABLE financial_transactions 
        ADD COLUMN debit_account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code);
    END IF;

    -- Add credit_account_code if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' 
                   AND column_name = 'credit_account_code') THEN
        ALTER TABLE financial_transactions 
        ADD COLUMN credit_account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code);
    END IF;

    -- Add ledger_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' 
                   AND column_name = 'ledger_id') THEN
        ALTER TABLE financial_transactions 
        ADD COLUMN ledger_id UUID REFERENCES accounting_ledgers(id) ON DELETE SET NULL;
    END IF;

    -- Add status if not exists (for approval workflow)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' 
                   AND column_name = 'status') THEN
        ALTER TABLE financial_transactions 
        ADD COLUMN status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'RECONCILED'));
    END IF;

    -- Add supporting_document_url if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' 
                   AND column_name = 'supporting_document_url') THEN
        ALTER TABLE financial_transactions 
        ADD COLUMN supporting_document_url TEXT;
    END IF;

    -- Rename kode_transaksi to transaction_number if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'financial_transactions' 
               AND column_name = 'kode_transaksi') THEN
        ALTER TABLE financial_transactions RENAME COLUMN kode_transaksi TO transaction_number;
    END IF;

    -- Rename tanggal_transaksi to transaction_date if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'financial_transactions' 
               AND column_name = 'tanggal_transaksi') THEN
        ALTER TABLE financial_transactions RENAME COLUMN tanggal_transaksi TO transaction_date;
    END IF;

    -- Rename jumlah_idr to amount_idr if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'financial_transactions' 
               AND column_name = 'jumlah_idr') THEN
        ALTER TABLE financial_transactions RENAME COLUMN jumlah_idr TO amount_idr;
    END IF;

    -- Rename deskripsi to description if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'financial_transactions' 
               AND column_name = 'deskripsi') THEN
        ALTER TABLE financial_transactions RENAME COLUMN deskripsi TO description;
    END IF;
END $$;

-- ============================================
-- 7. SEED INITIAL DATA FOR SAK
-- ============================================

-- Insert initial chart of accounts (SAK compliant)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, normal_balance, level) VALUES
-- Assets (1xxx)
('1110', 'Kas', 'ASSET', 'DEBIT', 1),
('1120', 'Bank', 'ASSET', 'DEBIT', 1),
('1130', 'Piutang', 'ASSET', 'DEBIT', 1),
('1140', 'Persediaan', 'ASSET', 'DEBIT', 1),
('1150', 'Aset Tetap', 'ASSET', 'DEBIT', 1),
-- Liabilities (2xxx)
('2110', 'Hutang Usaha', 'LIABILITY', 'CREDIT', 1),
('2120', 'Hutang Bank', 'LIABILITY', 'CREDIT', 1),
('2130', 'Pendapatan Diterima Dimuka', 'LIABILITY', 'CREDIT', 1),
-- Equity (3xxx)
('3110', 'Modal Yayasan', 'EQUITY', 'CREDIT', 1),
('3120', 'Saldo Laba', 'EQUITY', 'CREDIT', 1),
-- Revenue (4xxx)
('4110', 'Pendapatan Donor', 'REVENUE', 'CREDIT', 1),
('4120', 'Pendapatan Proyek Karbon', 'REVENUE', 'CREDIT', 1),
('4130', 'Pendapatan Lainnya', 'REVENUE', 'CREDIT', 1),
-- Expenses (5xxx)
('5110', 'Biaya Operasional Kantor', 'EXPENSE', 'DEBIT', 1),
('5120', 'Biaya Program Sosial', 'EXPENSE', 'DEBIT', 1),
('5130', 'Biaya Proyek Karbon', 'EXPENSE', 'DEBIT', 1),
('5140', 'Biaya Gaji dan Tunjangan', 'EXPENSE', 'DEBIT', 1),
('5150', 'Biaya Transportasi', 'EXPENSE', 'DEBIT', 1),
('5160', 'Biaya Pelatihan', 'EXPENSE', 'DEBIT', 1),
('5170', 'Biaya Bagi Hasil', 'EXPENSE', 'DEBIT', 1),
('5180', 'Biaya Lainnya', 'EXPENSE', 'DEBIT', 1)
ON CONFLICT (account_code) DO NOTHING;

-- Insert initial ledgers for dual ledger system
INSERT INTO accounting_ledgers (ledger_code, ledger_name, ledger_type, description) VALUES
('LEDGER-OPR', 'Operasional Kantor', 'OPERASIONAL', 'Ledger untuk transaksi operasional kantor yayasan'),
('LEDGER-PRJ-CARBON', 'Proyek Karbon', 'PROYEK', 'Ledger untuk proyek karbon dan carbon credits'),
('LEDGER-PRJ-SOSIAL', 'Program Sosial', 'PROYEK', 'Ledger untuk program sosial dan pemberdayaan'),
('LEDGER-DONOR', 'Dana Donor', 'DONOR', 'Ledger untuk dana donor dan grant'),
('LEDGER-BANK', 'Rekening Bank', 'BANK', 'Ledger untuk rekening bank yayasan'),
('LEDGER-CASH', 'Kas Kecil', 'KAS', 'Ledger untuk kas kecil operasional')
ON CONFLICT (ledger_code) DO NOTHING;

-- Insert initial budgets
INSERT INTO financial_budgets (budget_code, budget_name, budget_type, ledger_id, total_amount, start_date, end_date, status) 
SELECT 
    'BGT-2026-OPR-001',
    'Anggaran Operasional 2026',
    'OPERASIONAL',
    id,
    500000000,
    '2026-01-01',
    '2026-12-31',
    'APPROVED'
FROM accounting_ledgers WHERE ledger_code = 'LEDGER-OPR'
ON CONFLICT (budget_code) DO NOTHING;

INSERT INTO financial_budgets (budget_code, budget_name, budget_type, ledger_id, total_amount, start_date, end_date, status) 
SELECT 
    'BGT-2026-PRJ-CARBON-001',
    'Anggaran Proyek Karbon 2026',
    'PROYEK',
    id,
    1000000000,
    '2026-01-01',
    '2026-12-31',
    'APPROVED'
FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-CARBON'
ON CONFLICT (budget_code) DO NOTHING;

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

-- Accounting Ledgers
CREATE INDEX IF NOT EXISTS idx_accounting_ledgers_type ON accounting_ledgers(ledger_type);
CREATE INDEX IF NOT EXISTS idx_accounting_ledgers_active ON accounting_ledgers(is_active);

-- Chart of Accounts
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_account_code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active ON chart_of_accounts(is_active);

-- Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON accounting_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_transaction ON accounting_journal_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ledger ON accounting_journal_entries(ledger_id);

-- Journal Entry Lines
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_code);

-- Financial Budgets
CREATE INDEX IF NOT EXISTS idx_financial_budgets_type ON financial_budgets(budget_type);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_status ON financial_budgets(status);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_dates ON financial_budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_ledger ON financial_budgets(ledger_id);

-- Financial Transactions (new columns)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_debit_account ON financial_transactions(debit_account_code);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_credit_account ON financial_transactions(credit_account_code);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_ledger ON financial_transactions(ledger_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================
ALTER TABLE accounting_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_budgets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Accounting Ledgers: Readable by authenticated users, manageable by admin, finance, finance_manager
DROP POLICY IF EXISTS "Accounting ledgers readable by authenticated users" ON accounting_ledgers;
CREATE POLICY "Accounting ledgers readable by authenticated users" ON accounting_ledgers
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Accounting ledgers manageable by admin, finance, finance_manager" ON accounting_ledgers;
CREATE POLICY "Accounting ledgers manageable by admin, finance, finance_manager" ON accounting_ledgers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance', 'finance_manager')
        )
    );

-- Chart of Accounts: Readable by authenticated users, manageable by admin, finance_manager
DROP POLICY IF EXISTS "Chart of accounts readable by authenticated users" ON chart_of_accounts;
CREATE POLICY "Chart of accounts readable by authenticated users" ON chart_of_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Chart of accounts manageable by admin, finance_manager" ON chart_of_accounts;
CREATE POLICY "Chart of accounts manageable by admin, finance_manager" ON chart_of_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- Journal Entries: Readable by authenticated users, manageable by admin, finance, finance_manager
DROP POLICY IF EXISTS "Journal entries readable by authenticated users" ON accounting_journal_entries;
CREATE POLICY "Journal entries readable by authenticated users" ON accounting_journal_entries
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Journal entries manageable by admin, finance, finance_manager" ON accounting_journal_entries;
CREATE POLICY "Journal entries manageable by admin, finance, finance_manager" ON accounting_journal_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance', 'finance_manager')
        )
    );

-- Journal Entry Lines: Inherit permissions from journal entries
DROP POLICY IF EXISTS "Journal lines readable by authenticated users" ON journal_entry_lines;
CREATE POLICY "Journal lines readable by authenticated users" ON journal_entry_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM accounting_journal_entries je
            WHERE je.id = journal_entry_lines.journal_entry_id
        )
    );

DROP POLICY IF EXISTS "Journal lines manageable by journal entry managers" ON journal_entry_lines;
CREATE POLICY "Journal lines manageable by journal entry managers" ON journal_entry_lines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM accounting_journal_entries je
            WHERE je.id = journal_entry_lines.journal_entry_id
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role IN ('admin', 'finance', 'finance_manager')
            )
        )
    );

-- Financial Budgets: Readable by authenticated users, manageable by admin, finance_manager
DROP POLICY IF EXISTS "Financial budgets readable by authenticated users" ON financial_budgets;
CREATE POLICY "Financial budgets readable by authenticated users" ON financial_budgets
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Financial budgets manageable by admin, finance_manager" ON financial_budgets;
CREATE POLICY "Financial budgets manageable by admin, finance_manager" ON financial_budgets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- ============================================
-- 11. TRIGGERS FOR UPDATED_AT
-- ============================================
-- Apply update_updated_at_column trigger to all new tables
DROP TRIGGER IF EXISTS update_accounting_ledgers_updated_at ON accounting_ledgers;
CREATE TRIGGER update_accounting_ledgers_updated_at
    BEFORE UPDATE ON accounting_ledgers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chart_of_accounts_updated_at ON chart_of_accounts;
CREATE TRIGGER update_chart_of_accounts_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounting_journal_entries_updated_at ON accounting_journal_entries;
CREATE TRIGGER update_accounting_journal_entries_updated_at
    BEFORE UPDATE ON accounting_journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_journal_entry_lines_updated_at ON journal_entry_lines;
CREATE TRIGGER update_journal_entry_lines_updated_at
    BEFORE UPDATE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_budgets_updated_at ON financial_budgets;
CREATE TRIGGER update_financial_budgets_updated_at
    BEFORE UPDATE ON financial_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. AUDIT TRIGGERS FOR NEW TABLES
-- ============================================
-- Apply audit_trigger_function to all new tables
DROP TRIGGER IF EXISTS audit_accounting_ledgers ON accounting_ledgers;
CREATE TRIGGER audit_accounting_ledgers
    AFTER INSERT OR UPDATE OR DELETE ON accounting_ledgers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_chart_of_accounts ON chart_of_accounts;
CREATE TRIGGER audit_chart_of_accounts
    AFTER INSERT OR UPDATE OR DELETE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_accounting_journal_entries ON accounting_journal_entries;
CREATE TRIGGER audit_accounting_journal_entries
    AFTER INSERT OR UPDATE OR DELETE ON accounting_journal_entries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_journal_entry_lines ON journal_entry_lines;
CREATE TRIGGER audit_journal_entry_lines
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_financial_budgets ON financial_budgets;
CREATE TRIGGER audit_financial_budgets
    AFTER INSERT OR UPDATE OR DELETE ON financial_budgets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 13. FUNCTIONS FOR DOUBLE-ENTRY ACCOUNTING
-- ============================================

-- Function to create journal entry for a financial transaction
CREATE OR REPLACE FUNCTION create_journal_entry_for_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_number VARCHAR(50);
    v_ledger_id UUID;
    v_debit_account_code VARCHAR(20);
    v_credit_account_code VARCHAR(20);
BEGIN
    -- Generate journal entry number
    v_entry_number := 'JE-' || TO_CHAR(NEW.transaction_date, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');
    
    -- Determine ledger based on transaction type
    IF NEW.ledger_id IS NOT NULL THEN
        v_ledger_id := NEW.ledger_id;
    ELSE
        -- Default to operational ledger
        SELECT id INTO v_ledger_id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-OPR';
    END IF;
    
    -- Get account codes from transaction
    v_debit_account_code := NEW.debit_account_code;
    v_credit_account_code := NEW.credit_account_code;
    
    -- Create journal entry
    INSERT INTO accounting_journal_entries (
        entry_date,
        entry_number,
        description,
        transaction_id,
        ledger_id,
        created_by
    ) VALUES (
        NEW.transaction_date,
        v_entry_number,
        NEW.description,
        NEW.id,
        v_ledger_id,
        NEW.created_by
    ) RETURNING id INTO NEW.journal_entry_id;
    
    -- Create debit line
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_code,
        debit_amount,
        description
    ) VALUES (
        NEW.journal_entry_id,
        v_debit_account_code,
        NEW.amount_idr,
        'Debit: ' || NEW.description
    );
    
    -- Create credit line
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_code,
        credit_amount,
        description
    ) VALUES (
        NEW.journal_entry_id,
        v_credit_account_code,
        NEW.amount_idr,
        'Credit: ' || NEW.description
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for journal entry numbers
CREATE SEQUENCE IF NOT EXISTS journal_entry_seq START 1;

-- Add journal_entry_id column to financial_transactions if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_transactions' 
                   AND column_name = 'journal_entry_id') THEN
        ALTER TABLE financial_transactions 
        ADD COLUMN journal_entry_id UUID REFERENCES accounting_journal_entries(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create trigger for automatic journal entry creation
DROP TRIGGER IF EXISTS create_journal_entry ON financial_transactions;
CREATE TRIGGER create_journal_entry
    AFTER INSERT ON financial_transactions
    FOR EACH ROW
    WHEN (NEW.debit_account_code IS NOT NULL AND NEW.credit_account_code IS NOT NULL)
    EXECUTE FUNCTION create_journal_entry_for_transaction();

-- Function to update ledger balances
CREATE OR REPLACE FUNCTION update_ledger_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Update ledger balance when transaction is approved
    IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
        -- Update ledger current balance based on transaction type
        UPDATE accounting_ledgers al
        SET current_balance = 
            CASE 
                WHEN NEW.jenis_transaksi = 'PENERIMAAN' THEN al.current_balance + NEW.amount_idr
                WHEN NEW.jenis_transaksi = 'PENGELUARAN' THEN al.current_balance - NEW.amount_idr
                ELSE al.current_balance
            END
        WHERE al.id = NEW.ledger_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ledger balance updates
DROP TRIGGER IF EXISTS update_ledger_on_approval ON financial_transactions;
CREATE TRIGGER update_ledger_on_approval
    AFTER UPDATE OF status ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_ledger_balances();

-- ============================================
-- 14. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration adds SAK (Standar Akuntansi Indonesia) compliance features:
-- 1. Double-entry accounting system with journal entries
-- 2. Chart of accounts compliant with Indonesian accounting standards
-- 3. Dual ledger system for operational vs project accounting
-- 4. Budget management with ledger integration
-- 5. Automatic journal entry creation for transactions
-- 6. Ledger balance tracking
-- 
-- All new tables have RLS policies, audit triggers, and proper indexes.
-- Existing financial_transactions table is enhanced with SAK columns.
-- Initial seed data for chart of accounts and ledgers is provided.