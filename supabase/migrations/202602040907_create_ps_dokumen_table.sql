-- Migration: Create ps_dokumen table for document management
-- Generated at: 2026-02-04 09:07 AM
-- This table stores document data for Perhutanan Sosial groups

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create ps_dokumen table
-- ======================
CREATE TABLE IF NOT EXISTS ps_dokumen (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    jenis VARCHAR(50) NOT NULL CHECK (jenis IN ('SK', 'PETA', 'RKPS', 'PKS', 'LAINNYA')),
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    keterangan TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 2. Create indexes for performance
-- ======================
CREATE INDEX IF NOT EXISTS idx_ps_dokumen_perhutanan_sosial_id ON ps_dokumen(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_ps_dokumen_jenis ON ps_dokumen(jenis);
CREATE INDEX IF NOT EXISTS idx_ps_dokumen_created_at ON ps_dokumen(created_at);
CREATE INDEX IF NOT EXISTS idx_ps_dokumen_created_by ON ps_dokumen(created_by);

-- ======================
-- 3. Create updated_at trigger
-- ======================
-- Use existing function update_updated_at_column()
DROP TRIGGER IF EXISTS update_ps_dokumen_updated_at ON ps_dokumen;
CREATE TRIGGER update_ps_dokumen_updated_at
    BEFORE UPDATE ON ps_dokumen
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- 4. Create storage bucket for ps-dokumen
-- ======================
-- Note: Storage buckets are created via Supabase Dashboard or API
-- This is a reminder to create the bucket manually if it doesn't exist

-- ======================
-- 5. Create RLS (Row Level Security) policies
-- ======================
-- Enable RLS
ALTER TABLE ps_dokumen ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to view ps_dokumen
CREATE POLICY "Allow authenticated users to view ps_dokumen" ON ps_dokumen
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy 2: Allow admin and monev to insert ps_dokumen
CREATE POLICY "Allow admin and monev to insert ps_dokumen" ON ps_dokumen
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

-- Policy 3: Allow admin and monev to update ps_dokumen
CREATE POLICY "Allow admin and monev to update ps_dokumen" ON ps_dokumen
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

-- Policy 4: Allow only admin to delete ps_dokumen
CREATE POLICY "Allow only admin to delete ps_dokumen" ON ps_dokumen
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
GRANT ALL ON ps_dokumen TO postgres, anon, authenticated, service_role;

-- ======================
-- 7. Comments
-- ======================
COMMENT ON TABLE ps_dokumen IS 'Table for storing document data of Perhutanan Sosial (SK, Peta, RKPS, etc.)';
COMMENT ON COLUMN ps_dokumen.perhutanan_sosial_id IS 'Foreign key to perhutanan_sosial table';
COMMENT ON COLUMN ps_dokumen.nama IS 'Document name';
COMMENT ON COLUMN ps_dokumen.jenis IS 'Document type: SK, PETA, RKPS, PKS, LAINNYA';
COMMENT ON COLUMN ps_dokumen.file_url IS 'URL to the document file in storage';
COMMENT ON COLUMN ps_dokumen.file_name IS 'Original file name';
COMMENT ON COLUMN ps_dokumen.file_size IS 'File size in bytes';
COMMENT ON COLUMN ps_dokumen.keterangan IS 'Document description/notes';
COMMENT ON COLUMN ps_dokumen.created_by IS 'User who created the document';

-- ======================
-- 8. Verification
-- ======================
DO $$
BEGIN
    RAISE NOTICE 'ps_dokumen table migration completed successfully.';
    RAISE NOTICE 'Table created with columns: id, perhutanan_sosial_id, nama, jenis, file_url, file_name, file_size, keterangan, created_by, created_at, updated_at';
    RAISE NOTICE 'RLS policies created for:';
    RAISE NOTICE '- All authenticated users can view ps_dokumen';
    RAISE NOTICE '- Admin and monev can insert/update ps_dokumen';
    RAISE NOTICE '- Only admin can delete ps_dokumen';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Create storage bucket "ps-dokumen" in Supabase Storage';
    RAISE NOTICE '  1. Go to Storage → Create new bucket';
    RAISE NOTICE '  2. Name: ps-dokumen';
    RAISE NOTICE '  3. Set to public or configure RLS as needed';
END $$;

-- ======================
-- 9. Refresh schema cache
-- ======================
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;