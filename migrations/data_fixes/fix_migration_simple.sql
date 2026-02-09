-- SIMPLE MIGRATION untuk implementasi role pada user yang ada
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql
-- SQL ini aman, tidak drop tabel atau constraint yang sudah ada

-- ====================================================================
-- 1. Cek dan buat tabel jika belum ada (dengan IF NOT EXISTS)
-- ====================================================================

-- Tabel kabupaten (jika belum ada)
CREATE TABLE IF NOT EXISTS kabupaten (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default kabupaten jika belum ada
INSERT INTO kabupaten (nama) VALUES
    ('Kabupaten Katingan'),
    ('Kabupaten Kapuas'),
    ('Kabupaten Pulang Pisau'),
    ('Kabupaten Gunung Mas'),
    ('Kotamadya Palangka Raya')
ON CONFLICT (nama) DO NOTHING;

-- Tabel perhutanan_sosial (jika belum ada) - dengan struktur sederhana
CREATE TABLE IF NOT EXISTS perhutanan_sosial (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kabupaten_id UUID REFERENCES kabupaten(id) ON DELETE SET NULL,
    skema VARCHAR(50),
    pemegang_izin VARCHAR(255),
    desa VARCHAR(100),
    kecamatan VARCHAR(100),
    nomor_sk VARCHAR(255),
    luas_ha DECIMAL(10, 2),
    rkps_status VARCHAR(10),
    peta_status VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel profiles (jika belum ada)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 2. Update constraint role di profiles (jika constraint ada)
-- ====================================================================

-- Coba untuk drop constraint lama jika ada dan terlalu restriktif
DO $$
BEGIN
    -- Cek jika constraint profiles_role_check ada
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check' 
        AND conrelid = 'profiles'::regclass
    ) THEN
        -- Tampilkan constraint saat ini
        RAISE NOTICE 'Constraint profiles_role_check ditemukan, akan diupdate';
        
        -- Hapus constraint lama
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        
        -- Buat constraint baru yang lebih lengkap
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN (
            'admin', 'monev', 'viewer', 'program_planner', 
            'program_implementer', 'carbon_specialist'
        ));
        
        RAISE NOTICE 'Constraint profiles_role_check telah diupdate';
    ELSE
        -- Buat constraint baru jika belum ada
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN (
            'admin', 'monev', 'viewer', 'program_planner', 
            'program_implementer', 'carbon_specialist'
        ));
        RAISE NOTICE 'Constraint profiles_role_check dibuat baru';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating constraint: %', SQLERRM;
    -- Lanjutkan tanpa constraint jika error
END $$;

-- ====================================================================
-- 3. Assign roles ke user berdasarkan email
-- ====================================================================

DO $$
DECLARE
    v_axel_id UUID;
    v_amrin_id UUID;
    v_faris_id UUID;
    v_beben_id UUID;
    v_ocay_id UUID;
BEGIN
    -- Dapatkan user IDs dari auth.users
    SELECT id INTO v_axel_id FROM auth.users WHERE email = 'axel@yayasan.com';
    SELECT id INTO v_amrin_id FROM auth.users WHERE email = 'amrin@yayasan.com';
    SELECT id INTO v_faris_id FROM auth.users WHERE email = 'faris@yayasan.com';
    SELECT id INTO v_beben_id FROM auth.users WHERE email = 'beben@yayasan.com';
    SELECT id INTO v_ocay_id FROM auth.users WHERE email = 'ocay@yayasan.com';
    
    RAISE NOTICE 'Assigning roles...';
    
    -- Assign role 'admin' untuk axel@yayasan.com
    IF v_axel_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_axel_id, 'admin', 'Axel', NOW())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', updated_at = NOW();
        RAISE NOTICE 'axel@yayasan.com -> admin';
    END IF;
    
    -- Assign role 'monev' untuk amrin@yayasan.com
    IF v_amrin_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_amrin_id, 'monev', 'Amrin', NOW())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'monev', updated_at = NOW();
        RAISE NOTICE 'amrin@yayasan.com -> monev';
    END IF;
    
    -- Assign role 'program_planner' untuk faris@yayasan.com
    IF v_faris_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_faris_id, 'program_planner', 'Faris', NOW())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'program_planner', updated_at = NOW();
        RAISE NOTICE 'faris@yayasan.com -> program_planner';
    END IF;
    
    -- Assign role 'program_implementer' untuk beben@yayasan.com
    IF v_beben_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_beben_id, 'program_implementer', 'Beben', NOW())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'program_implementer', updated_at = NOW();
        RAISE NOTICE 'beben@yayasan.com -> program_implementer';
    END IF;
    
    -- Assign role 'carbon_specialist' untuk ocay@yayasan.com
    IF v_ocay_id IS NOT NULL THEN
        INSERT INTO profiles (id, role, full_name, updated_at)
        VALUES (v_ocay_id, 'carbon_specialist', 'Ocay', NOW())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'carbon_specialist', updated_at = NOW();
        RAISE NOTICE 'ocay@yayasan.com -> carbon_specialist';
    END IF;
    
    -- Assign role 'viewer' untuk user lainnya yang sudah ada di auth.users
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
    AND au.id NOT IN (COALESCE(v_axel_id, '00000000-0000-0000-0000-000000000000'),
                      COALESCE(v_amrin_id, '00000000-0000-0000-0000-000000000000'),
                      COALESCE(v_faris_id, '00000000-0000-0000-0000-000000000000'),
                      COALESCE(v_beben_id, '00000000-0000-0000-0000-000000000000'),
                      COALESCE(v_ocay_id, '00000000-0000-0000-0000-000000000000'))
    ON CONFLICT (id) DO UPDATE 
    SET role = 'viewer', updated_at = NOW();
    
    RAISE NOTICE 'Other users -> viewer';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error assigning roles: %', SQLERRM;
END $$;

-- ====================================================================
-- 4. Setup RLS policies sederhana (jika belum ada)
-- ====================================================================

-- Enable RLS untuk semua tabel
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;

-- Policy untuk perhutanan_sosial: semua authenticated users bisa baca
DO $$
BEGIN
    -- Cek jika policy sudah ada
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'perhutanan_sosial' 
        AND policyname = 'Allow read for authenticated users'
    ) THEN
        CREATE POLICY "Allow read for authenticated users" ON perhutanan_sosial
        FOR SELECT USING (auth.role() = 'authenticated');
        RAISE NOTICE 'RLS policy created for perhutanan_sosial';
    END IF;
    
    -- Policy untuk profiles: user hanya bisa lihat sendiri, admin bisa lihat semua
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);
        RAISE NOTICE 'RLS policy created for profiles';
    END IF;
    
    -- Policy untuk kabupaten: semua bisa baca
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kabupaten' 
        AND policyname = 'Allow read for all'
    ) THEN
        CREATE POLICY "Allow read for all" ON kabupaten
        FOR SELECT USING (true);
        RAISE NOTICE 'RLS policy created for kabupaten';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating RLS policies: %', SQLERRM;
END $$;

-- ====================================================================
-- 5. Verifikasi hasil
-- ====================================================================

DO $$
DECLARE
    total_users INTEGER;
    total_profiles INTEGER;
    admin_count INTEGER;
    monev_count INTEGER;
    viewer_count INTEGER;
    other_roles_count INTEGER;
BEGIN
    -- Hitung total users di auth
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- Hitung total profiles dengan role
    SELECT COUNT(*) INTO total_profiles FROM profiles WHERE role IS NOT NULL;
    
    -- Hitung per role
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    SELECT COUNT(*) INTO monev_count FROM profiles WHERE role = 'monev';
    SELECT COUNT(*) INTO viewer_count FROM profiles WHERE role = 'viewer';
    SELECT COUNT(*) INTO other_roles_count FROM profiles WHERE role IN ('program_planner', 'program_implementer', 'carbon_specialist');
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'IMPLEMENTASI ROLE SELESAI';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Total users di auth: %', total_users;
    RAISE NOTICE 'Total profiles dengan role: %', total_profiles;
    RAISE NOTICE '';
    RAISE NOTICE 'Distribusi Role:';
    RAISE NOTICE '  - admin: % user(s)', admin_count;
    RAISE NOTICE '  - monev: % user(s)', monev_count;
    RAISE NOTICE '  - viewer: % user(s)', viewer_count;
    RAISE NOTICE '  - program_planner/implementer/carbon_specialist: % user(s)', other_roles_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Detail assignments:';
    
    FOR user_rec IN (
        SELECT 
            p.role,
            au.email,
            p.full_name
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.role IS NOT NULL
        ORDER BY p.role, au.email
        LIMIT 15
    ) LOOP
        RAISE NOTICE '  - % (%): %', 
            COALESCE(user_rec.email, 'N/A'),
            COALESCE(user_rec.full_name, 'No name'),
            user_rec.role;
    END LOOP;
    
    -- Cek jika ada user tanpa profile
    DECLARE
        users_without_profile INTEGER;
    BEGIN
        SELECT COUNT(*) INTO users_without_profile
        FROM auth.users au
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);
        
        IF users_without_profile > 0 THEN
            RAISE NOTICE '';
            RAISE NOTICE '⚠️  Warning: % user(s) without profile', users_without_profile;
        END IF;
    END;
    
END $$;

-- ====================================================================
-- 6. Output final
-- ====================================================================

SELECT '✅ Migration selesai! Roles telah diimplementasikan.' AS status;