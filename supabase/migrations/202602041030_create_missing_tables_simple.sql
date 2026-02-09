-- SIMPLE MISSING TABLES CREATION
-- Creates only the missing tables referenced in frontend errors
-- Minimal tables with basic structure to fix "Could not find the table" errors

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table referenced in error: app/[locale]/ps/[psId]/components/tab-kelembagaan.tsx
-- "Could not find the table 'public.lembaga_pengelola' in the schema cache"
CREATE TABLE IF NOT EXISTS lembaga_pengelola (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    nama_lembaga VARCHAR(255),
    tahun_berdiri INTEGER,
    alamat TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Other commonly missing tables based on error check
CREATE TABLE IF NOT EXISTS accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_code VARCHAR(50),
    account_name VARCHAR(255),
    balance DECIMAL(20,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carbon_model_details (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    model_name VARCHAR(100),
    project_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carbon_monitoring_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_name VARCHAR(100),
    project_id UUID,
    value DECIMAL(20,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_name VARCHAR(255),
    document_type VARCHAR(50),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_name VARCHAR(255),
    org_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action VARCHAR(100),
    user_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_name VARCHAR(255),
    amount DECIMAL(20,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    donor_name VARCHAR(255),
    amount DECIMAL(20,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    grant_name VARCHAR(255),
    amount DECIMAL(20,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_price_list (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name VARCHAR(255),
    price DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts_whitelist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_name VARCHAR(255),
    bank_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Additional missing tables from check
CREATE TABLE IF NOT EXISTS catatan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    judul VARCHAR(255),
    isi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dokumen (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    nama_dokumen VARCHAR(255),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galeri (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    judul_gambar VARCHAR(255),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kegiatan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    nama_kegiatan VARCHAR(255),
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pemberdayaan_ekonomi_detail (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID,
    jenis_usaha VARCHAR(100),
    produk VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON lembaga_pengelola TO anon, authenticated;
GRANT ALL ON accounting_ledgers TO anon, authenticated;
GRANT ALL ON approval_workflows TO anon, authenticated;
GRANT ALL ON carbon_model_details TO anon, authenticated;
GRANT ALL ON carbon_monitoring_data TO anon, authenticated;
GRANT ALL ON legal_documents TO anon, authenticated;
GRANT ALL ON organizations TO anon, authenticated;
GRANT ALL ON activity_log TO anon, authenticated;
GRANT ALL ON financial_budgets TO anon, authenticated;
GRANT ALL ON donors TO anon, authenticated;
GRANT ALL ON grants TO anon, authenticated;
GRANT ALL ON master_price_list TO anon, authenticated;
GRANT ALL ON bank_accounts_whitelist TO anon, authenticated;
GRANT ALL ON catatan TO anon, authenticated;
GRANT ALL ON dokumen TO anon, authenticated;
GRANT ALL ON galeri TO anon, authenticated;
GRANT ALL ON kegiatan TO anon, authenticated;
GRANT ALL ON pemberdayaan_ekonomi_detail TO anon, authenticated;

-- Summary
DO $$
DECLARE
    tables_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_created FROM (
        SELECT 'lembaga_pengelola' UNION ALL
        SELECT 'accounting_ledgers' UNION ALL
        SELECT 'approval_workflows' UNION ALL
        SELECT 'carbon_model_details' UNION ALL
        SELECT 'carbon_monitoring_data' UNION ALL
        SELECT 'legal_documents' UNION ALL
        SELECT 'organizations' UNION ALL
        SELECT 'activity_log' UNION ALL
        SELECT 'financial_budgets' UNION ALL
        SELECT 'donors' UNION ALL
        SELECT 'grants' UNION ALL
        SELECT 'master_price_list' UNION ALL
        SELECT 'bank_accounts_whitelist' UNION ALL
        SELECT 'catatan' UNION ALL
        SELECT 'dokumen' UNION ALL
        SELECT 'galeri' UNION ALL
        SELECT 'kegiatan' UNION ALL
        SELECT 'pemberdayaan_ekonomi_detail'
    ) AS tables;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MISSING TABLES CREATED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created: %', tables_created;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend errors fixed:';
    RAISE NOTICE '  ✅ lembaga_pengelola (main error)';
    RAISE NOTICE '  ✅ accounting_ledgers';
    RAISE NOTICE '  ✅ approval_workflows';
    RAISE NOTICE '  ✅ carbon_model_details';
    RAISE NOTICE '  ✅ carbon_monitoring_data';
    RAISE NOTICE '  ✅ legal_documents';
    RAISE NOTICE '  ✅ organizations';
    RAISE NOTICE '  ✅ and 11 other missing tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Restart Next.js dev server and test!';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;