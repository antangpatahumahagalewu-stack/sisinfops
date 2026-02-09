-- Migration: Add telephone columns to perhutanan_sosial table
-- Generated at: $(date)
-- This migration adds telephone number columns for ketua_ps and kepala_desa

BEGIN;

-- ======================
-- 1. Add telephone columns to perhutanan_sosial table
-- ======================
ALTER TABLE perhutanan_sosial 
ADD COLUMN IF NOT EXISTS telepon_ketua_ps VARCHAR(20),
ADD COLUMN IF NOT EXISTS telepon_kepala_desa VARCHAR(20);

-- ======================
-- 2. Add comments for the new columns
-- ======================
COMMENT ON COLUMN perhutanan_sosial.telepon_ketua_ps IS 'Telephone number of the PS chairperson (Ketua PS)';
COMMENT ON COLUMN perhutanan_sosial.telepon_kepala_desa IS 'Telephone number of the village head (Kepala Desa)';

-- ======================
-- 3. Update existing data (optional - set default values if needed)
-- ======================
-- Uncomment below if you want to set default values for existing records
-- UPDATE perhutanan_sosial 
-- SET telepon_ketua_ps = COALESCE(telepon_ketua_ps, ''),
--     telepon_kepala_desa = COALESCE(telepon_kepala_desa, '')
-- WHERE telepon_ketua_ps IS NULL OR telepon_kepala_desa IS NULL;

-- ======================
-- 4. Verify the migration
-- ======================
DO $$
DECLARE
    column_exists_ketua BOOLEAN;
    column_exists_kepala BOOLEAN;
BEGIN
    -- Check if columns were added successfully
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'perhutanan_sosial' 
        AND column_name = 'telepon_ketua_ps'
    ) INTO column_exists_ketua;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'perhutanan_sosial' 
        AND column_name = 'telepon_kepala_desa'
    ) INTO column_exists_kepala;
    
    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '- telepon_ketua_ps column added: %', 
        CASE WHEN column_exists_ketua THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '- telepon_kepala_desa column added: %', 
        CASE WHEN column_exists_kepala THEN '✅ YES' ELSE '❌ NO' END;
    
    IF column_exists_ketua AND column_exists_kepala THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Both telephone columns successfully added to perhutanan_sosial table.';
        RAISE NOTICE 'The table now has:';
        RAISE NOTICE '  • telepon_ketua_ps (VARCHAR(20)) - for PS chairperson telephone';
        RAISE NOTICE '  • telepon_kepala_desa (VARCHAR(20)) - for village head telephone';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ Some columns may not have been added. Please check the migration.';
    END IF;
END $$;

-- ======================
-- 5. Refresh schema cache
-- ======================
-- Notify PostgREST to refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;