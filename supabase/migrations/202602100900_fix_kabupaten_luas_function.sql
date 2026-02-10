-- Fix: Correct ambiguous column reference in calculate_kabupaten_luas function
-- Date: 2026-02-10
-- Description: Fix PL/pgSQL function parameter naming conflict

-- Drop and recreate the calculate_kabupaten_luas function with correct parameter naming
CREATE OR REPLACE FUNCTION calculate_kabupaten_luas(target_kabupaten_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    kabupaten_nama VARCHAR(100);
    luas_kabupaten DECIMAL(12,2);
    luas_palangka_raya DECIMAL(12,2);
BEGIN
    -- Get kabupaten name
    SELECT nama INTO kabupaten_nama FROM kabupaten WHERE id = target_kabupaten_id;
    
    -- Calculate total luas from perhutanan_sosial for this kabupaten
    SELECT COALESCE(SUM(ps.luas_ha), 0) INTO luas_kabupaten
    FROM perhutanan_sosial ps
    WHERE ps.kabupaten_id = target_kabupaten_id;
    
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

-- Test the function with a sample kabupaten
DO $$
DECLARE
    test_id UUID;
    test_luas DECIMAL(12,2);
BEGIN
    -- Get a sample kabupaten ID
    SELECT id INTO test_id FROM kabupaten LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        test_luas := calculate_kabupaten_luas(test_id);
        RAISE NOTICE 'Test successful: Function returns % ha for kabupaten ID %', test_luas, test_id;
    ELSE
        RAISE NOTICE 'No kabupaten found for testing';
    END IF;
END $$;

-- Update all kabupaten luas using the fixed function
UPDATE kabupaten k
SET luas_total_ha = calculate_kabupaten_luas(k.id);

-- Output success message
DO $$
DECLARE
    total_kabupaten INTEGER;
    total_luas_all DECIMAL(12,2);
BEGIN
    SELECT COUNT(*) INTO total_kabupaten FROM kabupaten;
    SELECT COALESCE(SUM(luas_total_ha), 0) INTO total_luas_all FROM kabupaten;
    
    RAISE NOTICE 'Function fix complete:';
    RAISE NOTICE '- Fixed ambiguous column reference in calculate_kabupaten_luas';
    RAISE NOTICE '- Updated luas for % kabupaten', total_kabupaten;
    RAISE NOTICE '- Total luas all kabupaten: % ha', total_luas_all;
END $$;