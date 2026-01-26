-- Migration: Add program enhancements for kategori hutan and aksi mitigasi
-- Date: 2026-01-27
-- Description: Add kategori_hutan to programs, create master_aksi_mitigasi and program_aksi_mitigasi junction table
-- FIXED: Updated to handle integer IDs in audit triggers

-- 0. Fix audit system to support integer IDs (if needed)
DO $$
BEGIN
    -- Check if audit_log.record_id is UUID and needs to be changed to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'record_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE audit_log ALTER COLUMN record_id TYPE TEXT;
    END IF;
END $$;

-- 1. Update the audit_trigger_function to handle TEXT record_id
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 2. Add kategori_hutan column to programs table
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS kategori_hutan VARCHAR(20) CHECK (kategori_hutan IN ('MINERAL', 'GAMBUT'));

-- 3. Create master_aksi_mitigasi table
CREATE TABLE IF NOT EXISTS master_aksi_mitigasi (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(10) UNIQUE NOT NULL,
    nama_aksi VARCHAR(255) NOT NULL,
    kelompok VARCHAR(50) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert 15 aksi mitigasi from the user's list
-- Using the structure: A. Perlindungan Hutan, B. Peningkatan Serapan Karbon, C. Tata Kelola, D. Sosial, E. Sertifikasi
INSERT INTO master_aksi_mitigasi (kode, nama_aksi, kelompok, deskripsi) VALUES
-- A. Perlindungan Hutan (Avoided Emissions)
('AM01', 'Penetapan & Penegasan Batas Areal PS', 'PERLINDUNGAN_HUTAN', 'Pemasangan patok batas, pemetaan GIS & overlay tenurial. Output: kepastian kawasan, menghindari deforestasi & konflik'),
('AM02', 'Perlindungan dan Pengamanan Hutan (Forest Protection)', 'PERLINDUNGAN_HUTAN', 'Patroli rutin berbasis masyarakat, pencegahan illegal logging & perambahan, sistem pelaporan cepat. Output: penurunan emisi dari deforestasi ilegal'),
('AM03', 'Pengendalian Kebakaran Hutan dan Lahan (Karhutla)', 'PERLINDUNGAN_HUTAN', 'Pembentukan Masyarakat Peduli Api (MPA), sekat kanal sederhana (jika gambut), pelatihan pencegahan kebakaran. Output: avoided emission dari kebakaran'),
('AM04', 'Perlindungan Kawasan Bernilai Konservasi Tinggi (HCVF)', 'PERLINDUNGAN_HUTAN', 'Identifikasi HCV (riparian, mata air, situs budaya), larangan pembukaan lahan & pembakaran. Output: stabilitas stok karbon jangka panjang'),
-- B. Peningkatan Serapan Karbon (Carbon Removal)
('AM05', 'Rehabilitasi dan Penanaman Kembali (Reforestation / Enrichment)', 'PENINGKATAN_SERAPAN', 'Penanaman jenis lokal bernilai karbon tinggi, enrichment planting di hutan terdegradasi. Output: peningkatan carbon stock (tCO₂e)'),
('AM06', 'Pembuatan Persemaian Bibit Lokal', 'PENINGKATAN_SERAPAN', 'Persemaian desa, jenis tanaman kehutanan + HHBK. Output: keberlanjutan penanaman & efisiensi biaya'),
('AM07', 'Pemeliharaan Tanaman', 'PENINGKATAN_SERAPAN', 'Penyulaman, pengendalian gulma, perlindungan tanaman muda. Output: survival rate tinggi → valid untuk MRV'),
-- C. Tata Kelola & Manajemen
('AM08', 'Penerapan Sistem Silvikultur Berkelanjutan', 'TATA_KELOLA', 'Larangan tebang habis, tebang pilih & rotasi. Output: pengelolaan karbon jangka panjang'),
('AM09', 'Penguatan Kelembagaan PS', 'TATA_KELOLA', 'Operasional LPHD/Koperasi PS, SOP perlindungan hutan & mitigasi. Output: governance kuat (mandatory untuk sertifikasi)'),
('AM10', 'Penyusunan & Implementasi DRAM / PDD', 'TATA_KELOLA', 'Penetapan baseline emisi, skenario mitigasi, monitoring plan (MRV). Output: dokumen inti proyek karbon'),
-- D. Sosial (Social Safeguard)
('AM11', 'Social Impact Assessment (SIA)', 'SOSIAL', 'Identifikasi dampak sosial, strategi mitigasi konflik. Output: compliance safeguard nasional & internasional'),
('AM12', 'Pemberdayaan Ekonomi Alternatif', 'SOSIAL', 'HHBK (kopi, pala, rotan, damar, dll.), usaha non-ekstraktif. Output: menekan tekanan pembukaan hutan'),
('AM13', 'Pelibatan Kelompok Perempuan & Pemuda', 'SOSIAL', 'Persemaian, monitoring sosial, UMKM hijau. Output: keberlanjutan sosial proyek karbon'),
-- E. Sertifikasi & Perdagangan Karbon
('AM14', 'Monitoring, Reporting, and Verification (MRV)', 'SERTIFIKASI', 'Pengukuran biomassa, pelaporan berkala, audit independen. Output: eligible untuk SPE / voluntary credit'),
('AM15', 'Sertifikasi Karbon', 'SERTIFIKASI', 'Sertifikat Pengurangan Emisi (SPE) / skema voluntary. Output: karbon bisa diperdagangkan')
ON CONFLICT (kode) DO UPDATE 
SET nama_aksi = EXCLUDED.nama_aksi,
    kelompok = EXCLUDED.kelompok,
    deskripsi = EXCLUDED.deskripsi,
    updated_at = NOW();

-- 5. Create junction table for program to aksi mitigasi (many-to-many)
CREATE TABLE IF NOT EXISTS program_aksi_mitigasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    aksi_mitigasi_id INTEGER NOT NULL REFERENCES master_aksi_mitigasi(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, aksi_mitigasi_id)
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_programs_kategori_hutan ON programs(kategori_hutan);
CREATE INDEX IF NOT EXISTS idx_master_aksi_mitigasi_kelompok ON master_aksi_mitigasi(kelompok);
CREATE INDEX IF NOT EXISTS idx_program_aksi_mitigasi_program ON program_aksi_mitigasi(program_id);
CREATE INDEX IF NOT EXISTS idx_program_aksi_mitigasi_aksi ON program_aksi_mitigasi(aksi_mitigasi_id);

-- 7. Enable RLS on new tables
ALTER TABLE master_aksi_mitigasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_aksi_mitigasi ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies: master_aksi_mitigasi readable by all authenticated users
DROP POLICY IF EXISTS "Master aksi mitigasi readable by authenticated users" ON master_aksi_mitigasi;
CREATE POLICY "Master aksi mitigasi readable by authenticated users" ON master_aksi_mitigasi
    FOR SELECT USING (auth.role() = 'authenticated');

-- 9. RLS Policies: program_aksi_mitigasi - users can see their own program's aksi
DROP POLICY IF EXISTS "Program aksi mitigasi readable by authenticated users" ON program_aksi_mitigasi;
CREATE POLICY "Program aksi mitigasi readable by authenticated users" ON program_aksi_mitigasi
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM programs p 
            WHERE p.id = program_aksi_mitigasi.program_id 
            AND (p.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM role_permissions rp
                WHERE rp.role_name IN ('admin', 'program_planner')
                AND EXISTS (
                    SELECT 1 FROM profiles pf 
                    WHERE pf.id = auth.uid() 
                    AND pf.role = rp.role_name
                )
            ))
        )
    );

-- 10. RLS Policies: program_aksi_mitigasi - admin and program_planner can manage
DROP POLICY IF EXISTS "Program aksi mitigasi manageable by admin and program_planner" ON program_aksi_mitigasi;
CREATE POLICY "Program aksi mitigasi manageable by admin and program_planner" ON program_aksi_mitigasi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM programs p 
            WHERE p.id = program_aksi_mitigasi.program_id 
            AND (p.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM role_permissions rp
                WHERE rp.role_name IN ('admin', 'program_planner')
                AND EXISTS (
                    SELECT 1 FROM profiles pf 
                    WHERE pf.id = auth.uid() 
                    AND pf.role = rp.role_name
                )
            ))
        )
    );

-- 11. Trigger for updated_at on master_aksi_mitigasi
DROP TRIGGER IF EXISTS update_master_aksi_mitigasi_updated_at ON master_aksi_mitigasi;
CREATE TRIGGER update_master_aksi_mitigasi_updated_at
    BEFORE UPDATE ON master_aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Audit trigger for new tables
DROP TRIGGER IF EXISTS audit_master_aksi_mitigasi ON master_aksi_mitigasi;
CREATE TRIGGER audit_master_aksi_mitigasi
    AFTER INSERT OR UPDATE OR DELETE ON master_aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_program_aksi_mitigasi ON program_aksi_mitigasi;
CREATE TRIGGER audit_program_aksi_mitigasi
    AFTER INSERT OR UPDATE OR DELETE ON program_aksi_mitigasi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 13. Comments
COMMENT ON TABLE master_aksi_mitigasi IS 'Master data 15 aksi mitigasi untuk Program Karbon';
COMMENT ON TABLE program_aksi_mitigasi IS 'Junction table antara Program dan Aksi Mitigasi (many-to-many)';
COMMENT ON COLUMN programs.kategori_hutan IS 'Kategori hutan: MINERAL atau GAMBUT';