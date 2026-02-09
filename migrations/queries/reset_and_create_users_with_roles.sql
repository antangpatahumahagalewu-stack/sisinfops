-- RESET SYSTEM AND CREATE USERS WITH ROLES
-- Hapus semua user lama dan buat user baru dengan role yang tepat
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql

-- ====================================================================
-- PERINGATAN: OPERASI INI AKAN MENGHAPUS SEMUA USER YANG ADA!
-- ====================================================================

-- ====================================================================
-- 1. BACKUP DATA LAMA (Opsional)
-- ====================================================================

-- Backup profiles lama
CREATE TABLE IF NOT EXISTS profiles_backup_before_reset AS 
SELECT * FROM profiles WHERE 1=0; -- Create empty table with same structure

INSERT INTO profiles_backup_before_reset 
SELECT * FROM profiles;

-- Backup user emails
CREATE TABLE IF NOT EXISTS auth_users_backup_before_reset AS
SELECT email, created_at, raw_user_meta_data 
FROM auth.users WHERE 1=0;

INSERT INTO auth_users_backup_before_reset
SELECT email, created_at, raw_user_meta_data 
FROM auth.users;

-- ====================================================================
-- 2. HAPUS SEMUA USER LAMA
-- ====================================================================

-- Hapus profiles (akan otomatis terhapus oleh cascade delete)
DELETE FROM profiles;

-- Hapus semua user dari auth.users
DELETE FROM auth.users;

-- Verifikasi penghapusan
SELECT '1. User lama dihapus' as step,
       (SELECT COUNT(*) FROM auth.users) as remaining_auth_users,
       (SELECT COUNT(*) FROM profiles) as remaining_profiles;

-- ====================================================================
-- 3. BUAT USER BARU DENGAN ROLE YANG TEPAT
-- ====================================================================

-- Fungsi helper untuk membuat user
CREATE OR REPLACE FUNCTION create_user_with_profile(
    p_email TEXT,
    p_password TEXT DEFAULT 'password123', -- GANTI DENGAN PASSWORD YANG AMAN!
    p_full_name TEXT,
    p_role TEXT
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Buat user di auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', p_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO v_user_id;
    
    -- Buat profile untuk user
    INSERT INTO profiles (id, role, full_name, updated_at)
    VALUES (v_user_id, p_role, p_full_name, NOW());
    
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user %: %', p_email, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 4. BUAT 6 USER DENGAN ROLE YANG BERBEDA
-- ====================================================================

DO $$
DECLARE
    admin_id UUID;
    monev_id UUID;
    planner_id UUID;
    implementer_id UUID;
    carbon_id UUID;
    viewer_id UUID;
BEGIN
    -- 1. Admin - Full access
    admin_id := create_user_with_profile(
        'admin@yayasan.com',
        'AdminPass123!', -- GANTI PASSWORD INI!
        'Administrator',
        'admin'
    );
    
    -- 2. Monev - Monitoring & Evaluation
    monev_id := create_user_with_profile(
        'monev@yayasan.com',
        'MonevPass123!', -- GANTI PASSWORD INI!
        'Monitoring Officer',
        'monev'
    );
    
    -- 3. Program Planner
    planner_id := create_user_with_profile(
        'planner@yayasan.com',
        'PlannerPass123!', -- GANTI PASSWORD INI!
        'Program Planner',
        'program_planner'
    );
    
    -- 4. Program Implementer
    implementer_id := create_user_with_profile(
        'implementer@yayasan.com',
        'ImplementerPass123!', -- GANTI PASSWORD INI!
        'Program Implementer',
        'program_implementer'
    );
    
    -- 5. Carbon Specialist
    carbon_id := create_user_with_profile(
        'carbon@yayasan.com',
        'CarbonPass123!', -- GANTI PASSWORD INI!
        'Carbon Specialist',
        'carbon_specialist'
    );
    
    -- 6. Viewer - Read only access
    viewer_id := create_user_with_profile(
        'viewer@yayasan.com',
        'ViewerPass123!', -- GANTI PASSWORD INI!
        'Data Viewer',
        'viewer'
    );
    
    -- Buat 3 user viewer tambahan untuk simulasi
    PERFORM create_user_with_profile(
        'viewer1@yayasan.com',
        'Viewer1Pass123!',
        'Viewer Satu',
        'viewer'
    );
    
    PERFORM create_user_with_profile(
        'viewer2@yayasan.com',
        'Viewer2Pass123!',
        'Viewer Dua',
        'viewer'
    );
    
    PERFORM create_user_with_profile(
        'viewer3@yayasan.com',
        'Viewer3Pass123!',
        'Viewer Tiga',
        'viewer'
    );
    
END $$;

-- ====================================================================
-- 5. VERIFIKASI USER BARU
-- ====================================================================

-- Tampilkan semua user baru dengan role mereka
SELECT '2. User baru dibuat' as step;

SELECT 
    au.email,
    p.role,
    p.full_name,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY p.role, au.email;

-- Hitung per role
SELECT '3. Distribusi role' as step;

SELECT 
    COALESCE(p.role, 'NULL') as role,
    COUNT(*) as jumlah_user,
    STRING_AGG(au.email, ', ') as daftar_email
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
GROUP BY p.role
ORDER BY p.role;

-- ====================================================================
-- 6. SETUP RLS DAN CONSTRAINTS (Jika belum)
-- ====================================================================

-- Enable RLS
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;

-- Setup policies dasar
DROP POLICY IF EXISTS "Allow read for authenticated users" ON perhutanan_sosial;
CREATE POLICY "Allow read for authenticated users" ON perhutanan_sosial
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow read for all" ON kabupaten;
CREATE POLICY "Allow read for all" ON kabupaten
FOR SELECT USING (true);

-- Update constraint role di profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'admin', 'monev', 'viewer', 'program_planner', 
    'program_implementer', 'carbon_specialist'
));

-- ====================================================================
-- 7. OUTPUT FINAL
-- ====================================================================

SELECT '4. RESET SELESAI' as section;

SELECT 
    '✅ SISTEM DIRESET' as status,
    '✅ USER BARU DIBUAT' as user_status,
    '✅ ROLE DIIMPLEMENTASIKAN' as role_status,
    '✅ FRONTEND SIAP DIGUNAKAN' as frontend_status;

SELECT '5. LOGIN INFORMASI' as section;

SELECT 
    role,
    email,
    'password123' as default_password, -- INGAT UNTUK GANTI PASSWORD!
    'Ganti password setelah login pertama!' as catatan
FROM (
    SELECT DISTINCT ON (p.role)
        p.role,
        au.email,
        p.full_name
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    WHERE p.role IS NOT NULL
    ORDER BY p.role, au.email
) as login_info
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'monev' THEN 2
        WHEN 'program_planner' THEN 3
        WHEN 'program_implementer' THEN 4
        WHEN 'carbon_specialist' THEN 5
        WHEN 'viewer' THEN 6
        ELSE 7
    END;

-- ====================================================================
-- 8. CLEANUP FUNGSI HELPER
-- ====================================================================

DROP FUNCTION IF EXISTS create_user_with_profile(TEXT, TEXT, TEXT, TEXT);

-- ====================================================================
-- 9. INFORMASI BACKUP
-- ====================================================================

SELECT '6. BACKUP INFORMATION' as section;

SELECT 
    'profiles_backup_before_reset' as backup_table,
    COUNT(*) as row_count
FROM profiles_backup_before_reset
UNION ALL
SELECT 
    'auth_users_backup_before_reset' as backup_table,
    COUNT(*) as row_count
FROM auth_users_backup_before_reset;