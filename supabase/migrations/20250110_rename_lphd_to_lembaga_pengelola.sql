-- Rename lphd table to lembaga_pengelola to support all PS schemas (guarded if table does not exist)
ALTER TABLE IF EXISTS lphd RENAME TO lembaga_pengelola;

-- Rename triggers
ALTER TRIGGER update_lphd_updated_at ON lembaga_pengelola RENAME TO update_lembaga_pengelola_updated_at;
ALTER TRIGGER audit_lphd ON lembaga_pengelola RENAME TO audit_lembaga_pengelola;

-- Rename index (guarded if index does not exist)
ALTER INDEX IF EXISTS idx_lphd_perhutanan_sosial RENAME TO idx_lembaga_pengelola_perhutanan_sosial;

-- Drop old RLS policies
DROP POLICY IF EXISTS "lphd readable by authenticated users" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lphd insertable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lphd updatable by admin and monev" ON lembaga_pengelola;
DROP POLICY IF EXISTS "lphd deletable by admin only" ON lembaga_pengelola;

-- Create new RLS policies with updated names
CREATE POLICY "lembaga_pengelola readable by authenticated users" ON lembaga_pengelola
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "lembaga_pengelola insertable by admin and monev" ON lembaga_pengelola
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "lembaga_pengelola updatable by admin and monev" ON lembaga_pengelola
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "lembaga_pengelola deletable by admin only" ON lembaga_pengelola
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Update table comment
COMMENT ON TABLE lembaga_pengelola IS 'Lembaga Pengelola untuk semua skema PS (LPHD, HKM, HA, HTR, Kemitraan, dll) yang terkait dengan perhutanan sosial records';

-- Clean incorrect LPHD prefix from lembaga names where skema is not Hutan Desa
UPDATE lembaga_pengelola lp
SET nama = TRIM(REGEXP_REPLACE(lp.nama, '^LPHD\s+', '', 'i'))
FROM perhutanan_sosial ps
WHERE lp.perhutanan_sosial_id = ps.id
  AND LOWER(ps.skema) NOT LIKE '%desa%'
  AND LOWER(lp.nama) LIKE 'lphd%';

