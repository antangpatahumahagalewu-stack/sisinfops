-- Migration: Add sync triggers for ketua_ps and kepala_desa columns
-- Date: 2026-01-31
-- Description: Add triggers to sync ketua_ps and kepala_desa between perhutanan_sosial and lembaga_pengelola
-- Note: Assumes columns ketua_ps and kepala_desa already exist in perhutanan_sosial table

-- 1. Create a function to sync ketua_ps and kepala_desa from lembaga_pengelola to perhutanan_sosial
CREATE OR REPLACE FUNCTION sync_ketua_kepala_to_ps()
RETURNS TRIGGER AS $$
BEGIN
    -- When lembaga_pengelola is inserted or updated, sync the data to perhutanan_sosial
    UPDATE perhutanan_sosial
    SET 
        ketua_ps = NEW.ketua,
        kepala_desa = NEW.kepala_desa,
        updated_at = NOW()
    WHERE id = NEW.perhutanan_sosial_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger to automatically sync data from lembaga_pengelola to perhutanan_sosial
DROP TRIGGER IF EXISTS sync_ketua_kepala_trigger ON lembaga_pengelola;
CREATE TRIGGER sync_ketua_kepala_trigger
    AFTER INSERT OR UPDATE OF ketua, kepala_desa ON lembaga_pengelola
    FOR EACH ROW
    EXECUTE FUNCTION sync_ketua_kepala_to_ps();

-- 3. Create a function to sync when perhutanan_sosial is updated (backward sync)
CREATE OR REPLACE FUNCTION sync_ketua_kepala_from_ps()
RETURNS TRIGGER AS $$
BEGIN
    -- When perhutanan_sosial ketua_ps or kepala_desa is updated, sync to lembaga_pengelola
    UPDATE lembaga_pengelola
    SET 
        ketua = NEW.ketua_ps,
        kepala_desa = NEW.kepala_desa,
        updated_at = NOW()
    WHERE perhutanan_sosial_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for backward sync
DROP TRIGGER IF EXISTS sync_ketua_kepala_from_ps_trigger ON perhutanan_sosial;
CREATE TRIGGER sync_ketua_kepala_from_ps_trigger
    AFTER INSERT OR UPDATE OF ketua_ps, kepala_desa ON perhutanan_sosial
    FOR EACH ROW
    EXECUTE FUNCTION sync_ketua_kepala_from_ps();

-- 5. Initialize existing data: sync from lembaga_pengelola to perhutanan_sosial for all records
UPDATE perhutanan_sosial ps
SET 
    ketua_ps = lp.ketua,
    kepala_desa = lp.kepala_desa,
    updated_at = NOW()
FROM lembaga_pengelola lp
WHERE ps.id = lp.perhutanan_sosial_id
AND (ps.ketua_ps IS DISTINCT FROM lp.ketua OR ps.kepala_desa IS DISTINCT FROM lp.kepala_desa);

-- Migration completed