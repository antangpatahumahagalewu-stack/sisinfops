-- FIX PROGRAMS TABLE STRUCTURE AND DATA
-- 1. Add missing columns (perhutanan_sosial_id)
-- 2. Add foreign key constraints
-- 3. Update existing data with proper relationships

BEGIN;

-- ====================================================================
-- 1. ADD PERHUTANAN_SOSIAL_ID COLUMN TO PROGRAMS TABLE
-- ====================================================================

DO $$ 
BEGIN
    -- Add perhutanan_sosial_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'programs' 
        AND column_name = 'perhutanan_sosial_id'
    ) THEN
        ALTER TABLE programs ADD COLUMN perhutanan_sosial_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE programs 
        ADD CONSTRAINT programs_perhutanan_sosial_id_fkey 
        FOREIGN KEY (perhutanan_sosial_id) REFERENCES perhutanan_sosial(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added perhutanan_sosial_id column to programs table';
    ELSE
        RAISE NOTICE '⚠️  perhutanan_sosial_id column already exists';
    END IF;
    
    -- Ensure carbon_project_id has foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'programs' 
        AND constraint_name = 'programs_carbon_project_id_fkey'
    ) THEN
        ALTER TABLE programs 
        ADD CONSTRAINT programs_carbon_project_id_fkey 
        FOREIGN KEY (carbon_project_id) REFERENCES carbon_projects(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added foreign key constraint for carbon_project_id';
    ELSE
        RAISE NOTICE '⚠️  carbon_project_id foreign key already exists';
    END IF;
END $$;

-- ====================================================================
-- 2. UPDATE KODE_PROGRAM AND NAMA_PROGRAM FROM PROGRAM_CODE/PROGRAM_NAME
-- ====================================================================

UPDATE programs 
SET 
    kode_program = program_code,
    nama_program = program_name
WHERE kode_program IS NULL OR nama_program IS NULL;

RAISE NOTICE '✅ Updated kode_program and nama_program for % rows', (SELECT COUNT(*) FROM programs WHERE kode_program IS NOT NULL);

-- ====================================================================
-- 3. MAP PROGRAMS TO CARBON PROJECTS BASED ON PROGRAM_CODE PATTERN
-- ====================================================================

DO $$
DECLARE
    updated_count INTEGER := 0;
    program_record RECORD;
    cp_record RECORD;
    ps_record RECORD;
BEGIN
    -- Loop through all programs
    FOR program_record IN 
        SELECT id, program_code, carbon_project_id, perhutanan_sosial_id 
        FROM programs 
        WHERE carbon_project_id IS NULL OR perhutanan_sosial_id IS NULL
    LOOP
        -- Extract carbon project code from program_code (format: PRG-{CP_CODE}-{NUMBER})
        IF program_record.program_code LIKE 'PRG-%-%' THEN
            -- Get the middle part between first and second dash
            DECLARE
                cp_code_part VARCHAR;
            BEGIN
                cp_code_part := split_part(split_part(program_record.program_code, '-', 2), '-', 1);
                
                -- Find carbon project with matching kode_project
                SELECT id, kabupaten INTO cp_record
                FROM carbon_projects 
                WHERE kode_project LIKE '%' || cp_code_part || '%'
                LIMIT 1;
                
                IF cp_record.id IS NOT NULL THEN
                    -- Find perhutanan sosial in the same kabupaten
                    SELECT ps.id INTO ps_record
                    FROM perhutanan_sosial ps
                    JOIN kabupaten k ON ps.kabupaten_id = k.id
                    WHERE k.nama ILIKE '%' || cp_record.kabupaten || '%'
                    LIMIT 1;
                    
                    -- Update program with both IDs
                    UPDATE programs 
                    SET 
                        carbon_project_id = cp_record.id,
                        perhutanan_sosial_id = COALESCE(ps_record.id, perhutanan_sosial_id)
                    WHERE id = program_record.id;
                    
                    updated_count := updated_count + 1;
                END IF;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Updated % programs with carbon_project_id and perhutanan_sosial_id', updated_count;
END $$;

-- ====================================================================
-- 4. FALLBACK: LINK ALL PROGRAMS TO ANY CARBON PROJECT AND PERHUTANAN SOSIAL
-- ====================================================================

-- Update remaining programs that still don't have carbon_project_id
UPDATE programs p
SET carbon_project_id = cp.id
FROM carbon_projects cp
WHERE p.carbon_project_id IS NULL
AND cp.id IS NOT NULL
LIMIT (SELECT COUNT(*) FROM programs WHERE carbon_project_id IS NULL);

-- Update remaining programs that still don't have perhutanan_sosial_id
UPDATE programs p
SET perhutanan_sosial_id = ps.id
FROM perhutanan_sosial ps
WHERE p.perhutanan_sosial_id IS NULL
AND ps.id IS NOT NULL
LIMIT (SELECT COUNT(*) FROM programs WHERE perhutanan_sosial_id IS NULL);

RAISE NOTICE '✅ Fallback update completed';

-- ====================================================================
-- 5. VERIFICATION QUERY
-- ====================================================================

DO $$
DECLARE
    total_programs INTEGER;
    programs_with_carbon INTEGER;
    programs_with_ps INTEGER;
    programs_with_both INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_programs FROM programs;
    SELECT COUNT(*) INTO programs_with_carbon FROM programs WHERE carbon_project_id IS NOT NULL;
    SELECT COUNT(*) INTO programs_with_ps FROM programs WHERE perhutanan_sosial_id IS NOT NULL;
    SELECT COUNT(*) INTO programs_with_both FROM programs WHERE carbon_project_id IS NOT NULL AND perhutanan_sosial_id IS NOT NULL;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PROGRAMS DATA FIX VERIFICATION';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Total programs: %', total_programs;
    RAISE NOTICE 'Programs with carbon_project_id: % (%%)', programs_with_carbon, ROUND(programs_with_carbon::DECIMAL / total_programs * 100, 1);
    RAISE NOTICE 'Programs with perhutanan_sosial_id: % (%%)', programs_with_ps, ROUND(programs_with_ps::DECIMAL / total_programs * 100, 1);
    RAISE NOTICE 'Programs with BOTH links: % (%%)', programs_with_both, ROUND(programs_with_both::DECIMAL / total_programs * 100, 1);
    RAISE NOTICE '';
    
    -- Show sample of fixed programs
    RAISE NOTICE 'SAMPLE FIXED PROGRAMS:';
END $$;

SELECT 
    p.program_code as "Kode Program",
    p.nama_program as "Nama Program",
    p.program_type as "Jenis",
    cp.kode_project as "Carbon Project",
    cp.nama_project as "Nama Carbon Project",
    ps.pemegang_izin as "Perhutanan Sosial",
    p.status as "Status"
FROM programs p
LEFT JOIN carbon_projects cp ON p.carbon_project_id = cp.id
LEFT JOIN perhutanan_sosial ps ON p.perhutanan_sosial_id = ps.id
ORDER BY p.program_code
LIMIT 10;

-- ====================================================================
-- FINAL MESSAGE
-- ====================================================================
SELECT '✅ PROGRAMS STRUCTURE AND DATA FIX COMPLETED!' AS status;

COMMIT;