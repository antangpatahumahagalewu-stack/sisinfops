-- SIMPLE SQL FUNCTION FOR USER CREATION (FIX FOR "Database error saving new user")
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql

-- ====================================================================
-- STEP 1: CREATE THE FUNCTION
-- ====================================================================

-- Function untuk membuat user langsung di auth.users (bypass buggy Supabase Admin API)
CREATE OR REPLACE FUNCTION public.create_user_direct(
    p_email TEXT,
    p_password TEXT DEFAULT 'password123',
    p_full_name TEXT DEFAULT 'New User',
    p_role TEXT DEFAULT 'viewer'
) 
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER -- Penting: menjalankan dengan permission admin
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with email % already exists', p_email;
    END IF;
    
    -- 2. Generate random UUID untuk user
    v_user_id := gen_random_uuid();
    
    -- 3. Insert langsung ke auth.users table (bypass Admin API)
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
        v_user_id,
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(), -- Auto-confirm email
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', p_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
    
    -- 4. Create profile di public.profiles
    INSERT INTO public.profiles (id, role, full_name, updated_at)
    VALUES (v_user_id, p_role, p_full_name, NOW())
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user %: %', p_email, SQLERRM;
    RETURN NULL;
END;
$$;

-- ====================================================================
-- STEP 2: GRANT PERMISSIONS
-- ====================================================================

-- Berikan permission ke authenticated users (supaya API bisa panggil function)
GRANT EXECUTE ON FUNCTION public.create_user_direct TO authenticated;

-- ====================================================================
-- STEP 3: TEST THE FUNCTION
-- ====================================================================

-- Test function (opsional, bisa di-comment setelah berhasil)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Coba create test user (akan gagal jika email sudah ada)
    test_user_id := public.create_user_direct(
        'test-' || floor(random() * 1000000)::text || '@example.com',
        'TestPassword123',
        'Test User',
        'viewer'
    );
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ TEST SUCCESS: User created with ID: %', test_user_id;
        
        -- Cleanup: hapus test user
        DELETE FROM auth.users WHERE id = test_user_id;
        RAISE NOTICE '🧹 Test user cleaned up';
    ELSE
        RAISE NOTICE '⚠️ TEST FAILED: Could not create test user';
    END IF;
END $$;

-- ====================================================================
-- STEP 4: VERIFICATION
-- ====================================================================

-- Periksa apakah function berhasil dibuat
SELECT 
    'Function Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'create_user_direct' 
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ) THEN '✅ CREATED'
        ELSE '❌ NOT FOUND'
    END as status,
    'public.create_user_direct' as function_name;

-- Tampilkan semua function yang terkait user creation
SELECT 
    'Available Functions' as info,
    proname as function_name,
    pronargs as parameter_count
FROM pg_proc 
WHERE proname LIKE '%create_user%' OR proname LIKE '%user%create%'
ORDER BY proname;

-- ====================================================================
-- INSTRUKSI SETELAH SQL DIJALANKAN:
-- ====================================================================
/*
1. Function sudah dibuat: public.create_user_direct
2. Buka aplikasi SISINFOPS di: http://localhost:3000
3. Login sebagai admin
4. Buka halaman: /dashboard/user-management  
5. Coba buat user baru dengan email yang belum terdaftar
6. Jika masih error, restart dev server: killall -9 node && npm run dev
*/

-- ====================================================================
-- TROUBLESHOOTING:
-- ====================================================================
/*
Q: Error "permission denied for table auth.users"?
A: Jalankan ini dulu (sebagai database owner):

GRANT ALL ON auth.users TO postgres;
GRANT ALL ON auth.users TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

Q: Function created but API still failing?
A: Coba test manual dengan:

SELECT public.create_user_direct('test2@example.com', 'password123', 'Test 2', 'viewer');

Q: Still getting "Database error saving new user"?
A: Masalah di Supabase internal. Coba:
   - Buat user manual di Supabase Dashboard → Authentication → Users
   - Contact Supabase support untuk bug Admin API
*/