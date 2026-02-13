-- SIMPLE Migration to add financial columns to programs table
-- Financial Snapshot = Akumulasi nilai program yang telah dijalankan

BEGIN;

-- Add missing columns to programs table
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS spent_budget DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS implementation_plan TEXT,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS kabupaten VARCHAR(100),
ADD COLUMN IF NOT EXISTS start_date_actual DATE,
ADD COLUMN IF NOT EXISTS end_date_actual DATE;

-- Add check constraint for progress_percentage
ALTER TABLE programs 
ADD CONSTRAINT check_progress_percentage 
CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Drop view if exists (for clean recreation)
DROP VIEW IF EXISTS v_carbon_project_financials;

-- Create view for carbon project financial aggregation
CREATE VIEW v_carbon_project_financials AS
SELECT 
    cp.id as carbon_project_id,
    cp.project_code,
    cp.project_name,
    cp.kabupaten as project_kabupaten,
    cp.luas_total_ha,
    COUNT(p.id) as total_programs,
    COALESCE(SUM(p.total_budget), 0) as total_budget_all_programs,
    COALESCE(SUM(p.spent_budget), 0) as total_spent_all_programs,
    COALESCE(SUM(p.total_budget - p.spent_budget), 0) as total_remaining_all_programs,
    CASE 
        WHEN COALESCE(SUM(p.total_budget), 0) > 0 
        THEN ROUND((COALESCE(SUM(p.spent_budget), 0) / COALESCE(SUM(p.total_budget), 0)) * 100, 2)
        ELSE 0
    END as overall_progress_percentage,
    COALESCE(AVG(p.progress_percentage), 0) as avg_activity_progress
FROM carbon_projects cp
LEFT JOIN programs p ON p.carbon_project_id = cp.id
GROUP BY cp.id, cp.project_code, cp.project_name, cp.kabupaten, cp.luas_total_ha;

-- Update existing programs with sample financial data
UPDATE programs 
SET 
    carbon_project_id = '17a97b56-a525-4c65-b627-2e1e9e3ce343',
    total_budget = 500000000,
    spent_budget = 300000000,
    goal = 'Capacity building for 100 local community members on carbon project management',
    implementation_plan = 'Training sessions, field demonstrations, and mentoring program over 6 months',
    progress_percentage = 60,
    kabupaten = 'Pulang Pisau',
    status = 'active'
WHERE program_code = 'PROG-001'
AND carbon_project_id IS NULL;

-- Insert additional programs for testing if needed
INSERT INTO programs (
    program_code,
    program_name,
    program_type,
    description,
    status,
    budget,
    total_budget,
    spent_budget,
    goal,
    implementation_plan,
    progress_percentage,
    kabupaten,
    carbon_project_id,
    created_at
) VALUES
(
    'PROG-CP-001',
    'Forest Patrol System Implementation',
    'conservation',
    'Implementation of 24/7 forest patrol system to prevent illegal logging',
    'active',
    800000000,
    800000000,
    400000000,
    'Establish effective forest patrol system covering entire project area',
    'Hire and train patrol teams, install monitoring equipment, establish reporting system',
    50,
    'Pulang Pisau',
    '17a97b56-a525-4c65-b627-2e1e9e3ce343',
    NOW()
),
(
    'PROG-CP-002',
    'Carbon Monitoring Technology',
    'carbon',
    'Installation of carbon monitoring sensors and equipment',
    'active',
    1200000000,
    1200000000,
    600000000,
    'Implement advanced carbon monitoring technology for accurate measurement',
    'Procure equipment, install sensors, calibrate systems, train operators',
    50,
    'Pulang Pisau',
    '17a97b56-a525-4c65-b627-2e1e9e3ce343',
    NOW()
),
(
    'PROG-CP-003',
    'Community Livelihood Enhancement',
    'livelihood',
    'Support alternative livelihoods for forest-dependent communities',
    'planning',
    300000000,
    300000000,
    50000000,
    'Create sustainable livelihood alternatives to reduce forest pressure',
    'Identify opportunities, provide training, establish market linkages',
    17,
    'Gunung Mas',
    'db56f3d7-60c8-42a6-aff1-2220b51b32de',
    NOW()
)
ON CONFLICT (program_code) DO UPDATE SET
    total_budget = EXCLUDED.total_budget,
    spent_budget = EXCLUDED.spent_budget,
    progress_percentage = EXCLUDED.progress_percentage,
    status = EXCLUDED.status;

-- Grant permissions
GRANT SELECT ON v_carbon_project_financials TO anon, authenticated;

-- Verification
DO $$
DECLARE
    program_count INTEGER;
    total_budget_sum NUMERIC;
    total_spent_sum NUMERIC;
    project_id_1 UUID := '17a97b56-a525-4c65-b627-2e1e9e3ce343';
BEGIN
    SELECT COUNT(*), COALESCE(SUM(total_budget), 0), COALESCE(SUM(spent_budget), 0)
    INTO program_count, total_budget_sum, total_spent_sum
    FROM programs 
    WHERE carbon_project_id = project_id_1;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'FINANCIAL COLUMNS MIGRATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Added columns to programs table:';
    RAISE NOTICE '  • spent_budget (financial tracking)';
    RAISE NOTICE '  • goal (program objectives)';
    RAISE NOTICE '  • implementation_plan (execution details)';
    RAISE NOTICE '  • progress_percentage (0-100%)';
    RAISE NOTICE '  • kabupaten (location)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created view: v_carbon_project_financials';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample data for project %:', project_id_1;
    RAISE NOTICE '  • Programs linked: %', program_count;
    RAISE NOTICE '  • Total budget: Rp %', total_budget_sum;
    RAISE NOTICE '  • Total spent: Rp %', total_spent_sum;
    
    IF total_budget_sum > 0 THEN
        RAISE NOTICE '  • Progress: %%%', ROUND((total_spent_sum / total_budget_sum) * 100, 2);
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Financial Snapshot calculation:';
    RAISE NOTICE '  Total Budget = SUM(programs.total_budget)';
    RAISE NOTICE '  Total Spent = SUM(programs.spent_budget)';
    RAISE NOTICE '  Progress = (Total Spent / Total Budget) × 100%';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;

SELECT '✅ Financial columns added to programs table. Financial Snapshot now based on actual program data.' AS migration_status;