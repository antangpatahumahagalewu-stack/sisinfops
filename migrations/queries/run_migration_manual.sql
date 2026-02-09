-- MIGRATION SQL untuk mengimplementasikan semua role pada user yang ada
-- Jalankan SQL ini di Supabase SQL Editor (https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql)

-- ====================================================================
-- 1. Hapus constraint lama jika ada (agar bisa assign role apapun)
-- ====================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ====================================================================
-- 2. Buat constraint baru yang memperbolehkan semua role
-- ====================================================================
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  -- Core roles dari TINGKATAN_USER.md
  'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist',
  -- Finance roles dari ROLE_PERMISSION_KEUANGAN.md (untuk future use)
  'finance_manager', 'finance_operational', 'finance_project_carbon', 
  'finance_project_implementation', 'finance_project_social', 'investor'
));

-- ====================================================================
-- 3. Buat atau update tabel role_permissions
-- ====================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    display_name VARCHAR(255),
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 4. Insert semua role ke role_permissions
-- ====================================================================
INSERT INTO role_permissions (role_name, display_name, description, permissions) VALUES
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
-- 5. Assign roles kepada user berdasarkan email
-- ====================================================================
-- Update profiles untuk user yang sudah ada
UPDATE profiles 
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'axel@yayasan.com'
);

UPDATE profiles 
SET role = 'monev'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'amrin@yayasan.com'
);

UPDATE profiles 
SET role = 'program_planner'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'faris@yayasan.com'
);

UPDATE profiles 
SET role = 'program_implementer'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'beben@yayasan.com'
);

UPDATE profiles 
SET role = 'carbon_specialist'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'ocay@yayasan.com'
);

-- Set default role 'viewer' untuk user lain
UPDATE profiles 
SET role = 'viewer'
WHERE role IS NULL OR role = ''
   OR id IN (
    SELECT id FROM auth.users WHERE email IN (
        'bambangplk@yayasan.com',
        'arjuni@yayasan.com',
        'masbob@yamal.com',
        'boby@yayasan.com'
    )
);

-- ====================================================================
-- 6. Buat profile untuk user yang belum punya profile
-- ====================================================================
INSERT INTO profiles (id, role, full_name, created_at, updated_at)
SELECT 
    au.id,
    CASE 
        WHEN au.email = 'axel@yayasan.com' THEN 'admin'
        WHEN au.email = 'amrin@yayasan.com' THEN 'monev'
        WHEN au.email = 'faris@yayasan.com' THEN 'program_planner'
        WHEN au.email = 'beben@yayasan.com' THEN 'program_implementer'
        WHEN au.email = 'ocay@yayasan.com' THEN 'carbon_specialist'
        ELSE 'viewer'
    END,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    NOW(),
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 7. Setup RLS policies dasar (opsional, jika belum ada)
-- ====================================================================
-- Enable RLS
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE potensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy untuk perhutanan_sosial: semua role bisa baca, admin dan monev bisa edit
DROP POLICY IF EXISTS "Allow read for all roles" ON perhutanan_sosial;
CREATE POLICY "Allow read for all roles" ON perhutanan_sosial
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write for admin and monev" ON perhutanan_sosial;
CREATE POLICY "Allow write for admin and monev" ON perhutanan_sosial
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monev'))
);

-- ====================================================================
-- 8. Verifikasi hasil
-- ====================================================================
DO $$
DECLARE
    user_count INTEGER;
    role_count INTEGER;
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
    RAISE NOTICE 'Detail user assignments:';
    FOR u IN (
        SELECT 
            p.role,
            au.email,
            p.full_name
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.role IS NOT NULL
        ORDER BY p.role, au.email
        LIMIT 10
    ) LOOP
        RAISE NOTICE '  - % (%): %', 
            u.email,
            COALESCE(u.full_name, 'No name'),
            u.role;
    END LOOP;
    
END $$;

-- ====================================================================
-- 9. Output final message
-- ====================================================================
SELECT '✅ Migration selesai! Roles telah diimplementasikan untuk semua user.' AS status;