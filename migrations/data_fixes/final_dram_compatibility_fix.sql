-- FINAL DRAM COMPATIBILITY FIX
-- Fix all issues for DRAM page to work correctly:
-- 1. Add foreign key from dram.program_id to programs.id
-- 2. Add carbon_project_id to programs table
-- 3. Add proper RLS policies
-- 4. Update sample data with proper relationships

BEGIN;

-- ====================================================================
-- 1. ADD FOREIGN KEY CONSTRAINT TO DRAM TABLE
-- ====================================================================

-- First, ensure dram.program_id can reference programs.id
-- Add foreign key constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'dram' 
        AND constraint_name = 'dram_program_id_fkey'
    ) THEN
        ALTER TABLE dram 
        ADD CONSTRAINT dram_program_id_fkey 
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ====================================================================
-- 2. ADD CARBON_PROJECT_ID TO PROGRAMS TABLE
-- ====================================================================

-- Add carbon_project_id column to programs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'programs' 
        AND column_name = 'carbon_project_id'
    ) THEN
        ALTER TABLE programs ADD COLUMN carbon_project_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE programs 
        ADD CONSTRAINT programs_carbon_project_id_fkey 
        FOREIGN KEY (carbon_project_id) REFERENCES carbon_projects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ====================================================================
-- 3. UPDATE SAMPLE DATA WITH PROPER RELATIONSHIPS
-- ====================================================================

DO $$
DECLARE
    sample_program_id UUID;
    sample_carbon_project_id UUID;
    sample_dram_id UUID;
BEGIN
    -- Get existing program and carbon project
    SELECT id INTO sample_program_id FROM programs LIMIT 1;
    SELECT id INTO sample_carbon_project_id FROM carbon_projects LIMIT 1;
    
    IF sample_program_id IS NOT NULL AND sample_carbon_project_id IS NOT NULL THEN
        -- Update program to link to carbon project
        UPDATE programs 
        SET carbon_project_id = sample_carbon_project_id
        WHERE id = sample_program_id;
        
        -- Update dram to link to program
        UPDATE dram 
        SET program_id = sample_program_id
        WHERE program_id IS NULL;
        
        -- Also ensure kode_program and nama_program are set
        UPDATE programs 
        SET 
            kode_program = program_code,
            nama_program = program_name
        WHERE kode_program IS NULL OR nama_program IS NULL;
        
        -- Ensure carbon projects have kode_project and nama_project
        UPDATE carbon_projects 
        SET 
            kode_project = project_code,
            nama_project = project_name
        WHERE kode_project IS NULL OR nama_project IS NULL;
        
        RAISE NOTICE '✅ Updated relationships:';
        RAISE NOTICE '   - Program % linked to Carbon Project %', sample_program_id, sample_carbon_project_id;
        RAISE NOTICE '   - DRAM records linked to Program %', sample_program_id;
    END IF;
END $$;

-- ====================================================================
-- 4. SETUP RLS POLICIES FOR DRAM TABLE
-- ====================================================================

-- Enable RLS on dram table
ALTER TABLE IF EXISTS dram ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can view dram" ON dram;
DROP POLICY IF EXISTS "Program roles can manage dram" ON dram;

-- Create policies
CREATE POLICY "Authenticated users can view dram" ON dram
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program roles can manage dram" ON dram
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'program_planner', 'carbon_specialist')
    )
);

-- ====================================================================
-- 5. VERIFICATION QUERY (SAME AS FRONTEND)
-- ====================================================================

DO $$
DECLARE
    dram_count INTEGER;
    programs_linked_count INTEGER;
    projects_linked_count INTEGER;
BEGIN
    -- Count data
    SELECT COUNT(*) INTO dram_count FROM dram;
    SELECT COUNT(*) INTO programs_linked_count FROM programs WHERE carbon_project_id IS NOT NULL;
    SELECT COUNT(*) INTO projects_linked_count FROM carbon_projects;
    
    -- Test the actual frontend query
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'DRAM COMPATIBILITY FIX COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Data status:';
    RAISE NOTICE '  • dram: % rows', dram_count;
    RAISE NOTICE '  • programs linked to carbon projects: %/%', programs_linked_count, (SELECT COUNT(*) FROM programs);
    RAISE NOTICE '  • carbon projects: % rows', projects_linked_count;
    RAISE NOTICE '';
    
    -- Show sample query result
    RAISE NOTICE 'Sample frontend query result:';
END $$;

-- Test query that matches frontend structure
SELECT 
    '✅ Frontend query test:' as test,
    d.id as dram_id,
    d.versi,
    d.status,
    d.tujuan_mitigasi,
    d.anggaran_total,
    p.kode_program,
    p.nama_program,
    cp.kode_project,
    cp.nama_project
FROM dram d
LEFT JOIN programs p ON d.program_id = p.id
LEFT JOIN carbon_projects cp ON p.carbon_project_id = cp.id
LIMIT 2;

-- ====================================================================
-- 6. ADDITIONAL COMPATIBILITY FIXES
-- ====================================================================

-- Ensure status column has valid values for frontend badge component
UPDATE dram 
SET status = 'draft' 
WHERE status IS NULL OR status NOT IN ('draft', 'approved', 'active', 'evaluated', 'closed');

-- Add default values for important columns
UPDATE dram 
SET 
    versi = COALESCE(versi, '1.0'),
    anggaran_total = COALESCE(anggaran_total, 0)
WHERE versi IS NULL OR anggaran_total IS NULL;

-- ====================================================================
-- FINAL MESSAGE
-- ====================================================================
SELECT '🎉 DRAM COMPATIBILITY FIX COMPLETE! Frontend DRAM page should now work without errors.' AS status;

COMMIT;