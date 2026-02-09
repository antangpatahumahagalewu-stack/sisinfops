-- Migration: Create stakeholders table for stakeholder management and FPIC tracking
-- Generated at: 2026-02-02 10:52 AM
-- Run this SQL in Supabase SQL editor

-- ======================
-- 1. Create stakeholders table
-- ======================
CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Basic Information
    nama_stakeholder VARCHAR(255) NOT NULL,
    organisasi VARCHAR(255),
    email VARCHAR(255),
    telepon VARCHAR(50),
    alamat TEXT,
    
    -- Category & Influence
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN (
        'government', 'community', 'ngo_cso', 'investor', 'academic',
        'private_sector', 'media', 'international_organization', 'other'
    )),
    tingkat_pengaruh VARCHAR(20) DEFAULT 'medium' CHECK (tingkat_pengaruh IN ('low', 'medium', 'high')),
    
    -- Project/Program Association (temporary without foreign key constraints)
    kode_project VARCHAR(100),
    program_id VARCHAR(100),
    
    -- FPIC (Free, Prior and Informed Consent) Information
    fpic_status VARCHAR(20) DEFAULT 'not_started' CHECK (fpic_status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
    tanggal_fpic DATE,
    dokumen_fpic_url TEXT,
    
    -- Engagement Tracking
    jenis_engagement VARCHAR(100),
    tanggal_engagement_terakhir DATE,
    catatan_engagement TEXT,
    frekuensi_engagement VARCHAR(50),
    
    -- Risk Assessment
    level_risiko VARCHAR(20) DEFAULT 'low' CHECK (level_risiko IN ('low', 'medium', 'high')),
    catatan_khusus TEXT,
    
    -- Status & Metadata
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Additional Contact Information
    jabatan VARCHAR(100),
    website VARCHAR(255),
    social_media JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints and Indexes
    CONSTRAINT stakeholders_email_unique UNIQUE (email)
);

-- ======================
-- 2. Create indexes for performance
-- ======================
CREATE INDEX IF NOT EXISTS idx_stakeholders_nama_stakeholder ON stakeholders(nama_stakeholder);
CREATE INDEX IF NOT EXISTS idx_stakeholders_kategori ON stakeholders(kategori);
CREATE INDEX IF NOT EXISTS idx_stakeholders_fpic_status ON stakeholders(fpic_status);
CREATE INDEX IF NOT EXISTS idx_stakeholders_tingkat_pengaruh ON stakeholders(tingkat_pengaruh);
CREATE INDEX IF NOT EXISTS idx_stakeholders_kode_project ON stakeholders(kode_project);
CREATE INDEX IF NOT EXISTS idx_stakeholders_program_id ON stakeholders(program_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_status_aktif ON stakeholders(status_aktif);
CREATE INDEX IF NOT EXISTS idx_stakeholders_created_at ON stakeholders(created_at);

-- ======================
-- 3. Create updated_at trigger
-- ======================
-- Use existing function update_updated_at_column()
DROP TRIGGER IF EXISTS update_stakeholders_updated_at ON stakeholders;
CREATE TRIGGER update_stakeholders_updated_at
    BEFORE UPDATE ON stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- 4. Insert sample data (optional - for testing)
-- ======================
-- Uncomment below if you want to insert sample data
/*
INSERT INTO stakeholders (
    nama_stakeholder,
    organisasi,
    email,
    kategori,
    tingkat_pengaruh,
    fpic_status,
    status_aktif
) VALUES 
    ('Dinas Kehutanan Provinsi Kalimantan Tengah', 'Pemerintah Provinsi Kalimantan Tengah', 'dishut@kaltengprov.go.id', 'government', 'high', 'completed', true),
    ('Komunitas Adat Dayak Ngaju', 'Lembaga Adat Dayak Ngaju', 'dayakngaju@community.org', 'community', 'high', 'in_progress', true),
    ('Yayasan Borneo Orangutan Survival', 'BOS Foundation', 'info@borneoorangutansurvival.org', 'ngo_cso', 'medium', 'not_started', true),
    ('PT. Carbon Investment Indonesia', 'Carbon Investment Group', 'contact@carboninvestment.co.id', 'investor', 'high', 'completed', true),
    ('Universitas Palangka Raya', 'Fakultas Kehutanan UNPAR', 'kehutanan@unpar.ac.id', 'academic', 'medium', 'not_started', true),
    ('PT. Sinar Mas Forestry', 'Sinar Mas Group', 'forestry@sinarmas.com', 'private_sector', 'medium', 'in_progress', true)
ON CONFLICT (email) DO UPDATE SET
    nama_stakeholder = EXCLUDED.nama_stakeholder,
    organisasi = EXCLUDED.organisasi,
    kategori = EXCLUDED.kategori,
    updated_at = NOW();
*/

-- ======================
-- 5. Create RLS (Row Level Security) policies
-- ======================
-- Enable RLS
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to view stakeholders
CREATE POLICY "Allow authenticated users to view stakeholders" ON stakeholders
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy 2: Allow admin and carbon_specialist to insert stakeholders
CREATE POLICY "Allow admin and carbon_specialist to insert stakeholders" ON stakeholders
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'carbon_specialist', 'program_planner')
            )
        )
    );

-- Policy 3: Allow admin and carbon_specialist to update stakeholders
CREATE POLICY "Allow admin and carbon_specialist to update stakeholders" ON stakeholders
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'carbon_specialist', 'program_planner')
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'carbon_specialist', 'program_planner')
            )
        )
    );

-- Policy 4: Allow only admin to delete stakeholders
CREATE POLICY "Allow only admin to delete stakeholders" ON stakeholders
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'admin'
            )
        )
    );

-- ======================
-- 6. Grant permissions
-- ======================
GRANT ALL ON stakeholders TO postgres, anon, authenticated, service_role;

-- ======================
-- 7. Comments
-- ======================
COMMENT ON TABLE stakeholders IS 'Table for managing stakeholders and FPIC (Free, Prior and Informed Consent) tracking';
COMMENT ON COLUMN stakeholders.kategori IS 'Category of stakeholder: government, community, ngo_cso, investor, academic, private_sector, media, international_organization, other';
COMMENT ON COLUMN stakeholders.tingkat_pengaruh IS 'Level of influence: low, medium, high';
COMMENT ON COLUMN stakeholders.fpic_status IS 'FPIC process status: not_started, in_progress, completed, on_hold';
COMMENT ON COLUMN stakeholders.level_risiko IS 'Risk level associated with the stakeholder: low, medium, high';

-- ======================
-- 8. Verification
-- ======================
DO $$
BEGIN
    RAISE NOTICE 'Stakeholders table migration completed successfully.';
    RAISE NOTICE 'Table stakeholders created with RLS policies for:';
    RAISE NOTICE '- All authenticated users can view stakeholders';
    RAISE NOTICE '- Admin, carbon_specialist, program_planner can insert/update stakeholders';
    RAISE NOTICE '- Only admin can delete stakeholders';
END $$;