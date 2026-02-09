-- Migration: Create tables for perhutanan_sosial, potensi, profiles, and role_permissions
-- Generated at: 2026-01-29 12:47 PM
-- Simple version without comments or RAISE NOTICE

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