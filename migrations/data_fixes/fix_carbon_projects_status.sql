-- FIX CARBON PROJECTS STATUS COLUMN ERROR
-- Frontend is trying to access project.status.toUpperCase() but column doesn't exist

BEGIN;

-- ====================================================================
-- PART 1: ADD STATUS COLUMN TO CARBON_PROJECTS
-- ====================================================================

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE carbon_projects 
        ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        
        RAISE NOTICE '✅ Added status column to carbon_projects';
    ELSE
        RAISE NOTICE 'ℹ️ status column already exists in carbon_projects';
    END IF;
END $$;

-- ====================================================================
-- PART 2: UPDATE EXISTING DATA
-- ====================================================================

-- Copy validation_status to status for existing records where status is null
UPDATE carbon_projects 
SET status = COALESCE(validation_status, 'draft')
WHERE status IS NULL OR status = '';

DO $$ 
BEGIN
    RAISE NOTICE '✅ Updated status for existing carbon projects';
END $$;

-- ====================================================================
-- PART 3: ADD SAMPLE DATA WITH PROPER STATUS
-- ====================================================================

-- Insert another sample project with different status for testing
INSERT INTO carbon_projects (
    project_code,
    project_name,
    project_type,
    standard,
    methodology,
    validation_status,
    verification_status,
    status,
    estimated_credits,
    project_description
) VALUES (
    'CP-002',
    'Kapuas Mangrove Restoration',
    'ARR',
    'VCS',
    'VM0033',
    'approved',
    'completed',
    'active',
    25000.00,
    'Proyek restorasi mangrove di Kabupaten Kapuas'
) ON CONFLICT (project_code) DO UPDATE 
SET 
    status = EXCLUDED.status,
    validation_status = EXCLUDED.validation_status;

-- Insert project with 'suspended' status
INSERT INTO carbon_projects (
    project_code,
    project_name,
    project_type,
    standard,
    methodology,
    validation_status,
    verification_status,
    status,
    estimated_credits,
    project_description
) VALUES (
    'CP-003',
    'Gunung Mas Forest Management',
    'IFM',
    'Gold Standard',
    'GS-VER',
    'suspended',
    'not_started',
    'suspended',
    15000.00,
    'Proyek pengelolaan hutan berkelanjutan di Kabupaten Gunung Mas'
) ON CONFLICT (project_code) DO UPDATE 
SET 
    status = EXCLUDED.status,
    validation_status = EXCLUDED.validation_status;

-- ====================================================================
-- PART 4: VERIFICATION
-- ====================================================================

DO $$
DECLARE
    total_projects INTEGER;
    status_counts JSONB;
BEGIN
    -- Count total projects
    SELECT COUNT(*) INTO total_projects FROM carbon_projects;
    
    -- Get status distribution
    SELECT jsonb_object_agg(status, count) INTO status_counts
    FROM (
        SELECT status, COUNT(*) as count
        FROM carbon_projects
        GROUP BY status
        ORDER BY count DESC
    ) subquery;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'CARBON PROJECTS STATUS FIX COMPLETED';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Total projects: %', total_projects;
    RAISE NOTICE 'Status distribution: %', status_counts;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend StatusBadge should now work with:';
    RAISE NOTICE '  • Status values: draft, active, suspended';
    RAISE NOTICE '  • No more "Cannot read properties of undefined" error';
    RAISE NOTICE '  • Status badges will display properly';
    RAISE NOTICE '=========================================';
END $$;

-- ====================================================================
-- FINAL MESSAGE
-- ====================================================================
SELECT '✅ Carbon projects status column fixed! Frontend error should be resolved.' AS status;

COMMIT;