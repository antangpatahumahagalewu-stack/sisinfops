-- Migration: Create master_aksi_mitigasi table and program_aksi_mitigasi junction table
-- Date: 2026-01-26
-- Description: Add master table for standard aksi mitigasi and junction table for program-aksi many-to-many relationship

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MASTER_AKSI_MITIGASI TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS master_aksi_mitigasi (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(10) UNIQUE NOT NULL,
    nama_aksi VARCHAR(255) NOT NULL,
    kelompok VARCHAR(50) NOT NULL CHECK (kelompok IN ('PERLINDUNGAN_HUTAN', 'PENINGKATAN_SERAPAN', 'TATA_KELOLA', 'SOSIAL', 'SERTIFIKASI')),
    deskripsi TEXT,
    urutan INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 15 standard aksi mitigasi based on user requirements
INSERT INTO master_aksi_mitigasi (kode, nama_aksi, kelompok, deskripsi, urutan) VALUES
-- A. Perlindungan Hutan (Avoided Emissions)
('AM001', 'Penetapan & Penegasan Batas Areal PS', 'PERLINDUNGAN_HUTAN', 'Pemasangan patok batas, pemetaan GIS & overlay tenurial. Output: kepastian kawasan, menghindari deforestasi & konflik', 1),
('AM002', 'Perlindungan dan Pengamanan Hutan (Forest Protection)', 'PERLINDUNGAN_HUTAN', 'Patroli rutin berbasis masyarakat, pencegahan illegal logging & perambahan, sistem pelaporan cepat. Output: penurunan emisi dari deforestasi ilegal', 2),
('AM003', 'Pengendalian Kebakaran Hutan dan Lahan (Karhutla)', 'PERLINDUNGAN_HUTAN', 'Pembentukan Masyarakat Peduli Api (MPA), sekat kanal sederhana (jika gambut), pelatihan pencegahan kebakaran. Output: avoided emission dari kebakaran', 3),
('AM004', 'Perlindungan Kawasan Bernilai Konservasi Tinggi (HCVF)', 'PERLINDUNGAN_HUTAN', 'Identifikasi HCV (riparian, mata air, situs budaya), larangan pembukaan lahan & pembakaran. Output: stabilitas stok karbon jangka panjang', 4),

-- B. Peningkatan Serapan Karbon (Carbon Removal)
('AM005', 'Rehabilitasi dan Penanaman Kembali (Reforestation / Enrichment)', 'PENINGKATAN_SERAPAN', 'Penanaman jenis lokal bernilai karbon tinggi, enrichment planting di hutan terdegradasi. Output: peningkatan carbon stock (tCO₂e)', 5),
('AM006', 'Pembuatan Persemaian Bibit Lokal', 'PENINGKATAN_SERAPAN', 'Persemaian desa, jenis tanaman kehutanan + HHBK. Output: keberlanjutan penanaman & efisiensi biaya', 6),
('AM007', 'Pemeliharaan Tanaman', 'PENINGKATAN_SERAPAN', 'Penyulaman, pengendalian gulma, perlindungan tanaman muda. Output: survival rate tinggi → valid untuk MRV', 7),

-- C. Tata Kelola & Manajemen
('AM008', 'Penerapan Sistem Silvikultur Berkelanjutan', 'TATA_KELOLA', 'Larangan tebang habis, tebang pilih & rotasi. Output: pengelolaan karbon jangka panjang', 8),
('AM009', 'Penguatan Kelembagaan PS', 'TATA_KELOLA', 'Operasional LPHD/Koperasi PS, SOP perlindungan hutan & mitigasi. Output: governance kuat (mandatory untuk sertifikasi)', 9),
('AM010', 'Penyusunan & Implementasi DRAM / PDD', 'TATA_KELOLA', 'Penetapan baseline emisi, skenario mitigasi, monitoring plan (MRV). Output: dokumen inti proyek karbon', 10),

-- D. Sosial (Social Safeguard)
('AM011', 'Social Impact Assessment (SIA)', 'SOSIAL', 'Identifikasi dampak sosial, strategi mitigasi konflik. Output: compliance safeguard nasional & internasional', 11),
('AM012', 'Pemberdayaan Ekonomi Alternatif', 'SOSIAL', 'HHBK (kopi, pala, rotan, damar, dll.), usaha non-ekstraktif. Output: menekan tekanan pembukaan hutan', 12),
('AM013', 'Pelibatan Kelompok Perempuan & Pemuda', 'SOSIAL', 'Persemaian, monitoring sosial, UMKM hijau. Output: keberlanjutan sosial proyek karbon', 13),

-- E. Sertifikasi & Perdagangan Karbon
('AM014', 'Monitoring, Reporting, and Verification (MRV)', 'SERTIFIKASI', 'Pengukuran biomassa, pelaporan berkala, audit independen. Output: eligible untuk SPE / voluntary credit', 14),
('AM015', 'Sertifikasi Karbon', 'SERTIFIKASI', 'Sertifikat Pengurangan Emisi (SPE) / skema voluntary. Output: karbon bisa diperdagangkan', 15)
ON CONFLICT (kode) DO UPDATE 
SET nama_aksi = EXCLUDED.nama_aksi,
    kelompok = EXCLUDED.kelompok,
    deskripsi = EXCLUDED.deskripsi,
    urutan = EXCLUDED.urutan;

-- ============================================
-- 2. PROGRAM_AKSI_MITIGASI JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS program_aksi_mitigasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    aksi_mitigasi_id INTEGER NOT NULL REFERENCES master_aksi_mitigasi(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, aksi_mitigasi_id)
);

-- ============================================
-- 3. ADD CATEGORI_HUTAN COLUMN TO PROGRAMS TABLE
-- ============================================
DO $$ 
BEGIN
    -- Add kategori_hutan column to programs table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'programs' 
        AND column_name = 'kategori_hutan'
    ) THEN
        ALTER TABLE programs ADD COLUMN kategori_hutan VARCHAR(20) CHECK (kategori_hutan IN ('MINERAL', 'GAMBUT'));
        COMMENT ON COLUMN programs.kategori_hutan IS 'Kategori hutan untuk program Karbon: MINERAL atau GAMBUT';
    END IF;
END $$;

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_master_aksi_mitigasi_kelompok ON master_aksi_mitigasi(kelompok);
CREATE INDEX IF NOT EXISTS idx_master_aksi_mitigasi_urutan ON master_aksi_mitigasi(urutan);

CREATE INDEX IF NOT EXISTS idx_program_aksi_mitigasi_program ON program_aksi_mitigasi(program_id);
CREATE INDEX IF NOT EXISTS idx_program_aksi_mitigasi_aksi ON program_aksi_mitigasi(aksi_mitigasi_id);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE master_aksi_mitigasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_aksi_mitigasi ENABLE ROW LEVEL SECURITY;

-- Master Aksi Mitigasi: Readable by all authenticated users
DROP POLICY IF EXISTS "Master aksi mitigasi readable by authenticated users" ON master_aksi_mitigasi;
CREATE POLICY "Master aksi mitigasi readable by authenticated users" ON master_aksi_mitigasi
    FOR SELECT USING (auth.role() = 'authenticated');

-- Master Aksi Mitigasi: Only admin can modify
DROP POLICY IF EXISTS "Master aksi mitigasi manageable by admin only" ON master_aksi_mitigasi;
CREATE POLICY "Master aksi mitigasi manageable by admin only" ON master_aksi_mitigasi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- Program Aksi Mitigasi: Readable by authenticated users
DROP POLICY IF EXISTS "Program aksi mitigasi readable by authenticated users" ON program_aksi_mitigasi;
CREATE POLICY "Program aksi mitigasi readable by authenticated users" ON program_aksi_mitigasi
    FOR SELECT USING (auth.role() = 'authenticated');

-- Program Aksi Mitigasi: Manageable by admin and program_planner
DROP POLICY IF EXISTS "Program aksi mitigasi manageable by admin and program_planner" ON program_aksi_mitigasi;
CREATE POLICY "Program aksi mitigasi manageable by admin and program_planner" ON program_aksi_mitigasi
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
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================
-- Create trigger for master_aksi_mitigasi
DROP TRIGGER IF EXISTS update_master_aksi_mitigasi_updated_at ON master_aksi_mitigasi;
CREATE TRIGGER update_master_aksi_mitigasi_updated_at
    BEFORE UPDATE ON master_aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for program_aksi_mitigasi
DROP TRIGGER IF EXISTS update_program_aksi_mitigasi_updated_at ON program_aksi_mitigasi;
CREATE TRIGGER update_program_aksi_mitigasi_updated_at
    BEFORE UPDATE ON program_aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. AUDIT TRIGGERS
-- ============================================
-- Apply audit triggers to new tables
DROP TRIGGER IF EXISTS audit_master_aksi_mitigasi ON master_aksi_mitigasi;
CREATE TRIGGER audit_master_aksi_mitigasi
    AFTER INSERT OR UPDATE OR DELETE ON master_aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_program_aksi_mitigasi ON program_aksi_mitigasi;
CREATE TRIGGER audit_program_aksi_mitigasi
    AFTER INSERT OR UPDATE OR DELETE ON program_aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE master_aksi_mitigasi IS 'Tabel master berisi 15 aksi mitigasi standar untuk program karbon';
COMMENT ON TABLE program_aksi_mitigasi IS 'Tabel junction untuk relasi many-to-many antara program dan aksi mitigasi';
COMMENT ON COLUMN master_aksi_mitigasi.kelompok IS 'Kelompok aksi mitigasi: PERLINDUNGAN_HUTAN, PENINGKATAN_SERAPAN, TATA_KELOLA, SOSIAL, SERTIFIKASI';

-- ============================================
-- 9. MIGRATION SUCCESS MESSAGE
-- ============================================
-- This migration creates:
-- 1. master_aksi_mitigasi table with 15 standard actions
-- 2. program_aksi_mitigasi junction table for many-to-many relationship
-- 3. Adds kategori_hutan column to programs table
-- All tables have proper RLS policies and audit triggers.
