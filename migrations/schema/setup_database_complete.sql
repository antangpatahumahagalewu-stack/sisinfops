-- SETUP DATABASE LENGKAP UNTUK SISTEM INFORMASI PERHUTANAN SOSIAL
-- Jalankan file ini di Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql

-- ====================================================================
-- PART 1: CREATE EXTENSIONS AND BASIC TABLES
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. Create kabupaten table
-- ====================================================================
CREATE TABLE IF NOT EXISTS kabupaten (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial kabupaten data
INSERT INTO kabupaten (nama) VALUES
    ('Kabupaten Katingan'),
    ('Kabupaten Kapuas'),
    ('Kabupaten Pulang Pisau'),
    ('Kabupaten Gunung Mas'),
    ('Kotamadya Palangka Raya')
ON CONFLICT (nama) DO NOTHING;

-- ====================================================================
-- 2. Create perhutanan_sosial table
-- ====================================================================
CREATE TABLE IF NOT EXISTS perhutanan_sosial (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kabupaten_id UUID REFERENCES kabupaten(id) ON DELETE CASCADE,
    skema VARCHAR(50) NOT NULL,
    pemegang_izin VARCHAR(255) NOT NULL,
    desa VARCHAR(100),
    kecamatan VARCHAR(100),
    nomor_sk VARCHAR(255),
    tanggal_sk DATE,
    masa_berlaku VARCHAR(50),
    tanggal_berakhir_izin DATE,
    nomor_pks VARCHAR(255),
    luas_ha DECIMAL(10, 2),
    jenis_hutan VARCHAR(50),
    status_kawasan VARCHAR(50),
    rkps_status VARCHAR(10) CHECK (rkps_status IN ('ada', 'belum')),
    peta_status VARCHAR(10) CHECK (peta_status IN ('ada', 'belum')),
    keterangan TEXT,
    fasilitator VARCHAR(100),
    jumlah_kk INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID,
    ketua_ps VARCHAR(255),
    kepala_desa VARCHAR(255)
);

-- Create indexes for perhutanan_sosial
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_kabupaten_id ON perhutanan_sosial(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_skema ON perhutanan_sosial(skema);
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_pemegang_izin ON perhutanan_sosial(pemegang_izin);
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_nomor_sk ON perhutanan_sosial(nomor_sk);
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_desa ON perhutanan_sosial(desa);
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_kecamatan ON perhutanan_sosial(kecamatan);

-- ====================================================================
-- 3. Create potensi table
-- ====================================================================
CREATE TABLE IF NOT EXISTS potensi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kabupaten_id UUID REFERENCES kabupaten(id) ON DELETE CASCADE,
    skema VARCHAR(50) NOT NULL DEFAULT 'POTENSI',
    nama_area VARCHAR(255) NOT NULL,
    desa VARCHAR(100),
    kecamatan VARCHAR(100),
    luas_potensi_ha DECIMAL(12, 2),
    jenis_hutan VARCHAR(50),
    status_kawasan VARCHAR(50),
    pemegang_izin VARCHAR(255),
    nomor_sk VARCHAR(255),
    tanggal_sk DATE,
    masa_berlaku VARCHAR(50),
    tanggal_berakhir_izin DATE,
    luas_izin_sk_ha DECIMAL(12, 2),
    status_pengembangan VARCHAR(50) DEFAULT 'Proses Pembentukan',
    keterangan TEXT,
    fasilitator VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for potensi
CREATE INDEX IF NOT EXISTS idx_potensi_kabupaten_id ON potensi(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_potensi_skema ON potensi(skema);
CREATE INDEX IF NOT EXISTS idx_potensi_status_pengembangan ON potensi(status_pengembangan);
CREATE INDEX IF NOT EXISTS idx_potensi_nama_area ON potensi(nama_area);

-- ====================================================================
-- 4. Create profiles table
-- ====================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    phone VARCHAR(20),
    location VARCHAR(255),
    bio TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT false,
    online_status VARCHAR(20) DEFAULT 'offline'
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON profiles(last_seen_at);

-- ====================================================================
-- 5. Create role_permissions table
-- ====================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    display_name VARCHAR(255),
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_name ON role_permissions(role_name);

-- ====================================================================
-- PART 2: INSERT ROLE PERMISSIONS DATA
-- ====================================================================

-- Insert semua 14 role (6 core + 8 finance)
INSERT INTO role_permissions (role_name, display_name, description, permissions) VALUES
    -- Core roles dari TINGKATAN_USER.md
    ('admin', 'Administrator', 'Full access semua fitur', '{"all": ["create", "read", "update", "delete"], "modules": ["dashboard", "ps_data", "potensi", "kabupaten", "carbon_projects", "programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder", "legal", "pdd", "excel_upload", "user_management"]}'),
    ('monev', 'Monitoring & Evaluasi', 'Fokus pada monitoring dan evaluasi data', '{"read": ["all"], "edit": ["ps_data", "potensi", "kabupaten"], "upload": ["excel"], "modules": ["dashboard", "ps_data", "potensi", "kabupaten", "monitoring"], "no_access": ["delete", "user_management", "carbon_projects", "program_management", "pdd_generation"]}'),
    ('viewer', 'Viewer', 'Hanya membaca data (read-only)', '{"read": ["ps_data", "potensi", "kabupaten", "statistics"], "modules": ["dashboard", "ps_data", "potensi", "kabupaten"], "no_access": ["edit", "delete", "upload", "all_management"]}'),
    ('program_planner', 'Program Planner', 'Fokus pada perencanaan program', '{"read": ["all"], "edit": ["programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder"], "modules": ["dashboard", "programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder"], "no_access": ["delete", "excel_upload", "carbon_projects", "pdd_generation"]}'),
    ('program_implementer', 'Program Implementer', 'Fokus pada implementasi program', '{"read": ["all"], "edit": ["implementation", "economic_empowerment"], "modules": ["dashboard", "implementation", "economic_empowerment"], "no_access": ["delete", "excel_upload", "program_management", "dram", "carbon_projects"]}'),
    ('carbon_specialist', 'Carbon Specialist', 'Fokus pada proyek karbon', '{"read": ["all"], "edit": ["carbon_projects", "programs", "monitoring", "stakeholder", "legal", "pdd"], "modules": ["dashboard", "carbon_projects", "programs", "monitoring", "stakeholder", "legal", "pdd"], "no_access": ["delete", "excel_upload", "dram", "implementation"]}'),
    -- Finance roles dari ROLE_PERMISSION_KEUANGAN.md
    ('finance_manager', 'Finance Manager', 'Mengelola semua aspek keuangan dan anggaran', '{"read": ["all_financial"], "edit": ["budgets", "transactions", "reports", "benefit_distributions"], "approve": ["financial_transactions"], "modules": ["financial_dashboard", "budget_management", "transaction_management", "reporting", "benefit_distribution"], "no_access": ["user_management", "carbon_projects"]}'),
    ('finance_operational', 'Finance Operational', 'Menangani transaksi harian dan operasional', '{"read": ["transactions", "budgets"], "edit": ["transactions"], "create": ["transactions"], "modules": ["transaction_management", "budget_tracking"], "no_access": ["approve_transactions", "delete", "user_management"]}'),
    ('finance_project_carbon', 'Finance Project Carbon', 'Mengelola keuangan proyek karbon', '{"read": ["carbon_finance", "transactions"], "edit": ["carbon_transactions"], "create": ["carbon_transactions"], "modules": ["carbon_finance", "transaction_management"], "no_access": ["approve_transactions", "delete", "budget_management"]}'),
    ('finance_project_implementation', 'Finance Project Implementation', 'Mengelola keuangan implementasi program', '{"read": ["implementation_finance", "transactions"], "edit": ["implementation_transactions"], "create": ["implementation_transactions"], "modules": ["implementation_finance", "transaction_management"], "no_access": ["approve_transactions", "delete", "budget_management"]}'),
    ('finance_project_social', 'Finance Project Social', 'Mengelola keuangan program sosial', '{"read": ["social_finance", "transactions"], "edit": ["social_transactions"], "create": ["social_transactions"], "modules": ["social_finance", "transaction_management"], "no_access": ["approve_transactions", "delete", "budget_management"]}'),
    ('investor', 'Investor', 'Akses laporan keuangan dan performa', '{"read": ["financial_reports", "performance"], "modules": ["financial_reports", "performance_dashboard"], "no_access": ["edit", "create", "delete", "approve"]}')
ON CONFLICT (role_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- ====================================================================
-- PART 3: CREATE OR UPDATE PROFILES FOR EXISTING USERS
-- ====================================================================

-- First, ensure profiles table has proper role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist',
  'finance_manager', 'finance_operational', 'finance_project_carbon', 
  'finance_project_implementation', 'finance_project_social', 'investor'
));

-- Create profiles for existing auth users
INSERT INTO profiles (id, role, full_name, created_at, updated_at)
SELECT 
    au.id,
    CASE 
        WHEN au.email = 'axel@yayasan.com' THEN 'admin'
        WHEN au.email = 'amrin@yayasan.com' THEN 'monev'
        WHEN au.email = 'faris@yayasan.com' THEN 'program_planner'
        WHEN au.email = 'beben@yayasan.com' THEN 'program_implementer'
        WHEN au.email = 'ocay@yayasan.com' THEN 'carbon_specialist'
        WHEN au.email = 'finance@yayasan.com' THEN 'finance_manager'
        ELSE 'viewer'
    END,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    NOW(),
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- ====================================================================
-- PART 4: SETUP ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE potensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read access for kabupaten" ON kabupaten;
DROP POLICY IF EXISTS "Admin full access for kabupaten" ON kabupaten;

DROP POLICY IF EXISTS "Public read access for perhutanan_sosial" ON perhutanan_sosial;
DROP POLICY IF EXISTS "Admin and monev write access for perhutanan_sosial" ON perhutanan_sosial;

DROP POLICY IF EXISTS "Public read access for potensi" ON potensi;
DROP POLICY IF EXISTS "Admin and monev write access for potensi" ON potensi;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;

DROP POLICY IF EXISTS "Public read access for role_permissions" ON role_permissions;

-- ====================================================================
-- RLS Policies for kabupaten
-- ====================================================================
CREATE POLICY "Public read access for kabupaten" ON kabupaten
FOR SELECT USING (true);

CREATE POLICY "Admin full access for kabupaten" ON kabupaten
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ====================================================================
-- RLS Policies for perhutanan_sosial
-- ====================================================================
CREATE POLICY "Public read access for perhutanan_sosial" ON perhutanan_sosial
FOR SELECT USING (true);

CREATE POLICY "Admin and monev write access for perhutanan_sosial" ON perhutanan_sosial
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monev'))
);

-- ====================================================================
-- RLS Policies for potensi
-- ====================================================================
CREATE POLICY "Public read access for potensi" ON potensi
FOR SELECT USING (true);

CREATE POLICY "Admin and monev write access for potensi" ON potensi
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monev'))
);

-- ====================================================================
-- RLS Policies for profiles
-- ====================================================================
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can manage all profiles" ON profiles
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ====================================================================
-- RLS Policies for role_permissions
-- ====================================================================
CREATE POLICY "Public read access for role_permissions" ON role_permissions
FOR SELECT USING (true);

-- ====================================================================
-- PART 5: CREATE TRIGGERS FOR UPDATED_AT
-- ====================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table
DROP TRIGGER IF EXISTS update_perhutanan_sosial_updated_at ON perhutanan_sosial;
CREATE TRIGGER update_perhutanan_sosial_updated_at
    BEFORE UPDATE ON perhutanan_sosial
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_potensi_updated_at ON potensi;
CREATE TRIGGER update_potensi_updated_at
    BEFORE UPDATE ON potensi
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- PART 6: VERIFICATION AND REPORT
-- ====================================================================

DO $$
DECLARE
    user_count INTEGER;
    role_count INTEGER;
    kabupaten_count INTEGER;
    ps_count INTEGER;
    potensi_count INTEGER;
    r_role TEXT;
    r_count INTEGER;
    u_role TEXT;
    u_email TEXT;
    u_full_name TEXT;
BEGIN
    -- Count users with roles
    SELECT COUNT(*) INTO user_count FROM profiles WHERE role IS NOT NULL;
    
    -- Count defined roles
    SELECT COUNT(*) INTO role_count FROM role_permissions;
    
    -- Count data in main tables
    SELECT COUNT(*) INTO kabupaten_count FROM kabupaten;
    SELECT COUNT(*) INTO ps_count FROM perhutanan_sosial;
    SELECT COUNT(*) INTO potensi_count FROM potensi;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created and configured:';
    RAISE NOTICE '  - kabupaten: % rows', kabupaten_count;
    RAISE NOTICE '  - perhutanan_sosial: % rows', ps_count;
    RAISE NOTICE '  - potensi: % rows', potensi_count;
    RAISE NOTICE '  - profiles: % users with roles', user_count;
    RAISE NOTICE '  - role_permissions: % roles defined', role_count;
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies enabled on: kabupaten, perhutanan_sosial, potensi, profiles, role_permissions';
    RAISE NOTICE '';
    RAISE NOTICE 'User role distribution:';
    
    FOR r_role, r_count IN 
        SELECT role, COUNT(*) as count 
        FROM profiles 
        WHERE role IS NOT NULL 
        GROUP BY role 
        ORDER BY role
    LOOP
        RAISE NOTICE '  - %: % user(s)', r_role, r_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Sample user assignments:';
    
    FOR u_role, u_email, u_full_name IN 
        SELECT 
            p.role,
            au.email,
            p.full_name
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.role IS NOT NULL
        ORDER BY p.role, au.email
        LIMIT 5
    LOOP
        RAISE NOTICE '  - % (%): %', 
            u_email,
            COALESCE(u_full_name, 'No name'),
            u_role;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test login with user credentials';
    RAISE NOTICE '2. Verify dashboard displays data';
    RAISE NOTICE '3. Check role-based access control';
    RAISE NOTICE '=========================================';
    
END $$;

-- ====================================================================
-- FINAL MESSAGE
-- ====================================================================
SELECT '✅ Database setup completed successfully!' AS status;
