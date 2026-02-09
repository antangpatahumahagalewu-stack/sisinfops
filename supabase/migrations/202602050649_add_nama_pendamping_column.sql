-- Migration: Add nama_pendamping column to perhutanan_sosial table
-- Generated at: 2026-02-05 06:49 AM
-- This migration adds nama_pendamping column for tracking individual facilitator/pendamping

BEGIN;

-- ======================
-- 1. Add nama_pendamping column to perhutanan_sosial table
-- ======================
ALTER TABLE perhutanan_sosial 
ADD COLUMN IF NOT EXISTS nama_pendamping VARCHAR(100);

-- ======================
-- 2. Add comment for the new column
-- ======================
COMMENT ON COLUMN perhutanan_sosial.nama_pendamping IS 'Nama individu pendamping (person) yang mendampingi PS (bukan organisasi fasilitator)';

-- ======================
-- 3. Update existing data (optional - copy from fasilitator if needed)
-- ======================
-- Note: We don't copy from fasilitator because fasilitator is organization, nama_pendamping is person
-- If you want to migrate existing data, you can run:
-- UPDATE perhutanan_sosial 
-- SET nama_pendamping = fasilitator
-- WHERE nama_pendamping IS NULL AND fasilitator IS NOT NULL;

-- ======================
-- 4. Verify the migration
-- ======================
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if column was added successfully
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'perhutanan_sosial' 
        AND column_name = 'nama_pendamping'
    ) INTO column_exists;
    
    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '- nama_pendamping column added: %', 
        CASE WHEN column_exists THEN '✅ YES' ELSE '❌ NO' END;
    
    IF column_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ nama_pendamping column successfully added to perhutanan_sosial table.';
        RAISE NOTICE 'Column details:';
        RAISE NOTICE '  • nama_pendamping (VARCHAR(100)) - for individual facilitator name';
        RAISE NOTICE '  • Optional (NULL allowed)';
        RAISE NOTICE '  • Different from fasilitator (organization)';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ Column may not have been added. Please check the migration.';
    END IF;
END $$;

-- ======================
-- 5. Refresh schema cache
-- ======================
-- Notify PostgREST to refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;