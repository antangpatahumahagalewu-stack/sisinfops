-- Migration: Fix audit trigger for null record_id
-- Date: 2026-01-31
-- Description: Fix the audit_trigger_function to handle cases where id might be null

-- 1. Update the audit_trigger_function to handle null record_id
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

    -- Log a warning if the id is null (for debugging)
    IF (TG_OP = 'DELETE' AND OLD.id IS NULL) OR (TG_OP != 'DELETE' AND NEW.id IS NULL) THEN
        RAISE WARNING 'audit_trigger_function: id is null for table %', TG_TABLE_NAME;
    END IF;

    -- Insert the audit log
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

-- 2. Comment
COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger function updated to handle null record_id by setting it to unknown';

-- Migration completed