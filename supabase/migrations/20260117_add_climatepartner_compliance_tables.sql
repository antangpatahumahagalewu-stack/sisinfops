-- Migration: Add ClimatePartner Compliance Tables
-- Date: 2026-01-17
-- Description: Add 9 new tables to comply with ClimatePartner "Application for Project Development" requirements
-- PRINCIPLE: ADDITIVE ONLY - no alterations to existing tables, only new tables with foreign keys to existing ones.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ORGANIZATIONS TABLE (Informasi Organisasi)
-- ============================================
-- Stores organization/yayasan profile information
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    legal_form VARCHAR(100) CHECK (legal_form IN ('NGO', 'SOCIAL_ENTERPRISE', 'BUSINESS', 'GOVERNMENT', 'OTHER')),
    history TEXT,
    mission TEXT,
    technical_experience TEXT,
    working_areas TEXT[],
    partners TEXT,
    years_of_operation INTEGER,
    number_of_staff INTEGER,
    annual_budget DECIMAL(15,2),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Profil organisasi/yayasan pengusul proyek';
COMMENT ON COLUMN organizations.legal_form IS 'Bentuk legal organisasi';
COMMENT ON COLUMN organizations.technical_experience IS 'Pengalaman teknis yang relevan dengan proyek karbon';
COMMENT ON COLUMN organizations.working_areas IS 'Wilayah kerja organisasi';

-- ============================================
-- 2. LAND_TENURE TABLE (Status Kepemilikan & Tenure Lahan)
-- ============================================
CREATE TABLE IF NOT EXISTS land_tenure (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    ownership_status VARCHAR(50) CHECK (ownership_status IN ('PRIVATE', 'PUBLIC', 'COMMUNAL', 'MIXED')),
    land_certificate_number VARCHAR(255),
    certificate_date DATE,
    area_ha DECIMAL(10,2),
    challenges TEXT,
    government_involvement TEXT,
    ministry_engagement TEXT,
    conflict_history TEXT,
    resolution_status VARCHAR(50) CHECK (resolution_status IN ('NONE', 'RESOLVED', 'ONGOING', 'PENDING')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE land_tenure IS 'Status kepemilikan dan tenure lahan proyek';
COMMENT ON COLUMN land_tenure.ownership_status IS 'Status kepemilikan: privat, publik, komunal, campuran';
COMMENT ON COLUMN land_tenure.challenges IS 'Tantangan kepastian lahan';
COMMENT ON COLUMN land_tenure.government_involvement IS 'Keterlibatan pemerintah dalam kepemilikan lahan';

-- ============================================
-- 3. FOREST_STATUS_HISTORY TABLE (Status Hutan 10 Tahun)
-- ============================================
CREATE TABLE IF NOT EXISTS forest_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    forest_status VARCHAR(50) CHECK (forest_status IN ('FOREST', 'NON_FOREST', 'DEGRADED_FOREST', 'OTHER')),
    definition_used VARCHAR(100) DEFAULT 'UNFCCC_DNA',
    area_ha DECIMAL(10,2),
    data_source VARCHAR(255),
    verification_method VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(perhutanan_sosial_id, year)
);

COMMENT ON TABLE forest_status_history IS 'Riwayat status hutan 10 tahun ke belakang';
COMMENT ON COLUMN forest_status_history.forest_status IS 'Status berdasarkan definisi hutan nasional (UNFCCC DNA)';
COMMENT ON COLUMN forest_status_history.definition_used IS 'Definisi hutan yang digunakan (default: UNFCCC DNA)';

-- ============================================
-- 4. DEFORESTATION_DRIVERS TABLE (Penyebab Deforestasi)
-- ============================================
CREATE TABLE IF NOT EXISTS deforestation_drivers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    driver_type VARCHAR(50) CHECK (driver_type IN ('AGRICULTURAL_EXPANSION', 'LOGGING', 'INFRASTRUCTURE', 'MINING', 'FIRE', 'OTHER')),
    driver_description TEXT NOT NULL,
    historical_trend VARCHAR(50) CHECK (historical_trend IN ('INCREASING', 'DECREASING', 'STABLE', 'FLUCTUATING')),
    intervention_activity TEXT NOT NULL,
    intervention_rationale TEXT,
    expected_impact TEXT,
    data_source VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE deforestation_drivers IS 'Penyebab deforestasi/degradasi dan aktivitas intervensi proyek';
COMMENT ON COLUMN deforestation_drivers.driver_type IS 'Jenis penyebab deforestasi';
COMMENT ON COLUMN deforestation_drivers.intervention_activity IS 'Aktivitas proyek untuk mengatasi penyebab deforestasi';

-- ============================================
-- 5. SOCIAL_MODEL_DETAILS TABLE (Detail Social Model)
-- ============================================
CREATE TABLE IF NOT EXISTS social_model_details (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    direct_beneficiaries_count INTEGER,
    households_count INTEGER,
    individuals_count INTEGER,
    social_profile TEXT,
    challenges_faced TEXT,
    measurable_benefits TEXT,
    organization_history_with_community TEXT,
    community_organization_level VARCHAR(50) CHECK (community_organization_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    community_role_in_project TEXT,
    gender_breakdown JSONB DEFAULT '{"male": 0, "female": 0, "other": 0}'::jsonb,
    age_distribution JSONB DEFAULT '{}'::jsonb,
    education_levels JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE social_model_details IS 'Detail sosial model komunitas untuk proyek';
COMMENT ON COLUMN social_model_details.social_profile IS 'Profil sosial komunitas';
COMMENT ON COLUMN social_model_details.measurable_benefits IS 'Manfaat proyek yang terukur untuk komunitas';

-- ============================================
-- 6. CARBON_MODEL_DETAILS TABLE (Detail Carbon Model)
-- ============================================
CREATE TABLE IF NOT EXISTS carbon_model_details (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('ARR', 'REDD', 'AGRICULTURE_SOIL_WATER')),
    
    -- ARR specific fields
    planting_density_per_ha DECIMAL(10,2),
    species_composition JSONB DEFAULT '{}'::jsonb,
    number_of_seedlings INTEGER,
    tree_functions TEXT[],
    mortality_rate DECIMAL(5,2),
    planting_challenges TEXT,
    
    -- REDD+ specific fields
    historical_deforestation_analysis TEXT,
    satellite_data_used TEXT,
    baseline_scenario TEXT,
    forest_protection_experience TEXT,
    
    -- Agriculture/Soil & Water specific fields
    current_practices TEXT,
    improved_practices TEXT,
    carbon_benefits_agriculture TEXT,
    farmer_benefits TEXT,
    
    general_notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE carbon_model_details IS 'Detail teknis carbon model (ARR, REDD+, Agriculture/Soil & Water)';
COMMENT ON COLUMN carbon_model_details.model_type IS 'Jenis carbon model: ARR, REDD, AGRICULTURE_SOIL_WATER';
COMMENT ON COLUMN carbon_model_details.species_composition IS 'Komposisi spesies untuk ARR (JSON: {species: percentage})';

-- ============================================
-- 7. FINANCIAL_MODEL TABLE (Model Finansial)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_model (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    planting_protection_cost_per_ha DECIMAL(15,2),
    management_human_resource_cost DECIMAL(15,2),
    community_livelihood_cost DECIMAL(15,2),
    carbon_costs_mrv_validation DECIMAL(15,2),
    carbon_costs_registry DECIMAL(15,2),
    total_project_cost DECIMAL(15,2),
    funding_sources TEXT,
    financing_plan TEXT,
    investor_partners TEXT,
    cost_breakdown JSONB DEFAULT '{}'::jsonb,
    currency VARCHAR(3) DEFAULT 'IDR',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE financial_model IS 'Model finansial proyek karbon';
COMMENT ON COLUMN financial_model.planting_protection_cost_per_ha IS 'Biaya tanam/perlindungan per hektar';
COMMENT ON COLUMN financial_model.carbon_costs_mrv_validation IS 'Biaya MRV, validasi, verifikasi';

-- ============================================
-- 8. IMPLEMENTATION_TIMELINE TABLE (Timeline Implementasi)
-- ============================================
CREATE TABLE IF NOT EXISTS implementation_timeline (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    target_area_ha DECIMAL(10,2),
    activities TEXT,
    phase VARCHAR(50) CHECK (phase IN ('PREPARATION', 'IMPLEMENTATION', 'CREDITING', 'MONITORING', 'CLOSURE')),
    carbon_credit_period BOOLEAN DEFAULT FALSE,
    implementation_period BOOLEAN DEFAULT FALSE,
    verification_frequency INTEGER,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(carbon_project_id, year)
);

COMMENT ON TABLE implementation_timeline IS 'Timeline implementasi proyek per tahun (10-30 tahun)';
COMMENT ON COLUMN implementation_timeline.target_area_ha IS 'Target luasan kegiatan per tahun (hektar)';
COMMENT ON COLUMN implementation_timeline.carbon_credit_period IS 'Apakah tahun ini termasuk periode kredit karbon';
COMMENT ON COLUMN implementation_timeline.implementation_period IS 'Apakah tahun ini termasuk periode implementasi';

-- ============================================
-- 9. PROJECT_DOCUMENTS TABLE (Dokumen Pendukung)
-- ============================================
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('KML', 'CARBON_ESTIMATE', 'MAP', 'LEGAL', 'OTHER')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    description TEXT,
    upload_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_documents IS 'Dokumen pendukung proyek (KML, estimasi karbon, dll)';
COMMENT ON COLUMN project_documents.document_type IS 'Jenis dokumen: KML, CARBON_ESTIMATE, MAP, LEGAL, OTHER';

-- ============================================
-- ADDITIVE COLUMNS TO EXISTING TABLES
-- ============================================

-- Add organization_id to perhutanan_sosial table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'perhutanan_sosial' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE perhutanan_sosial ADD COLUMN organization_id UUID REFERENCES organizations(id);
    END IF;
END $$;

-- Add initial_estimate_tco2e and verification_frequency to carbon_projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects' 
        AND column_name = 'initial_estimate_tco2e'
    ) THEN
        ALTER TABLE carbon_projects ADD COLUMN initial_estimate_tco2e DECIMAL(15,2);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects' 
        AND column_name = 'verification_frequency'
    ) THEN
        ALTER TABLE carbon_projects ADD COLUMN verification_frequency INTEGER;
    END IF;
END $$;

-- Add kml_file_url and kml_file_name to verra_project_registrations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'verra_project_registrations' 
        AND column_name = 'kml_file_url'
    ) THEN
        ALTER TABLE verra_project_registrations ADD COLUMN kml_file_url TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'verra_project_registrations' 
        AND column_name = 'kml_file_name'
    ) THEN
        ALTER TABLE verra_project_registrations ADD COLUMN kml_file_name VARCHAR(255);
    END IF;
END $$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- Land Tenure
CREATE INDEX IF NOT EXISTS idx_land_tenure_ps ON land_tenure(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_land_tenure_ownership ON land_tenure(ownership_status);

-- Forest Status History
CREATE INDEX IF NOT EXISTS idx_forest_status_ps ON forest_status_history(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_forest_status_year ON forest_status_history(year);

-- Deforestation Drivers
CREATE INDEX IF NOT EXISTS idx_deforestation_drivers_ps ON deforestation_drivers(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_deforestation_drivers_type ON deforestation_drivers(driver_type);

-- Social Model Details
CREATE INDEX IF NOT EXISTS idx_social_model_ps ON social_model_details(perhutanan_sosial_id);

-- Carbon Model Details
CREATE INDEX IF NOT EXISTS idx_carbon_model_project ON carbon_model_details(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_carbon_model_type ON carbon_model_details(model_type);

-- Financial Model
CREATE INDEX IF NOT EXISTS idx_financial_model_project ON financial_model(carbon_project_id);

-- Implementation Timeline
CREATE INDEX IF NOT EXISTS idx_implementation_timeline_project ON implementation_timeline(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_implementation_timeline_year ON implementation_timeline(year);

-- Project Documents
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(document_type);

-- Index for new column in perhutanan_sosial
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_organization ON perhutanan_sosial(organization_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_tenure ENABLE ROW LEVEL SECURITY;
ALTER TABLE forest_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deforestation_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_model_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_model_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementation_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

-- Organizations: Readable by authenticated, manageable by admin and carbon_specialist
DROP POLICY IF EXISTS "Organizations readable by authenticated users" ON organizations;
CREATE POLICY "Organizations readable by authenticated users" ON organizations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Organizations manageable by admin and carbon_specialist" ON organizations;
CREATE POLICY "Organizations manageable by admin and carbon_specialist" ON organizations
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

-- Land Tenure: Inherit permissions from perhutanan_sosial
DROP POLICY IF EXISTS "Land tenure readable by authenticated users" ON land_tenure;
CREATE POLICY "Land tenure readable by authenticated users" ON land_tenure
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Land tenure manageable by admin and carbon_specialist" ON land_tenure;
CREATE POLICY "Land tenure manageable by admin and carbon_specialist" ON land_tenure
    FOR ALL USING (
        EXISTS (SELECT 1 FROM perhutanan_sosial ps WHERE ps.id = land_tenure.perhutanan_sosial_id) AND
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

-- Forest Status History: Similar to land_tenure
DROP POLICY IF EXISTS "Forest status history readable by authenticated users" ON forest_status_history;
CREATE POLICY "Forest status history readable by authenticated users" ON forest_status_history
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Forest status history manageable by admin and carbon_specialist" ON forest_status_history;
CREATE POLICY "Forest status history manageable by admin and carbon_specialist" ON forest_status_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM perhutanan_sosial ps WHERE ps.id = forest_status_history.perhutanan_sosial_id) AND
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

-- Deforestation Drivers: Similar to land_tenure
DROP POLICY IF EXISTS "Deforestation drivers readable by authenticated users" ON deforestation_drivers;
CREATE POLICY "Deforestation drivers readable by authenticated users" ON deforestation_drivers
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Deforestation drivers manageable by admin and carbon_specialist" ON deforestation_drivers;
CREATE POLICY "Deforestation drivers manageable by admin and carbon_specialist" ON deforestation_drivers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM perhutanan_sosial ps WHERE ps.id = deforestation_drivers.perhutanan_sosial_id) AND
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

-- Social Model Details: Similar to land_tenure
DROP POLICY IF EXISTS "Social model details readable by authenticated users" ON social_model_details;
CREATE POLICY "Social model details readable by authenticated users" ON social_model_details
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Social model details manageable by admin and program_planner" ON social_model_details;
CREATE POLICY "Social model details manageable by admin and program_planner" ON social_model_details
    FOR ALL USING (
        EXISTS (SELECT 1 FROM perhutanan_sosial ps WHERE ps.id = social_model_details.perhutanan_sosial_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Carbon Model Details: Based on carbon project
DROP POLICY IF EXISTS "Carbon model details readable by authenticated users" ON carbon_model_details;
CREATE POLICY "Carbon model details readable by authenticated users" ON carbon_model_details
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Carbon model details manageable by admin and carbon_specialist" ON carbon_model_details;
CREATE POLICY "Carbon model details manageable by admin and carbon_specialist" ON carbon_model_details
    FOR ALL USING (
        EXISTS (SELECT 1 FROM carbon_projects cp WHERE cp.id = carbon_model_details.carbon_project_id) AND
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

-- Financial Model: Based on carbon project
DROP POLICY IF EXISTS "Financial model readable by authenticated users" ON financial_model;
CREATE POLICY "Financial model readable by authenticated users" ON financial_model
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Financial model manageable by admin and carbon_specialist" ON financial_model;
CREATE POLICY "Financial model manageable by admin and carbon_specialist" ON financial_model
    FOR ALL USING (
        EXISTS (SELECT 1 FROM carbon_projects cp WHERE cp.id = financial_model.carbon_project_id) AND
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

-- Implementation Timeline: Based on carbon project
DROP POLICY IF EXISTS "Implementation timeline readable by authenticated users" ON implementation_timeline;
CREATE POLICY "Implementation timeline readable by authenticated users" ON implementation_timeline
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Implementation timeline manageable by admin and program_planner" ON implementation_timeline;
CREATE POLICY "Implementation timeline manageable by admin and program_planner" ON implementation_timeline
    FOR ALL USING (
        EXISTS (SELECT 1 FROM carbon_projects cp WHERE cp.id = implementation_timeline.carbon_project_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Project Documents: Based on carbon project
DROP POLICY IF EXISTS "Project documents readable by authenticated users" ON project_documents;
CREATE POLICY "Project documents readable by authenticated users" ON project_documents
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Project documents manageable by admin and carbon_specialist" ON project_documents;
CREATE POLICY "Project documents manageable by admin and carbon_specialist" ON project_documents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM carbon_projects cp WHERE cp.id = project_documents.carbon_project_id) AND
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
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_land_tenure_updated_at ON land_tenure;
CREATE TRIGGER update_land_tenure_updated_at
    BEFORE UPDATE ON land_tenure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forest_status_history_updated_at ON forest_status_history;
CREATE TRIGGER update_forest_status_history_updated_at
    BEFORE UPDATE ON forest_status_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deforestation_drivers_updated_at ON deforestation_drivers;
CREATE TRIGGER update_deforestation_drivers_updated_at
    BEFORE UPDATE ON deforestation_drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_model_details_updated_at ON social_model_details;
CREATE TRIGGER update_social_model_details_updated_at
    BEFORE UPDATE ON social_model_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carbon_model_details_updated_at ON carbon_model_details;
CREATE TRIGGER update_carbon_model_details_updated_at
    BEFORE UPDATE ON carbon_model_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_model_updated_at ON financial_model;
CREATE TRIGGER update_financial_model_updated_at
    BEFORE UPDATE ON financial_model
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_implementation_timeline_updated_at ON implementation_timeline;
CREATE TRIGGER update_implementation_timeline_updated_at
    BEFORE UPDATE ON implementation_timeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_documents_updated_at ON project_documents;
CREATE TRIGGER update_project_documents_updated_at
    BEFORE UPDATE ON project_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================
-- Apply audit_trigger_function to all new tables
DROP TRIGGER IF EXISTS audit_organizations ON organizations;
CREATE TRIGGER audit_organizations
    AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_land_tenure ON land_tenure;
CREATE TRIGGER audit_land_tenure
    AFTER INSERT OR UPDATE OR DELETE ON land_tenure
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_forest_status_history ON forest_status_history;
CREATE TRIGGER audit_forest_status_history
    AFTER INSERT OR UPDATE OR DELETE ON forest_status_history
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_deforestation_drivers ON deforestation_drivers;
CREATE TRIGGER audit_deforestation_drivers
    AFTER INSERT OR UPDATE OR DELETE ON deforestation_drivers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_social_model_details ON social_model_details;
CREATE TRIGGER audit_social_model_details
    AFTER INSERT OR UPDATE OR DELETE ON social_model_details
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_carbon_model_details ON carbon_model_details;
CREATE TRIGGER audit_carbon_model_details
    AFTER INSERT OR UPDATE OR DELETE ON carbon_model_details
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_financial_model ON financial_model;
CREATE TRIGGER audit_financial_model
    AFTER INSERT OR UPDATE OR DELETE ON financial_model
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_implementation_timeline ON implementation_timeline;
CREATE TRIGGER audit_implementation_timeline
    AFTER INSERT OR UPDATE OR DELETE ON implementation_timeline
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_project_documents ON project_documents;
CREATE TRIGGER audit_project_documents
    AFTER INSERT OR UPDATE OR DELETE ON project_documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration adds 9 new tables for ClimatePartner compliance:
-- 1. organizations
-- 2. land_tenure
-- 3. forest_status_history
-- 4. deforestation_drivers
-- 5. social_model_details
-- 6. carbon_model_details
-- 7. financial_model
-- 8. implementation_timeline
-- 9. project_documents
--
-- Also adds 3 columns to existing tables:
-- - perhutanan_sosial.organization_id
-- - carbon_projects.initial_estimate_tco2e
-- - carbon_projects.verification_frequency
-- - verra_project_registrations.kml_file_url
-- - verra_project_registrations.kml_file_name
--
-- All tables have proper RLS policies, indexes, audit triggers, and updated_at triggers.
-- No breaking changes to existing functionality.
