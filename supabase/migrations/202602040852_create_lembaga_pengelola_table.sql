-- Migration: Create lembaga_pengelola table for institutional management
-- Generated at: 2026-02-04 08:52 AM
-- This table stores institutional data for Perhutanan Sosial groups

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create lembaga_pengelola table
-- ======================
CREATE TABLE IF NOT EXISTS lembaga_pengelola (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    ketua VARCHAR(255),
    jumlah_anggota INTEGER,
    kepala_desa VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each PS has only one lembaga_pengelola
    CONSTRAINT unique_lembaga_per_ps UNIQUE (perhutanan_sosial_id)
);

-- ======================
-- 2. Create indexes for performance
-- ======================
CREATE INDEX IF NOT EXISTS idx_lembaga_pengelola_perhutanan_sosial_id ON lembaga_pengelola(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_lembaga_pengelola_nama ON lembaga_pengelola(nama);
CREATE INDEX IF NOT EXISTS idx_lembaga_pengelola_created_at ON lembaga_pengelola(created_at);

-- ======================
-- 3. Create updated_at function and trigger
-- ======================
-- Create function to update updated_at timestamp if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for lembaga_pengelola
DROP TRIGGER IF EXISTS update_lembaga_pengelola_updated_at ON lembaga_pengelola;
CREATE TRIGGER update_lembaga_pengelola_updated_at
    BEFORE UPDATE ON lembaga_pengelola
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- 4. Insert sample data (optional)
-- ======================
-- Uncomment below to insert sample data for testing
/*
INSERT INTO lembaga_pengelola (
    perhutanan_sosial_id,
    nama,
    ketua,
    jumlah_anggota,
    kepala_desa
) 
SELECT 
    id as perhutanan_sosial_id,
    pemegang_izin || ' - LPHD' as nama,
    ketua_ps as ketua,
    jumlah_kk as jumlah_anggota,
    kepala_desa
FROM perhutanan_sosial
WHERE ketua_ps IS NOT NULL OR jumlah_kk IS NOT NULL OR kepala_desa IS NOT NULL
ON CONFLICT (perhutanan_sosial_id) DO NOTHING;
*/

-- ======================
-- 5. Create RLS (Row Level Security) policies
-- ======================
-- Enable RLS
ALTER TABLE lembaga_pengelola ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to view lembaga_pengelola
CREATE POLICY "Allow authenticated users to view lembaga_pengelola" ON lembaga_pengelola
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy 2: Allow admin and monev to insert lembaga_pengelola
CREATE POLICY "Allow admin and monev to insert lembaga_pengelola" ON lembaga_pengelola
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'monev')
            )
        )
    );

-- Policy 3: Allow admin and monev to update lembaga_pengelola
CREATE POLICY "Allow admin and monev to update lembaga_pengelola" ON lembaga_pengelola
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'monev')
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'monev')
            )
        )
    );

-- Policy 4: Allow only admin to delete lembaga_pengelola
CREATE POLICY "Allow only admin to delete lembaga_pengelola" ON lembaga_pengelola
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND 
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'admin'
            )
        )
    );

-- ======================
-- 6. Grant permissions
-- ======================
GRANT ALL ON lembaga_pengelola TO postgres, anon, authenticated, service_role;

-- ======================
-- 7. Comments
-- ======================
COMMENT ON TABLE lembaga_pengelola IS 'Table for storing institutional data of Perhutanan Sosial managing bodies (LPHD, KUPS, HTR, etc.)';
COMMENT ON COLUMN lembaga_pengelola.perhutanan_sosial_id IS 'Foreign key to perhutanan_sosial table';
COMMENT ON COLUMN lembaga_pengelola.nama IS 'Name of the managing institution';
COMMENT ON COLUMN lembaga_pengelola.ketua IS 'Chairperson/head of the institution';
COMMENT ON COLUMN lembaga_pengelola.jumlah_anggota IS 'Number of members (households)';
COMMENT ON COLUMN lembaga_pengelola.kepala_desa IS 'Village head (for LPHD)';

-- ======================
-- 8. Verification
-- ======================
DO $$
BEGIN
    RAISE NOTICE 'Lembaga_pengelola table migration completed successfully.';
    RAISE NOTICE 'Table created with columns: id, perhutanan_sosial_id, nama, ketua, jumlah_anggota, kepala_desa, created_at, updated_at';
    RAISE NOTICE 'RLS policies created for:';
    RAISE NOTICE '- All authenticated users can view lembaga_pengelola';
    RAISE NOTICE '- Admin and monev can insert/update lembaga_pengelola';
    RAISE NOTICE '- Only admin can delete lembaga_pengelola';
    RAISE NOTICE '';
    RAISE NOTICE 'The table will now be available in the schema cache.';
END $$;

-- ======================
-- 9. Refresh schema cache (not directly possible via SQL, but Supabase will detect new table)
-- ======================
-- Note: Supabase schema cache refreshes automatically within a few minutes
-- You can also manually refresh via: SELECT pg_notify('pgrst', 'reload schema');

SELECT pg_notify('pgrst', 'reload schema');

COMMIT;