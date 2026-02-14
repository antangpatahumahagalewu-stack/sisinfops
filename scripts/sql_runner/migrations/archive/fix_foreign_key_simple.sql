-- SIMPLE FIX FOR FOREIGN KEY ISSUE
-- Copy and paste this entire script into Supabase SQL Editor and run it

BEGIN;

-- Drop existing view if it exists (safe operation)
DROP VIEW IF EXISTS projects;

-- Create projects view as alias to carbon_projects
CREATE OR REPLACE VIEW projects AS
SELECT 
    id,
    nama_project as project_name,
    kabupaten,
    luas_total_ha,
    status,
    created_at,
    updated_at,
    project_code,
    project_type,
    standard,
    methodology,
    estimated_credits,
    issued_credits,
    investment_amount,
    roi_percentage,
    project_period_years
FROM carbon_projects;

-- Add comment for documentation
COMMENT ON VIEW projects IS 'Alias view for carbon_projects table. Created to fix MCP foreign key issue: "Table carbon_projects references non-existent table projects".';

-- Grant permissions (same as carbon_projects)
GRANT SELECT ON projects TO postgres;
GRANT SELECT ON projects TO anon;
GRANT SELECT ON projects TO authenticated;
GRANT SELECT ON projects TO service_role;

-- Verification queries (run after migration)
DO $$
DECLARE
    view_exists BOOLEAN;
    row_count INTEGER;
    orphaned_programs INTEGER;
BEGIN
    -- Check if view was created
    SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) INTO view_exists;
    
    RAISE NOTICE '1. View created: %', view_exists;
    
    -- Count rows
    SELECT COUNT(*) INTO row_count FROM projects;
    RAISE NOTICE '2. Row count: %', row_count;
    
    -- Check data integrity
    SELECT COUNT(*) INTO orphaned_programs
    FROM programs p
    LEFT JOIN carbon_projects cp ON p.carbon_project_id = cp.id
    WHERE p.carbon_project_id IS NOT NULL
    AND cp.id IS NULL;
    
    IF orphaned_programs > 0 THEN
        RAISE NOTICE '3. WARNING: % orphaned program references found', orphaned_programs;
    ELSE
        RAISE NOTICE '3. SUCCESS: All program references are valid';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE 'Created "projects" view as alias to "carbon_projects"';
    RAISE NOTICE 'This fixes MCP warning about missing table reference';
END $$;

COMMIT;

-- POST-MIGRATION TEST QUERIES (optional - run separately)

-- Test 1: Verify view works
-- SELECT * FROM projects LIMIT 3;

-- Test 2: Verify join with programs works
-- SELECT 
--     p.program_name,
--     pr.project_name,
--     pr.kabupaten,
--     pr.luas_total_ha
-- FROM programs p
-- JOIN projects pr ON p.carbon_project_id = pr.id
-- LIMIT 5;

-- Test 3: Verify row counts match
-- SELECT 
--     (SELECT COUNT(*) FROM carbon_projects) as carbon_projects_count,
--     (SELECT COUNT(*) FROM projects) as projects_count;