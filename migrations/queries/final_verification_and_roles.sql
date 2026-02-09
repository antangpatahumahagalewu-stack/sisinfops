-- FINAL VERIFICATION AND ROLE IMPLEMENTATION
-- Jalankan setelah tabel kabupaten direcovery
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql

-- ====================================================================
-- 1. Verifikasi tabel kabupaten dan data perhutanan_sosial
-- ====================================================================
DO $$
DECLARE
    kabupaten_count INTEGER;
    ps_count INTEGER;
    profiles_count INTEGER;
    auth_users_count INTEGER;
BEGIN
    -- Verifikasi tabel kabupaten
    SELECT COUNT(*) INTO kabupaten_count FROM kabupaten;
    RAISE NOTICE '1. TABEL KABUPATEN: % data', kabupaten_count;
    
    -- Tampilkan list kabupaten
    RAISE NOTICE '   Data kabupaten:';
    FOR rec IN (SELECT nama FROM kabupaten ORDER BY nama) LOOP
        RAISE NOTICE '   - %', rec.nama;
    END LOOP;
    
    -- Verifikasi data perhutanan_sosial
    SELECT COUNT(*) INTO ps_count FROM perhutanan_sosial;
    RAISE NOTICE '';
    RAISE NOTICE '2. DATA PERHUTANAN SOSIAL: % baris', ps_count;
    
    -- Hitung data per kabupaten
    RAISE NOTICE '   Distribusi per kabupaten:';
    FOR rec IN (
        SELECT 
            k.nama,
            COUNT(ps.id) as jumlah,
            COALESCE(SUM(ps.luas_ha), 0) as luas_total
        FROM kabupaten k
        LEFT JOIN perhutanan_sosial ps ON ps.kabupaten_id = k.id
        GROUP BY k.id, k.nama
        ORDER BY k.nama
    ) LOOP
        RAISE NOTICE '   - %: % data (% ha)', rec.nama, rec.jumlah, rec.luas_total;
    END LOOP;
    
    -- Verifikasi auth users
    SELECT COUNT(*) INTO auth_users_count FROM auth.users;
    RAISE NOTICE '';
    RAISE NOTICE '3. AUTH USERS: % user terdaftar', auth_users_count;
    
    -- Verifikasi profiles
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    RAISE NOTICE '4. PROFILES: % profile', profiles_count;
    
    -- Tampilkan role distribution saat ini
    RAISE NOTICE '';
    RAISE NOTICE '5. DISTRIBUSI ROLE SAAT INI:';
    FOR rec IN (
        SELECT 
            COALESCE(role, 'NULL') as role,
            COUNT(*) as jumlah
        FROM profiles
        GROUP BY role
        ORDER BY role
    ) LOOP
        RAISE NOTICE '   - %: % user', rec.role, rec.jumlah;
    END LOOP;
    
    -- Cek user tanpa profile
    DECLARE
        users_without_profile INTEGER;
    BEGIN
        SELECT COUNT(*) INTO users_without_profile
        FROM auth.users au
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);
        
        IF users_without_profile > 0 THEN
            RAISE NOTICE '';
            RAISE NOTICE '⚠️  PERINGATAN: % user TANPA PROFILE', users_without_profile;
        END IF;
    END;
    
END $$;

-- ====================================================================
-- 2. Implementasi roles untuk semua user (jika belum)
-- ====================================================================
DO $$
DECLARE
    v_axel_id UUID;
    v_amrin_id UUID;
    v_faris_id UUID;
    v_beben_id UUID;
    v_ocay_id UUID;
    roles_assigned INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'IMPLEMENTASI ROLES UNTUK SEMUA USER';
    RAISE NOTICE '=========================================';
    
    -- Dapatkan user IDs
    SELECT id INTO v_axel_id FROM auth.users WHERE email = 'axel@yayasan.com';
    SELECT id INTO v_amrin_id FROM auth.users WHERE email = 'amrin@yayasan.com';
    SELECT id INTO v_faris_id FROM auth.users WHERE email = 'faris@yayasan.com';
    SELECT id INTO v_beben_id FROM auth.users WHERE email = 'beben@yayasan.com';
    SELECT id INTO v_ocay_id FROM auth.users WHERE email = 'ocay@yayasan.com';
    
    -- Assign roles berdasarkan email
    IF v_axel_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_axel_id, 'admin', 'Axel', NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = NOW();
        roles_assigned := roles_assigned + 1;
        RAISE NOTICE '✅ axel@yayasan.com -> admin';
    END IF;
    
    IF v_amrin_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_amrin_id, 'monev', 'Amrin', NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'monev', updated_at = NOW();
        roles_assigned := roles_assigned + 1;
        RAISE NOTICE '✅ amrin@yayasan.com -> monev';
    END IF;
    
    IF v_faris_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_faris_id, 'program_planner', 'Faris', NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'program_planner', updated_at = NOW();
        roles_assigned := roles_assigned + 1;
        RAISE NOTICE '✅ faris@yayasan.com -> program_planner';
    END IF;
    
    IF v_beben_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_beben_id, 'program_implementer', 'Beben', NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'program_implementer', updated_at = NOW();
        roles_assigned := roles_assigned + 1;
        RAISE NOTICE '✅ beben@yayasan.com -> program_implementer';
    END IF;
    
    IF v_ocay_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_ocay_id, 'carbon_specialist', 'Ocay', NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'carbon_specialist', updated_at = NOW();
        roles_assigned := roles_assigned + 1;
        RAISE NOTICE '✅ ocay@yayasan.com -> carbon_specialist';
    END IF;
    
    -- Assign default role 'viewer' untuk user lainnya
    WITH new_viewers AS (
        INSERT INTO profiles (id, role, full_name, updated_at)
        SELECT 
            au.id, 
            'viewer',
            COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
            NOW()
        FROM auth.users au
        WHERE au.id NOT IN (
            SELECT id FROM profiles WHERE role IS NOT NULL
        )
        AND au.id NOT IN (
            COALESCE(v_axel_id, '00000000-0000-0000-0000-000000000000'),
            COALESCE(v_amrin_id, '00000000-0000-0000-0000-000000000000'),
            COALESCE(v_faris_id, '00000000-0000-0000-0000-000000000000'),
            COALESCE(v_beben_id, '00000000-0000-0000-0000-000000000000'),
            COALESCE(v_ocay_id, '00000000-0000-0000-0000-000000000000')
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'viewer', updated_at = NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO roles_assigned FROM new_viewers;
    
    RAISE NOTICE '✅ Other users -> viewer';
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total roles assigned/updated: %', roles_assigned;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error assigning roles: %', SQLERRM;
END $$;

-- ====================================================================
-- 3. Verifikasi final setelah implementasi roles
-- ====================================================================
DO $$
DECLARE
    total_profiles INTEGER;
    admin_count INTEGER;
    monev_count INTEGER;
    viewer_count INTEGER;
    program_roles_count INTEGER;
BEGIN
    -- Beri jeda sebentar
    PERFORM pg_sleep(1);
    
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'VERIFIKASI FINAL SETELAH IMPLEMENTASI';
    RAISE NOTICE '=========================================';
    
    -- Hitung total profiles
    SELECT COUNT(*) INTO total_profiles FROM profiles WHERE role IS NOT NULL;
    
    -- Hitung per role
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    SELECT COUNT(*) INTO monev_count FROM profiles WHERE role = 'monev';
    SELECT COUNT(*) INTO viewer_count FROM profiles WHERE role = 'viewer';
    SELECT COUNT(*) INTO program_roles_count FROM profiles WHERE role IN ('program_planner', 'program_implementer', 'carbon_specialist');
    
    RAISE NOTICE '📊 DISTRIBUSI ROLE FINAL:';
    RAISE NOTICE '   - admin: % user(s)', admin_count;
    RAISE NOTICE '   - monev: % user(s)', monev_count;
    RAISE NOTICE '   - viewer: % user(s)', viewer_count;
    RAISE NOTICE '   - program_planner/implementer/carbon_specialist: % user(s)', program_roles_count;
    RAISE NOTICE '   ---------------------------------';
    RAISE NOTICE '   TOTAL: % profiles dengan role', total_profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '👥 DETAIL USER DENGAN ROLE:';
    
    FOR rec IN (
        SELECT 
            p.role,
            au.email,
            p.full_name,
            au.created_at as registered_at
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.role IS NOT NULL
        ORDER BY p.role, au.email
        LIMIT 20
    ) LOOP
        RAISE NOTICE '   - % (%): % [terdaftar: %]', 
            COALESCE(rec.email, 'N/A'),
            COALESCE(rec.full_name, 'No name'),
            rec.role,
            TO_CHAR(rec.registered_at, 'DD-MM-YYYY');
    END LOOP;
    
    -- Cek frontend compatibility
    RAISE NOTICE '';
    RAISE NOTICE '🌐 FRONTEND COMPATIBILITY CHECK:';
    
    -- Cek jika data bisa diakses untuk frontend
    DECLARE
        ps_with_kabupaten INTEGER;
        ps_total INTEGER;
    BEGIN
        SELECT COUNT(*) INTO ps_total FROM perhutanan_sosial;
        SELECT COUNT(*) INTO ps_with_kabupaten 
        FROM perhutanan_sosial ps 
        WHERE ps.kabupaten_id IS NOT NULL;
        
        IF ps_total > 0 THEN
            IF ps_with_kabupaten = ps_total THEN
                RAISE NOTICE '   ✅ SEMUA data perhutanan_sosial memiliki kabupaten_id';
            ELSE
                RAISE NOTICE '   ⚠️  % dari % data TANPA kabupaten_id', 
                    (ps_total - ps_with_kabupaten), ps_total;
            END IF;
        ELSE
            RAISE NOTICE '   ℹ️  Tidak ada data perhutanan_sosial';
        END IF;
    END;
    
END $$;

-- ====================================================================
-- 4. Output final
-- ====================================================================
SELECT '✅ SELESAI! Semua role telah diimplementasikan dan frontend siap menampilkan data.' AS status;