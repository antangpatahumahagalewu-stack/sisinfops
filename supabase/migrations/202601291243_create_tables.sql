-- Migration: Create tables for perhutanan_sosial, potensi, profiles, and role_permissions
-- Generated at: 2026-01-29 12:43 PM
-- Run this SQL in Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create kabupaten table (if not exists)
-- ======================
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

-- ======================
-- 2. Create perhutanan_sosial table
-- ======================
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

-- ======================
-- 3. Create potensi table
-- ======================
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

-- ======================
-- 4. Create profiles table
-- ======================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- ======================
-- 5. Create role_permissions table
-- ======================
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

-- ======================
-- 6. Insert initial role permissions (optional)
-- ======================
-- Note: You can uncomment and modify the INSERT statements below if you want to insert initial data
/*
INSERT INTO role_permissions (role_name, display_name, description, permissions) VALUES
    ('admin', 'Administrator', 'Full access semua fitur', '{"all": ["create", "read", "update", "delete"]}'),
    ('program_planner', 'Program Planner', 'Membuat dan mengelola DRAM, program, tidak bisa mengubah realisasi', '{"dram": ["create", "read", "update"], "program": ["create", "read", "update"], "monitoring": ["read"]}'),
    ('program_implementer', 'Program Implementer', 'Melaksanakan kegiatan, upload bukti, tidak bisa mengubah indikator', '{"bukti": ["upload"], "kegiatan": ["create", "read", "update"], "monitoring": ["read"]}'),
    ('monev_officer', 'Monev Officer', 'Monitoring dan evaluasi, read-only ke rencana', '{"rencana": ["read"], "evaluasi": ["create", "read", "update"], "monitoring": ["create", "read", "update"]}'),
    ('carbon_specialist', 'Carbon Specialist', 'Mengelola proyek karbon, generate PDD, legal documents', '{"pdd": ["generate"], "legal": ["read", "update"], "carbon_project": ["create", "read", "update", "delete"]}')
ON CONFLICT (role_name) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;
*/

-- ======================
-- 7. Create updated_at triggers for all tables
-- ======================
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

-- ======================
-- 8. Comments and notes
-- ======================
COMMENT ON TABLE kabupaten IS 'Table for storing kabupaten/regency data';
COMMENT ON TABLE perhutanan_sosial IS 'Table for storing perhutanan sosial (social forestry) data';
COMMENT ON TABLE potensi IS 'Table for storing potential social forestry areas';
COMMENT ON TABLE profiles IS 'Table for storing user profiles';
COMMENT ON TABLE role_permissions IS 'Table for storing role-based permissions';

-- ======================
-- 9. Verify tables were created
-- ======================
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. Tables created/verified:';
    RAISE NOTICE '- kabupaten';
    RAISE NOTICE '- perhutanan_sosial';
    RAISE NOTICE '- potensi';
    RAISE NOTICE '- profiles';
    RAISE NOTICE '- role_permissions';
END $$;