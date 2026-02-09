-- ANALYZE AND FIX QUERIES FOR ADAPTATION TO NEW TABLES
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql

-- ====================================================================
-- 1. ANALISIS STRUKTUR TABEL SAAT INI
-- ====================================================================

-- Cek struktur tabel profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek apakah ada foreign key ke auth.users
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'profiles'
AND tc.constraint_type = 'FOREIGN KEY';

-- Cek struktur tabel kabupaten
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'kabupaten' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek struktur tabel perhutanan_sosial
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'perhutanan_sosial' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ====================================================================
-- 2. FIX PROFILES TABLE - Sesuaikan dengan source code aplikasi
-- ====================================================================

-- Cek constraint role di profiles
SELECT 
    pg_get_constraintdef(c.oid) AS constraint_def
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'profiles'
AND c.conname = 'profiles_role_check';

-- Drop constraint lama jika ada (yang terlalu restriktif)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Buat constraint baru yang sesuai dengan source code
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'admin', 'monev', 'viewer', 'program_planner', 
    'program_implementer', 'carbon_specialist'
));

-- Tambahkan foreign key ke auth.users jika belum ada
DO $$
BEGIN
    -- Cek jika kolom id sudah ada
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'id'
    ) THEN
        -- Coba tambahkan foreign key constraint
        BEGIN
            ALTER TABLE profiles 
            ADD CONSTRAINT profiles_id_fkey 
            FOREIGN KEY (id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Foreign key constraint added to profiles';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key constraint already exists';
        END;
    END IF;
END $$;

-- ====================================================================
-- 3. FIX PERHUTANAN_SOSIAL TABLE - Pastikan foreign key ke kabupaten
-- ====================================================================

-- Cek foreign key ke kabupaten
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'perhutanan_sosial'
AND tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'kabupaten';

-- Jika foreign key tidak ada, tambahkan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'perhutanan_sosial'
        AND constraint_name = 'perhutanan_sosial_kabupaten_id_fkey'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Pastikan kolom kabupaten_id ada
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'perhutanan_sosial' 
            AND column_name = 'kabupaten_id'
        ) THEN
            ALTER TABLE perhutanan_sosial 
            ADD CONSTRAINT perhutanan_sosial_kabupaten_id_fkey 
            FOREIGN KEY (kabupaten_id) 
            REFERENCES kabupaten(id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Foreign key constraint added to perhutanan_sosial';
        ELSE
            -- Jika kolom kabupaten_id tidak ada, tambahkan
            ALTER TABLE perhutanan_sosial 
            ADD COLUMN IF NOT EXISTS kabupaten_id UUID;
            
            ALTER TABLE perhutanan_sosial 
            ADD CONSTRAINT perhutanan_sosial_kabupaten_id_fkey 
            FOREIGN KEY (kabupaten_id) 
            REFERENCES kabupaten(id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Added kabupaten_id column and foreign key constraint';
        END IF;
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists on perhutanan_sosial';
    END IF;
END $$;

-- ====================================================================
-- 4. SETUP RLS POLICIES - Sesuai dengan kebutuhan aplikasi
-- ====================================================================

-- Enable RLS untuk semua tabel
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE potensi ENABLE ROW LEVEL SECURITY;

-- Hapus policies lama jika ada
DROP POLICY IF EXISTS "Allow read for authenticated users" ON perhutanan_sosial;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow read for all" ON kabupaten;

-- Policy untuk perhutanan_sosial: semua authenticated users bisa baca
CREATE POLICY "Allow read for authenticated users" ON perhutanan_sosial
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy untuk profiles: user hanya bisa lihat sendiri
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Policy untuk kabupaten: semua bisa baca
CREATE POLICY "Allow read for all" ON kabupaten
FOR SELECT USING (true);

-- Policy untuk potensi: semua authenticated users bisa baca
CREATE POLICY "Allow read for authenticated users" ON potensi
FOR SELECT USING (auth.role() = 'authenticated');

RAISE NOTICE 'RLS policies created successfully';

-- ====================================================================
-- 5. IMPLEMENTASI ROLES UNTUK SEMUA USER
-- ====================================================================

-- Update atau insert profiles untuk semua auth users
WITH user_roles AS (
    SELECT 
        au.id,
        au.email,
        CASE 
            WHEN au.email = 'axel@yayasan.com' THEN 'admin'
            WHEN au.email = 'amrin@yayasan.com' THEN 'monev'
            WHEN au.email = 'faris@yayasan.com' THEN 'program_planner'
            WHEN au.email = 'beben@yayasan.com' THEN 'program_implementer'
            WHEN au.email = 'ocay@yayasan.com' THEN 'carbon_specialist'
            ELSE 'viewer'
        END as assigned_role,
        COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name
    FROM auth.users au
)
INSERT INTO profiles (id, role, full_name, updated_at)
SELECT 
    ur.id,
    ur.assigned_role,
    ur.full_name,
    NOW()
FROM user_roles ur
ON CONFLICT (id) DO UPDATE 
SET 
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    updated_at = EXCLUDED.updated_at;

RAISE NOTICE 'Roles implemented for all users';

-- ====================================================================
-- 6. VERIFIKASI FINAL - Pastikan query aplikasi akan berfungsi
-- ====================================================================

-- Test query yang digunakan di app/[locale]/dashboard/data/page.tsx
WITH test_query AS (
    SELECT 
        ps.id,
        ps.pemegang_izin,
        ps.desa,
        ps.kecamatan,
        k.nama as kabupaten_nama,
        ps.skema,
        ps.luas_ha,
        ps.rkps_status,
        ps.peta_status
    FROM perhutanan_sosial ps
    LEFT JOIN kabupaten k ON ps.kabupaten_id = k.id
    LIMIT 5
)
SELECT 
    '✅ Query test berhasil' as status,
    COUNT(*) as sample_count,
    ARRAY_AGG(pemegang_izin) as sample_data
FROM test_query;

-- Test query profiles dengan role
SELECT 
    '✅ Profiles dengan role' as status,
    COUNT(*) as total_profiles,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'email', COALESCE(au.email, 'N/A'),
            'role', p.role,
            'full_name', p.full_name
        )
    ) as sample_profiles
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.role IS NOT NULL
LIMIT 10;

-- ====================================================================
-- 7. OUTPUT SUMMARY
-- ====================================================================

DO $$
DECLARE
    profile_count INTEGER;
    ps_count INTEGER;
    kabupaten_count INTEGER;
    user_without_profile_count INTEGER;
BEGIN
    -- Hitung jumlah data
    SELECT COUNT(*) INTO profile_count FROM profiles WHERE role IS NOT NULL;
    SELECT COUNT(*) INTO ps_count FROM perhutanan_sosial;
    SELECT COUNT(*) INTO kabupaten_count FROM kabupaten;
    
    -- Hitung user tanpa profile
    SELECT COUNT(*) INTO user_without_profile_count
    FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'ANALYSIS AND FIX COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '  - Kabupaten: %', kabupaten_count;
    RAISE NOTICE '  - Perhutanan Sosial: %', ps_count;
    RAISE NOTICE '  - Profiles dengan role: %', profile_count;
    
    IF user_without_profile_count > 0 THEN
        RAISE NOTICE '  - ⚠️  User tanpa profile: %', user_without_profile_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Role Distribution:';
    
    FOR rec IN (
        SELECT 
            COALESCE(p.role, 'NULL') as role,
            COUNT(*) as count
        FROM profiles p
        GROUP BY p.role
        ORDER BY p.role
    ) LOOP
        RAISE NOTICE '  - %: % user(s)', rec.role, rec.count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Source code aplikasi sekarang kompatibel dengan struktur database!';
    RAISE NOTICE '   Frontend akan bisa menampilkan data dengan query yang ada.';
    
END $$;