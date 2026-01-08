-- Migration: Setup Storage Buckets for PS Files
-- This migration creates storage policies for PS documents, photos, and maps
--
-- IMPORTANT: Storage buckets must be created manually through Supabase Dashboard:
-- 1. Go to Storage section in Supabase Dashboard
-- 2. Create the following buckets:
--    - ps-dokumen (public, 10MB limit)
--      Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
--    - ps-galeri (public, 5MB limit)
--      Allowed types: JPG, PNG, WEBP
--    - ps-peta (public, 20MB limit)
--      Allowed types: JSON, GeoJSON, KML, KMZ, JPG, PNG, PDF
-- 3. After creating buckets, run this migration to set up policies
--
-- Note: Buckets cannot be created via SQL due to permission restrictions.
-- This migration only creates the storage policies.

-- Storage policies for ps-dokumen bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ps-dokumen public read" ON storage.objects;
DROP POLICY IF EXISTS "ps-dokumen admin monev upload" ON storage.objects;
DROP POLICY IF EXISTS "ps-dokumen admin monev update" ON storage.objects;
DROP POLICY IF EXISTS "ps-dokumen admin delete" ON storage.objects;

-- Allow authenticated users to read
CREATE POLICY "ps-dokumen public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ps-dokumen');

-- Allow admin and monev to upload
CREATE POLICY "ps-dokumen admin monev upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ps-dokumen' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'monev')
  )
);

-- Allow admin and monev to update
CREATE POLICY "ps-dokumen admin monev update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ps-dokumen' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'monev')
  )
);

-- Allow admin to delete
CREATE POLICY "ps-dokumen admin delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ps-dokumen' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Storage policies for ps-galeri bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ps-galeri public read" ON storage.objects;
DROP POLICY IF EXISTS "ps-galeri admin monev upload" ON storage.objects;
DROP POLICY IF EXISTS "ps-galeri admin monev update" ON storage.objects;
DROP POLICY IF EXISTS "ps-galeri admin delete" ON storage.objects;

-- Allow authenticated users to read
CREATE POLICY "ps-galeri public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ps-galeri');

-- Allow admin and monev to upload
CREATE POLICY "ps-galeri admin monev upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ps-galeri' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'monev')
  )
);

-- Allow admin and monev to update
CREATE POLICY "ps-galeri admin monev update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ps-galeri' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'monev')
  )
);

-- Allow admin to delete
CREATE POLICY "ps-galeri admin delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ps-galeri' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Storage policies for ps-peta bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ps-peta public read" ON storage.objects;
DROP POLICY IF EXISTS "ps-peta admin monev upload" ON storage.objects;
DROP POLICY IF EXISTS "ps-peta admin monev update" ON storage.objects;
DROP POLICY IF EXISTS "ps-peta admin delete" ON storage.objects;

-- Allow authenticated users to read
CREATE POLICY "ps-peta public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ps-peta');

-- Allow admin and monev to upload
CREATE POLICY "ps-peta admin monev upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ps-peta' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'monev')
  )
);

-- Allow admin and monev to update
CREATE POLICY "ps-peta admin monev update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ps-peta' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'monev')
  )
);

-- Allow admin to delete
CREATE POLICY "ps-peta admin delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ps-peta' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Note: COMMENT ON TABLE storage.buckets requires owner permission, so it's commented out
-- COMMENT ON TABLE storage.buckets IS 'Storage buckets for PS files: ps-dokumen (documents), ps-galeri (photos), ps-peta (maps)';

-- Instructions for creating buckets manually:
-- 1. Open Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Create bucket "ps-dokumen":
--    - Name: ps-dokumen
--    - Public: Yes
--    - File size limit: 10 MB
--    - Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/jpeg, image/png, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
-- 4. Create bucket "ps-galeri":
--    - Name: ps-galeri
--    - Public: Yes
--    - File size limit: 5 MB
--    - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
-- 5. Create bucket "ps-peta":
--    - Name: ps-peta
--    - Public: Yes
--    - File size limit: 20 MB
--    - Allowed MIME types: application/json, application/geo+json, application/vnd.google-earth.kml+xml, application/vnd.google-earth.kmz, image/jpeg, image/png, application/pdf
