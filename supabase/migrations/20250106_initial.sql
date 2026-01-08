-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create kabupaten table
CREATE TABLE kabupaten (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 4 kabupaten
INSERT INTO kabupaten (nama) VALUES
    ('KABUPATEN KATINGAN'),
    ('KABUPATEN KAPUAS'),
    ('KABUPATEN PULANG PISAU'),
    ('KABUPATEN GUNUNG MAS')
ON CONFLICT (nama) DO NOTHING;

-- Create perhutanan_sosial table
CREATE TABLE perhutanan_sosial (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kabupaten_id UUID REFERENCES kabupaten(id) ON DELETE CASCADE,
    
    -- Basic info
    skema VARCHAR(50) NOT NULL,
    pemegang_izin VARCHAR(255) NOT NULL,
    desa VARCHAR(100),
    kecamatan VARCHAR(100),
    
    -- SK Details
    nomor_sk VARCHAR(255),
    tanggal_sk DATE,
    masa_berlaku VARCHAR(50),
    tanggal_berakhir_izin DATE,
    
    -- PKS Details
    nomor_pks VARCHAR(255),
    luas_ha DECIMAL(10, 2),
    jenis_hutan VARCHAR(50),
    status_kawasan VARCHAR(50),
    
    -- Status
    rkps_status VARCHAR(10) CHECK (rkps_status IN ('ada', 'belum')),
    peta_status VARCHAR(10) CHECK (peta_status IN ('ada', 'belum')),
    
    -- Additional info
    keterangan TEXT,
    fasilitator VARCHAR(100),
    jumlah_kk INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('admin', 'monev', 'viewer')) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_log table
CREATE TABLE audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to perhutanan_sosial
CREATE TRIGGER update_perhutanan_sosial_updated_at
    BEFORE UPDATE ON perhutanan_sosial
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kabupaten (read-only for all authenticated users)
CREATE POLICY "Kabupaten readable by authenticated users" ON kabupaten
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for perhutanan_sosial
CREATE POLICY "PS readable by authenticated users" ON perhutanan_sosial
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "PS insertable by admin and monev" ON perhutanan_sosial
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'monev')
        )
    );

CREATE POLICY "PS updatable by admin and monev" ON perhutanan_sosial
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'monev')
        )
    );

CREATE POLICY "PS deletable by admin only" ON perhutanan_sosial
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- RLS Policies for audit_log (admin only)
CREATE POLICY "Audit log readable by admin only" ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply audit trigger to perhutanan_sosial
CREATE TRIGGER audit_perhutanan_sosial
    AFTER INSERT OR UPDATE OR DELETE ON perhutanan_sosial
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create indexes for performance
CREATE INDEX idx_perhutanan_sosial_kabupaten ON perhutanan_sosial(kabupaten_id);
CREATE INDEX idx_perhutanan_sosial_skema ON perhutanan_sosial(skema);
CREATE INDEX idx_perhutanan_sosial_status ON perhutanan_sosial(rkps_status, peta_status);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
