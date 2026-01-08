-- Migration: Create Carbon Project Management Tables
-- Date: 2025-01-20
-- Description: Add tables for Carbon Project, Program, DRAM, Aksi Mitigasi, Kegiatan, Monitoring, Stakeholder, Legal, and Role Permissions
-- PRINCIPLE: ADDITIVE ONLY - no alterations to existing tables, only new tables with foreign keys to existing ones.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ROLE PERMISSIONS TABLE (for new roles)
-- ============================================
-- This table stores the new roles and their permissions without altering the existing 'profiles' table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add display_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions' 
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE role_permissions ADD COLUMN display_name VARCHAR(100);
        -- Update existing rows with a default display_name based on role_name
        UPDATE role_permissions SET display_name = INITCAP(REPLACE(role_name, '_', ' ')) WHERE display_name IS NULL;
        -- Set NOT NULL constraint only if all rows have values
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE display_name IS NULL) THEN
            ALTER TABLE role_permissions ALTER COLUMN display_name SET NOT NULL;
        END IF;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE role_permissions ADD COLUMN description TEXT;
    END IF;
END $$;

-- Insert the 5 new roles (additional to existing admin, monev, viewer)
INSERT INTO role_permissions (role_name, display_name, permissions, description) VALUES
('program_planner', 'Program Planner', 
 '{"dram": ["create", "read", "update"], "program": ["create", "read", "update"], "monitoring": ["read"]}',
 'Membuat dan mengelola DRAM, program, tidak bisa mengubah realisasi'),
('program_implementer', 'Program Implementer', 
 '{"kegiatan": ["create", "read", "update"], "bukti": ["upload"], "monitoring": ["read"]}',
 'Melaksanakan kegiatan, upload bukti, tidak bisa mengubah indikator'),
('monev_officer', 'Monev Officer', 
 '{"monitoring": ["create", "read", "update"], "evaluasi": ["create", "read", "update"], "rencana": ["read"]}',
 'Monitoring dan evaluasi, read-only ke rencana'),
('carbon_specialist', 'Carbon Specialist', 
 '{"carbon_project": ["create", "read", "update", "delete"], "pdd": ["generate"], "legal": ["read", "update"]}',
 'Mengelola proyek karbon, generate PDD, legal documents'),
('admin', 'Administrator', 
 '{"all": ["create", "read", "update", "delete"]}',
 'Full access semua fitur') 
ON CONFLICT (role_name) DO UPDATE 
SET display_name = EXCLUDED.display_name, 
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description;

-- ============================================
-- 2. CARBON PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS carbon_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kode_project VARCHAR(50) UNIQUE NOT NULL,
    nama_project VARCHAR(255) NOT NULL,
    standar_karbon VARCHAR(50) CHECK (standar_karbon IN ('VERRA', 'GOLD_STANDARD', 'INDONESIA', 'OTHER')),
    metodologi VARCHAR(255),
    luas_total_ha DECIMAL(10,2),
    estimasi_penyimpanan_karbon DECIMAL(15,2), -- ton CO2e
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    status VARCHAR(20) CHECK (status IN ('draft', 'approved', 'active', 'suspended', 'completed', 'archived')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing carbon_projects table
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE carbon_projects ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'carbon_projects_status_check'
        ) THEN
            ALTER TABLE carbon_projects ADD CONSTRAINT carbon_projects_status_check 
                CHECK (status IN ('draft', 'approved', 'active', 'suspended', 'completed', 'archived'));
        END IF;
    END IF;
    
    -- Add standar_karbon column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects' 
        AND column_name = 'standar_karbon'
    ) THEN
        ALTER TABLE carbon_projects ADD COLUMN standar_karbon VARCHAR(50);
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'carbon_projects_standar_karbon_check'
        ) THEN
            ALTER TABLE carbon_projects ADD CONSTRAINT carbon_projects_standar_karbon_check 
                CHECK (standar_karbon IN ('VERRA', 'GOLD_STANDARD', 'INDONESIA', 'OTHER'));
        END IF;
    END IF;
END $$;

-- ============================================
-- 3. PROGRAMS TABLE (links Carbon Project to existing PS)
-- ============================================
CREATE TABLE IF NOT EXISTS programs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    kode_program VARCHAR(50) UNIQUE NOT NULL,
    nama_program VARCHAR(255) NOT NULL,
    jenis_program VARCHAR(50) CHECK (jenis_program IN ('KARBON', 'PEMBERDAYAAN_EKONOMI', 'KAPASITAS', 'LAINNYA')),
    tujuan TEXT,
    lokasi_spesifik TEXT,
    target TEXT,
    risiko TEXT,
    logical_framework JSONB,
    status VARCHAR(20) CHECK (status IN ('draft', 'approved', 'active', 'completed', 'cancelled')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing programs table
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'programs' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE programs ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'programs_status_check'
        ) THEN
            ALTER TABLE programs ADD CONSTRAINT programs_status_check 
                CHECK (status IN ('draft', 'approved', 'active', 'completed', 'cancelled'));
        END IF;
    END IF;
    
    -- Add jenis_program column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'programs' 
        AND column_name = 'jenis_program'
    ) THEN
        ALTER TABLE programs ADD COLUMN jenis_program VARCHAR(50);
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'programs_jenis_program_check'
        ) THEN
            ALTER TABLE programs ADD CONSTRAINT programs_jenis_program_check 
                CHECK (jenis_program IN ('KARBON', 'PEMBERDAYAAN_EKONOMI', 'KAPASITAS', 'LAINNYA'));
        END IF;
    END IF;
END $$;

-- ============================================
-- 4. DRAM TABLE (Dokumen Rencana Aksi Mitigasi)
-- ============================================
CREATE TABLE IF NOT EXISTS dram (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    versi INTEGER DEFAULT 1,
    tujuan_mitigasi TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'approved', 'active', 'evaluated', 'closed')),
    tanggal_pengesahan DATE,
    penanggung_jawab UUID REFERENCES profiles(id),
    anggaran_total DECIMAL(15,2),
    timeline_start DATE,
    timeline_end DATE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing dram table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'dram' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE dram ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'dram_status_check'
        ) THEN
            ALTER TABLE dram ADD CONSTRAINT dram_status_check 
                CHECK (status IN ('draft', 'approved', 'active', 'evaluated', 'closed'));
        END IF;
    END IF;
END $$;

-- ============================================
-- 5. AKSI MITIGASI TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS aksi_mitigasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dram_id UUID REFERENCES dram(id) ON DELETE CASCADE,
    urutan INTEGER NOT NULL,
    kode_aksi VARCHAR(50),
    nama_aksi VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    target_kuantitatif DECIMAL(15,2),
    satuan_target VARCHAR(50),
    indikator_kinerja TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dram_id, urutan)
);

-- ============================================
-- 6. KEGIATAN DRAM TABLE (extended from ps_kegiatan concept)
-- ============================================
CREATE TABLE IF NOT EXISTS kegiatan_dram (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    aksi_mitigasi_id UUID REFERENCES aksi_mitigasi(id) ON DELETE CASCADE,
    nama_kegiatan VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    pic UUID REFERENCES profiles(id),
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    anggaran DECIMAL(15,2),
    status VARCHAR(20) CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed', 'cancelled')),
    bukti_url TEXT[], -- array of file URLs
    catatan TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing kegiatan_dram table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'kegiatan_dram' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE kegiatan_dram ADD COLUMN status VARCHAR(20) DEFAULT 'planned';
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'kegiatan_dram_status_check'
        ) THEN
            ALTER TABLE kegiatan_dram ADD CONSTRAINT kegiatan_dram_status_check 
                CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed', 'cancelled'));
        END IF;
    END IF;
END $$;

-- ============================================
-- 7. MONITORING & EVALUASI TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS monitoring_evaluasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kegiatan_dram_id UUID REFERENCES kegiatan_dram(id) ON DELETE CASCADE,
    indikator_id UUID, -- references aksi_mitigasi.id
    tanggal_monitoring DATE NOT NULL,
    target_nilai DECIMAL(15,2),
    realisasi_nilai DECIMAL(15,2),
    satuan VARCHAR(50),
    evaluasi TEXT,
    rekomendasi TEXT,
    bukti_url TEXT[],
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. STAKEHOLDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    peran VARCHAR(100),
    kategori VARCHAR(50) CHECK (kategori IN ('MASYARAKAT', 'PEMERINTAH', 'SWASTA', 'LSM', 'AKADEMISI', 'LAINNYA')),
    kontak VARCHAR(100),
    tingkat_keterlibatan VARCHAR(50) CHECK (tingkat_keterlibatan IN ('TINGGI', 'SEDANG', 'RENDAH')),
    catatan_konsultasi TEXT,
    persetujuan BOOLEAN DEFAULT FALSE,
    tanggal_konsultasi DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing stakeholders table
DO $$ 
BEGIN
    -- Add kategori column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stakeholders' 
        AND column_name = 'kategori'
    ) THEN
        ALTER TABLE stakeholders ADD COLUMN kategori VARCHAR(50);
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'stakeholders_kategori_check'
        ) THEN
            ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_kategori_check 
                CHECK (kategori IN ('MASYARAKAT', 'PEMERINTAH', 'SWASTA', 'LSM', 'AKADEMISI', 'LAINNYA'));
        END IF;
    END IF;
    
    -- Add tingkat_keterlibatan column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stakeholders' 
        AND column_name = 'tingkat_keterlibatan'
    ) THEN
        ALTER TABLE stakeholders ADD COLUMN tingkat_keterlibatan VARCHAR(50);
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'stakeholders_tingkat_keterlibatan_check'
        ) THEN
            ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_tingkat_keterlibatan_check 
                CHECK (tingkat_keterlibatan IN ('TINGGI', 'SEDANG', 'RENDAH'));
        END IF;
    END IF;
END $$;

-- ============================================
-- 9. LEGAL DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    jenis_dokumen VARCHAR(50) CHECK (jenis_dokumen IN ('HAK_KELOLA', 'HAK_KARBON', 'PERJANJIAN_KERJASAMA', 'BAGI_HASIL', 'IZIN_LAIN', 'SERTIFIKAT')),
    nomor_dokumen VARCHAR(255),
    tanggal_dokumen DATE,
    tanggal_berakhir DATE,
    file_url TEXT,
    keterangan TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing legal_documents table
DO $$ 
BEGIN
    -- Add jenis_dokumen column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'legal_documents' 
        AND column_name = 'jenis_dokumen'
    ) THEN
        ALTER TABLE legal_documents ADD COLUMN jenis_dokumen VARCHAR(50);
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'legal_documents_jenis_dokumen_check'
        ) THEN
            ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_jenis_dokumen_check 
                CHECK (jenis_dokumen IN ('HAK_KELOLA', 'HAK_KARBON', 'PERJANJIAN_KERJASAMA', 'BAGI_HASIL', 'IZIN_LAIN', 'SERTIFIKAT'));
        END IF;
    END IF;
END $$;

-- ============================================
-- 10. PEMBERDAYAAN EKONOMI PS TABLE
-- ============================================
-- Extends existing data with economic empowerment focus
CREATE TABLE IF NOT EXISTS pemberdayaan_ekonomi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    jenis_usaha VARCHAR(100),
    produk VARCHAR(255),
    volume_produksi DECIMAL(10,2),
    satuan_volume VARCHAR(50),
    pendapatan_per_bulan DECIMAL(15,2),
    jumlah_anggota INTEGER,
    pasar VARCHAR(100),
    bantuan_yang_diterima TEXT,
    tahun INTEGER,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Carbon Projects
CREATE INDEX IF NOT EXISTS idx_carbon_projects_status ON carbon_projects(status);
CREATE INDEX IF NOT EXISTS idx_carbon_projects_created_by ON carbon_projects(created_by);

-- Programs
CREATE INDEX IF NOT EXISTS idx_programs_carbon_project ON programs(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_programs_perhutanan_sosial ON programs(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);

-- DRAM
CREATE INDEX IF NOT EXISTS idx_dram_program ON dram(program_id);
CREATE INDEX IF NOT EXISTS idx_dram_status ON dram(status);
CREATE INDEX IF NOT EXISTS idx_dram_penanggung_jawab ON dram(penanggung_jawab);

-- Aksi Mitigasi
CREATE INDEX IF NOT EXISTS idx_aksi_mitigasi_dram ON aksi_mitigasi(dram_id);

-- Kegiatan DRAM
CREATE INDEX IF NOT EXISTS idx_kegiatan_dram_aksi ON kegiatan_dram(aksi_mitigasi_id);
CREATE INDEX IF NOT EXISTS idx_kegiatan_dram_pic ON kegiatan_dram(pic);
CREATE INDEX IF NOT EXISTS idx_kegiatan_dram_status ON kegiatan_dram(status);

-- Monitoring & Evaluasi
CREATE INDEX IF NOT EXISTS idx_monitoring_kegiatan ON monitoring_evaluasi(kegiatan_dram_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_tanggal ON monitoring_evaluasi(tanggal_monitoring);

-- Stakeholders
CREATE INDEX IF NOT EXISTS idx_stakeholders_project ON stakeholders(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_kategori ON stakeholders(kategori);

-- Legal Documents
CREATE INDEX IF NOT EXISTS idx_legal_documents_project ON legal_documents(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_jenis ON legal_documents(jenis_dokumen);

-- Pemberdayaan Ekonomi
CREATE INDEX IF NOT EXISTS idx_pemberdayaan_ps ON pemberdayaan_ekonomi(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_pemberdayaan_tahun ON pemberdayaan_ekonomi(tahun);

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ============================================
-- Enable RLS on all new tables
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dram ENABLE ROW LEVEL SECURITY;
ALTER TABLE aksi_mitigasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kegiatan_dram ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_evaluasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemberdayaan_ekonomi ENABLE ROW LEVEL SECURITY;

-- Role Permissions: Readable by all authenticated users
DROP POLICY IF EXISTS "Role permissions readable by authenticated users" ON role_permissions;
CREATE POLICY "Role permissions readable by authenticated users" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Carbon Projects: Complex RLS based on role_permissions
DROP POLICY IF EXISTS "Carbon projects readable by authenticated users" ON carbon_projects;
CREATE POLICY "Carbon projects readable by authenticated users" ON carbon_projects
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Carbon projects manageable by admin and carbon_specialist" ON carbon_projects;
CREATE POLICY "Carbon projects manageable by admin and carbon_specialist" ON carbon_projects
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

-- Programs: Similar RLS pattern
DROP POLICY IF EXISTS "Programs readable by authenticated users" ON programs;
CREATE POLICY "Programs readable by authenticated users" ON programs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Programs manageable by admin and program_planner" ON programs;
CREATE POLICY "Programs manageable by admin and program_planner" ON programs
    FOR ALL USING (
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

-- DRAM: Specific RLS for DRAM management
DROP POLICY IF EXISTS "DRAM readable by authenticated users" ON dram;
CREATE POLICY "DRAM readable by authenticated users" ON dram
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "DRAM manageable by admin and program_planner" ON dram;
CREATE POLICY "DRAM manageable by admin and program_planner" ON dram
    FOR ALL USING (
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

-- Aksi Mitigasi: Inherits DRAM permissions
DROP POLICY IF EXISTS "Aksi mitigasi readable by authenticated users" ON aksi_mitigasi;
CREATE POLICY "Aksi mitigasi readable by authenticated users" ON aksi_mitigasi
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Aksi mitigasi manageable by admin and program_planner" ON aksi_mitigasi;
CREATE POLICY "Aksi mitigasi manageable by admin and program_planner" ON aksi_mitigasi
    FOR ALL USING (
        EXISTS (SELECT 1 FROM dram d WHERE d.id = aksi_mitigasi.dram_id) AND
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

-- Kegiatan DRAM: Program implementers can update
DROP POLICY IF EXISTS "Kegiatan dram readable by authenticated users" ON kegiatan_dram;
CREATE POLICY "Kegiatan dram readable by authenticated users" ON kegiatan_dram
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Kegiatan dram manageable by admin and program_implementer" ON kegiatan_dram;
CREATE POLICY "Kegiatan dram manageable by admin and program_implementer" ON kegiatan_dram
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_implementer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Monitoring & Evaluasi: Monev officers can manage
DROP POLICY IF EXISTS "Monitoring evaluasi readable by authenticated users" ON monitoring_evaluasi;
CREATE POLICY "Monitoring evaluasi readable by authenticated users" ON monitoring_evaluasi
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Monitoring evaluasi manageable by admin and monev_officer" ON monitoring_evaluasi;
CREATE POLICY "Monitoring evaluasi manageable by admin and monev_officer" ON monitoring_evaluasi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'monev_officer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Stakeholders: Carbon specialists and admin
DROP POLICY IF EXISTS "Stakeholders readable by authenticated users" ON stakeholders;
CREATE POLICY "Stakeholders readable by authenticated users" ON stakeholders
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Stakeholders manageable by admin and carbon_specialist" ON stakeholders;
CREATE POLICY "Stakeholders manageable by admin and carbon_specialist" ON stakeholders
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

-- Legal Documents: Carbon specialists and admin
DROP POLICY IF EXISTS "Legal documents readable by authenticated users" ON legal_documents;
CREATE POLICY "Legal documents readable by authenticated users" ON legal_documents
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Legal documents manageable by admin and carbon_specialist" ON legal_documents;
CREATE POLICY "Legal documents manageable by admin and carbon_specialist" ON legal_documents
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

-- Pemberdayaan Ekonomi: Program planners and implementers
DROP POLICY IF EXISTS "Pemberdayaan ekonomi readable by authenticated users" ON pemberdayaan_ekonomi;
CREATE POLICY "Pemberdayaan ekonomi readable by authenticated users" ON pemberdayaan_ekonomi
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Pemberdayaan ekonomi manageable by admin and program_planner" ON pemberdayaan_ekonomi;
CREATE POLICY "Pemberdayaan ekonomi manageable by admin and program_planner" ON pemberdayaan_ekonomi
    FOR ALL USING (
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

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
-- Create trigger function if not exists (already exists from initial migration)
-- Apply triggers to all new tables
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carbon_projects_updated_at ON carbon_projects;
CREATE TRIGGER update_carbon_projects_updated_at
    BEFORE UPDATE ON carbon_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_programs_updated_at ON programs;
CREATE TRIGGER update_programs_updated_at
    BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dram_updated_at ON dram;
CREATE TRIGGER update_dram_updated_at
    BEFORE UPDATE ON dram
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_aksi_mitigasi_updated_at ON aksi_mitigasi;
CREATE TRIGGER update_aksi_mitigasi_updated_at
    BEFORE UPDATE ON aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kegiatan_dram_updated_at ON kegiatan_dram;
CREATE TRIGGER update_kegiatan_dram_updated_at
    BEFORE UPDATE ON kegiatan_dram
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monitoring_evaluasi_updated_at ON monitoring_evaluasi;
CREATE TRIGGER update_monitoring_evaluasi_updated_at
    BEFORE UPDATE ON monitoring_evaluasi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stakeholders_updated_at ON stakeholders;
CREATE TRIGGER update_stakeholders_updated_at
    BEFORE UPDATE ON stakeholders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_documents_updated_at ON legal_documents;
CREATE TRIGGER update_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pemberdayaan_ekonomi_updated_at ON pemberdayaan_ekonomi;
CREATE TRIGGER update_pemberdayaan_ekonomi_updated_at
    BEFORE UPDATE ON pemberdayaan_ekonomi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================
-- Apply audit triggers to all new tables (using existing audit_trigger_function)
DROP TRIGGER IF EXISTS audit_role_permissions ON role_permissions;
CREATE TRIGGER audit_role_permissions
    AFTER INSERT OR UPDATE OR DELETE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_carbon_projects ON carbon_projects;
CREATE TRIGGER audit_carbon_projects
    AFTER INSERT OR UPDATE OR DELETE ON carbon_projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_programs ON programs;
CREATE TRIGGER audit_programs
    AFTER INSERT OR UPDATE OR DELETE ON programs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_dram ON dram;
CREATE TRIGGER audit_dram
    AFTER INSERT OR UPDATE OR DELETE ON dram
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_aksi_mitigasi ON aksi_mitigasi;
CREATE TRIGGER audit_aksi_mitigasi
    AFTER INSERT OR UPDATE OR DELETE ON aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_kegiatan_dram ON kegiatan_dram;
CREATE TRIGGER audit_kegiatan_dram
    AFTER INSERT OR UPDATE OR DELETE ON kegiatan_dram
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_monitoring_evaluasi ON monitoring_evaluasi;
CREATE TRIGGER audit_monitoring_evaluasi
    AFTER INSERT OR UPDATE OR DELETE ON monitoring_evaluasi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_stakeholders ON stakeholders;
CREATE TRIGGER audit_stakeholders
    AFTER INSERT OR UPDATE OR DELETE ON stakeholders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_legal_documents ON legal_documents;
CREATE TRIGGER audit_legal_documents
    AFTER INSERT OR UPDATE OR DELETE ON legal_documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_pemberdayaan_ekonomi ON pemberdayaan_ekonomi;
CREATE TRIGGER audit_pemberdayaan_ekonomi
    AFTER INSERT OR UPDATE OR DELETE ON pemberdayaan_ekonomi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE role_permissions IS 'Tabel untuk menyimpan role baru dan permissionnya tanpa mengubah struktur profiles existing';
COMMENT ON TABLE carbon_projects IS 'Proyek karbon yang menaungi beberapa program';
COMMENT ON TABLE programs IS 'Program dalam proyek karbon, bisa link ke Perhutanan Sosial existing';
COMMENT ON TABLE dram IS 'Dokumen Rencana Aksi Mitigasi - core module untuk perencanaan program';
COMMENT ON TABLE aksi_mitigasi IS 'Aksi-aksi mitigasi dalam DRAM';
COMMENT ON TABLE kegiatan_dram IS 'Kegiatan implementasi dari aksi mitigasi';
COMMENT ON TABLE monitoring_evaluasi IS 'Monitoring dan evaluasi kegiatan DRAM';
COMMENT ON TABLE stakeholders IS 'Stakeholder terkait proyek karbon';
COMMENT ON TABLE legal_documents IS 'Dokumen legal proyek karbon (hak kelola, hak karbon, perjanjian)';
COMMENT ON TABLE pemberdayaan_ekonomi IS 'Data pemberdayaan ekonomi PS untuk PDD section Community Benefits';

-- ============================================
-- MIGRATION SUCCESS MESSAGE
-- ============================================
-- This migration adds 10 new tables for Carbon Project Management System
-- Total tables added: role_permissions, carbon_projects, programs, dram, aksi_mitigasi, 
-- kegiatan_dram, monitoring_evaluasi, stakeholders, legal_documents, pemberdayaan_ekonomi
-- All tables have RLS policies and audit triggers.
-- No existing tables were altered.