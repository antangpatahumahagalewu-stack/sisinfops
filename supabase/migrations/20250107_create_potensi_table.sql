-- Create potensi table for storing potential/calon Perhutanan Sosial data
CREATE TABLE IF NOT EXISTS potensi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Basic information
    kabupaten_id UUID REFERENCES kabupaten(id) ON DELETE CASCADE,
    skema VARCHAR(50) NOT NULL DEFAULT 'POTENSI',
    nama_area VARCHAR(255) NOT NULL,
    desa VARCHAR(100),
    kecamatan VARCHAR(100),
    
    -- Location details
    luas_potensi_ha DECIMAL(12, 2),
    jenis_hutan VARCHAR(50),
    status_kawasan VARCHAR(50),
    
    -- Additional information from Excel
    pemegang_izin VARCHAR(255),
    nomor_sk VARCHAR(255),
    tanggal_sk DATE,
    masa_berlaku VARCHAR(50),
    tanggal_berakhir_izin DATE,
    luas_izin_sk_ha DECIMAL(12, 2),
    
    -- Status and tracking
    status_pengembangan VARCHAR(50) DEFAULT 'Proses Pembentukan',
    keterangan TEXT,
    fasilitator VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status_pengembangan CHECK (
        status_pengembangan IN (
            'Proses Pembentukan',
            'Proses Penjajakan', 
            'Siap Dikembangkan',
            'Dalam Verifikasi',
            'Ditunda'
        )
    )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_potensi_kabupaten_id ON potensi(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_potensi_skema ON potensi(skema);
CREATE INDEX IF NOT EXISTS idx_potensi_status_pengembangan ON potensi(status_pengembangan);
CREATE INDEX IF NOT EXISTS idx_potensi_created_at ON potensi(created_at DESC);

-- Apply updated_at trigger
CREATE OR REPLACE TRIGGER update_potensi_updated_at
    BEFORE UPDATE ON potensi
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE potensi ENABLE ROW LEVEL SECURITY;

-- RLS Policies for potensi table
CREATE POLICY "Potensi readable by authenticated users" ON potensi
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Potensi insertable by admin and monev" ON potensi
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'monev')
        )
    );

CREATE POLICY "Potensi updatable by admin and monev" ON potensi
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'monev')
        )
    );

CREATE POLICY "Potensi deletable by admin only" ON potensi
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Apply audit trigger to potensi table
CREATE TRIGGER audit_potensi
    AFTER INSERT OR UPDATE OR DELETE ON potensi
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Insert kabupaten data if not exists (safety check)
INSERT INTO kabupaten (nama) VALUES
    ('KABUPATEN KATINGAN'),
    ('KABUPATEN KAPUAS'),
    ('KABUPATEN PULANG PISAU'),
    ('KABUPATEN GUNUNG MAS')
ON CONFLICT (nama) DO NOTHING;
