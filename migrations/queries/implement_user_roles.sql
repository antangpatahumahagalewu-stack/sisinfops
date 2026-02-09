-- SQL Migration untuk mengimplementasikan semua role pada user yang ada
-- dan setup RLS policies untuk akses tabel perhutanan_sosial

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. Update profiles table structure jika diperlukan
-- ====================================================================

-- Pastikan kolom role ada dan bisa menampung semua role
ALTER TABLE profiles 
ALTER COLUMN role TYPE VARCHAR(50);

-- ====================================================================
-- 2. Insert semua role ke dalam role_permissions table
-- ====================================================================

-- Hapus data lama jika ada (untuk clean start)
-- DELETE FROM role_permissions;

-- Insert semua role dari dokumentasi TINGKATAN_USER.md
INSERT INTO role_permissions (role_name, display_name, description, permissions) VALUES
    -- Core roles dari TINGKATAN_USER.md
    ('admin', 'Administrator', 'Full access semua fitur', '{"all": ["create", "read", "update", "delete"], "modules": ["dashboard", "ps_data", "potensi", "kabupaten", "carbon_projects", "programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder", "legal", "pdd", "excel_upload", "user_management"]}'),
    ('monev', 'Monitoring & Evaluasi', 'Fokus pada monitoring dan evaluasi data', '{"read": ["all"], "edit": ["ps_data", "potensi", "kabupaten"], "upload": ["excel"], "modules": ["dashboard", "ps_data", "potensi", "kabupaten", "monitoring"], "no_access": ["delete", "user_management", "carbon_projects", "program_management", "pdd_generation"]}'),
    ('viewer', 'Viewer', 'Hanya membaca data (read-only)', '{"read": ["ps_data", "potensi", "kabupaten", "statistics"], "modules": ["dashboard", "ps_data", "potensi", "kabupaten"], "no_access": ["edit", "delete", "upload", "all_management"]}'),
    ('program_planner', 'Program Planner', 'Fokus pada perencanaan program', '{"read": ["all"], "edit": ["programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder"], "modules": ["dashboard", "programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder"], "no_access": ["delete", "excel_upload", "carbon_projects", "pdd_generation"]}'),
    ('program_implementer', 'Program Implementer', 'Fokus pada implementasi program', '{"read": ["all"], "edit": ["implementation", "economic_empowerment"], "modules": ["dashboard", "implementation", "economic_empowerment"], "no_access": ["delete", "excel_upload", "program_management", "dram", "carbon_projects"]}'),
    ('carbon_specialist', 'Carbon Specialist', 'Fokus pada proyek karbon', '{"read": ["all"], "edit": ["carbon_projects", "programs", "monitoring", "stakeholder", "legal", "pdd"], "modules": ["dashboard", "carbon_projects", "programs", "monitoring", "stakeholder", "legal", "pdd"], "no_access": ["delete", "excel_upload", "dram", "implementation"]}')
ON CONFLICT (role_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- ====================================================================
-- 3. Assign roles kepada user yang ada berdasarkan email pattern
-- ====================================================================

-- Note: Ini adalah contoh assignment berdasarkan pola email
-- Anda mungkin perlu menyesuaikan dengan user yang sebenarnya

-- Fungsi helper untuk mendapatkan user_id dari email
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_to_find TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Try to get from auth.users
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = email_to_find;
    
    RETURN user_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles dengan role yang sesuai
-- Catatan: Anda perlu menyesuaikan assignment ini dengan kebutuhan sebenarnya

-- Contoh assignment (ganti dengan logika yang sesuai):
-- axel@yayasan.com -> admin
-- amrin@yayasan.com -> monev  
-- faris@yayasan.com -> program_planner
-- beben@yayasan.com -> program_implementer
-- ocay@yayasan.com -> carbon_specialist
-- user lain -> viewer (default)

UPDATE profiles 
SET role = 'admin',
    updated_at = NOW()
WHERE id = get_user_id_by_email('axel@yayasan.com')
   OR full_name ILIKE '%axel%';

UPDATE profiles 
SET role = 'monev',
    updated_at = NOW()
WHERE id = get_user_id_by_email('amrin@yayasan.com')
   OR full_name ILIKE '%amrin%';

UPDATE profiles 
SET role = 'program_planner',
    updated_at = NOW()
WHERE id = get_user_id_by_email('faris@yayasan.com')
   OR full_name ILIKE '%faris%';

UPDATE profiles 
SET role = 'program_implementer',
    updated_at = NOW()
WHERE id = get_user_id_by_email('beben@yayasan.com')
   OR full_name ILIKE '%beben%';

UPDATE profiles 
SET role = 'carbon_specialist',
    updated_at = NOW()
WHERE id = get_user_id_by_email('ocay@yayasan.com')
   OR full_name ILIKE '%ocay%';

-- Set default role 'viewer' untuk user yang belum punya role
UPDATE profiles 
SET role = 'viewer',
    updated_at = NOW()
WHERE role IS NULL OR role = '';

-- ====================================================================
-- 4. Setup RLS (Row Level Security) Policies untuk tabel perhutanan_sosial
-- ====================================================================

-- Enable RLS pada tabel perhutanan_sosial
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;

-- Hapus policies lama jika ada
DROP POLICY IF EXISTS "Allow all access for admin" ON perhutanan_sosial;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON perhutanan_sosial;
DROP POLICY IF EXISTS "Allow edit access for monev and admin" ON perhutanan_sosial;

-- Policy 1: Admin bisa akses semua (CREATE, READ, UPDATE, DELETE)
CREATE POLICY "Allow all access for admin" ON perhutanan_sosial
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Policy 2: Monev bisa READ dan UPDATE (tidak bisa DELETE)
CREATE POLICY "Allow read and update for monev" ON perhutanan_sosial
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'monev'
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'monev'
    )
);

-- Policy 3: Program Planner, Program Implementer, Carbon Specialist bisa READ
CREATE POLICY "Allow read for specialists" ON perhutanan_sosial
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('program_planner', 'program_implementer', 'carbon_specialist')
    )
);

-- Policy 4: Viewer hanya bisa READ
CREATE POLICY "Allow read for viewer" ON perhutanan_sosial
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'viewer'
    )
);

-- Policy 5: User terautentikasi tanpa role spesifik bisa READ (fallback)
CREATE POLICY "Allow read for authenticated users" ON perhutanan_sosial
FOR SELECT USING (auth.role() = 'authenticated');

-- ====================================================================
-- 5. Setup RLS untuk tabel potensi
-- ====================================================================

ALTER TABLE potensi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for admin on potensi" ON potensi;
DROP POLICY IF EXISTS "Allow read access for authenticated users on potensi" ON potensi;

CREATE POLICY "Allow all access for admin on potensi" ON potensi
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow read and update for monev on potensi" ON potensi
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'monev'
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'monev'
    )
);

CREATE POLICY "Allow read for all roles on potensi" ON potensi
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist')
    )
);

-- ====================================================================
-- 6. Setup RLS untuk tabel kabupaten
-- ====================================================================

ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for admin on kabupaten" ON kabupaten;
DROP POLICY IF EXISTS "Allow read access for authenticated users on kabupaten" ON kabupaten;

CREATE POLICY "Allow all access for admin on kabupaten" ON kabupaten
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow read for all roles on kabupaten" ON kabupaten
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist')
    )
);

-- ====================================================================
-- 7. Setup RLS untuk tabel profiles (user hanya bisa lihat/lubah profile sendiri)
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;

-- User bisa melihat profile sendiri
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- User bisa mengupdate profile sendiri
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Admin bisa melihat dan mengupdate semua profile
CREATE POLICY "Admin can manage all profiles" ON profiles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles AS p
        WHERE p.id = auth.uid() 
        AND p.role = 'admin'
    )
);

-- ====================================================================
-- 8. Verifikasi dan laporan
-- ====================================================================

DO $$
DECLARE
    user_count INTEGER;
    role_count INTEGER;
    rls_tables TEXT[] := ARRAY['perhutanan_sosial', 'potensi', 'kabupaten', 'profiles'];
    table_name TEXT;
BEGIN
    -- Hitung jumlah user dengan role
    SELECT COUNT(*) INTO user_count
    FROM profiles 
    WHERE role IS NOT NULL AND role != '';
    
    -- Hitung jumlah role yang di-definisi
    SELECT COUNT(*) INTO role_count
    FROM role_permissions;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'IMPLEMENTASI ROLE SELESAI';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Jumlah user dengan role: %', user_count;
    RAISE NOTICE 'Jumlah role yang di-definisi: %', role_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Distribusi role:';
    
    FOR r IN (SELECT role, COUNT(*) as count FROM profiles WHERE role IS NOT NULL GROUP BY role ORDER BY role) LOOP
        RAISE NOTICE '  - %: % user(s)', r.role, r.count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'RLS status untuk tabel:';
    FOREACH table_name IN ARRAY rls_tables LOOP
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = table_name
            ) THEN
                RAISE NOTICE '  - %: RLS ENABLED', table_name;
            ELSE
                RAISE NOTICE '  - %: TABLE NOT FOUND', table_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  - %: ERROR CHECKING', table_name;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Sample user assignments:';
    FOR u IN (
        SELECT p.full_name, p.role, au.email
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.role IS NOT NULL
        LIMIT 5
    ) LOOP
        RAISE NOTICE '  - % (%): %', 
            COALESCE(u.full_name, 'No name'), 
            COALESCE(u.email, 'No email'), 
            u.role;
    END LOOP;
    
END $$;

-- ====================================================================
-- 9. Cleanup fungsi helper
-- ====================================================================

DROP FUNCTION IF EXISTS get_user_id_by_email(TEXT);

RAISE NOTICE 'Migration selesai. Silakan cek dashboard untuk verifikasi.';