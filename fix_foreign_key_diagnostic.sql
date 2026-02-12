-- DIAGNOSTIC & FIX SCRIPT FOR FOREIGN KEY ISSUE
-- Issue: "Table carbon_projects references non-existent table projects"
-- Created: 2026-02-12
-- Purpose: Diagnose and fix broken foreign key constraint

-- ============================================
-- PART 1: DIAGNOSTIC QUERIES
-- ============================================

-- 1.1 Check if 'projects' table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'projects'
) AS projects_table_exists;

-- 1.2 Check if 'carbon_projects' table exists  
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'carbon_projects'
) AS carbon_projects_table_exists;

-- 1.3 Get all foreign key constraints in the database
SELECT 
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- 1.4 Check specifically for constraints referencing 'projects' table
SELECT 
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'projects'
ORDER BY tc.table_name;

-- 1.5 Check columns with 'project' in their name (potential foreign keys)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE column_name LIKE '%project%'
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 1.6 Check structure of carbon_projects table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'carbon_projects'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.7 Check data in carbon_projects
SELECT id, nama_project, kabupaten, luas_total_ha, status, created_at
FROM carbon_projects
LIMIT 10;

-- ============================================
-- PART 2: ANALYSIS BASED ON MIGRATION FILES
-- ============================================

-- Based on migration files analysis:
-- 1. Table 'carbon_projects' is used in multiple migrations
-- 2. Table 'projects' (without 'carbon_') NOT found in any migrations
-- 3. Possible foreign key columns found:
--    - programs.carbon_project_id (references carbon_projects.id)
--    - Other tables might have similar columns

-- ============================================
-- PART 3: FIX OPTIONS
-- ============================================

-- OPTION A: Create 'projects' as a VIEW (if code expects 'projects' table)
-- Uncomment and run if needed:

/*
-- 3.A.1 Create view 'projects' as alias to 'carbon_projects'
CREATE OR REPLACE VIEW projects AS
SELECT 
    id,
    nama_project as project_name,
    kabupaten,
    luas_total_ha,
    status,
    created_at,
    updated_at
FROM carbon_projects;

-- Grant permissions
GRANT SELECT ON projects TO postgres, anon, authenticated, service_role;

COMMENT ON VIEW projects IS 'Alias view for carbon_projects table (for backward compatibility)';
*/

-- OPTION B: Fix broken foreign key constraints (if any exist)
-- First, identify the broken constraint name from Part 1 queries
-- Then run something like:

/*
-- Example: If constraint 'fk_programs_projects' references 'projects'
-- 3.B.1 Drop the broken constraint
ALTER TABLE programs 
DROP CONSTRAINT IF EXISTS fk_programs_projects;

-- 3.B.2 Add correct constraint referencing carbon_projects
ALTER TABLE programs 
ADD CONSTRAINT fk_programs_carbon_projects 
FOREIGN KEY (carbon_project_id) 
REFERENCES carbon_projects(id)
ON DELETE CASCADE;
*/

-- OPTION C: Create 'projects' as a TABLE with same data (more comprehensive)
-- Uncomment and run if needed:

/*
-- 3.C.1 Create projects table with similar structure
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(255),
    kabupaten VARCHAR(100),
    luas_total_ha DECIMAL(12,2),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.C.2 Copy data from carbon_projects
INSERT INTO projects (id, project_name, kabupaten, luas_total_ha, status, created_at, updated_at)
SELECT 
    id,
    nama_project,
    kabupaten,
    luas_total_ha,
    status,
    created_at,
    updated_at
FROM carbon_projects
ON CONFLICT (id) DO NOTHING;

-- 3.C.3 Create foreign key from programs to projects (if needed)
ALTER TABLE programs 
ADD CONSTRAINT fk_programs_projects 
FOREIGN KEY (carbon_project_id) 
REFERENCES projects(id)
ON DELETE CASCADE;
*/

-- OPTION D: Do nothing if it's a false positive MCP warning
-- If no broken constraints found and system works fine, 
-- this might be a false positive from MCP scan

-- ============================================
-- PART 4: VERIFICATION QUERIES (POST-FIX)
-- ============================================

-- 4.1 Verify all foreign keys are valid
SELECT 
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    tc.constraint_name,
    'VALID' as status_check
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name IN ('carbon_projects', 'projects')
ORDER BY tc.table_name;

-- 4.2 Check if any tables reference non-existent tables
WITH all_tables AS (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
),
referenced_tables AS (
    SELECT DISTINCT ccu.table_name as referenced_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
)
SELECT 
    rt.referenced_table,
    CASE 
        WHEN at.table_name IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING - FOREIGN KEY ISSUE!'
    END as table_status
FROM referenced_tables rt
LEFT JOIN all_tables at ON at.table_name = rt.referenced_table
ORDER BY table_status, rt.referenced_table;

-- 4.3 Test data integrity for programs -> carbon_projects
SELECT 
    p.id as program_id,
    p.program_name,
    p.carbon_project_id,
    cp.nama_project as carbon_project_name,
    CASE 
        WHEN cp.id IS NOT NULL THEN 'VALID'
        ELSE 'ORPHANED - FOREIGN KEY ISSUE!'
    END as fk_status
FROM programs p
LEFT JOIN carbon_projects cp ON p.carbon_project_id = cp.id
WHERE p.carbon_project_id IS NOT NULL
LIMIT 10;

-- ============================================
-- PART 5: RECOMMENDATION BASED ON FINDINGS
-- ============================================

/*
RECOMMENDED ACTION FLOW:

1. Run Part 1 diagnostic queries first
2. Check results:
   - If query 1.4 returns any rows: There ARE broken foreign keys → Use OPTION B
   - If query 1.4 returns no rows but code expects 'projects' table → Use OPTION A or C
   - If everything works fine: Might be false positive → OPTION D

3. Based on current migration analysis, most likely:
   - No actual broken foreign keys exist
   - MCP might be detecting pattern or old code reference
   - OPTION A (VIEW) is safest for backward compatibility

4. After applying fix, run Part 4 verification queries
*/

-- ============================================
-- PART 6: MIGRATION SCRIPT TEMPLATE
-- ============================================

/*
-- Save this as a migration file if fix is needed
BEGIN;

-- Diagnostic logging
DO $$
BEGIN
    RAISE NOTICE 'Starting foreign key fix migration...';
END $$;

-- Option A: Create view (recommended for safety)
CREATE OR REPLACE VIEW projects AS
SELECT 
    id,
    nama_project as project_name,
    kabupaten,
    luas_total_ha,
    status,
    created_at,
    updated_at
FROM carbon_projects;

-- Grant permissions
GRANT SELECT ON projects TO postgres, anon, authenticated, service_role;

-- Update comment
COMMENT ON VIEW projects IS 'Alias view for carbon_projects table (fix for MCP foreign key issue)';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Foreign key fix migration completed successfully';
    RAISE NOTICE '- Created projects view as alias to carbon_projects';
    RAISE NOTICE '- No data migration needed';
    RAISE NOTICE '- System should now pass MCP foreign key check';
END $$;

COMMIT;
*/

-- ============================================
-- END OF DIAGNOSTIC SCRIPT
-- ============================================