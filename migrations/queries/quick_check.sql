-- Quick check of verra table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'verra_project_registrations'
ORDER BY column_name;

-- Check if status column exists and has data
SELECT 'Checking status column:' as check;
SELECT COUNT(*) as total_rows FROM verra_project_registrations;
SELECT COUNT(*) as rows_with_status FROM verra_project_registrations WHERE status IS NOT NULL;
SELECT COUNT(*) as rows_with_registration_status FROM verra_project_registrations WHERE registration_status IS NOT NULL;

-- Sample data
SELECT 'Sample data:' as info;
SELECT id, status, registration_status, verra_project_id, project_id, carbon_project_id 
FROM verra_project_registrations 
LIMIT 3;