-- SIMPLE FIX FOR VERRA TABLE COLUMNS
-- No PL/pgSQL, just simple SQL statements

-- 1. Check if status column exists, if not add it
ALTER TABLE verra_project_registrations 
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- 2. Copy data from registration_status to status
UPDATE verra_project_registrations 
SET status = registration_status 
WHERE status IS NULL AND registration_status IS NOT NULL;

-- 3. Ensure carbon_project_id exists
ALTER TABLE verra_project_registrations 
ADD COLUMN IF NOT EXISTS carbon_project_id UUID;

-- 4. Copy data from project_id to carbon_project_id
UPDATE verra_project_registrations 
SET carbon_project_id = project_id 
WHERE carbon_project_id IS NULL;

-- 5. Add sample data if needed
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
)
SELECT 
    id,
    id,
    'VERRA-VCS-2025-001',
    'registered',
    'registered',
    'VERRA-VCS-2025-001',
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '60 days',
    'https://registry.verra.org/app/projectDetail/VCS/1234'
FROM carbon_projects 
WHERE NOT EXISTS (
    SELECT 1 FROM verra_project_registrations 
    WHERE project_id = carbon_projects.id
)
LIMIT 1;

-- 6. Show results
SELECT '✅ Verra table columns fixed!' as message;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'verra_project_registrations'
AND column_name IN ('status', 'carbon_project_id', 'registration_status', 'verra_project_id')
ORDER BY column_name;

SELECT 'Sample data:' as info;
SELECT id, status, verra_project_id, carbon_project_id 
FROM verra_project_registrations 
LIMIT 3;