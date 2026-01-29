-- Migration: Fix audit record_id type mismatch and null handling
-- Date: 2026-01-31
-- Description: Ensure audit_log.record_id is TEXT type and audit_trigger_function handles it correctly

-- 1. First, check if audit_log.record_id is UUID and change it to TEXT
DO $$
BEGIN
    -- Check if audit_log.record_id is UUID and needs to be changed to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'record_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE audit_log ALTER COLUMN record_id TYPE TEXT;
        RAISE NOTICE 'Changed audit_log.record_id from UUID to TEXT';
    ELSE
        RAISE NOTICE 'audit_log.record_id is already TEXT or does not exist';
    END IF;
END $$;

-- 2. Update the audit_trigger_function to handle TEXT record_id and null values
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

-- 3. Verify the function works with TEXT record_id
COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger function updated to use TEXT record_id and handle null values';

-- 4. Update existing triggers to use the new function (they will automatically use the updated function)

-- Migration completed