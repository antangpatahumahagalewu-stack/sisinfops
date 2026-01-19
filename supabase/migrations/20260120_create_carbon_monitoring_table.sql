-- Migration: Create carbon_monitoring_data table for tracking carbon project monitoring metrics
-- Date: 2026-01-20
-- Description: Stores monitoring data for carbon projects including sequestration, forest cover, deforestation rate, etc.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create carbon_monitoring_data table
CREATE TABLE IF NOT EXISTS carbon_monitoring_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID NOT NULL REFERENCES carbon_projects(id) ON DELETE CASCADE,
    monitoring_date DATE NOT NULL,
    carbon_sequestration_actual DECIMAL(15,2), -- ton CO2e (actual)
    carbon_sequestration_target DECIMAL(15,2), -- ton CO2e (target for this period)
    forest_cover_ha DECIMAL(10,2), -- hectares of forest cover
    deforestation_rate DECIMAL(5,2), -- percentage (0-100)
    community_participation_count INTEGER, -- number of community participants
    carbon_credits_issued DECIMAL(15,2), -- number of carbon credits issued
    carbon_credits_sold DECIMAL(15,2), -- number of carbon credits sold
    revenue_generated DECIMAL(15,2), -- revenue in IDR
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(carbon_project_id, monitoring_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_carbon_monitoring_project ON carbon_monitoring_data(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_carbon_monitoring_date ON carbon_monitoring_data(monitoring_date DESC);
CREATE INDEX IF NOT EXISTS idx_carbon_monitoring_recorded_by ON carbon_monitoring_data(recorded_by);

-- Enable Row Level Security (RLS)
ALTER TABLE carbon_monitoring_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- All authenticated users can view monitoring data (transparency)
CREATE POLICY "Authenticated users can view carbon monitoring data" ON carbon_monitoring_data
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admin, carbon_specialist, and monev_officer can insert monitoring data
CREATE POLICY "Authorized roles can insert carbon monitoring data" ON carbon_monitoring_data
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'carbon_specialist', 'monev_officer')
        )
    );

-- Only admin, carbon_specialist, and monev_officer can update monitoring data
CREATE POLICY "Authorized roles can update carbon monitoring data" ON carbon_monitoring_data
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'carbon_specialist', 'monev_officer')
        )
    );

-- Only admin can delete monitoring data (for data integrity)
CREATE POLICY "Only admin can delete carbon monitoring data" ON carbon_monitoring_data
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_carbon_monitoring_data_updated_at ON carbon_monitoring_data;
CREATE TRIGGER update_carbon_monitoring_data_updated_at
    BEFORE UPDATE ON carbon_monitoring_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger (if audit_trigger_function exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'audit_trigger_function'
    ) THEN
        DROP TRIGGER IF EXISTS audit_carbon_monitoring_data ON carbon_monitoring_data;
        CREATE TRIGGER audit_carbon_monitoring_data
            AFTER INSERT OR UPDATE OR DELETE ON carbon_monitoring_data
            FOR EACH ROW
            EXECUTE FUNCTION audit_trigger_function();
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE carbon_monitoring_data IS 'Stores monitoring data for carbon projects including carbon sequestration, forest cover, deforestation rate, and community participation';
COMMENT ON COLUMN carbon_monitoring_data.carbon_project_id IS 'References carbon_projects.id - the carbon project being monitored';
COMMENT ON COLUMN carbon_monitoring_data.monitoring_date IS 'Date of monitoring data collection';
COMMENT ON COLUMN carbon_monitoring_data.carbon_sequestration_actual IS 'Actual carbon sequestration measured (ton CO2e)';
COMMENT ON COLUMN carbon_monitoring_data.carbon_sequestration_target IS 'Target carbon sequestration for this monitoring period (ton CO2e)';
COMMENT ON COLUMN carbon_monitoring_data.forest_cover_ha IS 'Forest cover in hectares at monitoring date';
COMMENT ON COLUMN carbon_monitoring_data.deforestation_rate IS 'Deforestation rate as percentage (0-100)';
COMMENT ON COLUMN carbon_monitoring_data.community_participation_count IS 'Number of community participants involved in the project';
COMMENT ON COLUMN carbon_monitoring_data.carbon_credits_issued IS 'Number of carbon credits issued for this period';
COMMENT ON COLUMN carbon_monitoring_data.carbon_credits_sold IS 'Number of carbon credits sold for this period';
COMMENT ON COLUMN carbon_monitoring_data.revenue_generated IS 'Revenue generated from carbon credit sales (IDR)';
COMMENT ON COLUMN carbon_monitoring_data.notes IS 'Additional notes or observations';
COMMENT ON COLUMN carbon_monitoring_data.recorded_by IS 'References profiles.id - user who recorded this monitoring data';
COMMENT ON COLUMN carbon_monitoring_data.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN carbon_monitoring_data.updated_at IS 'Timestamp when the record was last updated';

-- Create a view for carbon project progress summary
CREATE OR REPLACE VIEW carbon_project_progress AS
SELECT 
    cp.id AS carbon_project_id,
    cp.kode_project,
    cp.nama_project,
    cp.standar_karbon,
    cp.estimasi_penyimpanan_karbon AS target_total_co2,
    cp.luas_total_ha,
    cp.status,
    COUNT(cmd.id) AS monitoring_count,
    MAX(cmd.monitoring_date) AS last_monitoring_date,
    COALESCE(SUM(cmd.carbon_sequestration_actual), 0) AS total_actual_co2,
    CASE 
        WHEN cp.estimasi_penyimpanan_karbon > 0 
        THEN ROUND((COALESCE(SUM(cmd.carbon_sequestration_actual), 0) / cp.estimasi_penyimpanan_karbon) * 100, 2)
        ELSE 0 
    END AS progress_percentage,
    COALESCE(AVG(cmd.deforestation_rate), 0) AS avg_deforestation_rate,
    COALESCE(MAX(cmd.forest_cover_ha), cp.luas_total_ha) AS latest_forest_cover,
    COALESCE(SUM(cmd.carbon_credits_issued), 0) AS total_credits_issued,
    COALESCE(SUM(cmd.carbon_credits_sold), 0) AS total_credits_sold,
    COALESCE(SUM(cmd.revenue_generated), 0) AS total_revenue
FROM carbon_projects cp
LEFT JOIN carbon_monitoring_data cmd ON cp.id = cmd.carbon_project_id
GROUP BY cp.id, cp.kode_project, cp.nama_project, cp.standar_karbon, cp.estimasi_penyimpanan_karbon, cp.luas_total_ha, cp.status;

-- Add comment for the view
COMMENT ON VIEW carbon_project_progress IS 'Summary view showing progress of carbon projects including monitoring data aggregation';

-- Create a function to get carbon project monitoring timeline
CREATE OR REPLACE FUNCTION get_carbon_project_monitoring_timeline(project_id UUID)
RETURNS TABLE (
    monitoring_date DATE,
    carbon_sequestration_actual DECIMAL(15,2),
    carbon_sequestration_target DECIMAL(15,2),
    forest_cover_ha DECIMAL(10,2),
    deforestation_rate DECIMAL(5,2),
    cumulative_co2 DECIMAL(15,2),
    progress_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cmd.monitoring_date,
        cmd.carbon_sequestration_actual,
        cmd.carbon_sequestration_target,
        cmd.forest_cover_ha,
        cmd.deforestation_rate,
        SUM(cmd.carbon_sequestration_actual) OVER (ORDER BY cmd.monitoring_date) AS cumulative_co2,
        CASE 
            WHEN cp.estimasi_penyimpanan_karbon > 0 
            THEN ROUND((SUM(cmd.carbon_sequestration_actual) OVER (ORDER BY cmd.monitoring_date) / cp.estimasi_penyimpanan_karbon) * 100, 2)
            ELSE 0 
        END AS progress_percentage
    FROM carbon_monitoring_data cmd
    JOIN carbon_projects cp ON cmd.carbon_project_id = cp.id
    WHERE cmd.carbon_project_id = project_id
    ORDER BY cmd.monitoring_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for the function
COMMENT ON FUNCTION get_carbon_project_monitoring_timeline(UUID) IS 'Returns monitoring timeline for a specific carbon project with cumulative calculations';
