-- FIX AUTO PROFILE CREATION TRIGGER
-- Solusi untuk masalah: user auth tidak otomatis tergenerate di tabel profiles

-- ====================================================================
-- PART 1: CREATE TRIGGER FUNCTION FOR AUTOMATIC PROFILE CREATION
-- ====================================================================

-- Function yang akan dipanggil setiap kali user baru dibuat di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert ke profiles table untuk user baru
  -- Default role: 'viewer', default full_name: email (tanpa domain)
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'viewer', -- Default role untuk user baru
    split_part(NEW.email, '@', 1), -- Ambil nama sebelum @ sebagai full_name default
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PART 2: CREATE TRIGGER ON auth.users
-- ====================================================================

-- Hapus trigger jika sudah ada (untuk menghindari duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Buat trigger yang akan execute function setelah insert ke auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- PART 3: FIX EXISTING USERS (yang sudah ada di auth.users tapi belum punya profile)
-- ====================================================================

-- Insert profiles untuk semua user yang sudah ada di auth.users
-- tapi belum punya profile di public.profiles
INSERT INTO public.profiles (
  id,
  role,
  full_name,
  created_at,
  updated_at
)
SELECT 
  au.id,
  'viewer' as role, -- Default role
  split_part(au.email, '@', 1) as full_name, -- Default full_name
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL -- Hanya untuk user yang belum punya profile
ON CONFLICT (id) DO UPDATE 
SET 
  updated_at = EXCLUDED.updated_at
WHERE public.profiles.updated_at < EXCLUDED.updated_at;

-- ====================================================================
-- PART 4: VERIFICATION QUERIES
-- ====================================================================

-- Check total users vs profiles
DO $$
DECLARE
  auth_users_count INTEGER;
  profiles_count INTEGER;
  missing_profiles INTEGER;
BEGIN
  -- Hitung jumlah user di auth.users
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  
  -- Hitung jumlah profiles
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  
  -- Hitung user yang belum punya profile
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;
  
  RAISE NOTICE '=======================================';
  RAISE NOTICE 'AUTO PROFILE CREATION TRIGGER INSTALLED';
  RAISE NOTICE '=======================================';
  RAISE NOTICE 'Auth users: %', auth_users_count;
  RAISE NOTICE 'Profiles: %', profiles_count;
  RAISE NOTICE 'Missing profiles (before fix): %', missing_profiles;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create new user in Supabase Authentication';
  RAISE NOTICE '2. Verify profile is automatically created';
  RAISE NOTICE '3. Test login in frontend application';
  RAISE NOTICE '=======================================';
END $$;

-- ====================================================================
-- PART 5: GRANT PERMISSIONS (jika diperlukan)
-- ====================================================================

-- Pastikan anon role bisa execute function (untuk Supabase Auth webhook)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ====================================================================
-- FINAL MESSAGE
-- ====================================================================
SELECT '✅ Auto profile creation trigger installed successfully!' AS status;