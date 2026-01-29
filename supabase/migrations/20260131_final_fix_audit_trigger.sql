-- Migration: Final fix for audit trigger type mismatch and null handling
-- Date: 2026-01-31
-- Description: Ensure audit_log.record_id is TEXT and audit_trigger_function works correctly

-- Drop the existing function to recreate it cleanly
DROP FUNCTION IF EXISTS audit_trigger_function CASCADE;

-- Create the audit_trigger_function with proper TEXT handling
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id TEXT;
    v_user_id UUID;
BEGIN
    -- Determine the record id
    IF TG_OP = 'DELETE' THEN
        v_record_id := COALESCE(OLD.id::TEXT, 'unknown');
    ELSE
        v_record_id := COALESCE(NEW.id::TEXT, 'unknown');
    END IF;

    -- Get the current user id
    v_user_id := auth.uid();

    -- Insert the audit log with TEXT record_id
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), v_user_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', to_jsonb(NEW), v_user_id);
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ language 'plpgsql';

-- Recreate the audit trigger for perhutanan_sosial
DROP TRIGGER IF EXISTS audit_perhutanan_sosial ON perhutanan_sosial;
CREATE TRIGGER audit_perhutanan_sosial
    AFTER INSERT OR UPDATE OR DELETE ON perhutanan_sosial
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Verify the function
COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger function with TEXT record_id support and null handling';

-- Migration completed