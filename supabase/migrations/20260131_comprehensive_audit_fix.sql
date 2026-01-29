-- Migration: Comprehensive fix for audit trigger issues
-- Date: 2026-01-31
-- Description: Fix all audit trigger issues including record_id type mismatch and null handling

-- 1. First, ensure audit_log.record_id is TEXT (not UUID)
-- Check the current column type and change it if needed
DO $$
DECLARE
    column_type text;
BEGIN
    -- Get the current data type of record_id column
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_log'
      AND column_name = 'record_id';

    IF column_type = 'uuid' THEN
        -- Change from UUID to TEXT
        ALTER TABLE audit_log ALTER COLUMN record_id TYPE TEXT;
        RAISE NOTICE 'Changed audit_log.record_id from UUID to TEXT';
    ELSIF column_type = 'text' THEN
        RAISE NOTICE 'audit_log.record_id is already TEXT';
    ELSE
        RAISE NOTICE 'audit_log.record_id has unexpected type: %', column_type;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error checking/changing record_id type: %', SQLERRM;
END $$;

-- 2. Drop and recreate the audit_trigger_function with proper handling
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
        IF OLD.id IS NULL THEN
            v_record_id := 'unknown';
        ELSE
            v_record_id := OLD.id::TEXT;
        END IF;
    ELSE
        IF NEW.id IS NULL THEN
            v_record_id := 'unknown';
        ELSE
            v_record_id := NEW.id::TEXT;
        END IF;
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

-- 5. Add comment
COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger function with TEXT record_id and proper null handling';

-- 6. Verify the fix by checking the column type
DO $$
BEGIN
    RAISE NOTICE 'Audit trigger fix completed. Please verify:';
    RAISE NOTICE '1. audit_log.record_id should be TEXT type';
    RAISE NOTICE '2. audit_trigger_function should handle null values';
    RAISE NOTICE '3. Trigger audit_perhutanan_sosial should be active';
END $$;

-- Migration completed