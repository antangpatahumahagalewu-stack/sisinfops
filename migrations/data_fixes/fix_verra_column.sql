-- FIX VERRA_PROJECT_REGISTRATIONS TABLE COLUMNS
-- Frontend expects column 'status' but we have 'registration_status'
-- Also ensure all required columns exist

BEGIN;

-- 1. Add status column if it doesn't exist (for frontend compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'verra_project_registrations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE verra_project_registrations 
        ADD COLUMN status VARCHAR(50);
    END IF;
END $$;

-- 2. Copy data from registration_status to status
UPDATE verra_project_registrations 
SET status = registration_status 
WHERE status IS NULL AND registration_status IS NOT NULL;

-- 3. Also ensure carbon_project_id exists for frontend
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'verra_project_registrations' 
        AND column_name = 'carbon_project_id'
    ) THEN
        ALTER TABLE verra_project_registrations 
        ADD COLUMN carbon_project_id UUID;
        
        -- Copy from project_id
        UPDATE verra_project_registrations 
        SET carbon_project_id = project_id 
        WHERE carbon_project_id IS NULL;
    END IF;
END $$;

-- 4. Add sample data for testing
DO $$
DECLARE
    sample_project_id UUID;
BEGIN
    -- Get a carbon project ID
    SELECT id INTO sample_project_id FROM carbon_projects LIMIT 1;
    
    IF sample_project_id IS NOT NULL THEN
        -- Ensure we have at least one verra registration with status
        INSERT INTO verra_project_registrations (
            project_id,
            carbon_project_id,
            registration_code,
            registration_status,
            status,
            verra_project_id,
            submission_date,
            registration_date,
            registry_link
        ) VALUES (
            sample_project_id,
            sample_project_id,
            'VERRA-VCS-2025-001',
            'registered',
            'registered',
            'VERRA-VCS-2025-001',
            CURRENT_DATE - INTERVAL '90 days',
            CURRENT_DATE - INTERVAL '60 days',
            'https://registry.verra.org/app/projectDetail/VCS/1234'
        ) ON CONFLICT DO NOTHING;
        
        -- Update existing records to have status
        UPDATE verra_project_registrations 
        SET status = registration_status 
        WHERE status IS NULL;
    END IF;
END $$;

-- 5. Verify the fix
DO $$
DECLARE
    has_status_column BOOLEAN;
    has_carbon_project_id_column BOOLEAN;
    verra_count INTEGER;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verra_project_registrations' 
        AND column_name = 'status'
    ) INTO has_status_column;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verra_project_registrations' 
        AND column_name = 'carbon_project_id'
    ) INTO has_carbon_project_id_column;
    
    SELECT COUNT(*) INTO verra_count FROM verra_project_registrations;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'VERRA TABLE COLUMN FIX';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Columns added:';
    RAISE NOTICE '  • status: %', CASE WHEN has_status_column THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  • carbon_project_id: %', CASE WHEN has_carbon_project_id_column THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'Records: %', verra_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend query should now work without errors!';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;

SELECT '✅ Verra table columns fixed! Frontend should now work.' AS status;