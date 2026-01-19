-- Migration: Create benefit_distributions table for carbon project benefit sharing mechanism
-- Date: 2026-01-21
-- Description: Tracks distribution of carbon credit revenue to stakeholders (community, government, investors, etc.)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create benefit_distributions table
CREATE TABLE IF NOT EXISTS benefit_distributions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carbon_project_id UUID NOT NULL REFERENCES carbon_projects(id) ON DELETE CASCADE,
    stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
    distribution_date DATE NOT NULL,
    distribution_type VARCHAR(50) NOT NULL CHECK (distribution_type IN ('REVENUE_SHARE', 'COMMUNITY_FUND', 'GOVERNMENT_TAX', 'INVESTOR_DIVIDEND', 'OPERATIONAL_COST', 'OTHER')),
    amount DECIMAL(15,2) NOT NULL, -- amount in IDR
    percentage DECIMAL(5,2) CHECK (percentage >= 0 AND percentage <= 100), -- percentage of total revenue
    description TEXT,
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
    payment_method VARCHAR(50) CHECK (payment_method IN ('BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET', 'OTHER')),
    transaction_reference VARCHAR(255),
    proof_url TEXT, -- URL to payment proof document
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_benefit_distributions_project ON benefit_distributions(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_benefit_distributions_date ON benefit_distributions(distribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_benefit_distributions_stakeholder ON benefit_distributions(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_benefit_distributions_status ON benefit_distributions(payment_status);
CREATE INDEX IF NOT EXISTS idx_benefit_distributions_type ON benefit_distributions(distribution_type);

-- Enable Row Level Security (RLS)
ALTER TABLE benefit_distributions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- All authenticated users can view benefit distributions (transparency)
CREATE POLICY "Authenticated users can view benefit distributions" ON benefit_distributions
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admin, carbon_specialist, and finance roles can insert benefit distributions
CREATE POLICY "Authorized roles can insert benefit distributions" ON benefit_distributions
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'carbon_specialist', 'finance_officer')
        )
    );

-- Only admin, carbon_specialist, and finance roles can update benefit distributions
CREATE POLICY "Authorized roles can update benefit distributions" ON benefit_distributions
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'carbon_specialist', 'finance_officer')
        )
    );

-- Only admin can delete benefit distributions (for data integrity)
CREATE POLICY "Only admin can delete benefit distributions" ON benefit_distributions
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
DROP TRIGGER IF EXISTS update_benefit_distributions_updated_at ON benefit_distributions;
CREATE TRIGGER update_benefit_distributions_updated_at
    BEFORE UPDATE ON benefit_distributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger (if audit_trigger_function exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'audit_trigger_function'
    ) THEN
        DROP TRIGGER IF EXISTS audit_benefit_distributions ON benefit_distributions;
        CREATE TRIGGER audit_benefit_distributions
            AFTER INSERT OR UPDATE OR DELETE ON benefit_distributions
            FOR EACH ROW
            EXECUTE FUNCTION audit_trigger_function();
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE benefit_distributions IS 'Tracks distribution of carbon credit revenue to various stakeholders (community, government, investors, etc.)';
COMMENT ON COLUMN benefit_distributions.carbon_project_id IS 'References carbon_projects.id - the carbon project generating revenue';
COMMENT ON COLUMN benefit_distributions.stakeholder_id IS 'References stakeholders.id - the stakeholder receiving the benefit (optional)';
COMMENT ON COLUMN benefit_distributions.distribution_date IS 'Date when distribution was made or scheduled';
COMMENT ON COLUMN benefit_distributions.distribution_type IS 'Type of distribution: REVENUE_SHARE, COMMUNITY_FUND, GOVERNMENT_TAX, INVESTOR_DIVIDEND, OPERATIONAL_COST, OTHER';
COMMENT ON COLUMN benefit_distributions.amount IS 'Amount distributed in IDR';
COMMENT ON COLUMN benefit_distributions.percentage IS 'Percentage of total revenue distributed (0-100)';
COMMENT ON COLUMN benefit_distributions.description IS 'Description of the distribution';
COMMENT ON COLUMN benefit_distributions.payment_status IS 'Payment status: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED';
COMMENT ON COLUMN benefit_distributions.payment_method IS 'Payment method used: BANK_TRANSFER, CASH, DIGITAL_WALLET, OTHER';
COMMENT ON COLUMN benefit_distributions.transaction_reference IS 'Bank transaction reference or payment ID';
COMMENT ON COLUMN benefit_distributions.proof_url IS 'URL to payment proof document (receipt, bank statement, etc.)';
COMMENT ON COLUMN benefit_distributions.recorded_by IS 'References profiles.id - user who recorded this distribution';
COMMENT ON COLUMN benefit_distributions.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN benefit_distributions.updated_at IS 'Timestamp when the record was last updated';

-- Create a view for benefit distribution summary by project
CREATE OR REPLACE VIEW benefit_distribution_summary AS
SELECT 
    cp.id AS carbon_project_id,
    cp.kode_project,
    cp.nama_project,
    COUNT(bd.id) AS total_distributions,
    SUM(bd.amount) AS total_amount_distributed,
    AVG(bd.percentage) AS avg_distribution_percentage,
    COUNT(DISTINCT bd.stakeholder_id) AS unique_stakeholders,
    SUM(CASE WHEN bd.payment_status = 'COMPLETED' THEN bd.amount ELSE 0 END) AS completed_amount,
    SUM(CASE WHEN bd.payment_status = 'PENDING' THEN bd.amount ELSE 0 END) AS pending_amount,
    MAX(bd.distribution_date) AS last_distribution_date
FROM carbon_projects cp
LEFT JOIN benefit_distributions bd ON cp.id = bd.carbon_project_id
GROUP BY cp.id, cp.kode_project, cp.nama_project;

-- Add comment for the view
COMMENT ON VIEW benefit_distribution_summary IS 'Summary view showing benefit distribution totals and statistics by carbon project';

-- Create a function to calculate benefit distribution breakdown by type
CREATE OR REPLACE FUNCTION get_benefit_distribution_breakdown(project_id UUID)
RETURNS TABLE (
    distribution_type VARCHAR(50),
    total_amount DECIMAL(15,2),
    average_percentage DECIMAL(5,2),
    distribution_count BIGINT,
    completed_amount DECIMAL(15,2),
    pending_amount DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bd.distribution_type,
        COALESCE(SUM(bd.amount), 0) AS total_amount,
        COALESCE(AVG(bd.percentage), 0) AS average_percentage,
        COUNT(bd.id) AS distribution_count,
        COALESCE(SUM(CASE WHEN bd.payment_status = 'COMPLETED' THEN bd.amount ELSE 0 END), 0) AS completed_amount,
        COALESCE(SUM(CASE WHEN bd.payment_status = 'PENDING' THEN bd.amount ELSE 0 END), 0) AS pending_amount
    FROM benefit_distributions bd
    WHERE bd.carbon_project_id = project_id
    GROUP BY bd.distribution_type
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for the function
COMMENT ON FUNCTION get_benefit_distribution_breakdown(UUID) IS 'Returns benefit distribution breakdown by type for a specific carbon project';

-- Create a view for stakeholder benefit summary
CREATE OR REPLACE VIEW stakeholder_benefit_summary AS
SELECT 
    s.id AS stakeholder_id,
    s.nama AS stakeholder_name,
    s.peran AS stakeholder_role,
    s.kategori AS stakeholder_category,
    cp.id AS carbon_project_id,
    cp.kode_project,
    cp.nama_project,
    COUNT(bd.id) AS total_distributions,
    SUM(bd.amount) AS total_amount_received,
    AVG(bd.percentage) AS avg_distribution_percentage,
    MAX(bd.distribution_date) AS last_distribution_date
FROM stakeholders s
JOIN carbon_projects cp ON s.carbon_project_id = cp.id
LEFT JOIN benefit_distributions bd ON s.id = bd.stakeholder_id
GROUP BY s.id, s.nama, s.peran, s.kategori, cp.id, cp.kode_project, cp.nama_project;

-- Add comment for the view
COMMENT ON VIEW stakeholder_benefit_summary IS 'Summary view showing benefits received by each stakeholder across carbon projects';
