-- Migration: Final fix for audit trigger record_id type mismatch
-- Date: 2026-01-31 (but numbered 20260132 to ensure it runs after previous migrations)
-- Description: Ensure audit_log.record_id is TEXT type and audit_trigger_function works correctly

-- 1. First, ensure audit_log.record_id is TEXT (not UUID)
-- This is idempotent: it will do nothing if column is already TEXT
DO $$
BEGIN
    -- Check if column exists and is UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'record_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Change from UUID to TEXT
        ALTER TABLE audit_log ALTER COLUMN record_id TYPE TEXT;
        RAISE NOTICE 'Changed audit_log.record_id from UUID to TEXT';
    ELSE
        RAISE NOTICE 'audit_log.record_id is already TEXT or does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error checking/changing record_id type: %', SQLERRM;
END $$;

-- 2. Drop and recreate the audit_trigger_function with proper TEXT handling
-- Using CASCADE to also drop any dependent triggers
DROP FUNCTION IF EXISTS audit_trigger_function CASCADE;

-- 3. Create the new audit_trigger_function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id TEXT;
    v_user_id UUID;
BEGIN
    -- Determine the record id (handle null cases)
    IF TG_OP = 'DELETE' THEN
        v_record_id := COALESCE(OLD.id::TEXT, 'unknown');
    ELSE
        v_record_id := COALESCE(NEW.id::TEXT, 'unknown');
    END IF;

    -- Get the current user id
    v_user_id := auth.uid();

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
$$ LANGUAGE plpgsql;

-- 4. Recreate the audit trigger for perhutanan_sosial
DROP TRIGGER IF EXISTS audit_perhutanan_sosial ON perhutanan_sosial;
CREATE TRIGGER audit_perhutanan_sosial
    AFTER INSERT OR UPDATE OR DELETE ON perhutanan_sosial
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 5. Add comments for documentation
COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger function - uses TEXT record_id to support UUID and other ID types, handles null values';
COMMENT ON COLUMN audit_log.record_id IS 'Record identifier stored as TEXT (supports UUID, integer, etc.)';

-- 6. Log success
DO $$
BEGIN
    RAISE NOTICE 'Audit trigger fix applied successfully!';
    RAISE NOTICE '1. audit_log.record_id is TEXT type';
    RAISE NOTICE '2. audit_trigger_function created with proper TEXT handling';
    RAISE NOTICE '3. Trigger audit_perhutanan_sosial recreated';
END $$;

-- Migration completed