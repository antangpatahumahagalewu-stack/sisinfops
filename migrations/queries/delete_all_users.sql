-- DELETE ALL USERS - OPERASI DESTRUKTIF
-- HAPUS SEMUA USER DARI SISTEM
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql
-- PERINGATAN: Operasi ini akan menghapus SEMUA user dan data terkait!

-- ====================================================================
-- 1. BACKUP DATA (Opsional, tapi disarankan)
-- ====================================================================

-- Buat backup tabel profiles sebelum dihapus
CREATE TABLE IF NOT EXISTS profiles_backup AS 
SELECT * FROM profiles;

-- Buat backup user emails (jika perlu)
SELECT email, created_at 
INTO auth_users_backup
FROM auth.users;

-- ====================================================================
-- 2. HAPUS DATA DARI TABEL TERKAIT
-- ====================================================================

-- Hapus semua data dari profiles (karena foreign key ke auth.users)
DELETE FROM profiles;

-- ====================================================================
-- 3. HAPUS SEMUA USER DARI AUTH.USERS
-- ====================================================================

-- Hapus semua user dari auth.users
-- Note: Ini akan memicu cascade delete di profiles karena ON DELETE CASCADE
DELETE FROM auth.users;

-- ====================================================================
-- 4. VERIFIKASI
-- ====================================================================

-- Cek apakah semua user sudah terhapus
SELECT 
    'auth.users' as table_name,
    COUNT(*) as remaining_users
FROM auth.users
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as remaining_profiles
FROM profiles;

-- ====================================================================
-- 5. OPSIONAL: BUAT USER DEFAULT BARU
-- ====================================================================

-- Jika ingin membuat user default setelah menghapus semua
-- Uncomment bagian di bawah ini:

/*
-- Buat user admin default
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
    'admin@yayasan.com',
    crypt('password123', gen_salt('bf')), -- Ganti dengan password yang aman
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Administrator"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Buat profile untuk user admin
INSERT INTO profiles (id, role, full_name, updated_at)
SELECT 
    id,
    'admin',
    'Administrator',
    NOW()
FROM auth.users 
WHERE email = 'admin@yayasan.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', updated_at = NOW();
*/

-- ====================================================================
-- 6. OUTPUT FINAL
-- ====================================================================

SELECT '✅ SEMUA USER TELAH DIHAPUS' as status;

-- Tampilkan backup info
SELECT 
    'Backup dibuat' as info,
    (SELECT COUNT(*) FROM profiles_backup) as profiles_backup_count,
    (SELECT COUNT(*) FROM auth_users_backup) as auth_users_backup_count;