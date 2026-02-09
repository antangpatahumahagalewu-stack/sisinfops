-- FINAL FIX FOR VERRA TABLE - SIMPLE AND ROBUST
-- 1. Add status column if it doesn't exist
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
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding status column: %', SQLERRM;
END $$;

-- 2. Copy data from registration_status to status
UPDATE verra_project_registrations 
SET status = registration_status 
WHERE status IS NULL AND registration_status IS NOT NULL;

-- 3. Show what we have
SELECT 'After fix:' as message;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'verra_project_registrations'
AND column_name IN ('status', 'registration_status', 'verra_project_id', 'registration_date')
ORDER BY column_name;

SELECT 'Data sample:' as message;
SELECT id, status, registration_status, verra_project_id, registration_date
FROM verra_project_registrations 
LIMIT 3;