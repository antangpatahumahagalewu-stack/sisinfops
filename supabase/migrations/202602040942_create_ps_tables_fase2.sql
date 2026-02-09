-- Migration: Create missing PS tables for catatan, peta, galeri, lahan
-- Generated at: 2026-02-04 09:42 AM
-- Fixes console errors in PS detail tabs

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create ps_catatan table
-- ======================
CREATE TABLE IF NOT EXISTS ps_catatan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'MONITORING',
    tanggal_catatan DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Check constraints
    CONSTRAINT kategori_check CHECK (kategori IN ('MONITORING', 'EVALUASI', 'MASALAH', 'PENCAPAIAN', 'LAINNYA'))
);

-- ======================
-- 2. Create ps_peta table
-- ======================
CREATE TABLE IF NOT EXISTS ps_peta (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    nama_peta VARCHAR(255) NOT NULL,
    jenis_peta VARCHAR(100),
    deskripsi TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 3. Create ps_galeri table
-- ======================
CREATE TABLE IF NOT EXISTS ps_galeri (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    judul_gambar VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    jenis_file VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 4. Create ps_lahan table (for land/area management)
-- ======================
CREATE TABLE IF NOT EXISTS ps_lahan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    nama_lahan VARCHAR(255) NOT NULL,
    luas_ha DECIMAL(10, 2) NOT NULL,
    jenis_lahan VARCHAR(100),
    status_kepemilikan VARCHAR(100),
    koordinat JSONB,
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 5. Create indexes for performance
-- ======================
CREATE INDEX IF NOT EXISTS idx_ps_catatan_perhutanan_sosial_id ON ps_catatan(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_ps_catatan_tanggal_catatan ON ps_catatan(tanggal_catatan DESC);
CREATE INDEX IF NOT EXISTS idx_ps_catatan_kategori ON ps_catatan(kategori);

CREATE INDEX IF NOT EXISTS idx_ps_peta_perhutanan_sosial_id ON ps_peta(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_ps_peta_jenis_peta ON ps_peta(jenis_peta);

CREATE INDEX IF NOT EXISTS idx_ps_galeri_perhutanan_sosial_id ON ps_galeri(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_ps_galeri_jenis_file ON ps_galeri(jenis_file);

CREATE INDEX IF NOT EXISTS idx_ps_lahan_perhutanan_sosial_id ON ps_lahan(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_ps_lahan_jenis_lahan ON ps_lahan(jenis_lahan);

-- ======================
-- 6. Create updated_at triggers
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_ps_catatan_updated_at ON ps_catatan;
CREATE TRIGGER update_ps_catatan_updated_at
    BEFORE UPDATE ON ps_catatan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ps_peta_updated_at ON ps_peta;
CREATE TRIGGER update_ps_peta_updated_at
    BEFORE UPDATE ON ps_peta
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ps_galeri_updated_at ON ps_galeri;
CREATE TRIGGER update_ps_galeri_updated_at
    BEFORE UPDATE ON ps_galeri
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ps_lahan_updated_at ON ps_lahan;
CREATE TRIGGER update_ps_lahan_updated_at
    BEFORE UPDATE ON ps_lahan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- 7. Enable RLS with simple policies
-- ======================
ALTER TABLE IF EXISTS ps_catatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ps_peta ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ps_galeri ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ps_lahan ENABLE ROW LEVEL SECURITY;

-- Simple policies - allow all for testing
CREATE POLICY "Allow all operations on ps_catatan for testing" ON ps_catatan
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on ps_peta for testing" ON ps_peta
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on ps_galeri for testing" ON ps_galeri
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on ps_lahan for testing" ON ps_lahan
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ======================
-- 8. Grant permissions
-- ======================
GRANT ALL ON ps_catatan TO postgres, anon, authenticated, service_role;
GRANT ALL ON ps_peta TO postgres, anon, authenticated, service_role;
GRANT ALL ON ps_galeri TO postgres, anon, authenticated, service_role;
GRANT ALL ON ps_lahan TO postgres, anon, authenticated, service_role;

-- ======================
-- 9. Insert sample data for testing
-- ======================
DO $$
DECLARE
    sample_ps_id UUID;
BEGIN
    -- Get a sample PS ID
    SELECT id INTO sample_ps_id FROM perhutanan_sosial LIMIT 1;
    
    -- Only insert sample data if we have a PS
    IF sample_ps_id IS NOT NULL THEN
        -- Insert sample catatan
        INSERT INTO ps_catatan (perhutanan_sosial_id, judul, isi, kategori, tanggal_catatan) VALUES
        (sample_ps_id, 'Monitoring Pertumbuhan Pohon', 'Pohon menunjukkan pertumbuhan yang baik. Tinggi rata-rata sudah mencapai 1.5 meter.', 'MONITORING', CURRENT_DATE - INTERVAL '10 days'),
        (sample_ps_id, 'Kendala Akses Jalan', 'Jalan menuju lokasi PS rusak akibat hujan, perlu perbaikan.', 'MASALAH', CURRENT_DATE - INTERVAL '5 days'),
        (sample_ps_id, 'Evaluasi Program Penanaman', 'Program penanaman berjalan sesuai rencana, 95% bibit hidup.', 'EVALUASI', CURRENT_DATE - INTERVAL '2 days')
        ON CONFLICT DO NOTHING;
        
        -- Insert sample peta
        INSERT INTO ps_peta (perhutanan_sosial_id, nama_peta, jenis_peta, deskripsi) VALUES
        (sample_ps_id, 'Peta Batas Kawasan PS', 'batas', 'Peta batas kawasan Perhutanan Sosial'),
        (sample_ps_id, 'Peta Zonasi', 'zonasi', 'Peta zonasi untuk berbagai kegiatan')
        ON CONFLICT DO NOTHING;
        
        -- Insert sample lahan (note: galeri requires actual files, so we'll leave empty)
        INSERT INTO ps_lahan (perhutanan_sosial_id, nama_lahan, luas_ha, jenis_lahan, status_kepemilikan) VALUES
        (sample_ps_id, 'Blok A', 25.5, 'hutan_lindung', 'Hak Pakai'),
        (sample_ps_id, 'Blok B', 18.2, 'hutan_produksi', 'Hak Pakai'),
        (sample_ps_id, 'Blok C', 12.8, 'hutan_konservasi', 'Hak Guna Usaha')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Sample data inserted for PS ID: %', sample_ps_id;
        RAISE NOTICE '   • ps_catatan: 3 records';
        RAISE NOTICE '   • ps_peta: 2 records';
        RAISE NOTICE '   • ps_lahan: 3 records';
        RAISE NOTICE '   • ps_galeri: 0 records (requires file upload)';
    ELSE
        RAISE NOTICE 'ℹ️  No sample data inserted (no PS found)';
    END IF;
END $$;

-- ======================
-- 10. Verification
-- ======================
DO $$
DECLARE
    catatan_count INTEGER;
    peta_count INTEGER;
    galeri_count INTEGER;
    lahan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO catatan_count FROM ps_catatan;
    SELECT COUNT(*) INTO peta_count FROM ps_peta;
    SELECT COUNT(*) INTO galeri_count FROM ps_galeri;
    SELECT COUNT(*) INTO lahan_count FROM ps_lahan;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'FASE 2: PS TABLES CREATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  • ps_catatan - % rows', catatan_count;
    RAISE NOTICE '  • ps_peta - % rows', peta_count;
    RAISE NOTICE '  • ps_galeri - % rows', galeri_count;
    RAISE NOTICE '  • ps_lahan - % rows', lahan_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend errors that will now be fixed:';
    RAISE NOTICE '  ✅ tab-catatan.tsx - "Error fetching catatan: {}"';
    RAISE NOTICE '  ✅ tab-peta.tsx - "Error fetching peta: {}"';
    RAISE NOTICE '  ✅ tab-galeri.tsx - "Error fetching galeri: {}"';
    RAISE NOTICE '  ✅ tab-lahan.tsx - "Error fetching lahan: {}"';
    RAISE NOTICE '';
    RAISE NOTICE 'Total PS-related tables now available:';
    RAISE NOTICE '  • ps_kegiatan (created earlier)';
    RAISE NOTICE '  • ps_dokumen (created earlier)';
    RAISE NOTICE '  • ps_catatan (new)';
    RAISE NOTICE '  • ps_peta (new)';
    RAISE NOTICE '  • ps_galeri (new)';
    RAISE NOTICE '  • ps_lahan (new)';
    RAISE NOTICE '  • lembaga_pengelola (created earlier)';
    RAISE NOTICE '';
    RAISE NOTICE 'All PS detail page tabs should now work!';
    RAISE NOTICE '=========================================';
END $$;

-- ======================
-- 11. Refresh schema cache
-- ======================
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;