-- UNIFY PRICE LIST TABLES: ENHANCE price_list TABLE
-- Created: 2026-02-05 08:59 AM (Updated to match actual structure)
-- Purpose: Add missing columns to price_list table from master_price_list
--          Make price_list the single source of truth for all price data

BEGIN;

-- ====================================================================
-- PART 1: ENHANCE price_list TABLE WITH ADDITIONAL COLUMNS
-- ====================================================================

-- Add missing columns to price_list table to match master_price_list features
DO $$
BEGIN
    -- Add item_category if not exists (map to existing category column if it exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'item_category') THEN
        ALTER TABLE price_list ADD COLUMN item_category VARCHAR(100) DEFAULT 'MATERIAL';
        RAISE NOTICE '✅ Added item_category column to price_list';
    END IF;

    -- Add validity_start if not exists (map to existing valid_from if it exists)  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'validity_start') THEN
        ALTER TABLE price_list ADD COLUMN validity_start DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE '✅ Added validity_start column to price_list';
    END IF;

    -- Add validity_until if not exists (map to existing valid_until if it exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'validity_until') THEN
        ALTER TABLE price_list ADD COLUMN validity_until DATE;
        RAISE NOTICE '✅ Added validity_until column to price_list';
    END IF;

    -- Add version if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'version') THEN
        ALTER TABLE price_list ADD COLUMN version INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Added version column to price_list';
    END IF;

    -- Add approval_status if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'approval_status') THEN
        ALTER TABLE price_list ADD COLUMN approval_status VARCHAR(50) DEFAULT 'APPROVED';
        RAISE NOTICE '✅ Added approval_status column to price_list';
    END IF;

    -- Add created_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'created_by') THEN
        ALTER TABLE price_list ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added created_by column to price_list';
    END IF;

    -- Add approved_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'approved_by') THEN
        ALTER TABLE price_list ADD COLUMN approved_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added approved_by column to price_list';
    END IF;

    -- Add updated_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'price_list' AND column_name = 'updated_at') THEN
        ALTER TABLE price_list ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to price_list';
    END IF;
END $$;

-- ====================================================================
-- PART 2: COPY DATA FROM master_price_list TO price_list (if needed)
-- ====================================================================

-- Copy data from master_price_list to price_list for any missing items
-- This ensures all data is in the single price_list table
DO $$
DECLARE
    copied_count INTEGER;
BEGIN
    INSERT INTO price_list (
        item_code, 
        item_name, 
        item_description,
        category,
        unit,
        unit_price,
        currency,
        valid_from,
        valid_until,
        version,
        is_active,
        approval_status,
        created_by,
        created_at,
        updated_at
    )
    SELECT 
        m.item_code,
        m.item_name,
        m.item_description,
        m.item_category,
        COALESCE(m.unit, 'pcs'), -- default unit
        m.price,
        COALESCE(m.currency, 'IDR'), -- default currency
        m.created_at::DATE,
        NULL, -- no validity end
        1,
        true,
        'APPROVED',
        NULL,
        m.created_at,
        m.created_at
    FROM master_price_list m
    WHERE NOT EXISTS (
        SELECT 1 FROM price_list p 
        WHERE p.item_code = m.item_code OR p.item_name = m.item_name
    )
    ON CONFLICT (item_code) DO NOTHING;
    
    GET DIAGNOSTICS copied_count = ROW_COUNT;
    RAISE NOTICE '📊 Copied % items from master_price_list to price_list', copied_count;
END $$;

-- ====================================================================
-- PART 3: UPDATE EXISTING DATA IN price_list
-- ====================================================================

-- First, map existing category column to item_category if needed
DO $$
BEGIN
    -- If category column exists but item_category doesn't, copy data
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'price_list' AND column_name = 'category') THEN
        UPDATE price_list 
        SET item_category = category
        WHERE item_category IS NULL AND category IS NOT NULL;
        RAISE NOTICE '✅ Mapped existing category column to item_category';
    END IF;
    
    -- If valid_from column exists but validity_start doesn't, copy data
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'price_list' AND column_name = 'valid_from') THEN
        UPDATE price_list 
        SET validity_start = valid_from::DATE
        WHERE validity_start IS NULL AND valid_from IS NOT NULL;
        RAISE NOTICE '✅ Mapped existing valid_from column to validity_start';
    END IF;
    
    -- If valid_until column exists but validity_until doesn't, copy data
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'price_list' AND column_name = 'valid_until') THEN
        UPDATE price_list 
        SET validity_until = valid_until::DATE
        WHERE validity_until IS NULL AND valid_until IS NOT NULL;
        RAISE NOTICE '✅ Mapped existing valid_until column to validity_until';
    END IF;
END $$;

-- Set default values for newly added columns on existing rows
UPDATE price_list 
SET 
    item_category = COALESCE(item_category, 'MATERIAL'),
    version = COALESCE(version, 1),
    approval_status = COALESCE(approval_status, 'APPROVED'),
    validity_start = COALESCE(validity_start, CURRENT_DATE),
    updated_at = COALESCE(updated_at, created_at)
WHERE 
    item_category IS NULL OR 
    version IS NULL OR 
    approval_status IS NULL OR 
    validity_start IS NULL;

RAISE NOTICE '✅ Updated existing price_list rows with default values';

-- ====================================================================
-- PART 4: CREATE TRIGGER FOR UPDATED_AT
-- ====================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_price_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for price_list
DROP TRIGGER IF EXISTS update_price_list_updated_at ON price_list;
CREATE TRIGGER update_price_list_updated_at
    BEFORE UPDATE ON price_list
    FOR EACH ROW
    EXECUTE FUNCTION update_price_list_updated_at();

RAISE NOTICE '✅ Created updated_at trigger for price_list';

-- ====================================================================
-- PART 5: UPDATE FOREIGN KEY IN program_budget_items
-- ====================================================================

-- Ensure program_budget_items references price_list
DO $$
BEGIN
    -- Check if foreign key already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'program_budget_items' 
        AND constraint_name = 'program_budget_items_price_list_id_fkey'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE program_budget_items 
        ADD CONSTRAINT program_budget_items_price_list_id_fkey 
        FOREIGN KEY (price_list_id) REFERENCES price_list(id) ON DELETE RESTRICT;
        
        RAISE NOTICE '✅ Added foreign key constraint to program_budget_items';
    END IF;
END $$;

-- ====================================================================
-- PART 6: VERIFICATION AND SUMMARY
-- ====================================================================

DO $$
DECLARE
    price_list_count INTEGER;
    price_list_cols JSONB;
BEGIN
    -- Count rows in price_list
    SELECT COUNT(*) INTO price_list_count FROM price_list;
    
    -- Get column information
    SELECT jsonb_agg(
        jsonb_build_object(
            'column_name', column_name,
            'data_type', data_type,
            'is_nullable', is_nullable
        )
    ) INTO price_list_cols
    FROM information_schema.columns 
    WHERE table_name = 'price_list' 
    ORDER BY ordinal_position;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PRICE LIST UNIFICATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Enhanced table: price_list';
    RAISE NOTICE 'Total rows: %', price_list_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Columns added/enhanced:';
    RAISE NOTICE '  ✅ item_category (for categorization)';
    RAISE NOTICE '  ✅ validity_start & validity_until (period validity)';
    RAISE NOTICE '  ✅ version (for tracking changes)';
    RAISE NOTICE '  ✅ approval_status (workflow support)';
    RAISE NOTICE '  ✅ created_by & approved_by (audit trail)';
    RAISE NOTICE '  ✅ updated_at (with auto-update trigger)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Update API endpoints to use ONLY price_list table';
    RAISE NOTICE '  2. Update frontend components to use /api/price-list';
    RAISE NOTICE '  3. Test data synchronization end-to-end';
    RAISE NOTICE '  4. Consider dropping master_price_list table if no longer needed';
    RAISE NOTICE '=========================================';
END $$;

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;
