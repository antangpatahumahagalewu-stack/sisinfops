-- Migration: Add carbon credits summary function
-- Date: 2026-01-18
-- Description: Create RPC function get_carbon_credits_summary for dashboard statistics

CREATE OR REPLACE FUNCTION get_carbon_credits_summary()
RETURNS TABLE(
    total DECIMAL,
    issued DECIMAL,
    retired DECIMAL,
    value DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(cc.quantity), 0) AS total,
        COALESCE(SUM(CASE WHEN cc.status = 'issued' THEN cc.quantity ELSE 0 END), 0) AS issued,
        COALESCE(SUM(CASE WHEN cc.status = 'retired' THEN cc.quantity ELSE 0 END), 0) AS retired,
        COALESCE(SUM(cc.quantity) * 10, 0) AS value -- Assuming $10 per ton for estimated value
    FROM carbon_credits cc;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_carbon_credits_summary() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_carbon_credits_summary() IS 'Returns summary statistics for carbon credits dashboard (total, issued, retired, estimated value)';
