-- Migration: Fix audit trigger for integer IDs
-- Date: 2026-01-30
-- Description: Fix the audit_trigger_function to support both UUID and integer record IDs

-- 1. First, change the audit_log.record_id column from UUID to TEXT
--    This allows storing both UUIDs and integer IDs as text
ALTER TABLE audit_log 
ALTER COLUMN record_id TYPE TEXT;

-- 2. Update the audit_trigger_function to handle TEXT record_id
--    The function will cast any ID type to text
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 3. Update existing audit triggers to use the new function
--    Note: The triggers already exist and will use the updated function automatically
--    because we used CREATE OR REPLACE

-- 4. Comment
COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger function updated to support both UUID and integer IDs by storing record_id as TEXT';

-- Migration completed