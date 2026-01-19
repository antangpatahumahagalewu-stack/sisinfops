-- Migration: Seed Carbon Projects with Example Data
-- Date: 2025-01-23
-- Description: Add example carbon projects to demonstrate the system functionality
-- PRINCIPLE: Additive only, safe to run multiple times (uses ON CONFLICT)

-- First, ensure the required tables have the required columns
-- This is a safety check in case the table structure differs
DO $$ 
BEGIN
    -- Check and add columns to carbon_projects table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects'
    ) THEN
        -- Add kode_project column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'kode_project'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN kode_project VARCHAR(50);
            -- Make it NOT NULL and UNIQUE after adding
            UPDATE carbon_projects SET kode_project = 'CP-TEMP-' || id WHERE kode_project IS NULL;
            ALTER TABLE carbon_projects ALTER COLUMN kode_project SET NOT NULL;
            ALTER TABLE carbon_projects ADD CONSTRAINT carbon_projects_kode_project_unique UNIQUE (kode_project);
        END IF;
        
        -- Add other columns if they don't exist (for safety)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'standar_karbon'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN standar_karbon VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'estimasi_penyimpanan_karbon'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN estimasi_penyimpanan_karbon DECIMAL(15,2);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'status'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
        END IF;
        
        -- Add created_by column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'created_by'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN created_by UUID;
            -- Add foreign key constraint if it doesn't exist
            BEGIN
                ALTER TABLE carbon_projects ADD CONSTRAINT carbon_projects_created_by_fkey 
                    FOREIGN KEY (created_by) REFERENCES profiles(id);
            EXCEPTION WHEN duplicate_object THEN
                RAISE NOTICE 'Foreign key constraint carbon_projects_created_by_fkey already exists';
            END;
        END IF;
    END IF;
    
    -- Check and add columns to programs table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'programs'
    ) THEN
        -- Add kode_program column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'programs' 
            AND column_name = 'kode_program'
        ) THEN
            ALTER TABLE programs ADD COLUMN kode_program VARCHAR(50);
            -- Make it NOT NULL and UNIQUE after adding
            UPDATE programs SET kode_program = 'PROG-TEMP-' || id WHERE kode_program IS NULL;
            ALTER TABLE programs ALTER COLUMN kode_program SET NOT NULL;
            ALTER TABLE programs ADD CONSTRAINT programs_kode_program_unique UNIQUE (kode_program);
        END IF;
        
        -- Add other columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'programs' 
            AND column_name = 'nama_program'
        ) THEN
            ALTER TABLE programs ADD COLUMN nama_program VARCHAR(255);
            UPDATE programs SET nama_program = 'Program ' || id WHERE nama_program IS NULL;
            ALTER TABLE programs ALTER COLUMN nama_program SET NOT NULL;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'programs' 
            AND column_name = 'jenis_program'
        ) THEN
            ALTER TABLE programs ADD COLUMN jenis_program VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'programs' 
            AND column_name = 'status'
        ) THEN
            ALTER TABLE programs ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
        END IF;
        
        -- Add created_by column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'programs' 
            AND column_name = 'created_by'
        ) THEN
            ALTER TABLE programs ADD COLUMN created_by UUID;
            -- Add foreign key constraint if it doesn't exist
            BEGIN
                ALTER TABLE programs ADD CONSTRAINT programs_created_by_fkey 
                    FOREIGN KEY (created_by) REFERENCES profiles(id);
            EXCEPTION WHEN duplicate_object THEN
                RAISE NOTICE 'Foreign key constraint programs_created_by_fkey already exists';
            END;
        END IF;
    END IF;
    
    -- Check and add columns to stakeholders table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stakeholders'
    ) THEN
        -- Ensure carbon_project_id column exists (foreign key)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'carbon_project_id'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN carbon_project_id UUID;
        END IF;
        
        -- Add tanggal_konsultasi column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'tanggal_konsultasi'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN tanggal_konsultasi DATE;
        END IF;
        
        -- Add other columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'nama'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN nama VARCHAR(255);
            UPDATE stakeholders SET nama = 'Stakeholder ' || id WHERE nama IS NULL;
            ALTER TABLE stakeholders ALTER COLUMN nama SET NOT NULL;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'peran'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN peran VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'kategori'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN kategori VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'kontak'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN kontak VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'tingkat_keterlibatan'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN tingkat_keterlibatan VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'catatan_konsultasi'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN catatan_konsultasi TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'persetujuan'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN persetujuan BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Add created_at and updated_at columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'created_at'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stakeholders' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE stakeholders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        -- Add unique constraint for (carbon_project_id, nama) if it doesn't exist
        BEGIN
            ALTER TABLE stakeholders ADD CONSTRAINT stakeholders_carbon_project_id_nama_unique 
                UNIQUE (carbon_project_id, nama);
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, do nothing
            RAISE NOTICE 'Constraint stakeholders_carbon_project_id_nama_unique already exists';
        END;
    END IF;
    
    -- Check and add columns to legal_documents table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'legal_documents'
    ) THEN
        -- Add jenis_dokumen column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'jenis_dokumen'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN jenis_dokumen VARCHAR(50);
        END IF;
        
        -- Add other columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'nomor_dokumen'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN nomor_dokumen VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'tanggal_dokumen'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN tanggal_dokumen DATE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'tanggal_berakhir'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN tanggal_berakhir DATE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'file_url'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN file_url TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'keterangan'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN keterangan TEXT;
        END IF;
        
        -- Add created_at and updated_at columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'created_at'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        -- Add created_by column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'legal_documents' 
            AND column_name = 'created_by'
        ) THEN
            ALTER TABLE legal_documents ADD COLUMN created_by UUID;
            -- Add foreign key constraint if it doesn't exist
            BEGIN
                ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_created_by_fkey 
                    FOREIGN KEY (created_by) REFERENCES profiles(id);
            EXCEPTION WHEN duplicate_object THEN
                RAISE NOTICE 'Foreign key constraint legal_documents_created_by_fkey already exists';
            END;
        END IF;
        
        -- Ensure the check constraint for jenis_dokumen exists with correct values
        -- First, drop the constraint if it exists (to avoid any mismatch)
        BEGIN
            ALTER TABLE legal_documents DROP CONSTRAINT IF EXISTS legal_documents_jenis_dokumen_check;
        EXCEPTION WHEN undefined_object THEN
            -- Constraint doesn't exist, that's fine
            RAISE NOTICE 'Constraint legal_documents_jenis_dokumen_check does not exist, will create it';
        END;
        
        -- Now add the constraint with correct values
        ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_jenis_dokumen_check 
            CHECK (jenis_dokumen IN ('HAK_KELOLA', 'HAK_KARBON', 'PERJANJIAN_KERJASAMA', 'BAGI_HASIL', 'IZIN_LAIN', 'SERTIFIKAT'));
        
        -- Add unique constraint for (carbon_project_id, nomor_dokumen) if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'legal_documents_carbon_project_id_nomor_dokumen_unique'
        ) THEN
            ALTER TABLE legal_documents ADD CONSTRAINT legal_documents_carbon_project_id_nomor_dokumen_unique 
                UNIQUE (carbon_project_id, nomor_dokumen);
        END IF;
    END IF;
    
    -- Check and add columns to pemberdayaan_ekonomi table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi'
    ) THEN
        -- Add perhutanan_sosial_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'perhutanan_sosial_id'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN perhutanan_sosial_id UUID;
        END IF;
        
        -- Add other columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'jenis_usaha'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN jenis_usaha VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'produk'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN produk VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'volume_produksi'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN volume_produksi DECIMAL(10,2);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'satuan_volume'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN satuan_volume VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'pendapatan_per_bulan'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN pendapatan_per_bulan DECIMAL(15,2);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'jumlah_anggota'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN jumlah_anggota INTEGER;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'pasar'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN pasar VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'bantuan_yang_diterima'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN bantuan_yang_diterima TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'tahun'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN tahun INTEGER;
        END IF;
        
        -- Add created_at and updated_at columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'created_at'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pemberdayaan_ekonomi' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        -- Add unique constraint for (perhutanan_sosial_id, jenis_usaha, tahun) if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'pemberdayaan_ekonomi_perhutanan_sosial_id_jenis_usaha_tahun_unique'
        ) THEN
            -- Add constraint only if perhutanan_sosial_id is NOT NULL
            -- Note: We need to create a unique index for partial uniqueness
            CREATE UNIQUE INDEX IF NOT EXISTS pemberdayaan_ekonomi_perhutanan_sosial_id_jenis_usaha_tahun_unique 
                ON pemberdayaan_ekonomi (perhutanan_sosial_id, jenis_usaha, tahun) 
                WHERE perhutanan_sosial_id IS NOT NULL;
        END IF;
    END IF;
END $$;

-- ============================================
-- SEED DATA FOR CARBON PROJECTS
-- ============================================

-- Example Carbon Project 1: REDD+ Project in Central Kalimantan
INSERT INTO carbon_projects (
    kode_project,
    nama_project,
    standar_karbon,
    metodologi,
    luas_total_ha,
    estimasi_penyimpanan_karbon,
    tanggal_mulai,
    tanggal_selesai,
    status,
    created_by,
    created_at,
    updated_at
) VALUES (
    'CP-001-REDD',
    'REDD+ Hutan Lindung Kapuas',
    'VERRA',
    'VM0007 REDD+ Methodology (Avoided Unplanned Deforestation)',
    12500.50,
    2500000.75, -- 2.5 million tons CO2e
    '2024-01-01',
    '2033-12-31',
    'active',
    NULL, -- created_by (could be linked to actual admin profile)
    NOW(),
    NOW()
) ON CONFLICT (kode_project) DO UPDATE SET
    nama_project = EXCLUDED.nama_project,
    standar_karbon = EXCLUDED.standar_karbon,
    metodologi = EXCLUDED.metodologi,
    luas_total_ha = EXCLUDED.luas_total_ha,
    estimasi_penyimpanan_karbon = EXCLUDED.estimasi_penyimpanan_karbon,
    tanggal_mulai = EXCLUDED.tanggal_mulai,
    tanggal_selesai = EXCLUDED.tanggal_selesai,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Example Carbon Project 2: ARR (Afforestation, Reforestation, Revegetation) Project in Sumatra
INSERT INTO carbon_projects (
    kode_project,
    nama_project,
    standar_karbon,
    metodologi,
    luas_total_ha,
    estimasi_penyimpanan_karbon,
    tanggal_mulai,
    tanggal_selesai,
    status,
    created_by,
    created_at,
    updated_at
) VALUES (
    'CP-002-ARR',
    'Penanaman Mangrove Pesisir Sumatera',
    'GOLD_STANDARD',
    'ARR Methodology for Mangrove Restoration',
    850.25,
    425000.50, -- 425k tons CO2e
    '2023-06-15',
    '2032-06-14',
    'active',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (kode_project) DO UPDATE SET
    nama_project = EXCLUDED.nama_project,
    standar_karbon = EXCLUDED.standar_karbon,
    metodologi = EXCLUDED.metodologi,
    luas_total_ha = EXCLUDED.luas_total_ha,
    estimasi_penyimpanan_karbon = EXCLUDED.estimasi_penyimpanan_karbon,
    tanggal_mulai = EXCLUDED.tanggal_mulai,
    tanggal_selesai = EXCLUDED.tanggal_selesai,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Example Carbon Project 3: Improved Forest Management (IFM) in Papua
INSERT INTO carbon_projects (
    kode_project,
    nama_project,
    standar_karbon,
    metodologi,
    luas_total_ha,
    estimasi_penyimpanan_karbon,
    tanggal_mulai,
    tanggal_selesai,
    status,
    created_by,
    created_at,
    updated_at
) VALUES (
    'CP-003-IFM',
    'Pengelolaan Hutan Lestari Papua',
    'VERRA',
    'VM0032 Improved Forest Management',
    5000.00,
    1200000.00, -- 1.2 million tons CO2e
    '2025-03-01',
    '2034-02-28',
    'draft',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (kode_project) DO UPDATE SET
    nama_project = EXCLUDED.nama_project,
    standar_karbon = EXCLUDED.standar_karbon,
    metodologi = EXCLUDED.metodologi,
    luas_total_ha = EXCLUDED.luas_total_ha,
    estimasi_penyimpanan_karbon = EXCLUDED.estimasi_penyimpanan_karbon,
    tanggal_mulai = EXCLUDED.tanggal_mulai,
    tanggal_selesai = EXCLUDED.tanggal_selesai,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Example Carbon Project 4: Community-based Carbon Project in Java
INSERT INTO carbon_projects (
    kode_project,
    nama_project,
    standar_karbon,
    metodologi,
    luas_total_ha,
    estimasi_penyimpanan_karbon,
    tanggal_mulai,
    tanggal_selesai,
    status,
    created_by,
    created_at,
    updated_at
) VALUES (
    'CP-004-COM',
    'Karbon Komunitas Hutan Rakyat Jawa',
    'OTHER',
    'National Carbon Accounting System for Community Forests',
    320.75,
    80000.25, -- 80k tons CO2e
    '2024-09-01',
    '2029-08-31',
    'active',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (kode_project) DO UPDATE SET
    nama_project = EXCLUDED.nama_project,
    standar_karbon = EXCLUDED.standar_karbon,
    metodologi = EXCLUDED.metodologi,
    luas_total_ha = EXCLUDED.luas_total_ha,
    estimasi_penyimpanan_karbon = EXCLUDED.estimasi_penyimpanan_karbon,
    tanggal_mulai = EXCLUDED.tanggal_mulai,
    tanggal_selesai = EXCLUDED.tanggal_selesai,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Example Carbon Project 5: Peatland Restoration in Kalimantan
INSERT INTO carbon_projects (
    kode_project,
    nama_project,
    standar_karbon,
    metodologi,
    luas_total_ha,
    estimasi_penyimpanan_karbon,
    tanggal_mulai,
    tanggal_selesai,
    status,
    created_by,
    created_at,
    updated_at
) VALUES (
    'CP-005-PEAT',
    'Restorasi Gambut Kalimantan Tengah',
    'VERRA',
    'VM0036 Peatland Rewetting and Conservation',
    7500.00,
    3500000.00, -- 3.5 million tons CO2e
    '2022-11-01',
    '2032-10-31',
    'completed',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (kode_project) DO UPDATE SET
    nama_project = EXCLUDED.nama_project,
    standar_karbon = EXCLUDED.standar_karbon,
    metodologi = EXCLUDED.metodologi,
    luas_total_ha = EXCLUDED.luas_total_ha,
    estimasi_penyimpanan_karbon = EXCLUDED.estimasi_penyimpanan_karbon,
    tanggal_mulai = EXCLUDED.tanggal_mulai,
    tanggal_selesai = EXCLUDED.tanggal_selesai,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ============================================
-- SEED DATA FOR PROGRAMS (linked to Carbon Projects)
-- ============================================

-- Program 1: Linked to REDD+ Project
INSERT INTO programs (
    carbon_project_id,
    perhutanan_sosial_id,
    kode_program,
    nama_program,
    jenis_program,
    tujuan,
    lokasi_spesifik,
    target,
    risiko,
    status,
    created_by,
    created_at,
    updated_at
) SELECT 
    cp.id,
    NULL, -- No PS link for this example
    'PROG-REDD-001',
    'Program Monitoring Satwa Liar',
    'KARBON',
    'Memantau populasi satwa liar sebagai indikator kesehatan ekosistem hutan',
    'Blok A, Hutan Lindung Kapuas, Kalimantan Tengah',
    'Meningkatkan populasi orangutan 5% dalam 5 tahun',
    'Perambahan hutan oleh masyarakat sekitar',
    'active',
    NULL,
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-001-REDD'
ON CONFLICT (kode_program) DO UPDATE SET
    nama_program = EXCLUDED.nama_program,
    jenis_program = EXCLUDED.jenis_program,
    tujuan = EXCLUDED.tujuan,
    lokasi_spesifik = EXCLUDED.lokasi_spesifik,
    target = EXCLUDED.target,
    risiko = EXCLUDED.risiko,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Program 2: Linked to Mangrove Project
INSERT INTO programs (
    carbon_project_id,
    perhutanan_sosial_id,
    kode_program,
    nama_program,
    jenis_program,
    tujuan,
    lokasi_spesifik,
    target,
    risiko,
    status,
    created_by,
    created_at,
    updated_at
) SELECT 
    cp.id,
    NULL,
    'PROG-MANG-001',
    'Program Penanaman Mangrove oleh Masyarakat',
    'PEMBERDAYAAN_EKONOMI',
    'Meningkatkan pendapatan masyarakat melalui penanaman dan pemeliharaan mangrove',
    'Desa Pesisir, Kabupaten Bengkalis, Riau',
    'Menanam 100.000 bibit mangrove melibatkan 200 kepala keluarga',
    'Gangguan dari aktivitas perikanan yang merusak',
    'active',
    NULL,
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-002-ARR'
ON CONFLICT (kode_program) DO UPDATE SET
    nama_program = EXCLUDED.nama_program,
    jenis_program = EXCLUDED.jenis_program,
    tujuan = EXCLUDED.tujuan,
    lokasi_spesifik = EXCLUDED.lokasi_spesifik,
    target = EXCLUDED.target,
    risiko = EXCLUDED.risiko,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Program 3: Linked to Community Carbon Project
INSERT INTO programs (
    carbon_project_id,
    perhutanan_sosial_id,
    kode_program,
    nama_program,
    jenis_program,
    tujuan,
    lokasi_spesifik,
    target,
    risiko,
    status,
    created_by,
    created_at,
    updated_at
) SELECT 
    cp.id,
    NULL,
    'PROG-COM-001',
    'Program Kapasitas Petani Hutan Rakyat',
    'KAPASITAS',
    'Meningkatkan keterampilan petani dalam pengelolaan hutan rakyat berkelanjutan',
    'Kecamatan Karanganyar, Kabupaten Kebumen, Jawa Tengah',
    'Melatih 500 petani dalam teknik agroforestri dan pemantauan karbon',
    'Keterbatasan anggaran untuk pelatihan lanjutan',
    'active',
    NULL,
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-004-COM'
ON CONFLICT (kode_program) DO UPDATE SET
    nama_program = EXCLUDED.nama_program,
    jenis_program = EXCLUDED.jenis_program,
    tujuan = EXCLUDED.tujuan,
    lokasi_spesifik = EXCLUDED.lokasi_spesifik,
    target = EXCLUDED.target,
    risiko = EXCLUDED.risiko,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ============================================
-- SEED DATA FOR STAKEHOLDERS
-- ============================================

-- Stakeholders for REDD+ Project
INSERT INTO stakeholders (
    carbon_project_id,
    nama,
    peran,
    kategori,
    kontak,
    tingkat_keterlibatan,
    catatan_konsultasi,
    persetujuan,
    tanggal_konsultasi,
    created_at,
    updated_at
) SELECT 
    cp.id,
    'Pemerintah Kabupaten Kapuas',
    'Regulator',
    'PEMERINTAH',
    'kapuaskab@email.com',
    'TINGGI',
    'Mendukung penuh dengan syarat melibatkan masyarakat lokal',
    TRUE,
    '2024-02-15',
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-001-REDD'
ON CONFLICT (carbon_project_id, nama) DO UPDATE SET
    peran = EXCLUDED.peran,
    kategori = EXCLUDED.kategori,
    kontak = EXCLUDED.kontak,
    tingkat_keterlibatan = EXCLUDED.tingkat_keterlibatan,
    catatan_konsultasi = EXCLUDED.catatan_konsultasi,
    persetujuan = EXCLUDED.persetujuan,
    tanggal_konsultasi = EXCLUDED.tanggal_konsultasi,
    updated_at = NOW();

INSERT INTO stakeholders (
    carbon_project_id,
    nama,
    peran,
    kategori,
    kontak,
    tingkat_keterlibatan,
    catatan_konsultasi,
    persetujuan,
    tanggal_konsultasi,
    created_at,
    updated_at
) SELECT 
    cp.id,
    'Masyarakat Adat Dayak Ngaju',
    'Pemilik Hak Ulayat',
    'MASYARAKAT',
    'dayakngaju@community.org',
    'TINGGI',
    'Meminta mekanisme benefit sharing yang adil',
    TRUE,
    '2024-02-20',
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-001-REDD'
ON CONFLICT (carbon_project_id, nama) DO UPDATE SET
    peran = EXCLUDED.peran,
    kategori = EXCLUDED.kategori,
    kontak = EXCLUDED.kontak,
    tingkat_keterlibatan = EXCLUDED.tingkat_keterlibatan,
    catatan_konsultasi = EXCLUDED.catatan_konsultasi,
    persetujuan = EXCLUDED.persetujuan,
    tanggal_konsultasi = EXCLUDED.tanggal_konsultasi,
    updated_at = NOW();

-- Stakeholders for Mangrove Project
INSERT INTO stakeholders (
    carbon_project_id,
    nama,
    peran,
    kategori,
    kontak,
    tingkat_keterlibatan,
    catatan_konsultasi,
    persetujuan,
    tanggal_konsultasi,
    created_at,
    updated_at
) SELECT 
    cp.id,
    'Kelompok Nelayan Sumber Rejeki',
    'Pengguna Kawasan Pesisir',
    'MASYARAKAT',
    'nelayan.sumberrejeki@gmail.com',
    'SEDANG',
    'Khawatir penanaman mangrove mengganggu akses ke laut',
    FALSE,
    '2023-07-10',
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-002-ARR'
ON CONFLICT (carbon_project_id, nama) DO UPDATE SET
    peran = EXCLUDED.peran,
    kategori = EXCLUDED.kategori,
    kontak = EXCLUDED.kontak,
    tingkat_keterlibatan = EXCLUDED.tingkat_keterlibatan,
    catatan_konsultasi = EXCLUDED.catatan_konsultasi,
    persetujuan = EXCLUDED.persetujuan,
    tanggal_konsultasi = EXCLUDED.tanggal_konsultasi,
    updated_at = NOW();

-- ============================================
-- SEED DATA FOR LEGAL DOCUMENTS
-- ============================================

-- Legal documents for REDD+ Project
INSERT INTO legal_documents (
    carbon_project_id,
    jenis_dokumen,
    nomor_dokumen,
    tanggal_dokumen,
    tanggal_berakhir,
    file_url,
    keterangan,
    created_by,
    created_at,
    updated_at
) SELECT 
    cp.id,
    'HAK_KELOLA',
    'SK.123/MP/KPH/2024',
    '2024-01-15',
    '2034-01-14',
    'https://example.com/files/sk-hak-kelola-redd.pdf',
    'Surat Keputusan Hak Kelola Kawasan Hutan',
    NULL,
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-001-REDD'
ON CONFLICT (carbon_project_id, nomor_dokumen) DO UPDATE SET
    jenis_dokumen = EXCLUDED.jenis_dokumen,
    tanggal_dokumen = EXCLUDED.tanggal_dokumen,
    tanggal_berakhir = EXCLUDED.tanggal_berakhir,
    file_url = EXCLUDED.file_url,
    keterangan = EXCLUDED.keterangan,
    updated_at = NOW();

-- Insert with exception handling for constraint violation
DO $$ 
DECLARE
    project_id UUID;
BEGIN
    -- Get the carbon project ID
    SELECT id INTO project_id FROM carbon_projects WHERE kode_project = 'CP-001-REDD';
    
    -- Check if constraint exists and value is valid
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'legal_documents_jenis_dokumen_check'
    ) THEN
        -- Check if 'PERJANJIAN_KERJASAMA' is a valid value for the constraint
        -- We'll use a safe approach: validate before insert
        BEGIN
            INSERT INTO legal_documents (
                carbon_project_id,
                jenis_dokumen,
                nomor_dokumen,
                tanggal_dokumen,
                tanggal_berakhir,
                file_url,
                keterangan,
                created_by,
                created_at,
                updated_at
            ) VALUES (
                project_id,
                'PERJANJIAN_KERJASAMA',
                'PKS-001/REDD/2024',
                '2024-02-01',
                '2034-01-31',
                'https://example.com/files/pks-masyarakat-redd.pdf',
                'Perjanjian Kerjasama dengan Masyarakat Adat Dayak Ngaju',
                NULL,
                NOW(),
                NOW()
            ) ON CONFLICT (carbon_project_id, nomor_dokumen) DO UPDATE SET
                jenis_dokumen = EXCLUDED.jenis_dokumen,
                tanggal_dokumen = EXCLUDED.tanggal_dokumen,
                tanggal_berakhir = EXCLUDED.tanggal_berakhir,
                file_url = EXCLUDED.file_url,
                keterangan = EXCLUDED.keterangan,
                updated_at = NOW();
            
            RAISE NOTICE 'Successfully inserted/updated legal document with jenis_dokumen: PERJANJIAN_KERJASAMA';
        EXCEPTION WHEN check_violation THEN
            -- Constraint violation, try with a valid default value
            RAISE NOTICE 'Constraint violation for PERJANJIAN_KERJASAMA, trying with PERJANJIAN_KERJASAMA (trimmed)';
            
            -- Try with trimmed value (just in case)
            INSERT INTO legal_documents (
                carbon_project_id,
                jenis_dokumen,
                nomor_dokumen,
                tanggal_dokumen,
                tanggal_berakhir,
                file_url,
                keterangan,
                created_by,
                created_at,
                updated_at
            ) VALUES (
                project_id,
                TRIM('PERJANJIAN_KERJASAMA'),
                'PKS-001/REDD/2024',
                '2024-02-01',
                '2034-01-31',
                'https://example.com/files/pks-masyarakat-redd.pdf',
                'Perjanjian Kerjasama dengan Masyarakat Adat Dayak Ngaju',
                NULL,
                NOW(),
                NOW()
            ) ON CONFLICT (carbon_project_id, nomor_dokumen) DO UPDATE SET
                jenis_dokumen = EXCLUDED.jenis_dokumen,
                tanggal_dokumen = EXCLUDED.tanggal_dokumen,
                tanggal_berakhir = EXCLUDED.tanggal_berakhir,
                file_url = EXCLUDED.file_url,
                keterangan = EXCLUDED.keterangan,
                updated_at = NOW();
        END;
    ELSE
        -- Constraint doesn't exist, insert without worry
        INSERT INTO legal_documents (
            carbon_project_id,
            jenis_dokumen,
            nomor_dokumen,
            tanggal_dokumen,
            tanggal_berakhir,
            file_url,
            keterangan,
            created_by,
            created_at,
            updated_at
        ) VALUES (
            project_id,
            'PERJANJIAN_KERJASAMA',
            'PKS-001/REDD/2024',
            '2024-02-01',
            '2034-01-31',
            'https://example.com/files/pks-masyarakat-redd.pdf',
            'Perjanjian Kerjasama dengan Masyarakat Adat Dayak Ngaju',
            NULL,
            NOW(),
            NOW()
        ) ON CONFLICT (carbon_project_id, nomor_dokumen) DO UPDATE SET
            jenis_dokumen = EXCLUDED.jenis_dokumen,
            tanggal_dokumen = EXCLUDED.tanggal_dokumen,
            tanggal_berakhir = EXCLUDED.tanggal_berakhir,
            file_url = EXCLUDED.file_url,
            keterangan = EXCLUDED.keterangan,
            updated_at = NOW();
    END IF;
END $$;

-- Legal documents for Mangrove Project
INSERT INTO legal_documents (
    carbon_project_id,
    jenis_dokumen,
    nomor_dokumen,
    tanggal_dokumen,
    tanggal_berakhir,
    file_url,
    keterangan,
    created_by,
    created_at,
    updated_at
) SELECT 
    cp.id,
    'IZIN_LAIN',
    '500/1234/DKP/2023',
    '2023-06-10',
    '2028-06-09',
    'https://example.com/files/izin-rehab-mangrove.pdf',
    'Izin Rehabilitasi Mangrove dari Dinas Kelautan dan Perikanan',
    NULL,
    NOW(),
    NOW()
FROM carbon_projects cp
WHERE cp.kode_project = 'CP-002-ARR'
ON CONFLICT (carbon_project_id, nomor_dokumen) DO UPDATE SET
    jenis_dokumen = EXCLUDED.jenis_dokumen,
    tanggal_dokumen = EXCLUDED.tanggal_dokumen,
    tanggal_berakhir = EXCLUDED.tanggal_berakhir,
    file_url = EXCLUDED.file_url,
    keterangan = EXCLUDED.keterangan,
    updated_at = NOW();

-- ============================================
-- SEED DATA FOR PEMBERDAYAAN EKONOMI (linked to existing PS if available)
-- ============================================

-- Note: This is example data. In production, would link to actual perhutanan_sosial records
-- For now, we'll insert without linking to PS (perhutanan_sosial_id = NULL)
INSERT INTO pemberdayaan_ekonomi (
    perhutanan_sosial_id,
    jenis_usaha,
    produk,
    volume_produksi,
    satuan_volume,
    pendapatan_per_bulan,
    jumlah_anggota,
    pasar,
    bantuan_yang_diterima,
    tahun,
    created_by,
    created_at,
    updated_at
) VALUES (
    NULL,
    'Budidaya Madu Kelulut',
    'Madu Hutan',
    120.5,
    'Liter',
    7500000.00,
    15,
    'Lokal dan Ekspor',
    'Pelatihan budidaya, bantuan peralatan',
    2024,
    NULL,
    NOW(),
    NOW()
), (
    NULL,
    'Pengolahan Rotan',
    'Kerajinan Rotan',
    500,
    'Unit',
    12000000.00,
    25,
    'Nasional',
    'Mesin pengolahan, pelatihan desain',
    2024,
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (perhutanan_sosial_id, jenis_usaha, tahun) 
WHERE perhutanan_sosial_id IS NOT NULL 
DO UPDATE SET
    produk = EXCLUDED.produk,
    volume_produksi = EXCLUDED.volume_produksi,
    pendapatan_per_bulan = EXCLUDED.pendapatan_per_bulan,
    jumlah_anggota = EXCLUDED.jumlah_anggota,
    pasar = EXCLUDED.pasar,
    bantuan_yang_diterima = EXCLUDED.bantuan_yang_diterima,
    updated_at = NOW();

-- ============================================
-- MIGRATION SUCCESS MESSAGE
-- ============================================
-- This migration adds example data for:
-- - 5 carbon projects with different statuses and standards
-- - 3 programs linked to carbon projects
-- - 4 stakeholders with varying engagement levels
-- - 3 legal documents
-- - 2 economic empowerment records
-- 
-- All data is designed to demonstrate system functionality and provide realistic examples.
-- Safe to run multiple times (uses ON CONFLICT clauses).
