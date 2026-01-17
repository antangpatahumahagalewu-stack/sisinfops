-- Migration: Create Verra Compliance Tables
-- Date: 2026-01-14
-- Description: Add tables for Verra Registry compliance including VVB management,
--              carbon credit issuance, methodology compliance, and registry integration
-- PRINCIPLE: ADDITIVE ONLY - no alterations to existing tables, only new tables with foreign keys to existing ones.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. VERRA_PROJECT_REGISTRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS verra_project_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    verra_project_id VARCHAR(100) UNIQUE, -- Project ID di Verra Registry
    vcs_version VARCHAR(20) NOT NULL DEFAULT 'v5.0',
    methodology_code VARCHAR(50) NOT NULL, -- e.g., VM00XX
    project_type VARCHAR(50) CHECK (project_type IN ('AR', 'IFM', 'REDD', 'A/RR', 'ENERGY', 'OTHER')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'internal_review', 'vvb_appointed', 'under_validation',
        'validated', 'submitted_to_verra', 'registered', 'under_monitoring',
        'under_verification', 'verified', 'issued', 'suspended', 'terminated'
    )),
    registration_date DATE,
    validation_date DATE,
    verification_date DATE,
    first_issuance_date DATE,
    crediting_period_start DATE,
    crediting_period_end DATE,
    total_credits_issued DECIMAL(15,2) DEFAULT 0,
    total_credits_retired DECIMAL(15,2) DEFAULT 0,
    registry_account_number VARCHAR(100),
    registry_account_name VARCHAR(255),
    last_sync_date TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'failed', 'in_progress')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE verra_project_registrations IS 'Tracking registrasi proyek ke Verra Registry';
COMMENT ON COLUMN verra_project_registrations.verra_project_id IS 'Project ID di Verra Registry (contoh: VCS-1234)';
COMMENT ON COLUMN verra_project_registrations.methodology_code IS 'Kode metodologi Verra (contoh: VM0007, VM0015)';

-- ============================================
-- 2. VVB_ORGANIZATIONS TABLE (Validation & Verification Bodies)
-- ============================================
CREATE TABLE IF NOT EXISTS vvb_organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vvb_code VARCHAR(50) UNIQUE NOT NULL, -- Kode VVB di Verra
    organization_name VARCHAR(255) NOT NULL,
    accreditation_status VARCHAR(50) CHECK (accreditation_status IN ('active', 'suspended', 'withdrawn', 'expired')),
    accreditation_expiry DATE,
    countries_accredited TEXT[], -- Array of country codes
    methodologies_accredited TEXT[], -- Array of methodology codes
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE vvb_organizations IS 'Daftar VVB (Validation & Verification Bodies) terakreditasi Verra';

-- ============================================
-- 3. VVB_ENGAGEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vvb_engagements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    verra_project_registration_id UUID REFERENCES verra_project_registrations(id) ON DELETE CASCADE,
    vvb_organization_id UUID REFERENCES vvb_organizations(id) ON DELETE SET NULL,
    engagement_type VARCHAR(50) CHECK (engagement_type IN ('validation', 'verification', 'both')),
    contract_number VARCHAR(100),
    contract_date DATE,
    contract_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'contract_signed', 'desk_review', 'site_visit_scheduled',
        'site_visit_completed', 'assessment_report', 'car_issued',
        'car_resolved', 'statement_issued', 'completed'
    )),
    contract_document_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE vvb_engagements IS 'Kontrak dan engagement dengan VVB untuk validation/verification';

-- ============================================
-- 4. CORRECTIVE_ACTIONS TABLE (CARs from VVB)
-- ============================================
CREATE TABLE IF NOT EXISTS corrective_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vvb_engagement_id UUID REFERENCES vvb_engagements(id) ON DELETE CASCADE,
    car_number VARCHAR(50) NOT NULL,
    car_type VARCHAR(50) CHECK (car_type IN ('major', 'minor', 'observation')),
    description TEXT NOT NULL,
    requirement TEXT NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'rejected')),
    resolution_description TEXT,
    resolved_date DATE,
    resolved_by UUID REFERENCES profiles(id),
    supporting_documents_url TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE corrective_actions IS 'Corrective Action Requests (CARs) dari VVB';

-- ============================================
-- 5. CARBON_CREDITS TABLE (VCU Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS carbon_credits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    verra_project_registration_id UUID REFERENCES verra_project_registrations(id) ON DELETE CASCADE,
    vintage_year INTEGER NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL, -- VCU Serial Number
    batch_number VARCHAR(50) NOT NULL,
    issuance_date DATE NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'retired', 'cancelled', 'transferred', 'pending')),
    retirement_date DATE,
    retirement_reason TEXT,
    retirement_beneficiary VARCHAR(255),
    registry_transaction_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE carbon_credits IS 'Verified Carbon Unit (VCU) tracking';
COMMENT ON COLUMN carbon_credits.serial_number IS 'VCU Serial Number (contoh: VCS-1234-2018-0001-0001)';

-- ============================================
-- 6. ISSUANCE_BATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS issuance_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    verra_project_registration_id UUID REFERENCES verra_project_registrations(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    monitoring_period_start DATE NOT NULL,
    monitoring_period_end DATE NOT NULL,
    total_vcus DECIMAL(15,2) NOT NULL,
    issuance_request_date DATE,
    issuance_approval_date DATE,
    verification_report_url TEXT,
    monitoring_report_url TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'monitoring_completed', 'verification_requested',
        'under_verification', 'verification_completed', 'issuance_requested',
        'under_review', 'issued', 'rejected'
    )),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE issuance_batches IS 'Batch issuance untuk monitoring period tertentu';

-- ============================================
-- 7. METHODOLOGY_LIBRARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS methodology_library (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    methodology_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., VM0007
    methodology_name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    sector VARCHAR(100),
    applicable_activities TEXT[],
    applicability_conditions TEXT,
    documents_url TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    verra_approval_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE methodology_library IS 'Library metodologi Verra VCS';

-- ============================================
-- 8. METHODOLOGY_COMPLIANCE_CHECKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS methodology_compliance_checks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    verra_project_registration_id UUID REFERENCES verra_project_registrations(id) ON DELETE CASCADE,
    methodology_code VARCHAR(50) NOT NULL,
    check_category VARCHAR(100) NOT NULL,
    check_item VARCHAR(255) NOT NULL,
    requirement_description TEXT NOT NULL,
    compliance_status VARCHAR(50) DEFAULT 'not_checked' CHECK (compliance_status IN ('not_checked', 'compliant', 'non_compliant', 'partial')),
    evidence_description TEXT,
    evidence_url TEXT[],
    checked_by UUID REFERENCES profiles(id),
    checked_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE methodology_compliance_checks IS 'Tracking compliance dengan requirement metodologi';

-- ============================================
-- 9. VERRA_DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS verra_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    verra_project_registration_id UUID REFERENCES verra_project_registrations(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'PDD', 'MONITORING_REPORT', 'VALIDATION_REPORT', 'VERIFICATION_REPORT',
        'ISSUANCE_REQUEST', 'CAR_RESPONSE', 'REGISTRY_SUBMISSION', 'OTHER'
    )),
    document_version VARCHAR(20) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
    verra_submission_date DATE,
    verra_status VARCHAR(50) CHECK (verra_status IN ('draft', 'submitted', 'approved', 'rejected', 'pending')),
    verra_reference_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE verra_documents IS 'Dokumen spesifik untuk Verra submission';

-- ============================================
-- 10. VERRA_REGISTRY_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS verra_registry_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    verra_project_registration_id UUID REFERENCES verra_project_registrations(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'sync', 'submission', 'status_check', 'download', 'upload', 'api_call'
    )),
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    executed_by UUID REFERENCES profiles(id),
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE verra_registry_logs IS 'Audit log untuk interaksi dengan Verra Registry API';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Verra Project Registrations
CREATE INDEX IF NOT EXISTS idx_verra_registrations_project ON verra_project_registrations(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_verra_registrations_status ON verra_project_registrations(status);
CREATE INDEX IF NOT EXISTS idx_verra_registrations_verra_id ON verra_project_registrations(verra_project_id);

-- VVB Organizations
CREATE INDEX IF NOT EXISTS idx_vvb_organizations_active ON vvb_organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_vvb_organizations_accreditation ON vvb_organizations(accreditation_status);

-- VVB Engagements
CREATE INDEX IF NOT EXISTS idx_vvb_engagements_project ON vvb_engagements(verra_project_registration_id);
CREATE INDEX IF NOT EXISTS idx_vvb_engagements_vvb ON vvb_engagements(vvb_organization_id);
CREATE INDEX IF NOT EXISTS idx_vvb_engagements_status ON vvb_engagements(status);

-- Corrective Actions
CREATE INDEX IF NOT EXISTS idx_corrective_actions_engagement ON corrective_actions(vvb_engagement_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due_date ON corrective_actions(due_date);

-- Carbon Credits
CREATE INDEX IF NOT EXISTS idx_carbon_credits_project ON carbon_credits(verra_project_registration_id);
CREATE INDEX IF NOT EXISTS idx_carbon_credits_status ON carbon_credits(status);
CREATE INDEX IF NOT EXISTS idx_carbon_credits_vintage ON carbon_credits(vintage_year);
CREATE INDEX IF NOT EXISTS idx_carbon_credits_serial ON carbon_credits(serial_number);

-- Issuance Batches
CREATE INDEX IF NOT EXISTS idx_issuance_batches_project ON issuance_batches(verra_project_registration_id);
CREATE INDEX IF NOT EXISTS idx_issuance_batches_status ON issuance_batches(status);
CREATE INDEX IF NOT EXISTS idx_issuance_batches_monitoring ON issuance_batches(monitoring_period_start, monitoring_period_end);

-- Methodology Library
CREATE INDEX IF NOT EXISTS idx_methodology_library_code ON methodology_library(methodology_code);
CREATE INDEX IF NOT EXISTS idx_methodology_library_active ON methodology_library(is_active);

-- Methodology Compliance Checks
CREATE INDEX IF NOT EXISTS idx_methodology_checks_project ON methodology_compliance_checks(verra_project_registration_id);
CREATE INDEX IF NOT EXISTS idx_methodology_checks_status ON methodology_compliance_checks(compliance_status);

-- Verra Documents
CREATE INDEX IF NOT EXISTS idx_verra_documents_project ON verra_documents(verra_project_registration_id);
CREATE INDEX IF NOT EXISTS idx_verra_documents_type ON verra_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_verra_documents_status ON verra_documents(verra_status);

-- Verra Registry Logs
CREATE INDEX IF NOT EXISTS idx_verra_logs_project ON verra_registry_logs(verra_project_registration_id);
CREATE INDEX IF NOT EXISTS idx_verra_logs_action ON verra_registry_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_verra_logs_executed_at ON verra_registry_logs(executed_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================
ALTER TABLE verra_project_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vvb_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vvb_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE methodology_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE methodology_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE verra_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verra_registry_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR VERRA COMPLIANCE TABLES
-- ============================================

-- Verra Project Registrations: Readable by authenticated, manageable by admin and carbon_specialist
DROP POLICY IF EXISTS "Verra registrations readable by authenticated users" ON verra_project_registrations;
CREATE POLICY "Verra registrations readable by authenticated users" ON verra_project_registrations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Verra registrations manageable by admin and carbon_specialist" ON verra_project_registrations;
CREATE POLICY "Verra registrations manageable by admin and carbon_specialist" ON verra_project_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- VVB Organizations: Readable by all authenticated users
DROP POLICY IF EXISTS "VVB organizations readable by authenticated users" ON vvb_organizations;
CREATE POLICY "VVB organizations readable by authenticated users" ON vvb_organizations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "VVB organizations manageable by admin and carbon_specialist" ON vvb_organizations;
CREATE POLICY "VVB organizations manageable by admin and carbon_specialist" ON vvb_organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- VVB Engagements: Inherit permissions from parent registration
DROP POLICY IF EXISTS "VVB engagements readable by authenticated users" ON vvb_engagements;
CREATE POLICY "VVB engagements readable by authenticated users" ON vvb_engagements
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "VVB engagements manageable by admin and carbon_specialist" ON vvb_engagements;
CREATE POLICY "VVB engagements manageable by admin and carbon_specialist" ON vvb_engagements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM verra_project_registrations vpr WHERE vpr.id = vvb_engagements.verra_project_registration_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Corrective Actions: Inherit permissions from parent engagement
DROP POLICY IF EXISTS "Corrective actions readable by authenticated users" ON corrective_actions;
CREATE POLICY "Corrective actions readable by authenticated users" ON corrective_actions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Corrective actions manageable by admin and carbon_specialist" ON corrective_actions;
CREATE POLICY "Corrective actions manageable by admin and carbon_specialist" ON corrective_actions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM vvb_engagements ve WHERE ve.id = corrective_actions.vvb_engagement_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Carbon Credits: Readable by authenticated, manageable by admin and carbon_specialist
DROP POLICY IF EXISTS "Carbon credits readable by authenticated users" ON carbon_credits;
CREATE POLICY "Carbon credits readable by authenticated users" ON carbon_credits
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Carbon credits manageable by admin and carbon_specialist" ON carbon_credits;
CREATE POLICY "Carbon credits manageable by admin and carbon_specialist" ON carbon_credits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Issuance Batches: Similar permissions as carbon credits
DROP POLICY IF EXISTS "Issuance batches readable by authenticated users" ON issuance_batches;
CREATE POLICY "Issuance batches readable by authenticated users" ON issuance_batches
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Issuance batches manageable by admin and carbon_specialist" ON issuance_batches;
CREATE POLICY "Issuance batches manageable by admin and carbon_specialist" ON issuance_batches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Methodology Library: Readable by all, manageable by admin and carbon_specialist
DROP POLICY IF EXISTS "Methodology library readable by authenticated users" ON methodology_library;
CREATE POLICY "Methodology library readable by authenticated users" ON methodology_library
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Methodology library manageable by admin and carbon_specialist" ON methodology_library;
CREATE POLICY "Methodology library manageable by admin and carbon_specialist" ON methodology_library
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Methodology Compliance Checks: Inherit permissions from parent registration
DROP POLICY IF EXISTS "Methodology checks readable by authenticated users" ON methodology_compliance_checks;
CREATE POLICY "Methodology checks readable by authenticated users" ON methodology_compliance_checks
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Methodology checks manageable by admin and carbon_specialist" ON methodology_compliance_checks;
CREATE POLICY "Methodology checks manageable by admin and carbon_specialist" ON methodology_compliance_checks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM verra_project_registrations vpr WHERE vpr.id = methodology_compliance_checks.verra_project_registration_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Verra Documents: Inherit permissions from parent registration
DROP POLICY IF EXISTS "Verra documents readable by authenticated users" ON verra_documents;
CREATE POLICY "Verra documents readable by authenticated users" ON verra_documents
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Verra documents manageable by admin and carbon_specialist" ON verra_documents;
CREATE POLICY "Verra documents manageable by admin and carbon_specialist" ON verra_documents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM verra_project_registrations vpr WHERE vpr.id = verra_documents.verra_project_registration_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Verra Registry Logs: Readable by admin and carbon_specialist only
DROP POLICY IF EXISTS "Verra logs readable by admin and carbon_specialist" ON verra_registry_logs;
CREATE POLICY "Verra logs readable by admin and carbon_specialist" ON verra_registry_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
-- Apply update_updated_at_column trigger to all new tables
DROP TRIGGER IF EXISTS update_verra_registrations_updated_at ON verra_project_registrations;
CREATE TRIGGER update_verra_registrations_updated_at
    BEFORE UPDATE ON verra_project_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vvb_organizations_updated_at ON vvb_organizations;
CREATE TRIGGER update_vvb_organizations_updated_at
    BEFORE UPDATE ON vvb_organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vvb_engagements_updated_at ON vvb_engagements;
CREATE TRIGGER update_vvb_engagements_updated_at
    BEFORE UPDATE ON vvb_engagements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_corrective_actions_updated_at ON corrective_actions;
CREATE TRIGGER update_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carbon_credits_updated_at ON carbon_credits;
CREATE TRIGGER update_carbon_credits_updated_at
    BEFORE UPDATE ON carbon_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_issuance_batches_updated_at ON issuance_batches;
CREATE TRIGGER update_issuance_batches_updated_at
    BEFORE UPDATE ON issuance_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_methodology_library_updated_at ON methodology_library;
CREATE TRIGGER update_methodology_library_updated_at
    BEFORE UPDATE ON methodology_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_methodology_checks_updated_at ON methodology_compliance_checks;
CREATE TRIGGER update_methodology_checks_updated_at
    BEFORE UPDATE ON methodology_compliance_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_verra_documents_updated_at ON verra_documents;
CREATE TRIGGER update_verra_documents_updated_at
    BEFORE UPDATE ON verra_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================
-- Apply audit_trigger_function to all new tables
DROP TRIGGER IF EXISTS audit_verra_registrations ON verra_project_registrations;
CREATE TRIGGER audit_verra_registrations
    AFTER INSERT OR UPDATE OR DELETE ON verra_project_registrations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_vvb_organizations ON vvb_organizations;
CREATE TRIGGER audit_vvb_organizations
    AFTER INSERT OR UPDATE OR DELETE ON vvb_organizations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_vvb_engagements ON vvb_engagements;
CREATE TRIGGER audit_vvb_engagements
    AFTER INSERT OR UPDATE OR DELETE ON vvb_engagements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_corrective_actions ON corrective_actions;
CREATE TRIGGER audit_corrective_actions
    AFTER INSERT OR UPDATE OR DELETE ON corrective_actions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_carbon_credits ON carbon_credits;
CREATE TRIGGER audit_carbon_credits
    AFTER INSERT OR UPDATE OR DELETE ON carbon_credits
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_issuance_batches ON issuance_batches;
CREATE TRIGGER audit_issuance_batches
    AFTER INSERT OR UPDATE OR DELETE ON issuance_batches
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_methodology_library ON methodology_library;
CREATE TRIGGER audit_methodology_library
    AFTER INSERT OR UPDATE OR DELETE ON methodology_library
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_methodology_checks ON methodology_compliance_checks;
CREATE TRIGGER audit_methodology_checks
    AFTER INSERT OR UPDATE OR DELETE ON methodology_compliance_checks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_verra_documents ON verra_documents;
CREATE TRIGGER audit_verra_documents
    AFTER INSERT OR UPDATE OR DELETE ON verra_documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_verra_registry_logs ON verra_registry_logs;
CREATE TRIGGER audit_verra_registry_logs
    AFTER INSERT OR UPDATE OR DELETE ON verra_registry_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================
-- Insert sample VVB organizations
INSERT INTO vvb_organizations (vvb_code, organization_name, accreditation_status, accreditation_expiry, countries_accredited, methodologies_accredited) VALUES
('VVB001', 'SGS United Kingdom Ltd.', 'active', '2026-12-31', ARRAY['GB', 'ID', 'MY'], ARRAY['VM0007', 'VM0015', 'VM0017']),
('VVB002', 'TÜV SÜD South Asia Pvt. Ltd.', 'active', '2025-11-30', ARRAY['IN', 'ID', 'TH'], ARRAY['VM0007', 'VM0015']),
('VVB003', 'AENOR Internacional S.A.U.', 'active', '2026-06-30', ARRAY['ES', 'ID', 'BR'], ARRAY['VM0007', 'VM0015', 'VM0033'])
ON CONFLICT (vvb_code) DO NOTHING;

-- Insert sample methodologies
INSERT INTO methodology_library (methodology_code, methodology_name, version, sector, applicable_activities) VALUES
('VM0007', 'REDD+ Methodology Framework (REDD+ MF)', 'v1.6', 'Forestry', ARRAY['REDD', 'IFM']),
('VM0015', 'Methodology for Improved Forest Management through Extension of Rotation Age', 'v1.0', 'Forestry', ARRAY['IFM']),
('VM0017', 'Methodology for Afforestation and Reforestation of Degraded Land', 'v1.0', 'Forestry', ARRAY['AR']),
('VM0033', 'Methodology for Improved Forest Management through Reduced Impact Logging', 'v1.0', 'Forestry', ARRAY['IFM'])
ON CONFLICT (methodology_code) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration adds 10 new tables for Verra Registry Compliance
-- Total tables added: verra_project_registrations, vvb_organizations, vvb_engagements,
-- corrective_actions, carbon_credits, issuance_batches, methodology_library,
-- methodology_compliance_checks, verra_documents, verra_registry_logs
-- All tables have RLS policies, audit triggers, and proper indexes.
-- No existing tables were altered.
