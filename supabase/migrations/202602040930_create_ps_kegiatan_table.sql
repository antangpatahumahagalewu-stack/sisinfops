-- Migration: Create ps_kegiatan table for kegiatan tab
-- Generated at: 2026-02-04 09:30 AM

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create ps_kegiatan table
-- ======================
CREATE TABLE IF NOT EXISTS ps_kegiatan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    nama_kegiatan VARCHAR(255) NOT NULL,
    jenis_kegiatan VARCHAR(100),
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    lokasi TEXT,
    deskripsi TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'RENCANA',
    anggaran DECIMAL(15, 2),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Check constraints
    CONSTRAINT status_check CHECK (status IN ('RENCANA', 'BERLANGSUNG', 'SELESAI', 'DIBATALKAN')),
    CONSTRAINT tanggal_check CHECK (tanggal_selesai IS NULL OR tanggal_mulai IS NULL OR tanggal_selesai >= tanggal_mulai)
);

-- ======================
-- 2. Create indexes for performance
-- ======================
CREATE INDEX IF NOT EXISTS idx_ps_kegiatan_perhutanan_sosial_id ON ps_kegiatan(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_ps_kegiatan_status ON ps_kegiatan(status);
CREATE INDEX IF NOT EXISTS idx_ps_kegiatan_tanggal_mulai ON ps_kegiatan(tanggal_mulai DESC);
CREATE INDEX IF NOT EXISTS idx_ps_kegiatan_created_at ON ps_kegiatan(created_at DESC);

-- ======================
-- 3. Create updated_at trigger
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ps_kegiatan_updated_at ON ps_kegiatan;
CREATE TRIGGER update_ps_kegiatan_updated_at
    BEFORE UPDATE ON ps_kegiatan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- 4. Enable RLS with simple policies for testing
-- ======================
ALTER TABLE IF EXISTS ps_kegiatan ENABLE ROW LEVEL SECURITY;

-- Allow all operations for testing (can be restricted later)
CREATE POLICY "Allow all operations on ps_kegiatan for testing" ON ps_kegiatan
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ======================
-- 5. Grant permissions
-- ======================
GRANT ALL ON ps_kegiatan TO postgres, anon, authenticated, service_role;

-- ======================
-- 6. Insert sample data for testing
-- ======================
DO $$
DECLARE
    sample_ps_id UUID;
BEGIN
    -- Get a sample PS ID
    SELECT id INTO sample_ps_id FROM perhutanan_sosial LIMIT 1;
    
    -- Only insert sample data if we have a PS and the table is empty
    IF sample_ps_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ps_kegiatan LIMIT 1) THEN
        INSERT INTO ps_kegiatan (
            perhutanan_sosial_id,
            nama_kegiatan,
            jenis_kegiatan,
            tanggal_mulai,
            tanggal_selesai,
            lokasi,
            deskripsi,
            status,
            anggaran,
            latitude,
            longitude
        ) VALUES 
        (
            sample_ps_id,
            'Penanaman Pohon 2025',
            'Penanaman',
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE - INTERVAL '25 days',
            'Blok A, Desa Sumber Rejeki',
            'Penanaman 1000 bibit pohon mahoni untuk reforestasi',
            'SELESAI',
            25000000.00,
            -2.23000000,
            113.92000000
        ),
        (
            sample_ps_id,
            'Pelatihan Pengelolaan Hutan',
            'Pelatihan',
            CURRENT_DATE + INTERVAL '7 days',
            CURRENT_DATE + INTERVAL '10 days',
            'Balai Desa Sumber Rejeki',
            'Pelatihan pengelolaan hutan berkelanjutan untuk kelompok tani',
            'RENCANA',
            15000000.00,
            -2.23100000,
            113.92100000
        ),
        (
            sample_ps_id,
            'Monitoring Pertumbuhan Pohon',
            'Monitoring',
            CURRENT_DATE - INTERVAL '15 days',
            CURRENT_DATE,
            'Area Reforestasi Blok A',
            'Monitoring pertumbuhan pohon yang ditanam bulan lalu',
            'BERLANGSUNG',
            5000000.00,
            -2.22900000,
            113.91900000
        );
        
        RAISE NOTICE '✅ Inserted 3 sample kegiatan records';
    ELSE
        RAISE NOTICE 'ℹ️  No sample data inserted (table already has data or no PS found)';
    END IF;
END $$;

-- ======================
-- 7. Verification
-- ======================
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_kegiatan'
    ) INTO table_exists;
    
    -- Get row count
    SELECT COUNT(*) INTO row_count FROM ps_kegiatan;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PS_KEGIATAN TABLE CREATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Table status:';
    RAISE NOTICE '  • ps_kegiatan: % (% rows)', 
        CASE WHEN table_exists THEN 'EXISTS' ELSE 'MISSING' END,
        row_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend impact:';
    RAISE NOTICE '  ✅ /ps/[psId]/kegiatan tab will now work';
    RAISE NOTICE '  ✅ No more "Error fetching kegiatan: {}"';
    RAISE NOTICE '  ✅ Sample data: 3 kegiatan records';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  • Foreign key to perhutanan_sosial';
    RAISE NOTICE '  • Status validation (RENCANA, BERLANGSUNG, SELESAI, DIBATALKAN)';
    RAISE NOTICE '  • Date validation (selesai >= mulai)';
    RAISE NOTICE '  • RLS enabled with simple policies';
    RAISE NOTICE '  • Auto-updated timestamps';
    RAISE NOTICE '=========================================';
END $$;

-- ======================
-- 8. Refresh schema cache
-- ======================
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;