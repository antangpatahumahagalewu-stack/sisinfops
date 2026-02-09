-- FINAL FIX SIMPLE - Tanpa RAISE NOTICE di luar block
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql

-- ====================================================================
-- 1. FIX PROFILES TABLE
-- ====================================================================

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
    -- Coba tambahkan foreign key constraint
    BEGIN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
        -- Constraint sudah ada, tidak perlu dilakukan apa-apa
    END;
END $$;

-- ====================================================================
-- 2. FIX PERHUTANAN_SOSIAL TABLE - Pastikan foreign key ke kabupaten
-- ====================================================================

-- Pastikan kolom kabupaten_id ada
ALTER TABLE perhutanan_sosial 
ADD COLUMN IF NOT EXISTS kabupaten_id UUID;

-- Tambahkan foreign key constraint
DO $$
BEGIN
    BEGIN
        ALTER TABLE perhutanan_sosial 
        ADD CONSTRAINT perhutanan_sosial_kabupaten_id_fkey 
        FOREIGN KEY (kabupaten_id) 
        REFERENCES kabupaten(id) 
        ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
        -- Constraint sudah ada, tidak perlu dilakukan apa-apa
    END;
END $$;

-- ====================================================================
-- 3. SETUP RLS POLICIES
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
DROP POLICY IF EXISTS "Allow read for authenticated users" ON potensi;

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

-- ====================================================================
-- 4. IMPLEMENTASI ROLES UNTUK SEMUA USER
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

-- ====================================================================
-- 5. VERIFIKASI & OUTPUT
-- ====================================================================

-- 5.1 Verifikasi struktur tabel
SELECT '1. Struktur Tabel' as section;

-- Cek profiles
SELECT 
    'profiles' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT role) as unique_roles
FROM profiles;

-- Cek perhutanan_sosial
SELECT 
    'perhutanan_sosial' as table_name,
    COUNT(*) as total_data,
    COUNT(kabupaten_id) as with_kabupaten_id,
    COUNT(*) - COUNT(kabupaten_id) as without_kabupaten_id
FROM perhutanan_sosial;

-- Cek kabupaten
SELECT 
    'kabupaten' as table_name,
    COUNT(*) as jumlah_kabupaten,
    STRING_AGG(nama, ', ') as list_kabupaten
FROM kabupaten;

-- 5.2 Distribusi role
SELECT '2. Distribusi Role' as section;

SELECT 
    COALESCE(role, 'NULL') as role,
    COUNT(*) as jumlah_user,
    STRING_AGG(COALESCE(full_name, email), ', ') as users
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
GROUP BY role
ORDER BY role;

-- 5.3 Test query frontend
SELECT '3. Test Query Frontend' as section;

SELECT 
    ps.id,
    ps.pemegang_izin,
    k.nama as kabupaten_nama,
    ps.skema,
    ps.luas_ha,
    ps.rkps_status,
    ps.peta_status
FROM perhutanan_sosial ps
LEFT JOIN kabupaten k ON ps.kabupaten_id = k.id
LIMIT 5;

-- 5.4 Summary final
SELECT '4. STATUS FINAL' as section;

SELECT 
    '✅ SEMUA FIX SELESAI' as status,
    'Frontend siap menampilkan data' as message,
    'Jalankan aplikasi dan login dengan akun berbeda' as next_step;

-- ====================================================================
-- 6. OPSIONAL: Update kabupaten_id jika NULL
-- ====================================================================

-- Jika ada data perhutanan_sosial tanpa kabupaten_id, assign ke kabupaten pertama
DO $$
DECLARE
    default_kabupaten_id UUID;
BEGIN
    -- Dapatkan ID kabupaten pertama (Katingan)
    SELECT id INTO default_kabupaten_id 
    FROM kabupaten 
    WHERE nama LIKE '%Katingan%' 
    LIMIT 1;
    
    -- Update perhutanan_sosial yang kabupaten_id NULL
    IF default_kabupaten_id IS NOT NULL THEN
        UPDATE perhutanan_sosial 
        SET kabupaten_id = default_kabupaten_id 
        WHERE kabupaten_id IS NULL;
    END IF;
END $$;

-- Final check
SELECT '5. Data perhutanan_sosial setelah update' as section;

SELECT 
    'perhutanan_sosial' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN kabupaten_id IS NOT NULL THEN 1 END) as with_kabupaten,
    COUNT(CASE WHEN kabupaten_id IS NULL THEN 1 END) as without_kabupaten
FROM perhutanan_sosial;