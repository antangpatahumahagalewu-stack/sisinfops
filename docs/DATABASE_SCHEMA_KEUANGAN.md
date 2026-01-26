# DATABASE SCHEMA MODUL KEUANGAN

## **OVERVIEW**

Dokumen ini mendefinisikan skema database lengkap untuk modul keuangan dengan **dual ledger system** sesuai **Standar Akuntansi Indonesia (SAK)**. Skema ini terintegrasi dengan sistem existing (carbon_projects, programs, perhutanan_sosial, dll) dan mendukung **double-entry accounting**, **audit trail**, dan **compliance reporting**.

## **CORE TABLES (15 TABEL)**

### **1. `accounting_ledgers` - Master Ledger**
```sql
CREATE TABLE accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ledger_code VARCHAR(20) UNIQUE NOT NULL,
    ledger_name VARCHAR(100) NOT NULL,
    ledger_type VARCHAR(20) CHECK (ledger_type IN ('OPERATIONAL', 'PROJECT')),
    description TEXT,
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    opening_balance DECIMAL(20,2) DEFAULT 0,
    current_balance DECIMAL(20,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ledgers_type ON accounting_ledgers(ledger_type);
CREATE INDEX idx_ledgers_active ON accounting_ledgers(is_active) WHERE is_active = TRUE;
```

### **2. `chart_of_accounts` - Chart of Accounts SAK**
```sql
CREATE TABLE chart_of_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    account_subtype VARCHAR(100),
    normal_balance VARCHAR(10) CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    ledger_type VARCHAR(20) CHECK (ledger_type IN ('OPERATIONAL', 'PROJECT', 'BOTH')),
    parent_account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coa_account_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_ledger_type ON chart_of_accounts(ledger_type);
CREATE INDEX idx_coa_active ON chart_of_accounts(is_active) WHERE is_active = TRUE;
```

### **3. `general_journal` - Jurnal Umum**
```sql
CREATE TABLE general_journal (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    journal_date DATE NOT NULL,
    journal_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50) CHECK (reference_type IN ('TRANSACTION', 'BUDGET', 'ADJUSTMENT', 'CLOSING')),
    ledger_id UUID REFERENCES accounting_ledgers(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ,
    posting_error TEXT,
    
    -- Check constraints
    CHECK (journal_date <= CURRENT_DATE)
);

-- Indexes
CREATE INDEX idx_journal_date ON general_journal(journal_date);
CREATE INDEX idx_journal_posted ON general_journal(posted) WHERE posted = TRUE;
CREATE INDEX idx_journal_ledger ON general_journal(ledger_id);
CREATE INDEX idx_journal_reference ON general_journal(reference_type, reference_id);
```

### **4. `journal_entries` - Entries (Double Entry)**
```sql
CREATE TABLE journal_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    journal_id UUID REFERENCES general_journal(id) ON DELETE CASCADE,
    account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code),
    debit_amount DECIMAL(20,2) DEFAULT 0,
    credit_amount DECIMAL(20,2) DEFAULT 0,
    description TEXT,
    segment_1 VARCHAR(50),
    segment_2 VARCHAR(50),
    segment_3 VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Check constraints
    CHECK (debit_amount >= 0 AND credit_amount >= 0),
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (debit_amount = 0 AND credit_amount > 0))
);

-- Indexes
CREATE INDEX idx_entries_journal ON journal_entries(journal_id);
CREATE INDEX idx_entries_account ON journal_entries(account_code);
CREATE INDEX idx_entries_debit ON journal_entries(debit_amount) WHERE debit_amount > 0;
CREATE INDEX idx_entries_credit ON journal_entries(credit_amount) WHERE credit_amount > 0;
```

### **5. `financial_transactions` - Transaksi Keuangan**
```sql
CREATE TABLE financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_date DATE NOT NULL,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    jenis_transaksi VARCHAR(20) CHECK (jenis_transaksi IN ('PENERIMAAN', 'PENGELUARAN', 'TRANSFER')),
    jumlah_idr DECIMAL(20,2) NOT NULL,
    jumlah_usd DECIMAL(20,2),
    exchange_rate DECIMAL(10,4),
    currency VARCHAR(3) DEFAULT 'IDR',
    
    -- References
    ledger_id UUID REFERENCES accounting_ledgers(id),
    project_id UUID REFERENCES carbon_projects(id),
    program_id UUID REFERENCES programs(id),
    ps_id UUID REFERENCES perhutanan_sosial(id),
    
    -- Details
    description TEXT NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('CASH', 'TRANSFER', 'CHECK', 'CREDIT_CARD')),
    bank_account_from VARCHAR(50),
    bank_account_to VARCHAR(50),
    beneficiary_name VARCHAR(255),
    beneficiary_account VARCHAR(50),
    
    -- Approval workflow
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'RECONCILED')),
    approval_notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- Check constraints
    CHECK (transaction_date <= CURRENT_DATE),
    CHECK (jumlah_idr > 0)
);

-- Indexes
CREATE INDEX idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_transactions_ledger ON financial_transactions(ledger_id);
CREATE INDEX idx_transactions_status ON financial_transactions(status);
CREATE INDEX idx_transactions_project ON financial_transactions(project_id);
CREATE INDEX idx_transactions_program ON financial_transactions(program_id);
```

### **6. `budgets` - Anggaran**
```sql
CREATE TABLE budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_year INTEGER NOT NULL,
    budget_period VARCHAR(20) CHECK (budget_period IN ('ANNUAL', 'QUARTERLY', 'MONTHLY')),
    budget_name VARCHAR(255) NOT NULL,
    ledger_id UUID REFERENCES accounting_ledgers(id),
    project_id UUID REFERENCES carbon_projects(id),
    program_id UUID REFERENCES programs(id),
    
    -- Amounts
    total_amount DECIMAL(20,2) NOT NULL,
    allocated_amount DECIMAL(20,2) DEFAULT 0,
    utilized_amount DECIMAL(20,2) DEFAULT 0,
    remaining_amount DECIMAL(20,2) GENERATED ALWAYS AS (total_amount - utilized_amount) STORED,
    
    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ACTIVE', 'CLOSED')),
    approval_notes TEXT,
    
    -- Dates
    start_date DATE,
    end_date DATE,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_budgets_year ON budgets(budget_year);
CREATE INDEX idx_budgets_ledger ON budgets(ledger_id);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_project ON budgets(project_id);
```

### **7. `budget_allocations` - Detail Alokasi Anggaran**
```sql
CREATE TABLE budget_allocations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code),
    description TEXT NOT NULL,
    allocated_amount DECIMAL(20,2) NOT NULL,
    utilized_amount DECIMAL(20,2) DEFAULT 0,
    remaining_amount DECIMAL(20,2) GENERATED ALWAYS AS (allocated_amount - utilized_amount) STORED,
    
    -- Tracking
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_allocations_budget ON budget_allocations(budget_id);
CREATE INDEX idx_allocations_account ON budget_allocations(account_code);
```

### **8. `spending_limits` - Batas Pengeluaran per Role**
```sql
CREATE TABLE spending_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    limit_type VARCHAR(20) CHECK (limit_type IN ('DAILY', 'MONTHLY', 'PER_TRANSACTION', 'ANNUAL')),
    limit_amount DECIMAL(20,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_limits_role ON spending_limits(role_name);
CREATE INDEX idx_limits_active ON spending_limits(is_active) WHERE is_active = TRUE;
```

### **9. `approval_workflows` - Workflow Persetujuan**
```sql
CREATE TABLE approval_workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL,
    min_approvals INTEGER DEFAULT 1,
    required_roles TEXT[],
    amount_threshold DECIMAL(20,2),
    ledger_types TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_active ON approval_workflows(is_active) WHERE is_active = TRUE;
```

### **10. `transaction_approvals` - History Approval**
```sql
CREATE TABLE transaction_approvals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES profiles(id),
    approval_level INTEGER NOT NULL,
    approval_status VARCHAR(20) CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVISED')),
    approval_notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approvals_transaction ON transaction_approvals(transaction_id);
CREATE INDEX idx_approvals_approver ON transaction_approvals(approver_id);
CREATE INDEX idx_approvals_status ON transaction_approvals(approval_status);
```

### **11. `benefit_distributions` - Distribusi Bagi Hasil**
```sql
CREATE TABLE benefit_distributions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    distribution_date DATE NOT NULL,
    distribution_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- References
    project_id UUID REFERENCES carbon_projects(id),
    ps_id UUID REFERENCES perhutanan_sosial(id),
    kk_id UUID REFERENCES kepala_keluarga(id),
    
    -- Amounts
    distribution_type VARCHAR(20) CHECK (distribution_type IN ('CASH', 'GOODS', 'SERVICES', 'TRAINING')),
    amount_idr DECIMAL(20,2) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(20),
    
    -- Details
    description TEXT NOT NULL,
    recipient_name VARCHAR(255),
    recipient_id_number VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'DISTRIBUTED', 'RECEIVED', 'VERIFIED')),
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_distributions_date ON benefit_distributions(distribution_date);
CREATE INDEX idx_distributions_project ON benefit_distributions(project_id);
CREATE INDEX idx_distributions_ps ON benefit_distributions(ps_id);
CREATE INDEX idx_distributions_kk ON benefit_distributions(kk_id);
```

### **12. `financial_documents` - Dokumen Pendukung**
```sql
CREATE TABLE financial_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_type VARCHAR(50) CHECK (document_type IN ('INVOICE', 'RECEIPT', 'CONTRACT', 'PROPOSAL', 'REPORT', 'OTHER')),
    document_number VARCHAR(100),
    document_date DATE,
    
    -- References
    transaction_id UUID REFERENCES financial_transactions(id),
    distribution_id UUID REFERENCES benefit_distributions(id),
    
    -- Storage
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Metadata
    description TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security
    is_public BOOLEAN DEFAULT FALSE,
    encryption_key VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_documents_transaction ON financial_documents(transaction_id);
CREATE INDEX idx_documents_type ON financial_documents(document_type);
CREATE INDEX idx_documents_date ON financial_documents(document_date);
```

### **13. `exchange_rates` - Kurs Mata Uang**
```sql
CREATE TABLE exchange_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    base_currency VARCHAR(3) DEFAULT 'IDR',
    target_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    effective_date DATE NOT NULL,
    source VARCHAR(50) CHECK (source IN ('BI', 'MANUAL', 'API', 'BANK')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(target_currency, effective_date)
);

-- Indexes
CREATE INDEX idx_rates_currency ON exchange_rates(target_currency);
CREATE INDEX idx_rates_date ON exchange_rates(effective_date);
CREATE INDEX idx_rates_active ON exchange_rates(is_active) WHERE is_active = TRUE;
```

### **14. `fixed_assets` - Aset Tetap**
```sql
CREATE TABLE fixed_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('IT_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'BUILDING', 'LAND', 'OTHER')),
    
    -- Acquisition
    purchase_date DATE,
    purchase_price DECIMAL(20,2),
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    
    -- Depreciation
    useful_life_years INTEGER,
    depreciation_method VARCHAR(20) CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE')),
    salvage_value DECIMAL(20,2) DEFAULT 0,
    current_book_value DECIMAL(20,2),
    accumulated_depreciation DECIMAL(20,2) DEFAULT 0,
    
    -- Location & Responsibility
    location VARCHAR(100),
    responsible_person UUID REFERENCES profiles(id),
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('ACTIVE', 'SOLD', 'DISCARDED', 'UNDER_MAINTENANCE', 'LOST')),
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assets_category ON fixed_assets(category);
CREATE INDEX idx_assets_status ON fixed_assets(status);
CREATE INDEX idx_assets_responsible ON fixed_assets(responsible_person);
```

### **15. `financial_audit_trail` - Audit Trail**
```sql
CREATE TABLE financial_audit_trail (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Indexes
CREATE INDEX idx_audit_table ON financial_audit_trail(table_name);
CREATE INDEX idx_audit_record ON financial_audit_trail(record_id);
CREATE INDEX idx_audit_changed_at ON financial_audit_trail(changed_at);
CREATE INDEX idx_audit_changed_by ON financial_audit_trail(changed_by);
```

## **VIEWS & FUNCTIONS**

### **1. `balance_sheet` View**
```sql
CREATE OR REPLACE VIEW balance_sheet AS
WITH account_balances AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.normal_balance,
        SUM(CASE WHEN coa.normal_balance = 'DEBIT' 
                 THEN je.debit_amount - je.credit_amount
                 ELSE je.credit_amount - je.debit_amount 
            END) as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_entries je ON coa.account_code = je.account_code
    LEFT JOIN general_journal gj ON je.journal_id = gj.id
    WHERE gj.posted = TRUE
    GROUP BY coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
)
SELECT 
    account_type,
    account_code,
    account_name,
    balance,
    CASE 
        WHEN account_type IN ('ASSET', 'EXPENSE') AND normal_balance = 'DEBIT' THEN balance
        WHEN account_type IN ('ASSET', 'EXPENSE') AND normal_balance = 'CREDIT' THEN -balance
        WHEN account_type IN ('LIABILITY', 'EQUITY', 'INCOME') AND normal_balance = 'CREDIT' THEN balance
        ELSE -balance
    END as reported_balance
FROM account_balances
ORDER BY account_code;
```

### **2. `income_statement` View**
```sql
CREATE OR REPLACE VIEW income_statement AS
WITH period_data AS (
    SELECT 
        coa.account_type,
        coa.account_code,
        coa.account_name,
        SUM(je.debit_amount) as total_debit,
        SUM(je.credit_amount) as total_credit
    FROM journal_entries je
    JOIN general_journal gj ON je.journal_id = gj.id
    JOIN chart_of_accounts coa ON je.account_code = coa.account_code
    WHERE gj.posted = TRUE
      AND gj.journal_date BETWEEN :start_date AND :end_date
    GROUP BY coa.account_type, coa.account_code, coa.account_name
)
SELECT 
    account_type,
    account_code,
    account_name,
    total_debit,
    total_credit,
    CASE 
        WHEN account_type = 'INCOME' THEN total_credit - total_debit
        WHEN account_type = 'EXPENSE' THEN total_debit - total_credit
        ELSE 0
    END as net_amount
FROM period_data
WHERE account_type IN ('INCOME', 'EXPENSE')
ORDER BY account_type, account_code;
```

### **3. Function: `generate_journal_number`**
```sql
CREATE OR REPLACE FUNCTION generate_journal_number(ledger_code VARCHAR, journal_date DATE)
RETURNS VARCHAR AS $$
DECLARE
    next_sequence INTEGER;
    year_month VARCHAR(6);
    journal_number VARCHAR(50);
BEGIN
    year_month := TO_CHAR(journal_date, 'YYYYMM');
    
    SELECT COALESCE(MAX(SUBSTRING(journal_number FROM '(\d+)$')::INTEGER), 0) + 1
    INTO next_sequence
    FROM general_journal
    WHERE journal_number LIKE 'JRU-' || ledger_code || '-' || year_month || '-%';
    
    journal_number := 'JRU-' || ledger_code || '-' || year_month || '-' || LPAD(next_sequence::TEXT, 3, '0');
    
    RETURN journal_number;
END;
$$ LANGUAGE plpgsql;
```

### **4. Function: `validate_transaction_balance`**
```sql
CREATE OR REPLACE FUNCTION validate_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_debit DECIMAL(20,2);
    total_credit DECIMAL(20,2);
BEGIN
    -- Calculate totals for this journal
    SELECT SUM(debit_amount), SUM(credit_amount)
    INTO total_debit, total_credit
    FROM journal_entries
    WHERE journal_id = NEW.journal_id;
    
    -- Check if debit = credit
    IF total_debit != total_credit THEN
        RAISE EXCEPTION 'Journal entries not balanced. Debit: %, Credit: %', total_debit, total_credit;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## **TRIGGERS**

### **1. Update Current Balance**
```sql
CREATE OR REPLACE FUNCTION update_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE accounting_ledgers
        SET current_balance = (
            SELECT opening_balance + COALESCE(SUM(
                CASE 
                    WHEN jenis_transaksi = 'PENERIMAAN' THEN jumlah_idr
                    WHEN jenis_transaksi = 'PENGELUARAN' THEN -jumlah_idr
                    ELSE 0
                END
            ), 0)
            FROM financial_transactions
            WHERE ledger_id = NEW.ledger_id
              AND status IN ('APPROVED', 'PAID', 'RECONCILED')
        ),
        updated_at = NOW()
        WHERE id = NEW.ledger_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ledger_balance
    AFTER INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_ledger_balance();
```

### **2. Auto-generate Journal Entries**
```sql
CREATE OR REPLACE FUNCTION auto_generate_journal_entries()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_journal_number VARCHAR;
BEGIN
    IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
        -- Generate journal number
        SELECT generate_journal_number(
            (SELECT ledger_code FROM accounting_ledgers WHERE id = NEW.ledger_id),
            NEW.transaction_date
        ) INTO v_journal_number;
        
        -- Create journal header
        INSERT INTO general_journal (
            journal_date,
            journal_number,
            description,
            reference_id,
            reference_type,
            ledger_id,
            created_by,
            posted
        ) VALUES (
            NEW.transaction_date,
            v_journal_number,
            NEW.description,
            NEW.id,
            'TRANSACTION',
            NEW.ledger_id,
            NEW.approved_by,
            TRUE
        ) RETURNING id INTO v_journal_id;
        
        -- Create journal entries based on transaction type
        IF NEW.jenis_transaksi = 'PENGELUARAN' THEN
            -- Debit: Expense account, Credit: Bank/Cash
            INSERT INTO journal_entries (journal_id, account_code, debit_amount, description)
            VALUES (v_journal_id, '5210', NEW.jumlah_idr, NEW.description);
            
            INSERT INTO journal_entries (journal_id, account_code, credit_amount, description)
            VALUES (v_journal_id, '1120', NEW.jumlah_idr, 'Payment from bank');
            
        ELSIF NEW.jenis_transaksi = 'PENERIMAAN' THEN
            -- Debit: Bank/Cash, Credit: Income account
            INSERT INTO journal_entries (journal_id, account_code, debit_amount, description)
            VALUES (v_journal_id, '1120', NEW.jumlah_idr, 'Receipt to bank');
            
            INSERT INTO journal_entries (journal_id, account_code, credit_amount, description)
            VALUES (v_journal_id, '4110', NEW.jumlah_idr, NEW.description);
        END IF;
        
        -- Mark journal as posted
        UPDATE general_journal 
        SET posted_at = NOW()
        WHERE id = v_journal_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_journal
    AFTER UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION auto_generate_journal_entries();

## **INTEGRATION WITH EXISTING TABLES**

### **Foreign Key Relationships:**
1. **`carbon_projects`** → `financial_transactions.project_id`
2. **`programs`** → `financial_transactions.program_id`
3. **`perhutanan_sosial`** → `financial_transactions.ps_id`
4. **`kepala_keluarga`** → `benefit_distributions.kk_id`
5. **`profiles`** → All `created_by`, `updated_by`, `approved_by` columns

### **Data Consistency Rules:**
1. Jika transaksi memiliki `project_id`, maka `ledger_id` harus ledger proyek karbon
2. Jika transaksi memiliki `program_id`, maka `ledger_id` harus ledger implementasi/sosial
3. Jika `benefit_distribution` memiliki `kk_id`, maka harus ada validasi bahwa KK tersebut termasuk dalam PS yang terkait

## **PERFORMANCE OPTIMIZATION**

### **Recommended Indexes:**
```sql
-- Composite indexes for common queries
CREATE INDEX idx_transactions_ledger_date ON financial_transactions(ledger_id, transaction_date);
CREATE INDEX idx_journal_ledger_date ON general_journal(ledger_id, journal_date);
CREATE INDEX idx_budgets_year_status ON budgets(budget_year, status);

-- Partial indexes for active records
CREATE INDEX idx_transactions_active ON financial_transactions(status) 
WHERE status IN ('APPROVED', 'PAID', 'RECONCILED');

CREATE INDEX idx_budgets_active ON budgets(status) 
WHERE status IN ('APPROVED', 'ACTIVE');
```

### **Partitioning Strategy:**
```sql
-- Partition financial_transactions by year
CREATE TABLE financial_transactions_2026 PARTITION OF financial_transactions
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Partition general_journal by month
CREATE TABLE general_journal_202601 PARTITION OF general_journal
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

## **DATA MIGRATION SCRIPT**

```sql
-- Migration script (run in sequence)
-- 1. Create new tables
-- 2. Insert default chart of accounts
-- 3. Create default ledgers
-- 4. Migrate existing transactions (if any)
-- 5. Create views and functions
-- 6. Setup RLS policies
-- 7. Create audit trail triggers
```

## **NEXT STEPS**

### **Phase 1: Schema Creation**
- [x] Create all 15 core tables
- [x] Define indexes and constraints
- [x] Create views for reporting
- [x] Implement audit trail

### **Phase 2: Data Migration**
- [ ] Migrate existing financial data
- [ ] Setup default chart of accounts
- [ ] Create initial ledgers
- [ ] Validate data integrity

### **Phase 3: Integration & Testing**
- [ ] Integrate with existing application
- [ ] Test all database functions
- [ ] Performance testing
- [ ] Security audit

### **Phase 4: Production Deployment**
- [ ] Deploy to production database
- [ ] Data migration in production
- [ ] Monitor performance
- [ ] Backup and recovery testing

## **IMPLEMENTATION CHECKLIST**

### **Week 1-2: Foundation**
- [ ] Create all 15 core tables with proper constraints
- [ ] Implement indexes for performance
- [ ] Create basic views (balance_sheet, income_statement)
- [ ] Setup audit trail system

### **Week 3-4: Business Logic**
- [ ] Implement double-entry accounting functions
- [ ] Create budget management system
- [ ] Implement approval workflows
- [ ] Setup spending limits

### **Week 5-6: Integration**
- [ ] Integrate with existing profiles table
- [ ] Connect with carbon_projects and programs
- [ ] Implement benefit distribution tracking
- [ ] Setup document management

### **Week 7-8: Optimization & Security**
- [ ] Performance tuning and partitioning
- [ ] Implement RLS policies for data security
- [ ] Create comprehensive test data
- [ ] Documentation and training

## **TROUBLESHOOTING**

### **Common Issues:**

1. **Foreign key constraint errors**: Ensure referenced records exist before inserting
2. **Balance sheet not balancing**: Check that all journal entries have matching debit/credit
3. **Performance issues with large datasets**: Implement partitioning and proper indexes
4. **Permission errors**: Verify RLS policies and user roles

### **Debugging Tips:**
- Use `EXPLAIN ANALYZE` for query performance analysis
- Check audit trail for data changes
- Validate data consistency with regular scripts
- Monitor database logs for errors

## **DOKUMENTASI TERKAIT**

1. **IMPLEMENTASI_KEUANGAN_PHASE1.md** - Roadmap implementasi 8 minggu
2. **DESAIN_SISTEM_KEUANGAN_SAK.md** - Desain sistem SAK
3. **ROLE_PERMISSION_KEUANGAN.md** - Matriks role & permission
4. **API_ENDPOINTS_KEUANGAN.md** - Endpoint API untuk integrasi

---
**Dokumen Terakhir Diupdate**: 26 Januari 2026  
**Versi**: 1.0.0  
**Status**: Ready for Implementation Phase 1
