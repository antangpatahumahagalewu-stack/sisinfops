-- Migration: Create Kepala Keluarga (KK) Management Tables
-- Date: 2025-01-21
-- Description: Add tables for detailed Kepala Keluarga data, anggota keluarga, and household economics tracking
-- PRINCIPLE: ADDITIVE ONLY - extends existing perhutanan_sosial data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. KEPALA KELUARGA (HEAD OF HOUSEHOLD) TABLE
-- ============================================
CREATE TABLE kepala_keluarga (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL, -- optional link to specific program
    
    -- Basic identification
    nomor_kk VARCHAR(50) UNIQUE,
    nama_kepala_keluarga VARCHAR(255) NOT NULL,
    nik VARCHAR(16) UNIQUE, -- Nomor Induk Kependudukan
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(10) CHECK (jenis_kelamin IN ('LAKI-LAKI', 'PEREMPUAN')),
    
    -- Contact & location
    alamat TEXT,
    rt VARCHAR(10),
    rw VARCHAR(10),
    telepon VARCHAR(20),
    email VARCHAR(255),
    
    -- Household status
    status_rumah VARCHAR(50) CHECK (status_rumah IN ('MILIK SENDIRI', 'SEWA', 'KELUARGA', 'LAINNYA')),
    luas_rumah_m2 DECIMAL(6,2),
    jumlah_kamar INTEGER,
    sumber_air VARCHAR(50) CHECK (sumber_air IN ('PDAM', 'SUMUR', 'SUNGAI', 'HUJAN', 'LAINNYA')),
    sumber_listrik VARCHAR(50) CHECK (sumber_listrik IN ('PLN', 'SOLAR', 'GENSET', 'TIDAK ADA', 'LAINNYA')),
    
    -- Economic status
    pekerjaan_utama VARCHAR(100),
    pekerjaan_sampingan VARCHAR(100),
    pendapatan_per_bulan DECIMAL(12,2),
    pengeluaran_per_bulan DECIMAL(12,2),
    kepemilikan_lahan_ha DECIMAL(6,2),
    aset_produktif TEXT, -- JSON or text description
    
    -- Social status
    pendidikan_terakhir VARCHAR(50) CHECK (pendidikan_terakhir IN ('TIDAK SEKOLAH', 'SD', 'SMP', 'SMA', 'DIPLOMA', 'SARJANA', 'LAINNYA')),
    keterampilan_khusus TEXT,
    keanggotaan_kelompok VARCHAR(100), -- kelompok tani, kelompok wanita, dll
    
    -- Program participation
    status_partisipasi VARCHAR(20) CHECK (status_partisipasi IN ('AKTIF', 'PASIF', 'KELUAR', 'BELUM_AKTIF')),
    tanggal_gabung DATE,
    tanggal_keluar DATE,
    alasan_keluar TEXT,
    
    -- System fields
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ANGGOTA KELUARGA TABLE
-- ============================================
CREATE TABLE anggota_keluarga (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kepala_keluarga_id UUID REFERENCES kepala_keluarga(id) ON DELETE CASCADE,
    
    -- Basic identification
    nama VARCHAR(255) NOT NULL,
    nik VARCHAR(16) UNIQUE,
    hubungan VARCHAR(20) CHECK (hubungan IN ('SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'CUCU', 'ORANGTUA', 'LAINNYA')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(10) CHECK (jenis_kelamin IN ('LAKI-LAKI', 'PEREMPUAN')),
    
    -- Status
    status_perkawinan VARCHAR(20) CHECK (status_perkawinan IN ('BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI')),
    pendidikan_terakhir VARCHAR(50) CHECK (pendidikan_terakhir IN ('TIDAK SEKOLAH', 'SD', 'SMP', 'SMA', 'DIPLOMA', 'SARJANA', 'LAINNYA')),
    pekerjaan VARCHAR(100),
    penghasilan_bulanan DECIMAL(12,2),
    
    -- Health & social
    status_disabilitas BOOLEAN DEFAULT FALSE,
    jenis_disabilitas VARCHAR(100),
    keterampilan_khusus TEXT,
    
    -- Program participation
    ikut_program BOOLEAN DEFAULT FALSE,
    jenis_program VARCHAR(100),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. EKONOMI KELUARGA TABLE (Monthly tracking)
-- ============================================
CREATE TABLE ekonomi_keluarga (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kepala_keluarga_id UUID REFERENCES kepala_keluarga(id) ON DELETE CASCADE,
    
    -- Period
    tahun INTEGER NOT NULL,
    bulan INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
    
    -- Income sources
    pendapatan_pertanian DECIMAL(12,2) DEFAULT 0,
    pendapatan_non_pertanian DECIMAL(12,2) DEFAULT 0,
    pendapatan_program DECIMAL(12,2) DEFAULT 0, -- from carbon/empowerment programs
    pendapatan_lainnya DECIMAL(12,2) DEFAULT 0,
    total_pendapatan DECIMAL(12,2) GENERATED ALWAYS AS (
        pendapatan_pertanian + pendapatan_non_pertanian + 
        pendapatan_program + pendapatan_lainnya
    ) STORED,
    
    -- Expenses
    pengeluaran_pangan DECIMAL(12,2) DEFAULT 0,
    pengeluaran_pendidikan DECIMAL(12,2) DEFAULT 0,
    pengeluaran_kesehatan DECIMAL(12,2) DEFAULT 0,
    pengeluaran_transportasi DECIMAL(12,2) DEFAULT 0,
    pengeluaran_lainnya DECIMAL(12,2) DEFAULT 0,
    total_pengeluaran DECIMAL(12,2) GENERATED ALWAYS AS (
        pengeluaran_pangan + pengeluaran_pendidikan + 
        pengeluaran_kesehatan + pengeluaran_transportasi + 
        pengeluaran_lainnya
    ) STORED,
    
    -- Assets & savings
    tabungan_bulanan DECIMAL(12,2) DEFAULT 0,
    aset_tambahan TEXT, -- JSON or description
    
    -- Food security
    hari_makan_bergizi INTEGER CHECK (hari_makan_bergizi >= 0 AND hari_makan_bergizi <= 31),
    stok_pangan_bulan VARCHAR(20) CHECK (stok_pangan_bulan IN ('CUKUP', 'KURANG', 'SANGAT_KURANG')),
    
    -- Notes
    catatan TEXT,
    
    -- System fields
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(kepala_keluarga_id, tahun, bulan)
);

-- ============================================
-- 4. PARTISIPASI PROGRAM TABLE
-- ============================================
CREATE TABLE partisipasi_program (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kepala_keluarga_id UUID REFERENCES kepala_keluarga(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    kegiatan_dram_id UUID REFERENCES kegiatan_dram(id) ON DELETE SET NULL,
    
    -- Participation details
    peran VARCHAR(100), -- e.g., 'Peserta', 'Fasilitator', 'Koordinator'
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    intensitas_partisipasi VARCHAR(20) CHECK (intensitas_partisipasi IN ('RUTIN', 'KADANG-KADANG', 'JARANG')),
    
    -- Benefits received
    manfaat_diterima TEXT, -- JSON or description of benefits
    nilai_manfaat DECIMAL(12,2),
    
    -- Performance
    kinerja VARCHAR(20) CHECK (kinerja IN ('SANGAT BAIK', 'BAIK', 'CUKUP', 'KURANG')),
    catatan_kinerja TEXT,
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('AKTIF', 'SELESAI', 'DIBATALKAN', 'TERSUSPENSI')),
    
    -- System fields
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all new tables
ALTER TABLE kepala_keluarga ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggota_keluarga ENABLE ROW LEVEL SECURITY;
ALTER TABLE ekonomi_keluarga ENABLE ROW LEVEL SECURITY;
ALTER TABLE partisipasi_program ENABLE ROW LEVEL SECURITY;

-- Kepala Keluarga: Readable by authenticated users, manageable by program planners
CREATE POLICY "Kepala keluarga readable by authenticated users" ON kepala_keluarga
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Kepala keluarga manageable by admin and program_planner" ON kepala_keluarga
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'program_implementer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Anggota Keluarga: Inherits permissions from kepala_keluarga
CREATE POLICY "Anggota keluarga readable by authenticated users" ON anggota_keluarga
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anggota keluarga manageable by admin and program_planner" ON anggota_keluarga
    FOR ALL USING (
        EXISTS (SELECT 1 FROM kepala_keluarga kk WHERE kk.id = anggota_keluarga.kepala_keluarga_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'program_implementer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Ekonomi Keluarga: Sensitive data - restricted access
CREATE POLICY "Ekonomi keluarga readable by admin and program_planner" ON ekonomi_keluarga
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

CREATE POLICY "Ekonomi keluarga manageable by admin and program_planner" ON ekonomi_keluarga
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

-- Partisipasi Program: Manageable by program planners and implementers
CREATE POLICY "Partisipasi program readable by authenticated users" ON partisipasi_program
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Partisipasi program manageable by admin and program_planner" ON partisipasi_program
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'program_implementer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX idx_kk_perhutanan_sosial ON kepala_keluarga(perhutanan_sosial_id);
CREATE INDEX idx_kk_program ON kepala_keluarga(program_id);
CREATE INDEX idx_kk_nik ON kepala_keluarga(nik);
CREATE INDEX idx_kk_status ON kepala_keluarga(status_partisipasi);

CREATE INDEX idx_anggota_kk ON anggota_keluarga(kepala_keluarga_id);
CREATE INDEX idx_anggota_nik ON anggota_keluarga(nik);

CREATE INDEX idx_ekonomi_kk ON ekonomi_keluarga(kepala_keluarga_id);
CREATE INDEX idx_ekonomi_period ON ekonomi_keluarga(tahun, bulan);

CREATE INDEX idx_partisipasi_kk ON partisipasi_program(kepala_keluarga_id);
CREATE INDEX idx_partisipasi_program ON partisipasi_program(program_id);
CREATE INDEX idx_partisipasi_status ON partisipasi_program(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_kepala_keluarga_updated_at
    BEFORE UPDATE ON kepala_keluarga
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anggota_keluarga_updated_at
    BEFORE UPDATE ON anggota_keluarga
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ekonomi_keluarga_updated_at
    BEFORE UPDATE ON ekonomi_keluarga
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partisipasi_program_updated_at
    BEFORE UPDATE ON partisipasi_program
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT TRIGGERS
-- ============================================
CREATE TRIGGER audit_kepala_keluarga
    AFTER INSERT OR UPDATE OR DELETE ON kepala_keluarga
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_anggota_keluarga
    AFTER INSERT OR UPDATE OR DELETE ON anggota_keluarga
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_ekonomi_keluarga
    AFTER INSERT OR UPDATE OR DELETE ON ekonomi_keluarga
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_partisipasi_program
    AFTER INSERT OR UPDATE OR DELETE ON partisipasi_program
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- FUNCTIONS FOR DATA INTEGRITY
-- ============================================
-- Function to update jumlah_kk in perhutanan_sosial
CREATE OR REPLACE FUNCTION update_jumlah_kk()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE perhutanan_sosial ps
        SET jumlah_kk = (
            SELECT COUNT(DISTINCT kk.id)
            FROM kepala_keluarga kk
            WHERE kk.perhutanan_sosial_id = NEW.perhutanan_sosial_id
            AND kk.status_partisipasi != 'KELUAR'
        )
        WHERE ps.id = NEW.perhutanan_sosial_id;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Update both old and new PS if KK moved between PS
        IF OLD.perhutanan_sosial_id IS DISTINCT FROM NEW.perhutanan_sosial_id THEN
            -- Update old PS
            UPDATE perhutanan_sosial ps
            SET jumlah_kk = (
                SELECT COUNT(DISTINCT kk.id)
                FROM kepala_keluarga kk
                WHERE kk.perhutanan_sosial_id = OLD.perhutanan_sosial_id
                AND kk.status_partisipasi != 'KELUAR'
            )
            WHERE ps.id = OLD.perhutanan_sosial_id;
            
            -- Update new PS
            UPDATE perhutanan_sosial ps
            SET jumlah_kk = (
                SELECT COUNT(DISTINCT kk.id)
                FROM kepala_keluarga kk
                WHERE kk.perhutanan_sosial_id = NEW.perhutanan_sosial_id
                AND kk.status_partisipasi != 'KELUAR'
            )
            WHERE ps.id = NEW.perhutanan_sosial_id;
        ELSE
            -- Update current PS if status changed
            UPDATE perhutanan_sosial ps
            SET jumlah_kk = (
                SELECT COUNT(DISTINCT kk.id)
                FROM kepala_keluarga kk
                WHERE kk.perhutanan_sosial_id = NEW.perhutanan_sosial_id
                AND kk.status_partisipasi != 'KELUAR'
            )
            WHERE ps.id = NEW.perhutanan_sosial_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE perhutanan_sosial ps
        SET jumlah_kk = (
            SELECT COUNT(DISTINCT kk.id)
            FROM kepala_keluarga kk
            WHERE kk.perhutanan_sosial_id = OLD.perhutanan_sosial_id
            AND kk.status_partisipasi != 'KELUAR'
        )
        WHERE ps.id = OLD.perhutanan_sosial_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain jumlah_kk count
CREATE TRIGGER trigger_update_jumlah_kk
    AFTER INSERT OR UPDATE OR DELETE ON kepala_keluarga
    FOR EACH ROW EXECUTE FUNCTION update_jumlah_kk();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================
-- View for household summary
CREATE VIEW vw_summary_kk_per_ps AS
SELECT 
    ps.id as ps_id,
    ps.pemegang_izin,
    ps.desa,
    ps.kecamatan,
    COUNT(DISTINCT kk.id) as total_kk,
    COUNT(DISTINCT CASE WHEN kk.status_partisipasi = 'AKTIF' THEN kk.id END) as kk_aktif,
    COUNT(DISTINCT CASE WHEN kk.status_partisipasi = 'PASIF' THEN kk.id END) as kk_pasif,
    SUM(kk.jumlah_kamar) as total_kamar,
    AVG(kk.pendapatan_per_bulan) as rata_pendapatan,
    AVG(kk.pengeluaran_per_bulan) as rata_pengeluaran
FROM perhutanan_sosial ps
LEFT JOIN kepala_keluarga kk ON ps.id = kk.perhutanan_sosial_id
GROUP BY ps.id, ps.pemegang_izin, ps.desa, ps.kecamatan;

-- View for program participation
CREATE VIEW vw_partisipasi_program_detail AS
SELECT 
    pp.id,
    kk.nama_kepala_keluarga,
    kk.nik,
    ps.pemegang_izin as nama_ps,
    p.nama_program,
    pp.peran,
    pp.status,
    pp.tanggal_mulai,
    pp.tanggal_selesai,
    pp.nilai_manfaat,
    pp.kinerja
FROM partisipasi_program pp
JOIN kepala_keluarga kk ON pp.kepala_keluarga_id = kk.id
JOIN perhutanan_sosial ps ON kk.perhutanan_sosial_id = ps.id
JOIN programs p ON pp.program_id = p.id;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE kepala_keluarga IS 'Data detail Kepala Keluarga (KK) dalam Perhutanan Sosial';
COMMENT ON TABLE anggota_keluarga IS 'Data anggota keluarga per KK';
COMMENT ON TABLE ekonomi_keluarga IS 'Tracking ekonomi keluarga bulanan untuk monitoring pemberdayaan';
COMMENT ON TABLE partisipasi_program IS 'Partisipasi KK dalam program karbon/pemberdayaan';

COMMENT ON COLUMN kepala_keluarga.nomor_kk IS 'Nomor Kartu Keluarga (unique)';
COMMENT ON COLUMN kepala_keluarga.nik IS 'Nomor Induk Kependudukan (unique)';
COMMENT ON COLUMN ekonomi_keluarga.hari_makan_bergizi IS 'Jumlah hari dalam sebulan keluarga makan makanan bergizi';

-- ============================================
-- MIGRATION SUCCESS MESSAGE
-- ============================================
-- This migration adds 4 new tables for Kepala Keluarga Management System:
-- 1. kepala_keluarga - Detailed household data
-- 2. anggota_keluarga - Family members data
-- 3. ekonomi_keluarga - Monthly economic tracking
-- 4. partisipasi_program - Program participation tracking
-- Plus 2 views for reporting and automatic update of jumlah_kk in perhutanan_sosial.-- Plus 2 views for reporting and automatic update of jumlah_kk in perhutanan_sosial.
