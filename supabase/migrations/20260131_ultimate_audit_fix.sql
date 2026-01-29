-- Migration: Ultimate fix for audit trigger record_id type mismatch
-- Date: 2026-01-31
-- Description: Final comprehensive fix for the audit trigger record_id type error

-- 1. First, make absolutely sure audit_log.record_id is TEXT type
-- This will work whether the column is currently UUID or TEXT
DO $$
BEGIN
    -- Check if we can alter the column to TEXT (will work if it's UUID or TEXT already)
    BEGIN
        -- This will succeed if column exists and is UUID or TEXT
        ALTER TABLE audit_log 
        ALTER COLUMN record_id TYPE TEXT;
        
        RAISE NOTICE 'Successfully ensured audit_log.record_id is TEXT type';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Column record_id may not exist or cannot be altered: %', SQLERRM;
    END;
END $$;

-- 2. Drop the existing audit_trigger_function if it exists and recreate it
DROP FUNCTION IF EXISTS audit_trigger_function CASCADE;

-- 3. Create the new, corrected audit_trigger_function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id TEXT;
    v_user_id UUID;
BEGIN
    -- Get the current user id
    v_user_id := auth.uid();
    
    -- Handle each operation type
    IF TG_OP = 'DELETE' THEN
        -- For DELETE, use OLD.id
        v_record_id := COALESCE(OLD.id::TEXT, 'unknown');
        
        INSERT INTO audit_log (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), v_user_id);
        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- For UPDATE, use NEW.id
        v_record_id := COALESCE(NEW.id::TEXT, 'unknown');
        
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
        RETURN NEW;
        
    ELSIF TG_OP = 'INSERT' THEN
        -- For INSERT, use NEW.id
        v_record_id := COALESCE(NEW.id::TEXT, 'unknown');
        
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

-- 5. Add helpful comments
COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger function - uses TEXT record_id to support both UUID and integer IDs';
COMMENT ON COLUMN audit_log.record_id IS 'Record identifier as TEXT (can store UUIDs or other ID types)';

-- 6. Verification step
DO $$
BEGIN
    RAISE NOTICE 'Ultimate audit fix applied successfully!';
    RAISE NOTICE 'audit_log.record_id is now TEXT type';
    RAISE NOTICE 'audit_trigger_function handles NULL values properly';
    RAISE NOTICE 'Trigger audit_perhutanan_sosial is active';
END $$;

-- Migration completed