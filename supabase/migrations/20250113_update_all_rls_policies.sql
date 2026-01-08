-- Update all RLS policies to use check_user_role() function
-- This prevents infinite recursion and makes policies more maintainable
-- 
-- IMPORTANT: This migration requires check_user_role() function from 20250112_fix_rls_recursion.sql
-- Make sure that migration has been run first!

-- ============================================================================
-- Update perhutanan_sosial policies
-- ============================================================================

DROP POLICY IF EXISTS "PS insertable by admin and monev" ON perhutanan_sosial;
DROP POLICY IF EXISTS "PS updatable by admin and monev" ON perhutanan_sosial;
DROP POLICY IF EXISTS "PS deletable by admin only" ON perhutanan_sosial;

CREATE POLICY "PS insertable by admin and monev" ON perhutanan_sosial
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "PS updatable by admin and monev" ON perhutanan_sosial
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "PS deletable by admin only" ON perhutanan_sosial
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Update potensi policies
-- ============================================================================

DROP POLICY IF EXISTS "Potensi insertable by admin and monev" ON potensi;
DROP POLICY IF EXISTS "Potensi updatable by admin and monev" ON potensi;
DROP POLICY IF EXISTS "Potensi deletable by admin only" ON potensi;

CREATE POLICY "Potensi insertable by admin and monev" ON potensi
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "Potensi updatable by admin and monev" ON potensi
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "Potensi deletable by admin only" ON potensi
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Update ps_dokumen policies
-- ============================================================================

DROP POLICY IF EXISTS "ps_dokumen insertable by admin and monev" ON ps_dokumen;
DROP POLICY IF EXISTS "ps_dokumen updatable by admin and monev" ON ps_dokumen;
DROP POLICY IF EXISTS "ps_dokumen deletable by admin only" ON ps_dokumen;

CREATE POLICY "ps_dokumen insertable by admin and monev" ON ps_dokumen
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_dokumen updatable by admin and monev" ON ps_dokumen
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_dokumen deletable by admin only" ON ps_dokumen
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Update ps_kegiatan policies
-- ============================================================================

DROP POLICY IF EXISTS "ps_kegiatan insertable by admin and monev" ON ps_kegiatan;
DROP POLICY IF EXISTS "ps_kegiatan updatable by admin and monev" ON ps_kegiatan;
DROP POLICY IF EXISTS "ps_kegiatan deletable by admin only" ON ps_kegiatan;

CREATE POLICY "ps_kegiatan insertable by admin and monev" ON ps_kegiatan
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_kegiatan updatable by admin and monev" ON ps_kegiatan
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_kegiatan deletable by admin only" ON ps_kegiatan
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Update ps_galeri policies
-- ============================================================================

DROP POLICY IF EXISTS "ps_galeri insertable by admin and monev" ON ps_galeri;
DROP POLICY IF EXISTS "ps_galeri updatable by admin and monev" ON ps_galeri;
DROP POLICY IF EXISTS "ps_galeri deletable by admin only" ON ps_galeri;

CREATE POLICY "ps_galeri insertable by admin and monev" ON ps_galeri
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_galeri updatable by admin and monev" ON ps_galeri
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_galeri deletable by admin only" ON ps_galeri
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Update ps_catatan policies
-- ============================================================================

DROP POLICY IF EXISTS "ps_catatan insertable by admin and monev" ON ps_catatan;
DROP POLICY IF EXISTS "ps_catatan updatable by admin and monev" ON ps_catatan;
DROP POLICY IF EXISTS "ps_catatan deletable by admin only" ON ps_catatan;

CREATE POLICY "ps_catatan insertable by admin and monev" ON ps_catatan
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_catatan updatable by admin and monev" ON ps_catatan
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_catatan deletable by admin only" ON ps_catatan
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Update ps_peta policies
-- ============================================================================

DROP POLICY IF EXISTS "ps_peta insertable by admin and monev" ON ps_peta;
DROP POLICY IF EXISTS "ps_peta updatable by admin and monev" ON ps_peta;
DROP POLICY IF EXISTS "ps_peta deletable by admin only" ON ps_peta;

CREATE POLICY "ps_peta insertable by admin and monev" ON ps_peta
  FOR INSERT WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_peta updatable by admin and monev" ON ps_peta
  FOR UPDATE 
  USING (check_user_role(ARRAY['admin', 'monev']))
  WITH CHECK (check_user_role(ARRAY['admin', 'monev']));

CREATE POLICY "ps_peta deletable by admin only" ON ps_peta
  FOR DELETE USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Update audit_log policies
-- ============================================================================

DROP POLICY IF EXISTS "Audit log readable by admin only" ON audit_log;

CREATE POLICY "Audit log readable by admin only" ON audit_log
  FOR SELECT USING (check_user_role(ARRAY['admin']));

-- ============================================================================
-- Note: lembaga_pengelola policies are already updated in 20250112_fix_rls_recursion.sql
-- ============================================================================

