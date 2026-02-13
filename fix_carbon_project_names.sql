-- FIX CARBON PROJECT NAMES CONSISTENCY
-- This SQL migrates data to ensure consistency between nama_project and project_name columns

BEGIN;

-- ====================================================================
-- 1. DIAGNOSTIC: Check current inconsistencies
-- ====================================================================

SELECT 
    id,
    kode_project,
    nama_project,
    project_name,
    CASE 
        WHEN nama_project IS NULL AND project_name IS NULL THEN 'BOTH NULL'
        WHEN nama_project IS NULL AND project_name IS NOT NULL THEN 'MISSING nama_project'
        WHEN nama_project IS NOT NULL AND project_name IS NULL THEN 'MISSING project_name'
        WHEN nama_project != project_name THEN 'DIFFERENT VALUES'
        ELSE 'CONSISTENT'
    END as status,
    CASE 
        WHEN nama_project IS NULL AND project_name IS NOT NULL THEN project_name
        WHEN nama_project IS NOT NULL AND project_name IS NULL THEN nama_project
        WHEN nama_project != project_name THEN CONCAT('nama_project: ', nama_project, ' vs project_name: ', project_name)
        ELSE 'OK'
    END as details
FROM carbon_projects
ORDER BY status, kode_project;

-- ====================================================================
-- 2. FIX: Make nama_project consistent with project_name (project_name is primary source)
-- ====================================================================

-- Copy project_name to nama_project where nama_project is NULL or different
-- This ensures nama_project matches project_name (project_name is source of truth)
UPDATE carbon_projects 
SET nama_project = project_name
WHERE (nama_project IS NULL AND project_name IS NOT NULL) 
   OR (nama_project IS NOT NULL AND project_name IS NOT NULL AND nama_project != project_name);

-- ====================================================================
-- 3. ALTERNATIVE: Make project_name consistent with nama_project
-- ====================================================================

-- Uncomment below if you want nama_project to be the source of truth instead
/*
UPDATE carbon_projects 
SET project_name = nama_project
WHERE (project_name IS NULL AND nama_project IS NOT NULL) 
   OR (project_name IS NOT NULL AND nama_project IS NOT NULL AND project_name != nama_project);
*/

-- ====================================================================
-- 4. ADD FALLBACK FOR NULL VALUES
-- ====================================================================

-- If nama_project is still NULL after above updates, use project_code as fallback
UPDATE carbon_projects 
SET nama_project = COALESCE(nama_project, project_name, CONCAT('Carbon Project ', kode_project))
WHERE nama_project IS NULL;

-- If project_name is still NULL after above updates, use nama_project as fallback
UPDATE carbon_projects 
SET project_name = COALESCE(project_name, nama_project, CONCAT('Carbon Project ', kode_project))
WHERE project_name IS NULL;

-- ====================================================================
-- 5. VERIFICATION: Check results after fix
-- ====================================================================

SELECT 
    'AFTER FIX' as phase,
    COUNT(*) as total_projects,
    SUM(CASE WHEN nama_project IS NULL THEN 1 ELSE 0 END) as null_nama_project,
    SUM(CASE WHEN project_name IS NULL THEN 1 ELSE 0 END) as null_project_name,
    SUM(CASE WHEN nama_project = project_name THEN 1 ELSE 0 END) as consistent_count,
    SUM(CASE WHEN nama_project != project_name THEN 1 ELSE 0 END) as inconsistent_count
FROM carbon_projects;

-- Show sample of fixed data
SELECT 
    id,
    kode_project,
    nama_project as "Nama Project (utama)",
    project_name as "Project Name (backup)",
    CASE 
        WHEN nama_project = project_name THEN '✅ CONSISTENT'
        ELSE '⚠️  STILL DIFFERENT'
    END as consistency_check
FROM carbon_projects
ORDER BY kode_project
LIMIT 10;

-- ====================================================================
-- 6. RECOMMENDATION FOR APPLICATION
-- ====================================================================

SELECT 'RECOMMENDATION:' as note;
SELECT '1. Always use project.project_name as primary name in frontend (source of truth)' as step;
SELECT '2. Use project.project_name || project.nama_project as fallback' as step;
SELECT '3. Consider dropping nama_project column if not needed elsewhere' as step;

-- Show which other tables might reference these columns
SELECT 
    'Related tables that might need updates:' as note;
    
-- Check if there are foreign key references or other dependencies
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (column_name ILIKE '%project_name%' OR column_name ILIKE '%nama_project%')
  AND table_name != 'carbon_projects'
ORDER BY table_name, column_name;

COMMIT;

-- ====================================================================
-- 7. CLEANUP OPTION (Advanced - requires careful consideration)
-- ====================================================================
/*
-- Option: Drop project_name column if it's redundant
-- WARNING: Make sure no other systems depend on this column!

-- First, check if column is used elsewhere
SELECT 
    'Checking usage of project_name column in database...' as note;

-- If safe to remove:
-- ALTER TABLE carbon_projects DROP COLUMN project_name;

SELECT 'Column project_name has been removed. Use nama_project exclusively.' as result;
*/