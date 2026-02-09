-- Add missing columns to price_list table to match frontend requirements
-- Only add columns that are actually needed

DO $$
BEGIN
    -- Add updated_at if not exists (for tracking updates)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'updated_at') THEN
        ALTER TABLE price_list ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to price_list';
    END IF;

    -- Add version if not exists (for versioning)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'version') THEN
        ALTER TABLE price_list ADD COLUMN version INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Added version column to price_list';
    END IF;

    -- Add approval_status if not exists (for workflow)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'approval_status') THEN
        ALTER TABLE price_list ADD COLUMN approval_status VARCHAR(50) DEFAULT 'APPROVED';
        RAISE NOTICE '✅ Added approval_status column to price_list';
    END IF;

    -- Add created_by if not exists (for audit trail)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'created_by') THEN
        ALTER TABLE price_list ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added created_by column to price_list';
    END IF;

    -- Add approved_by if not exists (for audit trail)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'approved_by') THEN
        ALTER TABLE price_list ADD COLUMN approved_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added approved_by column to price_list';
    END IF;

    -- Note: We keep existing column names (category, valid_from, valid_until)
    -- because API and frontend already use these names
    -- This maintains backward compatibility
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MISSING COLUMNS ADDED SUCCESSFULLY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Columns added:';
    RAISE NOTICE '  ✅ updated_at (with default NOW())';
    RAISE NOTICE '  ✅ version (default 1)';
    RAISE NOTICE '  ✅ approval_status (default APPROVED)';
    RAISE NOTICE '  ✅ created_by (foreign key to auth.users)';
    RAISE NOTICE '  ✅ approved_by (foreign key to auth.users)';
    RAISE NOTICE '';
    RAISE NOTICE 'Existing columns preserved for compatibility:';
    RAISE NOTICE '  • category (not renamed to item_category)';
    RAISE NOTICE '  • valid_from (not renamed to validity_start)';
    RAISE NOTICE '  • valid_until (not renamed to validity_until)';
    RAISE NOTICE '=========================================';
END $$;

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_price_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_price_list_updated_at ON price_list;
CREATE TRIGGER update_price_list_updated_at
    BEFORE UPDATE ON price_list
    FOR EACH ROW
    EXECUTE FUNCTION update_price_list_updated_at();

RAISE NOTICE '✅ Created updated_at trigger for price_list';

-- Update existing rows with default values
UPDATE price_list 
SET 
    version = COALESCE(version, 1),
    approval_status = COALESCE(approval_status, 'APPROVED'),
    updated_at = COALESCE(updated_at, created_at);

RAISE NOTICE '✅ Updated existing rows with default values';

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');
