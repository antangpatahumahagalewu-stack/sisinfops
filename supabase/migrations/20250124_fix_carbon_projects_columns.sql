-- Migration: Fix missing columns in carbon_projects table
-- Date: 2025-01-24
-- Description: Ensure all required columns exist in carbon_projects table for seed data to work
-- PRINCIPLE: Additive only, safe to run multiple times

DO $$ 
BEGIN
    -- Check if carbon_projects table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_projects'
    ) THEN
        -- 1. Add kode_project column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'kode_project'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN kode_project VARCHAR(50);
            -- Update existing rows with a temporary code
            UPDATE carbon_projects SET kode_project = 'CP-TEMP-' || id WHERE kode_project IS NULL;
            -- Make it NOT NULL and add unique constraint
            ALTER TABLE carbon_projects ALTER COLUMN kode_project SET NOT NULL;
            
            -- Check if constraint already exists before adding
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'carbon_projects_kode_project_unique'
            ) THEN
                ALTER TABLE carbon_projects ADD CONSTRAINT carbon_projects_kode_project_unique UNIQUE (kode_project);
            END IF;
        END IF;
        
        -- 2. Add nama_project if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'nama_project'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN nama_project VARCHAR(255);
            UPDATE carbon_projects SET nama_project = 'Proyek Karbon ' || id WHERE nama_project IS NULL;
            ALTER TABLE carbon_projects ALTER COLUMN nama_project SET NOT NULL;
        END IF;
        
        -- 3. Add standar_karbon if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'standar_karbon'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN standar_karbon VARCHAR(50);
            -- Add constraint if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'carbon_projects_standar_karbon_check'
            ) THEN
                ALTER TABLE carbon_projects ADD CONSTRAINT carbon_projects_standar_karbon_check 
                    CHECK (standar_karbon IN ('VERRA', 'GOLD_STANDARD', 'INDONESIA', 'OTHER'));
            END IF;
        END IF;
        
        -- 4. Add metodologi if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'metodologi'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN metodologi VARCHAR(255);
        END IF;
        
        -- 5. Add luas_total_ha if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'luas_total_ha'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN luas_total_ha DECIMAL(10,2);
        END IF;
        
        -- 6. Add estimasi_penyimpanan_karbon if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'estimasi_penyimpanan_karbon'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN estimasi_penyimpanan_karbon DECIMAL(15,2);
        END IF;
        
        -- 7. Add tanggal_mulai if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'tanggal_mulai'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN tanggal_mulai DATE;
        END IF;
        
        -- 8. Add tanggal_selesai if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'tanggal_selesai'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN tanggal_selesai DATE;
        END IF;
        
        -- 9. Add status if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'status'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
            -- Add constraint if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'carbon_projects_status_check'
            ) THEN
                ALTER TABLE carbon_projects ADD CONSTRAINT carbon_projects_status_check 
                    CHECK (status IN ('draft', 'approved', 'active', 'suspended', 'completed', 'archived'));
            END IF;
        END IF;
        
        -- 10. Add created_by if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_projects' 
            AND column_name = 'created_by'
        ) THEN
            ALTER TABLE carbon_projects ADD COLUMN created_by UUID REFERENCES profiles(id);
        END IF;
        
        RAISE NOTICE 'Successfully ensured all required columns exist in carbon_projects table';
    ELSE
        RAISE NOTICE 'carbon_projects table does not exist yet. Run the 20250120_create_carbon_management_tables migration first.';
    END IF;
END $$;

-- ============================================
-- MIGRATION SUCCESS MESSAGE
-- ============================================
-- This migration ensures all required columns exist in the carbon_projects table
-- before attempting to insert seed data. It's safe to run multiple times.
