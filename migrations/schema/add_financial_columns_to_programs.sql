-- Migration to add financial columns to programs table for Carbon Projects Financial Snapshot
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
ADD COLUMN IF NOT EXISTS end_date_actual DATE,
ADD COLUMN IF NOT EXISTS spent_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
        WHEN total_budget > 0 THEN (spent_budget / total_budget) * 100
        ELSE 0
    END
) STORED;

-- Add check constraint for progress_percentage
ALTER TABLE programs 
ADD CONSTRAINT check_progress_percentage 
CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Create view for carbon project financial aggregation
CREATE OR REPLACE VIEW v_carbon_project_financials AS
SELECT 
    cp.id as carbon_project_id,
    cp.project_code,
    cp.project_name,
    cp.kabupaten as project_kabupaten,
    cp.luas_total_ha,
    COUNT(p.id) as total_programs,
    SUM(p.total_budget) as total_budget_all_programs,
    SUM(p.spent_budget) as total_spent_all_programs,
    SUM(p.total_budget - p.spent_budget) as total_remaining_all_programs,
    CASE 
        WHEN SUM(p.total_budget) > 0 
        THEN ROUND((SUM(p.spent_budget) / SUM(p.total_budget)) * 100, 2)
        ELSE 0
    END as overall_progress_percentage,
    AVG(p.progress_percentage) as avg_activity_progress,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'program_id', p.id,
            'program_name', p.program_name,
            'program_code', p.program_code,
            'total_budget', p.total_budget,
            'spent_budget', p.spent_budget,
            'remaining_budget', p.total_budget - p.spent_budget,
            'progress_percentage', p.progress_percentage,
            'spent_percentage', p.spent_percentage,
            'kabupaten', p.kabupaten,
            'status', p.status
        )
    ) as program_details
FROM carbon_projects cp
LEFT JOIN programs p ON p.carbon_project_id = cp.id
GROUP BY cp.id, cp.project_code, cp.project_name, cp.kabupaten, cp.luas_total_ha;

-- Create materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_carbon_project_financial_summary AS
SELECT 
    carbon_project_id,
    project_code,
    project_name,
    project_kabupaten,
    luas_total_ha,
    total_programs,
    total_budget_all_programs,
    total_spent_all_programs,
    total_remaining_all_programs,
    overall_progress_percentage,
    avg_activity_progress,
    program_details,
    NOW() as last_updated
FROM v_carbon_project_financials;

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_carbon_financial_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_carbon_project_financial_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view when programs change
DROP TRIGGER IF EXISTS refresh_financial_summary_on_programs_change ON programs;
CREATE TRIGGER refresh_financial_summary_on_programs_change
    AFTER INSERT OR UPDATE OR DELETE ON programs
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_carbon_financial_summary();

-- Grant permissions
GRANT SELECT ON v_carbon_project_financials TO anon, authenticated;
GRANT SELECT ON mv_carbon_project_financial_summary TO anon, authenticated;

-- Add sample data for testing (update existing programs with carbon_project_id)
DO $$
DECLARE
    project_id_1 UUID := '17a97b56-a525-4c65-b627-2e1e9e3ce343'; -- Pulang Pisau
    project_id_2 UUID := 'db56f3d7-60c8-42a6-aff1-2220b51b32de'; -- Gunung Mas
BEGIN
    -- Update existing programs with sample financial data
    UPDATE programs 
    SET 
        carbon_project_id = project_id_1,
        total_budget = 500000000,
        spent_budget = 300000000,
        goal = 'Capacity building for 100 local community members on carbon project management',
        implementation_plan = 'Training sessions, field demonstrations, and mentoring program over 6 months',
        progress_percentage = 60,
        kabupaten = 'Pulang Pisau',
        status = 'active'
    WHERE program_code = 'PROG-001'
    AND carbon_project_id IS NULL;
    
    -- Create additional programs for testing if needed
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
        project_id_1,
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
        project_id_1,
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
        project_id_2,
        NOW()
    )
    ON CONFLICT (program_code) DO UPDATE SET
        total_budget = EXCLUDED.total_budget,
        spent_budget = EXCLUDED.spent_budget,
        progress_percentage = EXCLUDED.progress_percentage,
        status = EXCLUDED.status;
    
    -- Refresh the materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_carbon_project_financial_summary;
END $$;

-- Verification query
DO $$
DECLARE
    program_count INTEGER;
    financial_view_count INTEGER;
    project_id_1 UUID := '17a97b56-a525-4c65-b627-2e1e9e3ce343';
BEGIN
    SELECT COUNT(*) INTO program_count 
    FROM programs 
    WHERE carbon_project_id = project_id_1;
    
    SELECT COUNT(*) INTO financial_view_count 
    FROM v_carbon_project_financials 
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
    RAISE NOTICE '  • spent_percentage (generated column)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created views:';
    RAISE NOTICE '  • v_carbon_project_financials (real-time aggregation)';
    RAISE NOTICE '  • mv_carbon_project_financial_summary (materialized)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample data inserted for project %:', project_id_1;
    RAISE NOTICE '  • Programs linked: %', program_count;
    RAISE NOTICE '  • Financial view entries: %', financial_view_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Financial Snapshot Calculation:';
    RAISE NOTICE '  Total Budget = SUM(programs.total_budget)';
    RAISE NOTICE '  Total Spent = SUM(programs.spent_budget)';
    RAISE NOTICE '  Progress = (Total Spent / Total Budget) × 100%';
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend update required:';
    RAISE NOTICE '  • Update getFinancialData() in page.tsx to use v_carbon_project_financials';
    RAISE NOTICE '  • Financial Snapshot now shows REAL data from programs';
    RAISE NOTICE '=========================================';
END $$;

SELECT '✅ Financial columns added to programs table. Financial Snapshot now based on actual program data.' AS migration_status;

COMMIT;