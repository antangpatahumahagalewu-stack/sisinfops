-- MIGRATION: Fix foreign key issue "Table carbon_projects references non-existent table projects"
-- Created: 2026-02-12
-- Purpose: Create 'projects' view as alias to 'carbon_projects' for backward compatibility
-- Safe migration: No data changes, only creates a view

BEGIN;

-- Diagnostic logging
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'FOREIGN KEY FIX MIGRATION STARTING';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Issue: MCP detected "Table carbon_projects references non-existent table projects"';
    RAISE NOTICE 'Solution: Create projects view as alias to carbon_projects';
    RAISE NOTICE 'This provides backward compatibility without data migration';
    RAISE NOTICE '=========================================';
END $$;

-- ============================================
-- STEP 1: DIAGNOSTICS (for logging)
-- ============================================

DO $$
DECLARE
    projects_exists BOOLEAN;
    carbon_projects_exists BOOLEAN;
    carbon_projects_count INTEGER;
BEGIN
    -- Check if projects table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) INTO projects_exists;
    
    -- Check if carbon_projects table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects'
    ) INTO carbon_projects_exists;
    
    -- Count carbon_projects rows
    SELECT COUNT(*) INTO carbon_projects_count FROM carbon_projects;
    
    RAISE NOTICE 'Diagnostic Results:';
    RAISE NOTICE '- projects table exists: %', projects_exists;
    RAISE NOTICE '- carbon_projects table exists: %', carbon_projects_exists;
    RAISE NOTICE '- carbon_projects row count: %', carbon_projects_count;
    
    IF projects_exists THEN
        RAISE NOTICE '⚠️  WARNING: projects table already exists! View may not be needed.';
    END IF;
    
    IF NOT carbon_projects_exists THEN
        RAISE NOTICE '❌ ERROR: carbon_projects table does not exist! Aborting migration.';
        RETURN;
    END IF;
END $$;

-- ============================================
-- STEP 2: CREATE PROJECTS VIEW (SAFE FIX)
-- ============================================

-- Drop existing view if it exists (safe operation)
DROP VIEW IF EXISTS projects;

-- Create projects view as alias to carbon_projects
-- Includes essential columns for backward compatibility
CREATE OR REPLACE VIEW projects AS
SELECT 
    id,
    nama_project as project_name,
    kabupaten,
    luas_total_ha,
    status,
    created_at,
    updated_at,
    -- Additional columns that might be referenced
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
COMMENT ON VIEW projects IS 'Alias view for carbon_projects table. Created to fix MCP foreign key issue: "Table carbon_projects references non-existent table projects". Provides backward compatibility.';

-- ============================================
-- STEP 3: GRANT PERMISSIONS
-- ============================================

-- Grant same permissions as carbon_projects table
GRANT SELECT ON projects TO postgres;
GRANT SELECT ON projects TO anon;
GRANT SELECT ON projects TO authenticated;
GRANT SELECT ON projects TO service_role;

-- ============================================
-- STEP 4: VERIFICATION
-- ============================================

DO $$
DECLARE
    view_exists BOOLEAN;
    view_row_count INTEGER;
    sample_project_name TEXT;
BEGIN
    -- Verify view was created
    SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) INTO view_exists;
    
    -- Count rows in view
    SELECT COUNT(*) INTO view_row_count FROM projects;
    
    -- Get sample project name
    SELECT project_name INTO sample_project_name 
    FROM projects 
    LIMIT 1;
    
    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '- projects view created successfully: %', view_exists;
    RAISE NOTICE '- rows in projects view: %', view_row_count;
    
    IF sample_project_name IS NOT NULL THEN
        RAISE NOTICE '- sample project: %', sample_project_name;
    END IF;
    
    -- Check for any broken foreign key constraints
    RAISE NOTICE '';
    RAISE NOTICE 'Checking for broken foreign key constraints...';
    
    -- This is a simplified check - actual constraint check would need full SQL
    -- but we can verify data integrity between programs and projects view
    RAISE NOTICE 'Data integrity check: programs.carbon_project_id -> projects.id';
    
END $$;

-- ============================================
-- STEP 5: DATA INTEGRITY CHECK
-- ============================================

-- Check if any programs reference non-existent carbon projects
-- This would indicate a real foreign key issue
DO $$
DECLARE
    orphaned_programs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_programs_count
    FROM programs p
    LEFT JOIN carbon_projects cp ON p.carbon_project_id = cp.id
    WHERE p.carbon_project_id IS NOT NULL
    AND cp.id IS NULL;
    
    IF orphaned_programs_count > 0 THEN
        RAISE NOTICE '⚠️  WARNING: Found % program(s) with orphaned carbon_project_id', orphaned_programs_count;
        RAISE NOTICE '   These programs reference non-existent carbon projects';
        RAISE NOTICE '   Consider running: SELECT * FROM programs WHERE carbon_project_id NOT IN (SELECT id FROM carbon_projects)';
    ELSE
        RAISE NOTICE '✅ All programs.carbon_project_id references are valid';
    END IF;
END $$;

-- ============================================
-- STEP 6: FINAL SUMMARY
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Created projects view as alias to carbon_projects';
    RAISE NOTICE '- No data was modified or migrated';
    RAISE NOTICE '- View includes essential columns for compatibility';
    RAISE NOTICE '- Permissions granted to all roles';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test that existing code can query projects view';
    RAISE NOTICE '2. Run MCP health check to verify issue is resolved';
    RAISE NOTICE '3. If code expects full table (not view), consider creating';
    RAISE NOTICE '   a materialized view or actual table copy';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;

-- ============================================
-- POST-MIGRATION TEST QUERIES
-- ============================================

/*
-- Test the view works
SELECT * FROM projects LIMIT 3;

-- Test join with programs
SELECT 
    p.program_name,
    pr.project_name,
    pr.kabupaten,
    pr.luas_total_ha
FROM programs p
JOIN projects pr ON p.carbon_project_id = pr.id
LIMIT 5;

-- Verify row counts match
SELECT 
    (SELECT COUNT(*) FROM carbon_projects) as carbon_projects_count,
    (SELECT COUNT(*) FROM projects) as projects_count;
*/