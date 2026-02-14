-- VERIFICATION SCRIPT: Check projects type and structure
-- Run this directly in Supabase SQL Editor

-- ============================================
-- 1. CHECK PROJECTS TYPE (TABLE OR VIEW)
-- ============================================

SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'carbon_projects')
ORDER BY table_name;

-- ============================================
-- 2. COMPARE STRUCTURE
-- ============================================

-- 2.1 Get columns for carbon_projects
SELECT 
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'carbon_projects'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2.2 Get columns for projects  
SELECT 
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'projects'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2.3 Compare column counts
SELECT 
    'carbon_projects' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'carbon_projects'
AND table_schema = 'public'

UNION ALL

SELECT 
    'projects' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'projects'
AND table_schema = 'public';

-- ============================================
-- 3. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================

-- 3.1 All foreign keys in database
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
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 3.2 Check specifically for projects/carbon_projects references
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
AND tc.table_schema = 'public'
AND ccu.table_name IN ('projects', 'carbon_projects')
ORDER BY tc.table_name;

-- ============================================
-- 4. DATA INTEGRITY CHECK
-- ============================================

-- 4.1 Check row counts
SELECT 
    'carbon_projects' as table_name,
    COUNT(*) as row_count
FROM carbon_projects

UNION ALL

SELECT 
    'projects' as table_name,
    COUNT(*) as row_count
FROM projects;

-- 4.2 Check for orphaned programs (programs referencing non-existent projects)
SELECT 
    p.id as program_id,
    p.program_name,
    p.carbon_project_id,
    CASE 
        WHEN cp.id IS NOT NULL THEN '✅ EXISTS in carbon_projects'
        ELSE '❌ MISSING from carbon_projects'
    END as carbon_projects_status,
    CASE 
        WHEN pr.id IS NOT NULL THEN '✅ EXISTS in projects'
        ELSE '❌ MISSING from projects'
    END as projects_status
FROM programs p
LEFT JOIN carbon_projects cp ON p.carbon_project_id = cp.id
LEFT JOIN projects pr ON p.carbon_project_id = pr.id
WHERE p.carbon_project_id IS NOT NULL;

-- ============================================
-- 5. VIEW DEFINITION (if projects is a view)
-- ============================================

-- If projects is a view, try to get its definition
SELECT 
    table_name,
    view_definition,
    check_option,
    is_updatable
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'projects';

-- ============================================
-- 6. REFRESH SCHEMA CACHE (if needed)
-- ============================================

-- Uncomment and run if schema cache needs refresh
-- SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- 7. SUMMARY & RECOMMENDATIONS
-- ============================================

DO $$
DECLARE
    projects_type TEXT;
    projects_column_count INTEGER;
    carbon_projects_column_count INTEGER;
    row_count_match BOOLEAN;
    broken_fk_count INTEGER;
BEGIN
    -- Get projects type
    SELECT table_type INTO projects_type
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'projects';
    
    -- Get column counts
    SELECT COUNT(*) INTO projects_column_count
    FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND table_schema = 'public';
    
    SELECT COUNT(*) INTO carbon_projects_column_count
    FROM information_schema.columns 
    WHERE table_name = 'carbon_projects' 
    AND table_schema = 'public';
    
    -- Check row counts
    SELECT (SELECT COUNT(*) FROM carbon_projects) = (SELECT COUNT(*) FROM projects) 
    INTO row_count_match;
    
    -- Check for broken foreign keys
    SELECT COUNT(*) INTO broken_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'projects';
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'VERIFICATION RESULTS';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '1. projects is a: %', UPPER(projects_type);
    RAISE NOTICE '2. Column counts: carbon_projects=%, projects=%', 
        carbon_projects_column_count, projects_column_count;
    RAISE NOTICE '3. Row counts match: %', CASE WHEN row_count_match THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '4. Broken foreign keys referencing projects: %', broken_fk_count;
    RAISE NOTICE '';
    
    IF projects_type = 'VIEW' THEN
        RAISE NOTICE '✅ projects is a VIEW (likely created as alias to carbon_projects)';
        RAISE NOTICE '💡 MCP issue may be false positive or cache needs refresh';
        RAISE NOTICE '';
        RAISE NOTICE 'RECOMMENDED ACTIONS:';
        RAISE NOTICE '1. Refresh schema cache: SELECT pg_notify(''pgrst'', ''reload schema'');';
        RAISE NOTICE '2. Run MCP scan again';
        RAISE NOTICE '3. If issue persists, check MCP configuration';
    ELSIF projects_type = 'BASE TABLE' THEN
        RAISE NOTICE 'ℹ️  projects is a TABLE (not a VIEW)';
        RAISE NOTICE '💡 Check if this table was manually created';
        RAISE NOTICE '';
        RAISE NOTICE 'RECOMMENDED ACTIONS:';
        RAISE NOTICE '1. Verify data consistency with carbon_projects';
        RAISE NOTICE '2. Check for broken foreign key constraints';
        RAISE NOTICE '3. Update MCP configuration if needed';
    ELSE
        RAISE NOTICE '❓ Unknown projects type: %', projects_type;
    END IF;
    
    RAISE NOTICE '=========================================';
END $$;