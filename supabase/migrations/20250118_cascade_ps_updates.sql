-- Migration: Cascading Updates for PS Profile
-- This migration ensures that when PS profile data is updated,
-- all related data throughout the database is automatically updated

-- Function to generate lembaga name based on skema and pemegang_izin
CREATE OR REPLACE FUNCTION generate_lembaga_name(skema TEXT, pemegang_izin TEXT)
RETURNS TEXT AS $$
DECLARE
  skema_lower TEXT;
BEGIN
  skema_lower := LOWER(COALESCE(skema, ''));
  
  IF skema_lower LIKE '%desa%' OR skema_lower LIKE '%lphd%' THEN
    RETURN 'LPHD ' || pemegang_izin;
  ELSIF skema_lower LIKE '%kemasyarakatan%' OR skema_lower LIKE '%hkm%' THEN
    RETURN 'KUPS ' || pemegang_izin;
  ELSIF skema_lower LIKE '%tanaman%' OR skema_lower LIKE '%htr%' THEN
    RETURN 'KTH ' || pemegang_izin;
  ELSIF skema_lower LIKE '%adat%' OR skema_lower LIKE '%ha%' THEN
    RETURN 'Lembaga Adat ' || pemegang_izin;
  ELSIF skema_lower LIKE '%kemitraan%' THEN
    RETURN 'Lembaga Pengelola ' || pemegang_izin;
  ELSE
    RETURN 'Lembaga Pengelola ' || pemegang_izin;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean lembaga name (remove incorrect prefixes)
CREATE OR REPLACE FUNCTION clean_lembaga_name(nama TEXT, skema TEXT)
RETURNS TEXT AS $$
DECLARE
  skema_lower TEXT;
  nama_lower TEXT;
  cleaned_nama TEXT;
BEGIN
  IF nama IS NULL OR nama = '' THEN
    RETURN NULL;
  END IF;
  
  skema_lower := LOWER(COALESCE(skema, ''));
  nama_lower := LOWER(COALESCE(nama, ''));
  cleaned_nama := nama;
  
  -- Remove incorrect LPHD prefix if skema is not Hutan Desa
  IF skema_lower NOT LIKE '%desa%' AND skema_lower NOT LIKE '%lphd%' THEN
    IF nama_lower LIKE 'lphd%' THEN
      cleaned_nama := TRIM(REGEXP_REPLACE(cleaned_nama, '^LPHD\s+', '', 'i'));
    END IF;
  END IF;
  
  RETURN cleaned_nama;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to cascade updates from perhutanan_sosial to lembaga_pengelola
CREATE OR REPLACE FUNCTION cascade_ps_to_lembaga_update()
RETURNS TRIGGER AS $$
DECLARE
  existing_lembaga RECORD;
  new_nama TEXT;
  should_update_nama BOOLEAN := FALSE;
BEGIN
  -- Check if lembaga_pengelola exists for this PS
  SELECT * INTO existing_lembaga
  FROM lembaga_pengelola
  WHERE perhutanan_sosial_id = NEW.id;
  
  -- Determine if we need to update nama lembaga
  -- Update if skema or pemegang_izin changed
  IF (OLD.skema IS DISTINCT FROM NEW.skema) OR 
     (OLD.pemegang_izin IS DISTINCT FROM NEW.pemegang_izin) THEN
    should_update_nama := TRUE;
    new_nama := generate_lembaga_name(NEW.skema, NEW.pemegang_izin);
  END IF;
  
  -- If lembaga_pengelola exists, update it
  IF existing_lembaga IS NOT NULL THEN
    -- Update lembaga_pengelola
    UPDATE lembaga_pengelola
    SET
      -- Update nama if skema or pemegang_izin changed
      nama = CASE 
        WHEN should_update_nama THEN new_nama
        ELSE clean_lembaga_name(existing_lembaga.nama, NEW.skema)
      END,
      -- Sync jumlah_anggota with jumlah_kk if jumlah_kk changed
      jumlah_anggota = CASE
        WHEN OLD.jumlah_kk IS DISTINCT FROM NEW.jumlah_kk THEN NEW.jumlah_kk
        ELSE existing_lembaga.jumlah_anggota
      END,
      updated_at = NOW()
    WHERE perhutanan_sosial_id = NEW.id;
  ELSE
    -- If lembaga_pengelola doesn't exist, create it
    INSERT INTO lembaga_pengelola (
      perhutanan_sosial_id,
      nama,
      jumlah_anggota,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      generate_lembaga_name(NEW.skema, NEW.pemegang_izin),
      COALESCE(NEW.jumlah_kk, 0),
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to cascade updates
DROP TRIGGER IF EXISTS cascade_ps_to_lembaga_update_trigger ON perhutanan_sosial;
CREATE TRIGGER cascade_ps_to_lembaga_update_trigger
  AFTER UPDATE ON perhutanan_sosial
  FOR EACH ROW
  WHEN (
    -- Only trigger if relevant fields changed
    OLD.skema IS DISTINCT FROM NEW.skema OR
    OLD.pemegang_izin IS DISTINCT FROM NEW.pemegang_izin OR
    OLD.jumlah_kk IS DISTINCT FROM NEW.jumlah_kk
  )
  EXECUTE FUNCTION cascade_ps_to_lembaga_update();

-- Function to sync updated_at across related tables
-- This ensures all related data has consistent timestamps
CREATE OR REPLACE FUNCTION sync_ps_related_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Update updated_at for all related tables when PS is updated
  -- Note: This is a lightweight operation that just touches the updated_at
  -- We don't update the actual data here, just the timestamp for tracking
  
  -- Update lembaga_pengelola updated_at
  UPDATE lembaga_pengelola
  SET updated_at = NEW.updated_at
  WHERE perhutanan_sosial_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync updated_at (runs after the cascade trigger)
DROP TRIGGER IF EXISTS sync_ps_related_updated_at_trigger ON perhutanan_sosial;
CREATE TRIGGER sync_ps_related_updated_at_trigger
  AFTER UPDATE ON perhutanan_sosial
  FOR EACH ROW
  EXECUTE FUNCTION sync_ps_related_updated_at();

-- Add comments for documentation
COMMENT ON FUNCTION generate_lembaga_name(TEXT, TEXT) IS 
  'Generates lembaga name based on skema and pemegang_izin following naming conventions';

COMMENT ON FUNCTION clean_lembaga_name(TEXT, TEXT) IS 
  'Cleans lembaga name by removing incorrect prefixes based on skema';

COMMENT ON FUNCTION cascade_ps_to_lembaga_update() IS 
  'Automatically updates lembaga_pengelola when perhutanan_sosial is updated. Updates nama when skema or pemegang_izin changes, and syncs jumlah_anggota with jumlah_kk.';

COMMENT ON FUNCTION sync_ps_related_updated_at() IS 
  'Syncs updated_at timestamp across all related tables when PS is updated';

-- Update existing data to ensure consistency
-- Fix any lembaga names that don't match their skema
UPDATE lembaga_pengelola lp
SET 
  nama = generate_lembaga_name(ps.skema, ps.pemegang_izin),
  jumlah_anggota = COALESCE(ps.jumlah_kk, lp.jumlah_anggota, 0),
  updated_at = NOW()
FROM perhutanan_sosial ps
WHERE lp.perhutanan_sosial_id = ps.id
  AND (
    -- Update if nama doesn't match expected pattern
    lp.nama IS NULL 
    OR lp.nama = ''
    OR (
      -- Check if nama should have prefix but doesn't, or has wrong prefix
      (LOWER(ps.skema) LIKE '%desa%' AND LOWER(lp.nama) NOT LIKE 'lphd%')
      OR (LOWER(ps.skema) LIKE '%kemasyarakatan%' AND LOWER(lp.nama) NOT LIKE 'kups%')
      OR (LOWER(ps.skema) LIKE '%tanaman%' AND LOWER(lp.nama) NOT LIKE 'kth%')
      OR (LOWER(ps.skema) LIKE '%adat%' AND LOWER(lp.nama) NOT LIKE '%adat%')
    )
  );

-- Create indexes if they don't exist for better performance
CREATE INDEX IF NOT EXISTS idx_lembaga_pengelola_perhutanan_sosial_id 
  ON lembaga_pengelola(perhutanan_sosial_id);

-- Add comment to migration
COMMENT ON SCHEMA public IS 'Schema updated with cascading PS profile updates - all related data automatically syncs when PS profile changes';

