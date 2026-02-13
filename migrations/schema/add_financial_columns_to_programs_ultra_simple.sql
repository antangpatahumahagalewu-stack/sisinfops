-- ULTRA SIMPLE Migration to add financial columns to programs table
-- Financial Snapshot = Akumulasi nilai program yang telah dijalankan

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

-- Grant permissions
GRANT SELECT ON v_carbon_project_financials TO anon, authenticated;

SELECT '✅ STEP 1: Financial columns added to programs table' AS status;