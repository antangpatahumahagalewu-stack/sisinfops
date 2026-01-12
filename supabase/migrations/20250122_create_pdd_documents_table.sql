-- Migration: Create PDD Documents Table
-- Date: 2025-01-22
-- Description: Add table for storing generated Project Design Documents (PDD)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PDD DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pdd_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    status VARCHAR(20) CHECK (status IN ('draft', 'generated', 'reviewed', 'approved', 'submitted', 'archived')),
    format VARCHAR(10) CHECK (format IN ('docx', 'pdf', 'html', 'json')),
    file_url TEXT,
    file_size BIGINT,
    generated_by UUID REFERENCES profiles(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    submitted_to VARCHAR(255), -- e.g., "VERRA", "Gold Standard", "Indonesia Carbon Registry"
    submitted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    sections_completed JSONB DEFAULT '{}'::jsonb,
    data_sources JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PDD SECTIONS TABLE (for versioning and collaboration)
-- ============================================
CREATE TABLE IF NOT EXISTS pdd_sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pdd_document_id UUID REFERENCES pdd_documents(id) ON DELETE CASCADE,
    section_code VARCHAR(50) NOT NULL, -- e.g., "A.1", "B.2", "C.3"
    section_title VARCHAR(255) NOT NULL,
    content TEXT,
    version INTEGER DEFAULT 1,
    status VARCHAR(20) CHECK (status IN ('draft', 'completed', 'reviewed', 'approved')),
    last_modified_by UUID REFERENCES profiles(id),
    last_modified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pdd_document_id, section_code, version)
);

-- ============================================
-- 3. PDD GENERATION LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pdd_generation_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pdd_document_id UUID REFERENCES pdd_documents(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'generate', 'regenerate', 'update', 'export'
    status VARCHAR(20) CHECK (status IN ('started', 'success', 'failed')),
    error_message TEXT,
    data_snapshot JSONB, -- snapshot of data used for generation
    generated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- PDD Documents
CREATE INDEX IF NOT EXISTS idx_pdd_documents_carbon_project ON pdd_documents(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_pdd_documents_status ON pdd_documents(status);
CREATE INDEX IF NOT EXISTS idx_pdd_documents_generated_at ON pdd_documents(generated_at);

-- PDD Sections
CREATE INDEX IF NOT EXISTS idx_pdd_sections_document ON pdd_sections(pdd_document_id);
CREATE INDEX IF NOT EXISTS idx_pdd_sections_section_code ON pdd_sections(section_code);
CREATE INDEX IF NOT EXISTS idx_pdd_sections_status ON pdd_sections(status);

-- PDD Generation Logs
CREATE INDEX IF NOT EXISTS idx_pdd_logs_document ON pdd_generation_logs(pdd_document_id);
CREATE INDEX IF NOT EXISTS idx_pdd_logs_created_at ON pdd_generation_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE pdd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdd_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdd_generation_logs ENABLE ROW LEVEL SECURITY;

-- PDD Documents: Readable by all authenticated users, manageable by admin and carbon specialists
DROP POLICY IF EXISTS "PDD documents readable by authenticated users" ON pdd_documents;
CREATE POLICY "PDD documents readable by authenticated users" ON pdd_documents
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "PDD documents manageable by admin and carbon specialist" ON pdd_documents;
CREATE POLICY "PDD documents manageable by admin and carbon specialist" ON pdd_documents
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

-- PDD Sections: Inherit permissions from parent PDD document
DROP POLICY IF EXISTS "PDD sections readable by authenticated users" ON pdd_sections;
CREATE POLICY "PDD sections readable by authenticated users" ON pdd_sections
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "PDD sections manageable by admin and carbon specialist" ON pdd_sections;
CREATE POLICY "PDD sections manageable by admin and carbon specialist" ON pdd_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM pdd_documents pd 
            WHERE pd.id = pdd_sections.pdd_document_id
        ) AND
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

-- PDD Generation Logs: Readable by admin and carbon specialists
DROP POLICY IF EXISTS "PDD generation logs readable by admin and carbon specialist" ON pdd_generation_logs;
CREATE POLICY "PDD generation logs readable by admin and carbon specialist" ON pdd_generation_logs
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
DROP TRIGGER IF EXISTS update_pdd_documents_updated_at ON pdd_documents;
CREATE TRIGGER update_pdd_documents_updated_at
    BEFORE UPDATE ON pdd_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdd_sections_updated_at ON pdd_sections;
CREATE TRIGGER update_pdd_sections_updated_at
    BEFORE UPDATE ON pdd_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS audit_pdd_documents ON pdd_documents;
CREATE TRIGGER audit_pdd_documents
    AFTER INSERT OR UPDATE OR DELETE ON pdd_documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_pdd_sections ON pdd_sections;
CREATE TRIGGER audit_pdd_sections
    AFTER INSERT OR UPDATE OR DELETE ON pdd_sections
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE pdd_documents IS 'Stores generated Project Design Documents for carbon projects';
COMMENT ON TABLE pdd_sections IS 'Stores individual sections of PDD for versioning and collaboration';
COMMENT ON TABLE pdd_generation_logs IS 'Audit log for PDD generation activities';

-- ============================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================
-- Insert sample PDD document if in development environment
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM carbon_projects LIMIT 1) THEN
        INSERT INTO pdd_documents (carbon_project_id, version, status, format, metadata)
        SELECT 
            id,
            '1.0',
            'generated',
            'docx',
            '{"sections": ["A.1", "B.2", "C.3"], "template": "verra_v5"}'::jsonb
        FROM carbon_projects 
        WHERE status = 'active'
        LIMIT 1
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- MIGRATION SUCCESS MESSAGE
-- ============================================
-- This migration adds 3 new tables for PDD document management:
-- 1. pdd_documents - Main table for PDD documents
-- 2. pdd_sections - For section-level versioning
-- 3. pdd_generation_logs - For audit trail
-- All tables have RLS policies and audit triggers.
