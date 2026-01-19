-- Migration: Fix stakeholders table for carbon_project_id column
-- Date: 2026-01-22
-- Description: Add carbon_project_id column to stakeholders table if it doesn't exist
--              and ensure foreign key constraint to carbon_projects table.
--              This fixes the error in benefit_distributions migration.

-- 1. Add carbon_project_id column to stakeholders if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stakeholders' 
        AND column_name = 'carbon_project_id'
    ) THEN
        ALTER TABLE stakeholders ADD COLUMN carbon_project_id UUID;
    END IF;
END $$;

-- 2. Add foreign key constraint if column exists and constraint doesn't exist
DO $$ 
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stakeholders' 
        AND column_name = 'carbon_project_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stakeholders_carbon_project_id_fkey'
    ) THEN
        -- Check if carbon_projects table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects'
        ) THEN
            ALTER TABLE stakeholders 
            ADD CONSTRAINT stakeholders_carbon_project_id_fkey 
            FOREIGN KEY (carbon_project_id) REFERENCES carbon_projects(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Create index for performance if column exists and index doesn't exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stakeholders' 
        AND column_name = 'carbon_project_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'stakeholders' 
        AND indexname = 'idx_stakeholders_carbon_project'
    ) THEN
        CREATE INDEX idx_stakeholders_carbon_project ON stakeholders(carbon_project_id);
    END IF;
END $$;

-- 4. Update RLS policies (ensure they exist)
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Stakeholders readable by authenticated users" ON stakeholders;
DROP POLICY IF EXISTS "Stakeholders manageable by admin and carbon_specialist" ON stakeholders;

-- Recreate RLS policies
CREATE POLICY "Stakeholders readable by authenticated users" ON stakeholders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Stakeholders manageable by admin and carbon_specialist" ON stakeholders
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'carbon_specialist')
        )
    );
