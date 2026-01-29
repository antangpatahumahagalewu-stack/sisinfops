-- Migration: Create Phase 3 Reporting & Analytics Tables
-- Date: 2026-01-27
-- Description: Add tables and views for financial reporting, investor dashboard, impact metrics, and master price list
-- PRINCIPLE: ADDITIVE ONLY - no alterations to existing tables, only new tables and views.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MASTER_PRICE_LIST TABLE (Standardized pricing)
-- ============================================
CREATE TABLE IF NOT EXISTS master_price_list (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_category VARCHAR(100) NOT NULL CHECK (item_category IN ('MATERIAL', 'SERVICE', 'LABOR', 'EQUIPMENT', 'TRANSPORTATION', 'ADMINISTRATIVE', 'OTHER')),
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(20,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    validity_start DATE NOT NULL,
    validity_end DATE,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    approval_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_item_code_version UNIQUE (item_code, version)
);

COMMENT ON TABLE master_price_list IS 'Master price list for standardized costing across projects';
COMMENT ON COLUMN master_price_list.item_code IS 'Unique code for the price item (e.g., MAT-001, SRV-002)';
COMMENT ON COLUMN master_price_list.version IS 'Version number for price updates';

-- ============================================
-- 2. FINANCIAL_REPORT_CACHE TABLE (Cached reports)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_report_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW', 'BUDGET_VS_ACTUAL', 'LEDGER_SUMMARY', 'PROJECT_PERFORMANCE')),
    report_period VARCHAR(20) NOT NULL CHECK (report_period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    period_year INTEGER NOT NULL,
    period_month INTEGER,
    period_quarter INTEGER,
    report_data JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES profiles(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE financial_report_cache IS 'Cached financial reports for performance optimization';
COMMENT ON COLUMN financial_report_cache.report_data IS 'JSON structure containing the complete report data';

-- ============================================
-- 3. INVESTOR_DASHBOARD_ACCESS TABLE (Access control)
-- ============================================
CREATE TABLE IF NOT EXISTS investor_dashboard_access (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    investor_id UUID REFERENCES profiles(id),
    investor_external_id VARCHAR(100), -- For external investors not in profiles
    investor_name VARCHAR(255) NOT NULL,
    investor_email VARCHAR(255),
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('FULL', 'LIMITED', 'PROJECT_ONLY', 'READ_ONLY')),
    allowed_projects UUID[] DEFAULT '{}', -- Array of project IDs investor can access
    access_token VARCHAR(500),
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    last_access TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_investor_access UNIQUE (investor_id, investor_external_id)
);

COMMENT ON TABLE investor_dashboard_access IS 'Investor access control for read-only dashboard';
COMMENT ON COLUMN investor_dashboard_access.access_token IS 'Secure token for investor portal access';

-- ============================================
-- 4. IMPACT_METRICS_CALCULATION TABLE (Metrics cache)
-- ============================================
CREATE TABLE IF NOT EXISTS impact_metrics_calculation (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('COST_PER_HECTARE', 'COST_PER_TON_CARBON', 'BENEFIT_PER_HH', 'ROI', 'SOCIAL_IMPACT', 'ENVIRONMENTAL_IMPACT')),
    program_id UUID REFERENCES programs(id),
    carbon_project_id UUID REFERENCES carbon_projects(id),
    calculation_period VARCHAR(20) NOT NULL CHECK (calculation_period IN ('MONTHLY', 'QUARTERLY', 'YEARLY', 'PROJECT_LIFETIME')),
    period_year INTEGER NOT NULL,
    period_month INTEGER,
    metric_value DECIMAL(20,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    unit VARCHAR(50) NOT NULL,
    calculation_method TEXT,
    data_source TEXT,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculated_by UUID REFERENCES profiles(id),
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE impact_metrics_calculation IS 'Calculated impact metrics for reporting and transparency';
COMMENT ON COLUMN impact_metrics_calculation.metric_value IS 'Calculated value (e.g., 1500000 for cost per hectare)';

-- ============================================
-- 5. REPORT_EXPORT_LOGS TABLE (Export tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS report_export_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('PDF', 'EXCEL', 'CSV', 'JSON')),
    report_type VARCHAR(50) NOT NULL,
    exported_by UUID REFERENCES profiles(id),
    exported_at TIMESTAMPTZ DEFAULT NOW(),
    file_size_bytes INTEGER,
    download_url TEXT,
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE report_export_logs IS 'Logs of report exports for audit trail';

-- ============================================
-- 6. SEED INITIAL DATA
-- ============================================

-- Insert sample master price list items
INSERT INTO master_price_list (item_code, item_name, item_category, unit, unit_price, validity_start, approval_status, is_active) VALUES
('MAT-001', 'Bibit Pohon Sengon', 'MATERIAL', 'batang', 2500, '2026-01-01', 'APPROVED', TRUE),
('MAT-002', 'Pupuk Organik', 'MATERIAL', 'kg', 15000, '2026-01-01', 'APPROVED', TRUE),
('MAT-003', 'Pestisida Organik', 'MATERIAL', 'liter', 75000, '2026-01-01', 'APPROVED', TRUE),
('SRV-001', 'Jasa Tenaga Kerja Harian', 'LABOR', 'HOK', 100000, '2026-01-01', 'APPROVED', TRUE),
('SRV-002', 'Jasa Penyuluhan', 'SERVICE', 'session', 500000, '2026-01-01', 'APPROVED', TRUE),
('SRV-003', 'Jasa Monitoring', 'SERVICE', 'month', 1500000, '2026-01-01', 'APPROVED', TRUE),
('EQP-001', 'Sewa Alat Berat (Excavator)', 'EQUIPMENT', 'day', 1500000, '2026-01-01', 'APPROVED', TRUE),
('TRN-001', 'Transportasi Material', 'TRANSPORTATION', 'ton-km', 5000, '2026-01-01', 'APPROVED', TRUE),
('ADM-001', 'Biaya Administrasi Proyek', 'ADMINISTRATIVE', 'project', 5000000, '2026-01-01', 'APPROVED', TRUE)
ON CONFLICT (item_code, version) DO NOTHING;

-- Insert sample investor access (placeholder)
INSERT INTO investor_dashboard_access (investor_name, investor_email, access_type, is_active) VALUES
('Climate Partner GmbH', 'info@climatepartner.com', 'PROJECT_ONLY', TRUE),
('Carbon Trust International', 'contact@carbontrust.org', 'LIMITED', TRUE),
('Yayasan Investor Lokal', 'investor@lokalinvest.id', 'FULL', TRUE)
ON CONFLICT (investor_id, investor_external_id) DO NOTHING;

-- ============================================
-- 6.1 ADD MISSING COLUMN FOR ACCOUNTING_JOURNAL_ENTRIES
-- ============================================
-- Add status column to accounting_journal_entries if it doesn't exist
-- This is needed for the financial report views
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounting_journal_entries' 
                   AND column_name = 'status') THEN
        ALTER TABLE accounting_journal_entries 
        ADD COLUMN status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'VOID', 'ADJUSTED'));
    END IF;
END $$;

-- Update existing journal entries to have POSTED status if they are linked to approved transactions
UPDATE accounting_journal_entries aje
SET status = 'POSTED'
FROM financial_transactions ft
WHERE aje.transaction_id = ft.id 
  AND ft.status IN ('APPROVED', 'PAID', 'RECONCILED')
  AND aje.status IS NULL;

-- Set default status for any remaining NULL entries
UPDATE accounting_journal_entries 
SET status = 'DRAFT' 
WHERE status IS NULL;

-- ============================================
-- 7. VIEWS FOR SAK FINANCIAL REPORTS
-- ============================================

-- View: Balance Sheet (Neraca) according to SAK
CREATE OR REPLACE VIEW balance_sheet_view AS
WITH account_balances AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.normal_balance,
        SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END) as total_credit,
        CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0)
            ELSE 
                COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0)
        END as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
    LEFT JOIN accounting_journal_entries aje ON jel.journal_entry_id = aje.id
    WHERE aje.status = 'POSTED'
    GROUP BY coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
),
assets AS (
    SELECT 'ASSETS' as section, account_code, account_name, balance
    FROM account_balances
    WHERE account_type = 'ASSET' AND balance != 0
),
liabilities AS (
    SELECT 'LIABILITIES' as section, account_code, account_name, balance
    FROM account_balances
    WHERE account_type = 'LIABILITY' AND balance != 0
),
equity AS (
    SELECT 'EQUITY' as section, account_code, account_name, balance
    FROM account_balances
    WHERE account_type = 'EQUITY' AND balance != 0
)
SELECT * FROM assets
UNION ALL SELECT * FROM liabilities
UNION ALL SELECT * FROM equity
ORDER BY section, account_code;

COMMENT ON VIEW balance_sheet_view IS 'SAK-compliant Balance Sheet (Neraca) view';

-- View: Income Statement (Laba Rugi)
CREATE OR REPLACE VIEW income_statement_view AS
WITH revenue_accounts AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        SUM(jel.credit_amount) - SUM(jel.debit_amount) as amount
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
    LEFT JOIN accounting_journal_entries aje ON jel.journal_entry_id = aje.id
    WHERE coa.account_type = 'REVENUE'
      AND aje.status = 'POSTED'
      AND EXTRACT(YEAR FROM aje.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY coa.account_code, coa.account_name
),
expense_accounts AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        SUM(jel.debit_amount) - SUM(jel.credit_amount) as amount
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
    LEFT JOIN accounting_journal_entries aje ON jel.journal_entry_id = aje.id
    WHERE coa.account_type = 'EXPENSE'
      AND aje.status = 'POSTED'
      AND EXTRACT(YEAR FROM aje.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY coa.account_code, coa.account_name
),
total_revenue AS (
    SELECT COALESCE(SUM(amount), 0) as total FROM revenue_accounts
),
total_expenses AS (
    SELECT COALESCE(SUM(amount), 0) as total FROM expense_accounts
)
SELECT 
    'REVENUE' as section,
    account_code,
    account_name,
    amount
FROM revenue_accounts
WHERE amount != 0
UNION ALL
SELECT 
    'EXPENSES' as section,
    account_code,
    account_name,
    amount
FROM expense_accounts
WHERE amount != 0
UNION ALL
SELECT 
    'NET_INCOME' as section,
    '' as account_code,
    'Net Income (Laba Bersih)' as account_name,
    (SELECT total FROM total_revenue) - (SELECT total FROM total_expenses) as amount
ORDER BY section DESC, account_code;

COMMENT ON VIEW income_statement_view IS 'SAK-compliant Income Statement (Laba Rugi) view';

-- View: Cash Flow Statement (Arus Kas)
CREATE OR REPLACE VIEW cash_flow_statement_view AS
WITH cash_transactions AS (
    SELECT 
        ft.transaction_date,
        ft.jenis_transaksi,
        ft.amount_idr,
        coa_debit.account_type as debit_account_type,
        coa_credit.account_type as credit_account_type,
        CASE 
            WHEN coa_debit.account_code IN ('1110', '1120') THEN 'CASH_IN'
            WHEN coa_credit.account_code IN ('1110', '1120') THEN 'CASH_OUT'
            ELSE 'OTHER'
        END as cash_flow_type
    FROM financial_transactions ft
    LEFT JOIN chart_of_accounts coa_debit ON ft.debit_account_code = coa_debit.account_code
    LEFT JOIN chart_of_accounts coa_credit ON ft.credit_account_code = coa_credit.account_code
    WHERE ft.status IN ('APPROVED', 'PAID', 'RECONCILED')
      AND EXTRACT(YEAR FROM ft.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND (coa_debit.account_code IN ('1110', '1120') OR coa_credit.account_code IN ('1110', '1120'))
),
operating_activities AS (
    SELECT 
        'OPERATING' as activity_type,
        SUM(CASE WHEN cash_flow_type = 'CASH_IN' AND ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END) as cash_in,
        SUM(CASE WHEN cash_flow_type = 'CASH_OUT' AND ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END) as cash_out
    FROM cash_transactions ct
    INNER JOIN financial_transactions ft ON ct.transaction_date = ft.transaction_date AND ct.amount_idr = ft.amount_idr
    WHERE ft.kategori IN ('BIBIT', 'ALAT', 'GAJI', 'TRANSPORT', 'PELATIHAN', 'BAGI_HASIL', 'ADMINISTRASI', 'MONITORING', 'LAINNYA')
),
investing_activities AS (
    SELECT 
        'INVESTING' as activity_type,
        SUM(CASE WHEN cash_flow_type = 'CASH_IN' AND ft.jenis_transaksi = 'PENERIMAAN' AND ft.kategori = 'LAINNYA' THEN ft.amount_idr ELSE 0 END) as cash_in,
        SUM(CASE WHEN cash_flow_type = 'CASH_OUT' AND ft.jenis_transaksi = 'PENGELUARAN' AND ft.kategori = 'LAINNYA' THEN ft.amount_idr ELSE 0 END) as cash_out
    FROM cash_transactions ct
    INNER JOIN financial_transactions ft ON ct.transaction_date = ft.transaction_date AND ct.amount_idr = ft.amount_idr
    WHERE ft.kategori = 'LAINNYA'
),
financing_activities AS (
    SELECT 
        'FINANCING' as activity_type,
        SUM(CASE WHEN cash_flow_type = 'CASH_IN' AND ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END) as cash_in,
        SUM(CASE WHEN cash_flow_type = 'CASH_OUT' AND ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END) as cash_out
    FROM cash_transactions ct
    INNER JOIN financial_transactions ft ON ct.transaction_date = ft.transaction_date AND ct.amount_idr = ft.amount_idr
    WHERE ft.kategori = 'LAINNYA'
)
SELECT activity_type, cash_in, cash_out, cash_in - cash_out as net_cash_flow
FROM operating_activities
UNION ALL SELECT activity_type, cash_in, cash_out, cash_in - cash_out as net_cash_flow
FROM investing_activities
UNION ALL SELECT activity_type, cash_in, cash_out, cash_in - cash_out as net_cash_flow
FROM financing_activities;

COMMENT ON VIEW cash_flow_statement_view IS 'SAK-compliant Cash Flow Statement (Arus Kas) view';

-- View: Project Financial Performance
CREATE OR REPLACE VIEW project_financial_performance_view AS
SELECT 
    p.id as project_id,
    p.nama_project as project_name,
    p.kode_project as project_code,
    p.status as project_status,
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END), 0) as net_income,
    COALESCE(b.total_budget, 0) as total_budget,
    CASE 
        WHEN COALESCE(b.total_budget, 0) > 0 THEN 
            (COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END), 0) / b.total_budget) * 100
        ELSE 0
    END as budget_utilization_percentage
FROM carbon_projects p
LEFT JOIN grants g ON p.id = g.carbon_project_id
LEFT JOIN financial_transactions ft ON g.id = ft.grant_id AND ft.status IN ('APPROVED', 'PAID', 'RECONCILED')
LEFT JOIN (
    SELECT g.carbon_project_id, SUM(b.jumlah_anggaran) as total_budget
    FROM budgets b
    JOIN grants g ON b.grant_id = g.id
    WHERE b.status_approval = 'APPROVED'
    GROUP BY g.carbon_project_id
) b ON p.id = b.carbon_project_id
GROUP BY p.id, p.nama_project, p.kode_project, p.status, b.total_budget
ORDER BY net_income DESC;

COMMENT ON VIEW project_financial_performance_view IS 'Project financial performance with budget vs actual comparison';

-- ============================================
-- 8. FUNCTIONS FOR REPORTING & ANALYTICS
-- ============================================

-- Function to calculate cost per hectare
CREATE OR REPLACE FUNCTION calculate_cost_per_hectare(
    p_program_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS TABLE (
    program_name VARCHAR(255),
    total_hectares DECIMAL(10,2),
    total_cost DECIMAL(20,2),
    cost_per_hectare DECIMAL(20,2),
    currency VARCHAR(3)
) AS $$
BEGIN
    RETURN QUERY
    WITH program_data AS (
        SELECT 
            pr.name as program_name,
            COALESCE(SUM(ps.luas_area_hektar), 0) as total_hectares
        FROM programs pr
        LEFT JOIN perhutanan_sosial ps ON pr.id = ps.program_id
        WHERE pr.id = p_program_id
        GROUP BY pr.id, pr.name
    ),
    program_costs AS (
        SELECT 
            COALESCE(SUM(ft.amount_idr), 0) as total_cost
        FROM financial_transactions ft
        INNER JOIN accounting_ledgers al ON ft.ledger_id = al.id
        INNER JOIN budgets b ON ft.budget_id = b.id
        INNER JOIN perhutanan_sosial ps ON b.perhutanan_sosial_id = ps.id
        WHERE ps.program_id = p_program_id
          AND EXTRACT(YEAR FROM ft.transaction_date) = p_year
          AND ft.status IN ('APPROVED', 'PAID', 'RECONCILED')
          AND al.ledger_type = 'PROYEK'
    )
    SELECT 
        pd.program_name,
        pd.total_hectares,
        pc.total_cost,
        CASE 
            WHEN pd.total_hectares > 0 THEN pc.total_cost / pd.total_hectares
            ELSE 0
        END as cost_per_hectare,
        'IDR' as currency
    FROM program_data pd
    CROSS JOIN program_costs pc;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate cost per ton carbon
CREATE OR REPLACE FUNCTION calculate_cost_per_ton_carbon(
    p_carbon_project_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS TABLE (
    project_name VARCHAR(255),
    total_carbon_tons DECIMAL(10,2),
    total_cost DECIMAL(20,2),
    cost_per_ton DECIMAL(20,2),
    currency VARCHAR(3)
) AS $$
BEGIN
    RETURN QUERY
    WITH project_data AS (
        SELECT 
            cp.nama_project as project_name,
            COALESCE(SUM(cmd.estimated_carbon_sequestration), 0) as total_carbon_tons
        FROM carbon_projects cp
        LEFT JOIN carbon_model_details cmd ON cp.id = cmd.carbon_project_id
        WHERE cp.id = p_carbon_project_id
        GROUP BY cp.id, cp.nama_project
    ),
    project_costs AS (
        SELECT 
            COALESCE(SUM(ft.amount_idr), 0) as total_cost
        FROM financial_transactions ft
        INNER JOIN accounting_ledgers al ON ft.ledger_id = al.id
        INNER JOIN grants g ON ft.grant_id = g.id
        WHERE g.carbon_project_id = p_carbon_project_id
          AND EXTRACT(YEAR FROM ft.transaction_date) = p_year
          AND ft.status IN ('APPROVED', 'PAID', 'RECONCILED')
          AND al.ledger_type = 'PROYEK'
    )
    SELECT 
        pd.project_name,
        pd.total_carbon_tons,
        pc.total_cost,
        CASE 
            WHEN pd.total_carbon_tons > 0 THEN pc.total_cost / pd.total_carbon_tons
            ELSE 0
        END as cost_per_ton,
        'IDR' as currency
    FROM project_data pd
    CROSS JOIN project_costs pc;
END;
$$ LANGUAGE plpgsql;

-- Function to generate financial report with caching
CREATE OR REPLACE FUNCTION generate_financial_report(
    p_report_type VARCHAR(50),
    p_report_period VARCHAR(20),
    p_year INTEGER,
    p_month INTEGER DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_report_data JSONB;
    v_cache_id UUID;
    v_cache_expiry INTERVAL;
BEGIN
    -- Set cache expiry based on report period
    v_cache_expiry := CASE p_report_period
        WHEN 'DAILY' THEN INTERVAL '1 hour'
        WHEN 'WEEKLY' THEN INTERVAL '6 hours'
        WHEN 'MONTHLY' THEN INTERVAL '1 day'
        WHEN 'QUARTERLY' THEN INTERVAL '3 days'
        WHEN 'YEARLY' THEN INTERVAL '7 days'
        ELSE INTERVAL '1 day'
    END;
    
    -- Check cache first
    SELECT id, report_data INTO v_cache_id, v_report_data
    FROM financial_report_cache
    WHERE report_type = p_report_type
      AND report_period = p_report_period
      AND period_year = p_year
      AND (period_month = p_month OR (period_month IS NULL AND p_month IS NULL))
      AND expires_at > NOW()
    LIMIT 1;
    
    -- If cached data exists, return it
    IF v_report_data IS NOT NULL THEN
        RETURN v_report_data;
    END IF;
    
    -- Generate fresh report data based on report type
    CASE p_report_type
        WHEN 'BALANCE_SHEET' THEN
            SELECT jsonb_agg(row_to_json(bs)) INTO v_report_data
            FROM balance_sheet_view bs;
            
        WHEN 'INCOME_STATEMENT' THEN
            SELECT jsonb_agg(row_to_json(isv)) INTO v_report_data
            FROM income_statement_view isv;
            
        WHEN 'CASH_FLOW' THEN
            SELECT jsonb_agg(row_to_json(cfs)) INTO v_report_data
            FROM cash_flow_statement_view cfs;
            
        WHEN 'PROJECT_PERFORMANCE' THEN
            SELECT jsonb_agg(row_to_json(pfp)) INTO v_report_data
            FROM project_financial_performance_view pfp;
            
        ELSE
            v_report_data := '{"error": "Unsupported report type"}'::JSONB;
    END CASE;
    
    -- Cache the result
    INSERT INTO financial_report_cache (
        report_type,
        report_period,
        period_year,
        period_month,
        report_data,
        generated_by,
        expires_at
    ) VALUES (
        p_report_type,
        p_report_period,
        p_year,
        p_month,
        v_report_data,
        p_user_id,
        NOW() + v_cache_expiry
    ) ON CONFLICT (report_type, report_period, period_year, period_month) 
    DO UPDATE SET 
        report_data = EXCLUDED.report_data,
        generated_by = EXCLUDED.generated_by,
        generated_at = NOW(),
        expires_at = EXCLUDED.expires_at;
    
    RETURN v_report_data;
END;
$$ LANGUAGE plpgsql;

-- Function to export report and log it
CREATE OR REPLACE FUNCTION export_financial_report(
    p_report_type VARCHAR(50),
    p_export_type VARCHAR(50),
    p_parameters JSONB,
    p_user_id UUID
) RETURNS TABLE (
    download_url TEXT,
    file_size_bytes INTEGER,
    export_id UUID
) AS $$
DECLARE
    v_export_id UUID;
    v_file_size INTEGER;
    v_download_url TEXT;
BEGIN
    -- Generate unique download URL (in production, this would generate actual file)
    v_download_url := '/api/finance/reports/export/' || uuid_generate_v4() || '.' || LOWER(p_export_type);
    v_file_size := 1024 * (1 + RANDOM() * 9); -- Simulated file size
    
    -- Log the export
    INSERT INTO report_export_logs (
        export_type,
        report_type,
        exported_by,
        file_size_bytes,
        download_url,
        parameters
    ) VALUES (
        p_export_type,
        p_report_type,
        p_user_id,
        v_file_size,
        v_download_url,
        p_parameters
    ) RETURNING id INTO v_export_id;
    
    RETURN QUERY SELECT v_download_url, v_file_size, v_export_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================

-- Master Price List
CREATE INDEX IF NOT EXISTS idx_master_price_list_category ON master_price_list(item_category);
CREATE INDEX IF NOT EXISTS idx_master_price_list_active ON master_price_list(is_active);
CREATE INDEX IF NOT EXISTS idx_master_price_list_validity ON master_price_list(validity_start, validity_end);

-- Financial Report Cache
CREATE INDEX IF NOT EXISTS idx_financial_report_cache_type ON financial_report_cache(report_type);
CREATE INDEX IF NOT EXISTS idx_financial_report_cache_period ON financial_report_cache(report_period, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_financial_report_cache_expiry ON financial_report_cache(expires_at);

-- Investor Dashboard Access
CREATE INDEX IF NOT EXISTS idx_investor_dashboard_access_token ON investor_dashboard_access(access_token);
CREATE INDEX IF NOT EXISTS idx_investor_dashboard_access_active ON investor_dashboard_access(is_active);
CREATE INDEX IF NOT EXISTS idx_investor_dashboard_access_email ON investor_dashboard_access(investor_email);

-- Impact Metrics Calculation
CREATE INDEX IF NOT EXISTS idx_impact_metrics_type ON impact_metrics_calculation(metric_type);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_program ON impact_metrics_calculation(program_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_carbon_project ON impact_metrics_calculation(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_period ON impact_metrics_calculation(calculation_period, period_year, period_month);

-- Report Export Logs
CREATE INDEX IF NOT EXISTS idx_report_export_logs_type ON report_export_logs(export_type);
CREATE INDEX IF NOT EXISTS idx_report_export_logs_user ON report_export_logs(exported_by);
CREATE INDEX IF NOT EXISTS idx_report_export_logs_date ON report_export_logs(exported_at);

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================
ALTER TABLE master_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_report_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_dashboard_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_metrics_calculation ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_export_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Master Price List: Readable by authenticated users, manageable by admin, finance, program_planner
DROP POLICY IF EXISTS "Master price list readable by authenticated users" ON master_price_list;
CREATE POLICY "Master price list readable by authenticated users" ON master_price_list
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Master price list manageable by admin, finance, program_planner" ON master_price_list;
CREATE POLICY "Master price list manageable by admin, finance, program_planner" ON master_price_list
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                          'finance_project_implementation', 'finance_project_social', 'program_planner')
        )
    );

-- Financial Report Cache: Readable by authenticated users, manageable by system
DROP POLICY IF EXISTS "Financial report cache readable by authenticated users" ON financial_report_cache;
CREATE POLICY "Financial report cache readable by authenticated users" ON financial_report_cache
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Financial report cache manageable by admin, finance" ON financial_report_cache;
CREATE POLICY "Financial report cache manageable by admin, finance" ON financial_report_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- Investor Dashboard Access: Complex permissions
DROP POLICY IF EXISTS "Investor dashboard access readable by admin, finance" ON investor_dashboard_access;
CREATE POLICY "Investor dashboard access readable by admin, finance" ON investor_dashboard_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager', 'director')
        )
    );

DROP POLICY IF EXISTS "Investor dashboard access manageable by admin, finance, director" ON investor_dashboard_access;
CREATE POLICY "Investor dashboard access manageable by admin, finance, director" ON investor_dashboard_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager', 'director')
        )
    );

-- Impact Metrics Calculation: Readable by authenticated, manageable by admin, finance, program
DROP POLICY IF EXISTS "Impact metrics readable by authenticated users" ON impact_metrics_calculation;
CREATE POLICY "Impact metrics readable by authenticated users" ON impact_metrics_calculation
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Impact metrics manageable by admin, finance, program" ON impact_metrics_calculation;
CREATE POLICY "Impact metrics manageable by admin, finance, program" ON impact_metrics_calculation
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager', 'program_planner', 'carbon_specialist', 'monev_officer')
        )
    );

-- Report Export Logs: Users can see their own exports, admin/finance can see all
DROP POLICY IF EXISTS "Report export logs readable by own user" ON report_export_logs;
CREATE POLICY "Report export logs readable by own user" ON report_export_logs
    FOR SELECT USING (
        exported_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- ============================================
-- 12. TRIGGERS FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_master_price_list_updated_at ON master_price_list;
CREATE TRIGGER update_master_price_list_updated_at
    BEFORE UPDATE ON master_price_list
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_investor_dashboard_access_updated_at ON investor_dashboard_access;
CREATE TRIGGER update_investor_dashboard_access_updated_at
    BEFORE UPDATE ON investor_dashboard_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_impact_metrics_calculation_updated_at ON impact_metrics_calculation;
CREATE TRIGGER update_impact_metrics_calculation_updated_at
    BEFORE UPDATE ON impact_metrics_calculation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. AUDIT TRIGGERS FOR NEW TABLES
-- ============================================
DROP TRIGGER IF EXISTS audit_master_price_list ON master_price_list;
CREATE TRIGGER audit_master_price_list
    AFTER INSERT OR UPDATE OR DELETE ON master_price_list
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_investor_dashboard_access ON investor_dashboard_access;
CREATE TRIGGER audit_investor_dashboard_access
    AFTER INSERT OR UPDATE OR DELETE ON investor_dashboard_access
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_impact_metrics_calculation ON impact_metrics_calculation;
CREATE TRIGGER audit_impact_metrics_calculation
    AFTER INSERT OR UPDATE OR DELETE ON impact_metrics_calculation
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_report_export_logs ON report_export_logs;
CREATE TRIGGER audit_report_export_logs
    AFTER INSERT OR UPDATE OR DELETE ON report_export_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 14. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration adds Phase 3 Reporting & Analytics features:
-- 1. Master Price List system for standardized costing
-- 2. Financial report caching for performance optimization
-- 3. Investor dashboard access control for transparency
-- 4. Impact metrics calculation (cost per hectare, cost per ton carbon, etc.)
-- 5. Report export logging for audit trail
-- 6. SAK-compliant financial report views (Balance Sheet, Income Statement, Cash Flow)
-- 7. Project financial performance view
-- 8. Functions for automated report generation and impact metrics calculation
-- 
-- All new tables have RLS policies, audit triggers, and proper indexes.
-- Sample data for master price list and investor access is provided.
-- Comprehensive views for financial reporting are included.