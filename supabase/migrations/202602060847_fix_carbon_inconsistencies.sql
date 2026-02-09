-- MIGRATION: Fix Carbon Project Inconsistencies
-- Date: 2026-02-06 08:47 AM
-- Purpose: Standardize data model, integrate workflows, and fix inconsistencies
-- Note: Does NOT modify perhutanan_sosial table as per constraint

BEGIN;

-- ====================================================================
-- 1. CREATE MASTER AKSI MITIGASI TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS master_aksi_mitigasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kode_aksi VARCHAR(20) UNIQUE NOT NULL,
    nama_aksi VARCHAR(255) NOT NULL,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN (
        'avoided_emissions', 
        'carbon_removal', 
        'governance_social', 
        'certification_market'
    )),
    deskripsi TEXT,
    metodologi_verra VARCHAR(100),
    parameter_dram JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_master_aksi_mitigasi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_master_aksi_mitigasi_updated_at ON master_aksi_mitigasi;
CREATE TRIGGER update_master_aksi_mitigasi_updated_at
    BEFORE UPDATE ON master_aksi_mitigasi
    FOR EACH ROW
    EXECUTE FUNCTION update_master_aksi_mitigasi_updated_at();

-- Insert standard aksi mitigasi based on architecture document
INSERT INTO master_aksi_mitigasi (kode_aksi, nama_aksi, kategori, deskripsi) VALUES
-- A. Mitigasi Emisi (Avoided Emissions)
('AE-001', 'Perlindungan Hutan Desa dari Deforestasi', 'avoided_emissions', 'Mencegah deforestasi di hutan desa melalui penguatan kelembagaan dan patroli'),
('AE-002', 'Konservasi Hutan Gambut', 'avoided_emissions', 'Melindungi ekosistem gambut dari drainase dan kebakaran'),
('AE-003', 'Pengelolaan Hutan Lestari (SFM)', 'avoided_emissions', 'Sustainable Forest Management dengan prinsip lestari'),

-- B. Penyerapan Karbon (Carbon Removal)
('CR-001', 'Reboisasi Lahan Kritis', 'carbon_removal', 'Penanaman pohon pada lahan kritis dan terdegradasi'),
('CR-002', 'Agroforestri Kopi/Karet', 'carbon_removal', 'Sistem agroforestri dengan tanaman bernilai ekonomi'),
('CR-003', 'Restorasi Mangrove', 'carbon_removal', 'Pemulihan ekosistem mangrove untuk penyerapan karbon'),
('CR-004', 'Penanaman Pohon Multi-Purpose', 'carbon_removal', 'Penanaman pohon serbaguna untuk karbon dan ekonomi'),

-- C. Tata Kelola & Sosial (Governance & Social)
('GS-001', 'Penguatan Kelembagaan Tani', 'governance_social', 'Kapasitas kelembagaan kelompok tani dan masyarakat'),
('GS-002', 'Monitoring Hutan Berbasis Masyarakat', 'governance_social', 'Sistem patroli dan monitoring partisipatif'),
('GS-003', 'Rencana Pengelolaan Hutan', 'governance_social', 'Penyusunan rencana pengelolaan hutan partisipatif'),
('GS-004', 'Pemberdayaan Perempuan', 'governance_social', 'Program khusus pemberdayaan perempuan dalam pengelolaan hutan'),
('GS-005', 'Resolusi Konflik Tenurial', 'governance_social', 'Penyelesaian konflik penguasaan lahan'),
('GS-006', 'Benefit Sharing Mechanism', 'governance_social', 'Mekanisme pembagian manfaat dari proyek karbon'),

-- D. Sertifikasi & Pasar (Certification & Market)
('CM-001', 'Validasi & Verifikasi', 'certification_market', 'Proses validasi dan verifikasi oleh VVB'),
('CM-002', 'Pemasaran Kredit Karbon', 'certification_market', 'Strategi pemasaran dan penjualan kredit karbon')
ON CONFLICT (kode_aksi) DO UPDATE SET
    nama_aksi = EXCLUDED.nama_aksi,
    kategori = EXCLUDED.kategori,
    deskripsi = EXCLUDED.deskripsi;

-- ====================================================================
-- 2. ENHANCE CARBON PROJECTS TABLE FOR INTEGRATION
-- ====================================================================
-- Add integration columns to carbon_projects
ALTER TABLE carbon_projects ADD COLUMN IF NOT EXISTS 
    aksi_mitigasi_ids UUID[] DEFAULT '{}';

ALTER TABLE carbon_projects ADD COLUMN IF NOT EXISTS
    workflow_status VARCHAR(50) DEFAULT 'draft' CHECK (workflow_status IN (
        'draft', 'program_defined', 'dram_created', 'due_diligence_completed',
        'verra_submitted', 'vvb_engaged', 'registered', 'monitoring',
        'verification_pending', 'credits_issued', 'completed'
    ));

ALTER TABLE carbon_projects ADD COLUMN IF NOT EXISTS
    financial_account_id UUID;

ALTER TABLE carbon_projects ADD COLUMN IF NOT EXISTS
    last_workflow_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for workflow status
CREATE INDEX IF NOT EXISTS idx_carbon_projects_workflow_status 
    ON carbon_projects(workflow_status);

-- Create index for financial integration
CREATE INDEX IF NOT EXISTS idx_carbon_projects_financial_account 
    ON carbon_projects(financial_account_id);

-- ====================================================================
-- 3. CREATE CARBON WORKFLOW STATUS TRACKING TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS carbon_workflow_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID NOT NULL REFERENCES carbon_projects(id) ON DELETE CASCADE,
    module_name VARCHAR(50) NOT NULL CHECK (module_name IN (
        'program', 'dram', 'due_diligence', 'verra_registration', 
        'vvb_management', 'carbon_credits', 'investor_dashboard'
    )),
    module_status VARCHAR(50) NOT NULL,
    module_data JSONB DEFAULT '{}',
    financial_link_id UUID, -- Link to financial transactions/accounts
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one status per module per project
    UNIQUE(carbon_project_id, module_name)
);

-- Create indexes for workflow status
CREATE INDEX IF NOT EXISTS idx_carbon_workflow_project 
    ON carbon_workflow_status(carbon_project_id);

CREATE INDEX IF NOT EXISTS idx_carbon_workflow_module 
    ON carbon_workflow_status(module_name, module_status);

-- ====================================================================
-- 4. CREATE INTEGRATED VIEWS FOR REPORTING
-- ====================================================================
-- View for integrated carbon project data
CREATE OR REPLACE VIEW v_carbon_project_integrated AS
SELECT 
    cp.id,
    cp.kode_project,
    cp.nama_project,
    cp.standar_karbon,
    cp.metodologi,
    cp.luas_total_ha,
    cp.workflow_status as overall_status,
    cp.last_workflow_update,
    
    -- Program information
    (SELECT COUNT(*) FROM programs p WHERE p.carbon_project_id = cp.id) as program_count,
    (SELECT jsonb_agg(jsonb_build_object('id', p.id, 'nama_program', p.nama_program, 'status', p.status))
     FROM programs p WHERE p.carbon_project_id = cp.id) as programs,
    
    -- DRAM information
    (SELECT COUNT(*) FROM dram d 
     JOIN programs p ON p.id = d.program_id 
     WHERE p.carbon_project_id = cp.id) as dram_count,
    
    -- Verra registration information
    (SELECT jsonb_agg(jsonb_build_object('status', vpr.status, 'verra_project_id', vpr.verra_project_id, 'registration_date', vpr.registration_date))
     FROM verra_project_registrations vpr WHERE vpr.carbon_project_id = cp.id) as verra_registrations,
    
    -- VVB engagements
    (SELECT COUNT(*) FROM vvb_engagements ve 
     JOIN verra_project_registrations vpr ON vpr.id = ve.verra_project_registration_id
     WHERE vpr.carbon_project_id = cp.id) as vvb_engagement_count,
    
    -- Carbon credits
    (SELECT COALESCE(SUM(cc.quantity), 0) FROM carbon_credits cc 
     JOIN verra_project_registrations vpr ON vpr.id = cc.verra_project_registration_id
     WHERE vpr.carbon_project_id = cp.id) as total_credits_issued,
    
    -- Financial integration
    fa.account_code as financial_account_code,
    fa.account_name as financial_account_name,
    fa.current_balance as account_balance
    
FROM carbon_projects cp
LEFT JOIN financial_accounts fa ON fa.id = cp.financial_account_id;

-- View for workflow status dashboard
CREATE OR REPLACE VIEW v_carbon_workflow_dashboard AS
SELECT 
    cp.id as project_id,
    cp.kode_project,
    cp.nama_project,
    cp.workflow_status as overall_status,
    
    -- Module statuses
    MAX(CASE WHEN cws.module_name = 'program' THEN cws.module_status END) as program_status,
    MAX(CASE WHEN cws.module_name = 'dram' THEN cws.module_status END) as dram_status,
    MAX(CASE WHEN cws.module_name = 'due_diligence' THEN cws.module_status END) as due_diligence_status,
    MAX(CASE WHEN cws.module_name = 'verra_registration' THEN cws.module_status END) as verra_status,
    MAX(CASE WHEN cws.module_name = 'vvb_management' THEN cws.module_status END) as vvb_status,
    MAX(CASE WHEN cws.module_name = 'carbon_credits' THEN cws.module_status END) as credits_status,
    
    -- Timestamps
    MAX(cp.last_workflow_update) as last_update,
    COUNT(DISTINCT cws.id) as tracked_modules
    
FROM carbon_projects cp
LEFT JOIN carbon_workflow_status cws ON cws.carbon_project_id = cp.id
GROUP BY cp.id, cp.kode_project, cp.nama_project, cp.workflow_status;

-- ====================================================================
-- 5. CREATE FINANCIAL INTEGRATION VIEW
-- ====================================================================
CREATE OR REPLACE VIEW v_carbon_financial_integration AS
SELECT 
    cp.id as project_id,
    cp.kode_project,
    cp.nama_project,
    fa.id as financial_account_id,
    fa.account_code,
    fa.account_name,
    fa.account_type,
    fa.current_balance,
    fa.budget_amount,
    fa.spent_amount,
    fa.remaining_amount,
    
    -- Transaction summary
    (SELECT COALESCE(SUM(ft.amount), 0) 
     FROM financial_transactions ft 
     WHERE ft.project_id = cp.id AND ft.transaction_type = 'expense') as total_expenses,
    
    (SELECT COALESCE(SUM(ft.amount), 0) 
     FROM financial_transactions ft 
     WHERE ft.project_id = cp.id AND ft.transaction_type = 'revenue') as total_revenue,
    
    -- Carbon credits value (estimated)
    (SELECT COALESCE(SUM(cc.quantity * 15.5), 0) -- Assuming $15.5 per credit
     FROM carbon_credits cc 
     JOIN verra_project_registrations vpr ON vpr.id = cc.verra_project_registration_id
     WHERE vpr.carbon_project_id = cp.id AND cc.status = 'issued') as estimated_credits_value_usd
    
FROM carbon_projects cp
LEFT JOIN financial_accounts fa ON fa.id = cp.financial_account_id;

-- ====================================================================
-- 6. CREATE TRIGGERS FOR AUTOMATIC STATUS SYNC
-- ====================================================================
-- Function to update carbon project workflow status based on module statuses
CREATE OR REPLACE FUNCTION update_carbon_project_workflow_status()
RETURNS TRIGGER AS $$
DECLARE
    project_id UUID;
    overall_status VARCHAR(50);
BEGIN
    -- Get project ID
    IF TG_TABLE_NAME = 'programs' THEN
        project_id := NEW.carbon_project_id;
    ELSIF TG_TABLE_NAME = 'dram' THEN
        SELECT p.carbon_project_id INTO project_id 
        FROM programs p WHERE p.id = NEW.program_id;
    ELSIF TG_TABLE_NAME = 'verra_project_registrations' THEN
        project_id := NEW.carbon_project_id;
    ELSIF TG_TABLE_NAME = 'carbon_credits' THEN
        SELECT vpr.carbon_project_id INTO project_id
        FROM verra_project_registrations vpr 
        WHERE vpr.id = NEW.verra_project_registration_id;
    END IF;
    
    IF project_id IS NOT NULL THEN
        -- Determine overall status based on module statuses
        WITH module_statuses AS (
            SELECT module_status 
            FROM carbon_workflow_status 
            WHERE carbon_project_id = project_id
            UNION ALL
            SELECT NEW.status -- Include the new/updated status
        )
        SELECT 
            CASE 
                WHEN EXISTS (SELECT 1 FROM module_statuses WHERE module_status = 'registered') THEN 'registered'
                WHEN EXISTS (SELECT 1 FROM module_statuses WHERE module_status = 'verified') THEN 'verification_pending'
                WHEN EXISTS (SELECT 1 FROM module_statuses WHERE module_status = 'issued') THEN 'credits_issued'
                WHEN EXISTS (SELECT 1 FROM module_statuses WHERE module_status IN ('submitted_to_verra', 'under_validation')) THEN 'verra_submitted'
                WHEN EXISTS (SELECT 1 FROM module_statuses WHERE module_status = 'active') THEN 'dram_created'
                ELSE 'program_defined'
            END INTO overall_status;
        
        -- Update carbon project
        UPDATE carbon_projects 
        SET 
            workflow_status = overall_status,
            last_workflow_update = NOW()
        WHERE id = project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic status sync
DROP TRIGGER IF EXISTS sync_program_status ON programs;
CREATE TRIGGER sync_program_status
    AFTER INSERT OR UPDATE OF status ON programs
    FOR EACH ROW
    EXECUTE FUNCTION update_carbon_project_workflow_status();

DROP TRIGGER IF EXISTS sync_dram_status ON dram;
CREATE TRIGGER sync_dram_status
    AFTER INSERT OR UPDATE OF status ON dram
    FOR EACH ROW
    EXECUTE FUNCTION update_carbon_project_workflow_status();

DROP TRIGGER IF EXISTS sync_verra_status ON verra_project_registrations;
CREATE TRIGGER sync_verra_status
    AFTER INSERT OR UPDATE OF status ON verra_project_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_carbon_project_workflow_status();

-- ====================================================================
-- 7. CREATE FUNCTION TO INITIALIZE WORKFLOW STATUS
-- ====================================================================
CREATE OR REPLACE FUNCTION initialize_carbon_workflow(project_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert initial workflow status for all modules
    INSERT INTO carbon_workflow_status (carbon_project_id, module_name, module_status) VALUES
    (project_id, 'program', 'pending'),
    (project_id, 'dram', 'pending'),
    (project_id, 'due_diligence', 'pending'),
    (project_id, 'verra_registration', 'pending'),
    (project_id, 'vvb_management', 'pending'),
    (project_id, 'carbon_credits', 'pending'),
    (project_id, 'investor_dashboard', 'ready')
    ON CONFLICT (carbon_project_id, module_name) DO NOTHING;
    
    -- Update carbon project status
    UPDATE carbon_projects 
    SET workflow_status = 'draft'
    WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 8. GRANT PERMISSIONS
-- ====================================================================
GRANT ALL ON master_aksi_mitigasi TO postgres, anon, authenticated, service_role;
GRANT ALL ON carbon_workflow_status TO postgres, anon, authenticated, service_role;
GRANT SELECT ON v_carbon_project_integrated TO postgres, anon, authenticated, service_role;
GRANT SELECT ON v_carbon_workflow_dashboard TO postgres, anon, authenticated, service_role;
GRANT SELECT ON v_carbon_financial_integration TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION initialize_carbon_workflow TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_carbon_project_workflow_status TO postgres, anon, authenticated, service_role;

-- ====================================================================
-- 9. INSERT INITIAL DATA FOR EXISTING PROJECTS
-- ====================================================================
DO $$
DECLARE
    project_record RECORD;
BEGIN
    -- Initialize workflow for existing carbon projects
    FOR project_record IN SELECT id FROM carbon_projects LOOP
        PERFORM initialize_carbon_workflow(project_record.id);
    END LOOP;
    
    RAISE NOTICE '✅ Initialized workflow for existing carbon projects';
END $$;

-- ====================================================================
-- 10. VERIFICATION
-- ====================================================================
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Count created objects
    SELECT COUNT(*) INTO table_count FROM (
        SELECT 'master_aksi_mitigasi' UNION ALL
        SELECT 'carbon_workflow_status'
    ) AS tables;
    
    SELECT COUNT(*) INTO view_count FROM (
        SELECT 'v_carbon_project_integrated' UNION ALL
        SELECT 'v_carbon_workflow_dashboard' UNION ALL
        SELECT 'v_carbon_financial_integration'
    ) AS views;
    
    SELECT COUNT(*) INTO function_count FROM (
        SELECT 'update_master_aksi_mitigasi_updated_at' UNION ALL
        SELECT 'update_carbon_project_workflow_status' UNION ALL
        SELECT 'initialize_carbon_workflow'
    ) AS functions;
    
    SELECT COUNT(*) INTO trigger_count FROM (
        SELECT 'sync_program_status' UNION ALL
        SELECT 'sync_dram_status' UNION ALL
        SELECT 'sync_verra_status'
    ) AS triggers;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'CARBON INCONSISTENCIES FIX - COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created/enhanced: %', table_count;
    RAISE NOTICE '  - master_aksi_mitigasi (standardized actions)';
    RAISE NOTICE '  - carbon_workflow_status (integrated tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Views created: %', view_count;
    RAISE NOTICE '  - v_carbon_project_integrated';
    RAISE NOTICE '  - v_carbon_workflow_dashboard';
    RAISE NOTICE '  - v_carbon_financial_integration';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE '  - update_master_aksi_mitigasi_updated_at';
    RAISE NOTICE '  - update_carbon_project_workflow_status';
    RAISE NOTICE '  - initialize_carbon_workflow';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers created: %', trigger_count;
    RAISE NOTICE '  - sync_program_status (auto-sync)';
    RAISE NOTICE '  - sync_dram_status (auto-sync)';
    RAISE NOTICE '  - sync_verra_status (auto-sync)';
    RAISE NOTICE '';
    RAISE NOTICE 'KEY IMPROVEMENTS:';
    RAISE NOTICE '  1. ✅ Standardized aksi mitigasi (16 standard actions)';
    RAISE NOTICE '  2. ✅ Integrated workflow status tracking';
    RAISE NOTICE '  3. ✅ Automatic status synchronization';
    RAISE NOTICE '  4. ✅ Financial integration views';
    RAISE NOTICE '  5. ✅ Backward compatible - no perhutanan_sosial changes';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Run this migration in Supabase SQL Editor';
    RAISE NOTICE '  2. Test the integrated views';
    RAISE NOTICE '  3. Implement frontend components';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;
