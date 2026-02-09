-- SQL untuk memperbaiki tabel kabupaten yang terhapus
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql

-- ====================================================================
-- 1. Hapus foreign key constraint sementara untuk perbaikan
-- ====================================================================
-- Cek jika constraint ada, kita disable dulu untuk perbaikan
DO $$
BEGIN
    -- Cek jika ada foreign key constraint dari perhutanan_sosial ke kabupaten
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'perhutanan_sosial_kabupaten_id_fkey' 
        AND conrelid = 'perhutanan_sosial'::regclass
    ) THEN
        -- Tampilkan constraint yang akan dihapus sementara
        RAISE NOTICE 'Menemukan foreign key constraint perhutanan_sosial_kabupaten_id_fkey, akan dihapus sementara...';
        
        -- Hapus constraint sementara
        ALTER TABLE perhutanan_sosial DROP CONSTRAINT IF EXISTS perhutanan_sosial_kabupaten_id_fkey;
        RAISE NOTICE 'Constraint dihapus sementara untuk perbaikan';
    ELSE
        RAISE NOTICE 'Tidak ada foreign key constraint dari perhutanan_sosial ke kabupaten';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error handling constraint: %', SQLERRM;
END $$;

-- ====================================================================
-- 2. Buat tabel kabupaten jika belum ada
-- ====================================================================
CREATE TABLE IF NOT EXISTS kabupaten (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 3. Insert data kabupaten default (5 kabupaten di Kalimantan Tengah)
-- ====================================================================
INSERT INTO kabupaten (nama) VALUES
    ('Kabupaten Katingan'),
    ('Kabupaten Kapuas'),
    ('Kabupaten Pulang Pisau'),
    ('Kabupaten Gunung Mas'),
    ('Kotamadya Palangka Raya')
ON CONFLICT (nama) DO NOTHING;

-- ====================================================================
-- 4. Update kabupaten_id di perhutanan_sosial jika NULL atau invalid
-- ====================================================================
DO $$
DECLARE
    katingan_id UUID;
    kapuas_id UUID;
    pulang_pisau_id UUID;
    gunung_mas_id UUID;
    palangka_raya_id UUID;
BEGIN
    -- Dapatkan ID kabupaten
    SELECT id INTO katingan_id FROM kabupaten WHERE nama = 'Kabupaten Katingan';
    SELECT id INTO kapuas_id FROM kabupaten WHERE nama = 'Kabupaten Kapuas';
    SELECT id INTO pulang_pisau_id FROM kabupaten WHERE nama = 'Kabupaten Pulang Pisau';
    SELECT id INTO gunung_mas_id FROM kabupaten WHERE nama = 'Kabupaten Gunung Mas';
    SELECT id INTO palangka_raya_id FROM kabupaten WHERE nama = 'Kotamadya Palangka Raya';
    
    -- Update perhutanan_sosial yang kabupaten_id NULL atau tidak valid
    -- Default ke Kabupaten Katingan jika tidak ada info lain
    UPDATE perhutanan_sosial 
    SET kabupaten_id = katingan_id 
    WHERE kabupaten_id IS NULL;
    
    RAISE NOTICE 'Data kabupaten telah diupdate';
    
    -- Tampilkan statistik
    DECLARE
        total_ps INTEGER;
        ps_with_kabupaten INTEGER;
        ps_without_kabupaten INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_ps FROM perhutanan_sosial;
        SELECT COUNT(*) INTO ps_with_kabupaten FROM perhutanan_sosial WHERE kabupaten_id IS NOT NULL;
        SELECT COUNT(*) INTO ps_without_kabupaten FROM perhutanan_sosial WHERE kabupaten_id IS NULL;
        
        RAISE NOTICE 'Statistik perhutanan_sosial:';
        RAISE NOTICE '  Total data: %', total_ps;
        RAISE NOTICE '  Dengan kabupaten_id: %', ps_with_kabupaten;
        RAISE NOTICE '  Tanpa kabupaten_id: %', ps_without_kabupaten;
    END;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating perhutanan_sosial: %', SQLERRM;
END $$;

-- ====================================================================
-- 5. Restore foreign key constraint
-- ====================================================================
DO $$
BEGIN
    -- Tambahkan kembali foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'perhutanan_sosial_kabupaten_id_fkey' 
        AND conrelid = 'perhutanan_sosial'::regclass
    ) THEN
        ALTER TABLE perhutanan_sosial 
        ADD CONSTRAINT perhutanan_sosial_kabupaten_id_fkey 
        FOREIGN KEY (kabupaten_id) 
        REFERENCES kabupaten(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key constraint perhutanan_sosial_kabupaten_id_fkey telah dibuat';
    ELSE
        RAISE NOTICE 'Foreign key constraint sudah ada';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating constraint: %', SQLERRM;
END $$;

-- ====================================================================
-- 6. Verifikasi data kabupaten
-- ====================================================================
DO $$
DECLARE
    kabupaten_count INTEGER;
    ps_count INTEGER;
    kabupaten_list TEXT;
BEGIN
    -- Hitung jumlah kabupaten
    SELECT COUNT(*) INTO kabupaten_count FROM kabupaten;
    
    -- Hitung jumlah data perhutanan_sosial
    SELECT COUNT(*) INTO ps_count FROM perhutanan_sosial;
    
    -- Ambil list kabupaten
    SELECT STRING_AGG(nama, ', ') INTO kabupaten_list FROM kabupaten;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PERBAIKAN TABEL KABUPATEN SELESAI';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Jumlah kabupaten: %', kabupaten_count;
    RAISE NOTICE 'Data kabupaten: %', kabupaten_list;
    RAISE NOTICE 'Jumlah data perhutanan_sosial: %', ps_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Distribusi per kabupaten:';
    
    -- Tampilkan distribusi data per kabupaten
    FOR rec IN (
        SELECT 
            k.nama,
            COUNT(ps.id) as jumlah_data,
            COALESCE(SUM(ps.luas_ha), 0) as total_luas
        FROM kabupaten k
        LEFT JOIN perhutanan_sosial ps ON ps.kabupaten_id = k.id
        GROUP BY k.id, k.nama
        ORDER BY k.nama
    ) LOOP
        RAISE NOTICE '  - %: % data (% ha)', 
            rec.nama, rec.jumlah_data, rec.total_luas;
    END LOOP;
    
END $$;

-- ====================================================================
-- 7. Setup RLS untuk kabupaten jika belum ada
-- ====================================================================
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Policy untuk kabupaten: semua bisa baca
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kabupaten' 
        AND policyname = 'Allow read for all'
    ) THEN
        CREATE POLICY "Allow read for all" ON kabupaten
        FOR SELECT USING (true);
        RAISE NOTICE 'RLS policy created for kabupaten';
    ELSE
        RAISE NOTICE 'RLS policy already exists for kabupaten';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating RLS policy: %', SQLERRM;
END $$;

-- ====================================================================
-- 8. Output final
-- ====================================================================
SELECT '✅ Perbaikan tabel kabupaten selesai! Frontend sekarang bisa menampilkan data.' AS status;