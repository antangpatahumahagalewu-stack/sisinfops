-- Migration: Create storage buckets for PS files (Peta, Galeri, Dokumen, Shapefiles)
-- Generated at: 2026-02-05 07:38 AM
-- Create storage buckets for file uploads in Supabase Storage

BEGIN;

-- ======================
-- 1. Create storage buckets via SQL functions
-- Note: These require superuser permissions in Supabase
-- ======================

-- Create bucket for peta files (maps)
DO $$
BEGIN
    -- Check if bucket exists
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'ps-peta'
    ) THEN
        -- Create ps-peta bucket for map files
        INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
        VALUES (
            'ps-peta',
            'ps-peta',
            true, -- Set to false for RLS-controlled access
            ARRAY[
                'application/json',
                'application/geo+json',
                'application/vnd.google-earth.kml+xml',
                'application/vnd.google-earth.kmz',
                'image/jpeg',
                'image/png',
                'application/pdf',
                'application/octet-stream', -- For SHP files
                'application/zip', -- For SHP zipped files
                'application/x-zip-compressed'
            ],
            52428800 -- 50MB file size limit
        );
        RAISE NOTICE '✅ Created storage bucket: ps-peta';
    ELSE
        RAISE NOTICE 'ℹ️  Storage bucket ps-peta already exists';
    END IF;
END $$;

-- Create bucket for galeri files (images)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'ps-galeri'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
        VALUES (
            'ps-galeri',
            'ps-galeri',
            true,
            ARRAY[
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/svg+xml',
                'video/mp4',
                'video/mpeg',
                'video/quicktime'
            ],
            104857600 -- 100MB for videos
        );
        RAISE NOTICE '✅ Created storage bucket: ps-galeri';
    ELSE
        RAISE NOTICE 'ℹ️  Storage bucket ps-galeri already exists';
    END IF;
END $$;

-- Create bucket for dokumen files (documents)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'ps-dokumen'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
        VALUES (
            'ps-dokumen',
            'ps-dokumen',
            true,
            ARRAY[
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'application/rtf',
                'application/zip'
            ],
            10485760 -- 10MB for documents
        );
        RAISE NOTICE '✅ Created storage bucket: ps-dokumen';
    ELSE
        RAISE NOTICE 'ℹ️  Storage bucket ps-dokumen already exists';
    END IF;
END $$;

-- ======================
-- 2. Update tables to support SHP files and additional metadata
-- ======================

-- Add columns to ps_peta table for shapefile support
DO $$
BEGIN
    -- Add column for file type/mime type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_peta' 
        AND column_name = 'file_type'
    ) THEN
        ALTER TABLE ps_peta ADD COLUMN file_type VARCHAR(100);
        RAISE NOTICE '✅ Added file_type column to ps_peta';
    END IF;

    -- Add column for SHP metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_peta' 
        AND column_name = 'shp_metadata'
    ) THEN
        ALTER TABLE ps_peta ADD COLUMN shp_metadata JSONB;
        RAISE NOTICE '✅ Added shp_metadata column to ps_peta';
    END IF;

    -- Add column for projection/CRS
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_peta' 
        AND column_name = 'projection'
    ) THEN
        ALTER TABLE ps_peta ADD COLUMN projection VARCHAR(100);
        RAISE NOTICE '✅ Added projection column to ps_peta';
    END IF;

    -- Add column for bounding box
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_peta' 
        AND column_name = 'bounds'
    ) THEN
        ALTER TABLE ps_peta ADD COLUMN bounds JSONB;
        RAISE NOTICE '✅ Added bounds column to ps_peta';
    END IF;
END $$;

-- Add columns to ps_dokumen table for better file management
DO $$
BEGIN
    -- Add column for file type/mime type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_dokumen' 
        AND column_name = 'file_type'
    ) THEN
        ALTER TABLE ps_dokumen ADD COLUMN file_type VARCHAR(100);
        RAISE NOTICE '✅ Added file_type column to ps_dokumen';
    END IF;

    -- Add column for document version
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_dokumen' 
        AND column_name = 'version'
    ) THEN
        ALTER TABLE ps_dokumen ADD COLUMN version VARCHAR(20);
        RAISE NOTICE '✅ Added version column to ps_dokumen';
    END IF;

    -- Add column for effective date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_dokumen' 
        AND column_name = 'effective_date'
    ) THEN
        ALTER TABLE ps_dokumen ADD COLUMN effective_date DATE;
        RAISE NOTICE '✅ Added effective_date column to ps_dokumen';
    END IF;
END $$;

-- Add columns to ps_galeri table for better image management
DO $$
BEGIN
    -- Add column for image dimensions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_galeri' 
        AND column_name = 'image_dimensions'
    ) THEN
        ALTER TABLE ps_galeri ADD COLUMN image_dimensions JSONB;
        RAISE NOTICE '✅ Added image_dimensions column to ps_galeri';
    END IF;

    -- Add column for EXIF data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_galeri' 
        AND column_name = 'exif_data'
    ) THEN
        ALTER TABLE ps_galeri ADD COLUMN exif_data JSONB;
        RAISE NOTICE '✅ Added exif_data column to ps_galeri';
    END IF;

    -- Add column for image orientation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ps_galeri' 
        AND column_name = 'orientation'
    ) THEN
        ALTER TABLE ps_galeri ADD COLUMN orientation VARCHAR(20);
        RAISE NOTICE '✅ Added orientation column to ps_galeri';
    END IF;
END $$;

-- ======================
-- 3. Create RLS policies for storage buckets
-- ======================

-- Policies for ps-peta bucket
DO $$
BEGIN
    -- Policy for authenticated users to upload files
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'ps-peta' 
        AND name = 'Authenticated users can upload files'
    ) THEN
        CREATE POLICY "Authenticated users can upload files" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'ps-peta' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
        RAISE NOTICE '✅ Created upload policy for ps-peta';
    END IF;

    -- Policy for authenticated users to view files
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'ps-peta' 
        AND name = 'Authenticated users can view files'
    ) THEN
        CREATE POLICY "Authenticated users can view files" ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id = 'ps-peta');
        RAISE NOTICE '✅ Created view policy for ps-peta';
    END IF;

    -- Policy for admin users to delete files
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'ps-peta' 
        AND name = 'Admin users can delete files'
    ) THEN
        CREATE POLICY "Admin users can delete files" ON storage.objects
        FOR DELETE TO authenticated
        USING (
            bucket_id = 'ps-peta' AND
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'admin'
            )
        );
        RAISE NOTICE '✅ Created delete policy for ps-peta';
    END IF;
END $$;

-- Policies for ps-galeri bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'ps-galeri' 
        AND name = 'Authenticated users can upload to galeri'
    ) THEN
        CREATE POLICY "Authenticated users can upload to galeri" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'ps-galeri' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
        RAISE NOTICE '✅ Created upload policy for ps-galeri';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'ps-galeri' 
        AND name = 'Anyone can view galeri files'
    ) THEN
        CREATE POLICY "Anyone can view galeri files" ON storage.objects
        FOR SELECT TO authenticated, anon
        USING (bucket_id = 'ps-galeri');
        RAISE NOTICE '✅ Created view policy for ps-galeri';
    END IF;
END $$;

-- Policies for ps-dokumen bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'ps-dokumen' 
        AND name = 'Authenticated users can upload documents'
    ) THEN
        CREATE POLICY "Authenticated users can upload documents" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'ps-dokumen' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
        RAISE NOTICE '✅ Created upload policy for ps-dokumen';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'ps-dokumen' 
        AND name = 'Authenticated users can view documents'
    ) THEN
        CREATE POLICY "Authenticated users can view documents" ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id = 'ps-dokumen');
        RAISE NOTICE '✅ Created view policy for ps-dokumen';
    END IF;
END $$;

-- ======================
-- 4. Create function to extract SHP metadata
-- ======================
CREATE OR REPLACE FUNCTION extract_shp_metadata(
    p_file_url TEXT,
    p_file_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_metadata JSONB;
    v_file_ext TEXT;
BEGIN
    -- Initialize metadata
    v_metadata := '{}'::JSONB;
    v_file_ext := LOWER(SPLIT_PART(p_file_name, '.', -1));
    
    -- Extract basic file info
    v_metadata := v_metadata || jsonb_build_object(
        'file_name', p_file_name,
        'file_extension', v_file_ext,
        'is_shapefile', v_file_ext IN ('shp', 'shx', 'dbf', 'prj', 'cpg'),
        'extracted_at', NOW()
    );
    
    -- If it's a shapefile component, note which component
    IF v_file_ext = 'shp' THEN
        v_metadata := v_metadata || jsonb_build_object(
            'component_type', 'main_shapefile'
        );
    ELSIF v_file_ext = 'shx' THEN
        v_metadata := v_metadata || jsonb_build_object(
            'component_type', 'shape_index'
        );
    ELSIF v_file_ext = 'dbf' THEN
        v_metadata := v_metadata || jsonb_build_object(
            'component_type', 'attribute_table'
        );
    ELSIF v_file_ext = 'prj' THEN
        v_metadata := v_metadata || jsonb_build_object(
            'component_type', 'projection_file'
        );
    ELSIF v_file_ext = 'cpg' THEN
        v_metadata := v_metadata || jsonb_build_object(
            'component_type', 'codepage_file'
        );
    END IF;
    
    RETURN v_metadata;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'file_name', p_file_name
        );
END;
$$;

COMMENT ON FUNCTION extract_shp_metadata IS 'Extracts metadata from SHP file names and URLs';

-- ======================
-- 5. Create trigger to auto-update file metadata
-- ======================
CREATE OR REPLACE FUNCTION update_file_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set file_type based on file_name extension
    IF NEW.file_name IS NOT NULL THEN
        NEW.file_type := LOWER(SPLIT_PART(NEW.file_name, '.', -1));
    END IF;
    
    -- For peta files, extract SHP metadata if applicable
    IF TG_TABLE_NAME = 'ps_peta' AND NEW.file_name IS NOT NULL THEN
        NEW.shp_metadata := extract_shp_metadata(NEW.file_url, NEW.file_name);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply trigger to ps_peta
DROP TRIGGER IF EXISTS trigger_update_peta_metadata ON ps_peta;
CREATE TRIGGER trigger_update_peta_metadata
    BEFORE INSERT OR UPDATE ON ps_peta
    FOR EACH ROW
    EXECUTE FUNCTION update_file_metadata();

-- Apply trigger to ps_dokumen
DROP TRIGGER IF EXISTS trigger_update_dokumen_metadata ON ps_dokumen;
CREATE TRIGGER trigger_update_dokumen_metadata
    BEFORE INSERT OR UPDATE ON ps_dokumen
    FOR EACH ROW
    EXECUTE FUNCTION update_file_metadata();

-- Apply trigger to ps_galeri
DROP TRIGGER IF EXISTS trigger_update_galeri_metadata ON ps_galeri;
CREATE TRIGGER trigger_update_galeri_metadata
    BEFORE INSERT OR UPDATE ON ps_galeri
    FOR EACH ROW
    EXECUTE FUNCTION update_file_metadata();

-- ======================
-- 6. Verification and reporting
-- ======================
DO $$
DECLARE
    bucket_count INTEGER;
    peta_col_count INTEGER;
    dokumen_col_count INTEGER;
    galeri_col_count INTEGER;
BEGIN
    -- Count buckets
    SELECT COUNT(*) INTO bucket_count FROM storage.buckets 
    WHERE id IN ('ps-peta', 'ps-galeri', 'ps-dokumen');
    
    -- Check columns
    SELECT COUNT(*) INTO peta_col_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ps_peta';
    
    SELECT COUNT(*) INTO dokumen_col_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ps_dokumen';
    
    SELECT COUNT(*) INTO galeri_col_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ps_galeri';
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'STORAGE BUCKETS CREATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Storage buckets created/verified: %', bucket_count;
    RAISE NOTICE '  ✅ ps-peta (peta files - SHP, KML, GeoJSON, PDF, images)';
    RAISE NOTICE '  ✅ ps-galeri (gallery images/videos)';
    RAISE NOTICE '  ✅ ps-dokumen (documents - PDF, Word, Excel, etc.)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables updated with new columns:';
    RAISE NOTICE '  ✅ ps_peta: % columns (added file_type, shp_metadata, projection, bounds)', peta_col_count;
    RAISE NOTICE '  ✅ ps_dokumen: % columns (added file_type, version, effective_date)', dokumen_col_count;
    RAISE NOTICE '  ✅ ps_galeri: % columns (added image_dimensions, exif_data, orientation)', galeri_col_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '  ✅ Function: extract_shp_metadata()';
    RAISE NOTICE '  ✅ Trigger: auto-update file metadata on insert/update';
    RAISE NOTICE '  ✅ Storage policies for authenticated users';
    RAISE NOTICE '';
    RAISE NOTICE 'Supported file formats:';
    RAISE NOTICE '  • Peta: GeoJSON, KML, KMZ, SHP, JPG, PNG, PDF';
    RAISE NOTICE '  • Galeri: JPG, PNG, GIF, WebP, SVG, MP4, MPEG, QuickTime';
    RAISE NOTICE '  • Dokumen: PDF, Word, Excel, PowerPoint, TXT, RTF, ZIP';
    RAISE NOTICE '';
    RAISE NOTICE 'Shapefile (SHP) components supported:';
    RAISE NOTICE '  • .shp (main file) • .shx (index) • .dbf (attributes)';
    RAISE NOTICE '  • .prj (projection) • .cpg (codepage)';
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '⚠️  IMPORTANT MANUAL STEPS:';
    RAISE NOTICE '1. In Supabase Dashboard → Storage:';
    RAISE NOTICE '   - Verify buckets "ps-peta", "ps-galeri", "ps-dokumen" exist';
    RAISE NOTICE '   - Check public/private settings match your needs';
    RAISE NOTICE '2. Test file uploads from frontend forms';
    RAISE NOTICE '=========================================';
END $$;

-- ======================
-- 7. Refresh schema cache
-- ======================
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;