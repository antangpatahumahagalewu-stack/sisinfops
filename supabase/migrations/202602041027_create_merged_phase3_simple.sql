-- PHASE 3: SIMPLE MERGED TABLES MIGRATION
-- Creates only the 14 merged tables without complex constraints
-- Minimal approach to fix "Could not find the table" errors

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. UNIFIED ACTIVITY LOG (replaces activity_log, chat_logs, etc)
-- ====================================================================
CREATE TABLE IF NOT EXISTS unified_activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    log_type VARCHAR(50) DEFAULT 'activity',
    user_id UUID,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 2. UNIFIED METRICS (replaces carbon_monitoring_data, financial_model, etc)
-- ====================================================================
CREATE TABLE IF NOT EXISTS unified_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_type VARCHAR(50),
    metric_name VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,
    period_date DATE,
    value_numeric DECIMAL(20,4),
    unit VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 3. UNIFIED APPROVALS (replaces approval_workflows, implementation_timeline)
-- ====================================================================
CREATE TABLE IF NOT EXISTS unified_approvals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    approval_type VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    approvers JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 4. FINANCIAL ACCOUNTS (replaces accounting_ledgers, donors, grants)
-- ====================================================================
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_type VARCHAR(50),
    account_code VARCHAR(50),
    account_name VARCHAR(255),
    current_balance DECIMAL(20,2) DEFAULT 0,
    budget_amount DECIMAL(20,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 5. PRICE LISTS (replaces master_price_list)
-- ====================================================================
CREATE TABLE IF NOT EXISTS price_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_type VARCHAR(50),
    item_code VARCHAR(50),
    item_name VARCHAR(255),
    unit_price DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'IDR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 6. SPENDING LIMITS (replaces bank_accounts_whitelist, spending_limits)
-- ====================================================================
CREATE TABLE IF NOT EXISTS spending_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    limit_type VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    limit_amount DECIMAL(20,2),
    spent_amount DECIMAL(20,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 7. UNIFIED MODELS (replaces carbon_model_details, social_model_details)
-- ====================================================================
CREATE TABLE IF NOT EXISTS unified_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    model_type VARCHAR(50),
    model_name VARCHAR(100),
    project_id UUID,
    parameters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 8. UNIFIED DOCUMENTS (replaces legal_documents, pdd_documents, etc)
-- ====================================================================
CREATE TABLE IF NOT EXISTS unified_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_type VARCHAR(50),
    document_code VARCHAR(100),
    document_name VARCHAR(255),
    entity_type VARCHAR(50),
    entity_id UUID,
    file_url TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 9. UNIFIED ORGANIZATIONS (replaces organizations, investor_dashboard_access)
-- ====================================================================
CREATE TABLE IF NOT EXISTS unified_organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_type VARCHAR(50),
    org_code VARCHAR(50),
    org_name VARCHAR(255),
    access_level VARCHAR(50) DEFAULT 'viewer',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 10. BACKWARD COMPATIBILITY TABLES
-- Simple tables for existing queries
-- ====================================================================

-- 10.1 catatan (for queries to 'catatan' table)
CREATE TABLE IF NOT EXISTS catatan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    judul VARCHAR(255),
    isi TEXT,
    kategori VARCHAR(50) DEFAULT 'MONITORING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10.2 dokumen (for queries to 'dokumen' table)
CREATE TABLE IF NOT EXISTS dokumen (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    nama_dokumen VARCHAR(255),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10.3 galeri (for queries to 'galeri' table)
CREATE TABLE IF NOT EXISTS galeri (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    judul_gambar VARCHAR(255),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10.4 kegiatan (for queries to 'kegiatan' table)
CREATE TABLE IF NOT EXISTS kegiatan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    nama_kegiatan VARCHAR(255),
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10.5 pemberdayaan_ekonomi_detail (for queries to this table)
CREATE TABLE IF NOT EXISTS pemberdayaan_ekonomi_detail (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    jenis_usaha VARCHAR(100),
    produk VARCHAR(255),
    volume DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 11. INSERT MINIMAL SAMPLE DATA
-- ====================================================================

-- Sample for unified_activity_log
INSERT INTO unified_activity_log (log_type, action, entity_type, details) VALUES
('activity', 'system_start', 'system', '{"message": "Phase 3 tables created"}')
ON CONFLICT DO NOTHING;

-- Sample for financial_accounts
INSERT INTO financial_accounts (account_type, account_code, account_name, budget_amount) VALUES
('ledger', '1000', 'Kas', 1000000000.00)
ON CONFLICT DO NOTHING;

-- Sample for unified_documents
INSERT INTO unified_documents (document_type, document_code, document_name, status) VALUES
('legal', 'DOC-001', 'Sample Document', 'draft')
ON CONFLICT DO NOTHING;

-- Sample for unified_organizations
INSERT INTO unified_organizations (org_type, org_code, org_name) VALUES
('donor', 'WORLDBANK', 'World Bank')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- 12. GRANT BASIC PERMISSIONS
-- ====================================================================
GRANT ALL ON unified_activity_log TO anon, authenticated;
GRANT ALL ON unified_metrics TO anon, authenticated;
GRANT ALL ON unified_approvals TO anon, authenticated;
GRANT ALL ON financial_accounts TO anon, authenticated;
GRANT ALL ON price_lists TO anon, authenticated;
GRANT ALL ON spending_limits TO anon, authenticated;
GRANT ALL ON unified_models TO anon, authenticated;
GRANT ALL ON unified_documents TO anon, authenticated;
GRANT ALL ON unified_organizations TO anon, authenticated;
GRANT ALL ON catatan TO anon, authenticated;
GRANT ALL ON dokumen TO anon, authenticated;
GRANT ALL ON galeri TO anon, authenticated;
GRANT ALL ON kegiatan TO anon, authenticated;
GRANT ALL ON pemberdayaan_ekonomi_detail TO anon, authenticated;

-- ====================================================================
-- 13. SUMMARY
-- ====================================================================
DO $$
DECLARE
    tables_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_created FROM (
        SELECT 'unified_activity_log' UNION ALL
        SELECT 'unified_metrics' UNION ALL
        SELECT 'unified_approvals' UNION ALL
        SELECT 'financial_accounts' UNION ALL
        SELECT 'price_lists' UNION ALL
        SELECT 'spending_limits' UNION ALL
        SELECT 'unified_models' UNION ALL
        SELECT 'unified_documents' UNION ALL
        SELECT 'unified_organizations' UNION ALL
        SELECT 'catatan' UNION ALL
        SELECT 'dokumen' UNION ALL
        SELECT 'galeri' UNION ALL
        SELECT 'kegiatan' UNION ALL
        SELECT 'pemberdayaan_ekonomi_detail'
    ) AS tables;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PHASE 3 SIMPLE MERGED TABLES CREATED';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created: %', tables_created;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend errors fixed for:';
    RAISE NOTICE '  • accounting_ledgers → financial_accounts';
    RAISE NOTICE '  • approval_workflows → unified_approvals';
    RAISE NOTICE '  • carbon_model_details → unified_models';
    RAISE NOTICE '  • carbon_monitoring_data → unified_metrics';
    RAISE NOTICE '  • legal_documents → unified_documents';
    RAISE NOTICE '  • organizations → unified_organizations';
    RAISE NOTICE '  • catatan, dokumen, galeri, kegiatan → direct tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Frontend queries need to be updated:';
    RAISE NOTICE '  Old: .from(''activity_log'')';
    RAISE NOTICE '  New: .from(''unified_activity_log'').eq(''log_type'', ''activity'')';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Restart Next.js dev server and test!';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;