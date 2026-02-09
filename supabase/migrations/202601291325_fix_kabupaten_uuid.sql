-- Migration: Fix kabupaten UUIDs to match existing data references
-- Generated at: 2026-01-29 13:25 PM
-- This migration ensures kabupaten table has the correct UUIDs that are referenced in perhutanan_sosial and potensi tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, create a temporary table with the correct UUID mapping
CREATE TEMPORARY TABLE kabupaten_mapping (
    id UUID PRIMARY KEY,
    nama VARCHAR(100) NOT NULL
);

-- Insert the known UUID mappings (from cleanup-duplicates.js and data analysis)
INSERT INTO kabupaten_mapping (id, nama) VALUES
    -- These UUIDs are referenced in perhutanan_sosial_rows.sql and potensi_rows.sql
    ('17ae5cc0-5c49-425f-801f-77b3341a5460', 'Kabupaten Gunung Mas'),
    ('70e0c5f1-fc72-48b5-aa97-a22bfe915689', 'Kabupaten Kapuas'),
    ('c602e5e9-01ee-410f-bf0b-f7b1991f7608', 'Kabupaten Katingan'),
    ('f1a733b0-1ac9-49ea-818a-540de16dd66d', 'Kabupaten Pulang Pisau'),
    ('5d265f09-9362-4215-91c3-bb055cd59d0d', 'KABUPATEN PALANGKA RAYA')  -- Found in perhutanan_sosial data
ON CONFLICT (id) DO NOTHING;

-- Step 1: Disable foreign key constraints temporarily (if needed)
-- Note: We'll handle updates without disabling constraints if possible

-- Step 2: Update or insert kabupaten records with correct UUIDs
-- First, insert any missing kabupaten from our mapping
INSERT INTO kabupaten (id, nama, created_at)
SELECT 
    km.id, 
    km.nama,
    NOW()
FROM kabupaten_mapping km
WHERE NOT EXISTS (SELECT 1 FROM kabupaten k WHERE k.id = km.id)
ON CONFLICT (id) DO NOTHING;

-- Step 3: For kabupaten that exist with different IDs but same name, we need to handle them
-- This is complex because we can't update primary keys easily.
-- Instead, we'll update the references in child tables to use the correct UUIDs.

-- Update perhutanan_sosial table to use correct kabupaten_id
UPDATE perhutanan_sosial ps
SET kabupaten_id = km.id
FROM kabupaten_mapping km
WHERE ps.kabupaten_id IN (
    -- Find kabupaten IDs that don't match our mapping but have the same name
    SELECT k.id FROM kabupaten k
    WHERE EXISTS (
        SELECT 1 FROM kabupaten_mapping km2 
        WHERE km2.nama = k.nama AND km2.id != k.id
    )
) AND EXISTS (
    SELECT 1 FROM kabupaten k
    WHERE k.id = ps.kabupaten_id 
    AND k.nama = km.nama
);

-- Update potensi table to use correct kabupaten_id
UPDATE potensi p
SET kabupaten_id = km.id
FROM kabupaten_mapping km
WHERE p.kabupaten_id IN (
    -- Find kabupaten IDs that don't match our mapping but have the same name
    SELECT k.id FROM kabupaten k
    WHERE EXISTS (
        SELECT 1 FROM kabupaten_mapping km2 
        WHERE km2.nama = k.nama AND km2.id != k.id
    )
) AND EXISTS (
    SELECT 1 FROM kabupaten k
    WHERE k.id = p.kabupaten_id 
    AND k.nama = km.nama
);

-- Step 4: Delete old kabupaten records that are no longer referenced
-- Only delete if they have no references in child tables
DELETE FROM kabupaten k
WHERE k.id IN (
    -- Find kabupaten IDs that don't match our mapping
    SELECT k.id FROM kabupaten k
    WHERE NOT EXISTS (
        SELECT 1 FROM kabupaten_mapping km 
        WHERE km.id = k.id
    )
) AND NOT EXISTS (
    SELECT 1 FROM perhutanan_sosial ps 
    WHERE ps.kabupaten_id = k.id
) AND NOT EXISTS (
    SELECT 1 FROM potensi p 
    WHERE p.kabupaten_id = k.id
);

-- Step 5: Insert any remaining kabupaten that might be missing
-- These are kabupaten that are referenced but not in our mapping
-- We'll insert them with new UUIDs
INSERT INTO kabupaten (id, nama, created_at)
SELECT 
    COALESCE(ps.kabupaten_id, uuid_generate_v4()),
    -- Try to guess the kabupaten name from the data
    CASE 
        WHEN ps.kecamatan ILIKE '%gunung mas%' OR ps.kecamatan ILIKE '%gumas%' THEN 'Kabupaten Gunung Mas'
        WHEN ps.kecamatan ILIKE '%kapuas%' THEN 'Kabupaten Kapuas'
        WHEN ps.kecamatan ILIKE '%katingan%' OR ps.kecamatan ILIKE '%ktg%' THEN 'Kabupaten Katingan'
        WHEN ps.kecamatan ILIKE '%pulang pisau%' OR ps.kecamatan ILIKE '%pulpis%' THEN 'Kabupaten Pulang Pisau'
        ELSE 'Unknown Kabupaten'
    END,
    NOW()
FROM perhutanan_sosial ps
WHERE ps.kabupaten_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kabupaten k WHERE k.id = ps.kabupaten_id)
GROUP BY ps.kabupaten_id
ON CONFLICT (id) DO NOTHING;

-- Step 6: Verify the data
DO $$
DECLARE
    missing_refs INTEGER;
BEGIN
    -- Check for any perhutanan_sosial records with kabupaten_id not in kabupaten table
    SELECT COUNT(*) INTO missing_refs
    FROM perhutanan_sosial ps
    WHERE ps.kabupaten_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM kabupaten k WHERE k.id = ps.kabupaten_id);
    
    IF missing_refs > 0 THEN
        RAISE WARNING 'Found % perhutanan_sosial records with missing kabupaten references', missing_refs;
    ELSE
        RAISE NOTICE '✓ All perhutanan_sosial records have valid kabupaten references';
    END IF;
    
    -- Check for any potensi records with kabupaten_id not in kabupaten table
    SELECT COUNT(*) INTO missing_refs
    FROM potensi p
    WHERE p.kabupaten_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM kabupaten k WHERE k.id = p.kabupaten_id);
    
    IF missing_refs > 0 THEN
        RAISE WARNING 'Found % potensi records with missing kabupaten references', missing_refs;
    ELSE
        RAISE NOTICE '✓ All potensi records have valid kabupaten references';
    END IF;
    
    -- List all kabupaten
    RAISE NOTICE 'Kabupaten in database:';
    FOR r IN (SELECT id, nama FROM kabupaten ORDER BY nama) LOOP
        RAISE NOTICE '  - % (ID: %)', r.nama, r.id;
    END LOOP;
END $$;

-- Clean up temporary table
DROP TABLE kabupaten_mapping;

-- Final verification
SELECT 'Migration completed. Check warnings above if any.' AS status;