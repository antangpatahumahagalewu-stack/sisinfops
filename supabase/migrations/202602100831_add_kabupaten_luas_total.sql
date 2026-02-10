-- Migration: Add luas_total_ha column to kabupaten table with automatic trigger
-- Date: 2026-02-10
-- Description: Add column to store total area per kabupaten, with automatic updates
-- Special logic: Pulang Pisau area includes Palangka Raya area

-- 1. Add luas_total_ha column to kabupaten table
ALTER TABLE kabupaten 
ADD COLUMN IF NOT EXISTS luas_total_ha DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN kabupaten.luas_total_ha IS 'Total luas (hektar) perhutanan sosial di kabupaten ini, dengan logika khusus: Pulang Pisau termasuk Palangka Raya';

-- 2. Create function to calculate luas for a specific kabupaten
CREATE OR REPLACE FUNCTION calculate_kabupaten_luas(kabupaten_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    kabupaten_nama VARCHAR(100);
    luas_kabupaten DECIMAL(12,2);
    luas_palangka_raya DECIMAL(12,2);
BEGIN
    -- Get kabupaten name
    SELECT nama INTO kabupaten_nama FROM kabupaten WHERE id = kabupaten_id;
    
    -- Calculate total luas from perhutanan_sosial for this kabupaten
    SELECT COALESCE(SUM(ps.luas_ha), 0) INTO luas_kabupaten
    FROM perhutanan_sosial ps
    WHERE ps.kabupaten_id = kabupaten_id;
    
    -- SPECIAL LOGIC: If this is Pulang Pisau, add Palangka Raya area
    IF kabupaten_nama = 'Kabupaten Pulang Pisau' THEN
        -- Get Palangka Raya area
        SELECT COALESCE(SUM(ps.luas_ha), 0) INTO luas_palangka_raya
        FROM perhutanan_sosial ps
        JOIN kabupaten k ON ps.kabupaten_id = k.id
        WHERE k.nama = 'Kotamadya Palangka Raya';
        
        RETURN COALESCE(luas_kabupaten, 0) + COALESCE(luas_palangka_raya, 0);
    END IF;
    
    -- For other kabupaten, just return their own area
    RETURN COALESCE(luas_kabupaten, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to update luas_total_ha for all kabupaten
CREATE OR REPLACE FUNCTION update_all_kabupaten_luas()
RETURNS void AS $$
DECLARE
    kab_record RECORD;
BEGIN
    FOR kab_record IN SELECT id, nama FROM kabupaten LOOP
        UPDATE kabupaten 
        SET luas_total_ha = calculate_kabupaten_luas(kab_record.id)
        WHERE id = kab_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to update luas_total_ha when perhutanan_sosial changes
CREATE OR REPLACE FUNCTION update_kabupaten_luas_on_ps_change()
RETURNS TRIGGER AS $$
DECLARE
    affected_kabupaten_ids UUID[];
    kabupaten_id UUID;
    kabupaten_nama VARCHAR(100);
BEGIN
    -- Collect all affected kabupaten IDs
    affected_kabupaten_ids := '{}';
    
    -- Handle INSERT/UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.kabupaten_id IS NOT NULL THEN
            affected_kabupaten_ids := array_append(affected_kabupaten_ids, NEW.kabupaten_id);
        END IF;
        -- Also handle OLD kabupaten_id if UPDATE and it changed
        IF TG_OP = 'UPDATE' AND OLD.kabupaten_id IS NOT NULL AND OLD.kabupaten_id != NEW.kabupaten_id THEN
            affected_kabupaten_ids := array_append(affected_kabupaten_ids, OLD.kabupaten_id);
        END IF;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.kabupaten_id IS NOT NULL THEN
            affected_kabupaten_ids := array_append(affected_kabupaten_ids, OLD.kabupaten_id);
        END IF;
    END IF;
    
    -- Also need to update Pulang Pisau if Palangka Raya is affected, and vice versa
    -- For simplicity, we'll just update all kabupaten for now
    -- But we need to handle the special case
    PERFORM update_all_kabupaten_luas();
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger on perhutanan_sosial table
DROP TRIGGER IF EXISTS trg_update_kabupaten_luas ON perhutanan_sosial;
CREATE TRIGGER trg_update_kabupaten_luas
AFTER INSERT OR UPDATE OR DELETE ON perhutanan_sosial
FOR EACH ROW
EXECUTE FUNCTION update_kabupaten_luas_on_ps_change();

-- 6. Initialize data: calculate luas for all kabupaten
SELECT update_all_kabupaten_luas();

-- 7. Create view for carbon projects dashboard (filtered by kabupaten with carbon projects)
CREATE OR REPLACE VIEW v_carbon_projects_kabupaten_luas AS
SELECT 
    k.id,
    k.nama,
    k.luas_total_ha,
    EXISTS (
        SELECT 1 FROM carbon_projects cp
        JOIN perhutanan_sosial ps ON cp.ps_id = ps.id
        WHERE ps.kabupaten_id = k.id
    ) as has_carbon_project
FROM kabupaten k
ORDER BY k.nama;

-- 8. Create function to get total luas for kabupaten with carbon projects
CREATE OR REPLACE FUNCTION get_total_luas_kabupaten_with_carbon_projects()
RETURNS DECIMAL(12,2) AS $$
DECLARE
    total_luas DECIMAL(12,2);
BEGIN
    SELECT COALESCE(SUM(k.luas_total_ha), 0) INTO total_luas
    FROM kabupaten k
    WHERE EXISTS (
        SELECT 1 FROM carbon_projects cp
        JOIN perhutanan_sosial ps ON cp.ps_id = ps.id
        WHERE ps.kabupaten_id = k.id
    );
    
    RETURN total_luas;
END;
$$ LANGUAGE plpgsql;

-- 9. Output success message
DO $$
DECLARE
    total_kabupaten INTEGER;
    total_luas_all DECIMAL(12,2);
    total_luas_with_carbon DECIMAL(12,2);
BEGIN
    SELECT COUNT(*) INTO total_kabupaten FROM kabupaten;
    SELECT COALESCE(SUM(luas_total_ha), 0) INTO total_luas_all FROM kabupaten;
    SELECT get_total_luas_kabupaten_with_carbon_projects() INTO total_luas_with_carbon;
    
    RAISE NOTICE 'Kabupaten Luas Migration Complete:';
    RAISE NOTICE '- Added luas_total_ha column to kabupaten table';
    RAISE NOTICE '- Created automatic trigger for luas updates';
    RAISE NOTICE '- Initialized luas data for % kabupaten', total_kabupaten;
    RAISE NOTICE '- Total luas all kabupaten: % ha', total_luas_all;
    RAISE NOTICE '- Total luas kabupaten with carbon projects: % ha', total_luas_with_carbon;
    RAISE NOTICE '- Special logic: Pulang Pisau includes Palangka Raya area';
    RAISE NOTICE '- View created: v_carbon_projects_kabupaten_luas';
END $$;

-- 10. Grant permissions
GRANT SELECT ON v_carbon_projects_kabupaten_luas TO authenticated;