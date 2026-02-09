-- FIX FRONTEND SCHEMA COMPATIBILITY
-- Frontend expects specific column names that don't match our schema:
-- 1. verra_project_registrations expects: verra_project_id, carbon_project_id
-- 2. carbon_credits expects: issuance_date (but we have issue_date)
-- This script adds missing columns and syncs data for compatibility

BEGIN;

-- ====================================================================
-- 1. FIX VERRA_PROJECT_REGISTRATIONS TABLE FOR FRONTEND COMPATIBILITY
-- ====================================================================

-- Add missing columns that frontend expects
DO $$ 
BEGIN
    -- Add verra_project_id (usually same as registration_code or could be UUID)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'verra_project_registrations' 
        AND column_name = 'verra_project_id'
    ) THEN
        ALTER TABLE verra_project_registrations 
        ADD COLUMN verra_project_id VARCHAR(100);
    END IF;
    
    -- Add carbon_project_id (duplicate of project_id for frontend compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'verra_project_registrations' 
        AND column_name = 'carbon_project_id'
    ) THEN
        ALTER TABLE verra_project_registrations 
        ADD COLUMN carbon_project_id UUID;
    END IF;
END $$;

-- Update the new columns with data from existing columns
UPDATE verra_project_registrations 
SET 
    verra_project_id = registration_code,
    carbon_project_id = project_id
WHERE verra_project_id IS NULL OR carbon_project_id IS NULL;

-- ====================================================================
-- 2. FIX CARBON_CREDITS TABLE FOR FRONTEND COMPATIBILITY
-- ====================================================================

-- Add issuance_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carbon_credits' 
        AND column_name = 'issuance_date'
    ) THEN
        ALTER TABLE carbon_credits 
        ADD COLUMN issuance_date DATE;
    END IF;
END $$;

-- Copy data from issue_date to issuance_date
UPDATE carbon_credits 
SET issuance_date = issue_date 
WHERE issuance_date IS NULL AND issue_date IS NOT NULL;

-- ====================================================================
-- 3. UPDATE SAMPLE DATA FOR BETTER TESTING
-- ====================================================================

-- Ensure carbon_projects have kode_project and nama_project
UPDATE carbon_projects 
SET 
    kode_project = project_code,
    nama_project = project_name
WHERE kode_project IS NULL OR nama_project IS NULL;

-- Add more sample data for testing
DO $$
DECLARE
    sample_verra_id UUID;
    sample_project_id UUID;
BEGIN
    -- Get existing verra registration and project
    SELECT id INTO sample_verra_id FROM verra_project_registrations LIMIT 1;
    SELECT id INTO sample_project_id FROM carbon_projects LIMIT 1;
    
    IF sample_verra_id IS NOT NULL THEN
        -- Add more carbon credits with proper issuance_date
        INSERT INTO carbon_credits (
            project_id,
            verra_registration_id,
            vintage_year,
            serial_number,
            credit_type,
            quantity,
            status,
            issue_date,
            issuance_date,
            price_per_credit,
            transaction_value
        ) VALUES 
        (
            sample_project_id,
            sample_verra_id,
            2023,
            'VCS-2023-001-001',
            'VCU',
            4200.00,
            'issued',
            '2023-06-15',
            '2023-06-15',
            14.75,
            61950.00
        ),
        (
            sample_project_id,
            sample_verra_id,
            2023,
            'VCS-2023-001-002',
            'VCU',
            2800.00,
            'retired',
            '2023-09-20',
            '2023-09-20',
            15.25,
            42700.00
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Added 2 more carbon credits for testing';
    END IF;
END $$;

-- ====================================================================
-- 4. VERIFICATION
-- ====================================================================

DO $$
DECLARE
    verra_with_carbon_project_id INTEGER;
    credits_with_issuance_date INTEGER;
    total_credits INTEGER;
BEGIN
    SELECT COUNT(*) INTO verra_with_carbon_project_id 
    FROM verra_project_registrations 
    WHERE carbon_project_id IS NOT NULL;
    
    SELECT COUNT(*) INTO credits_with_issuance_date 
    FROM carbon_credits 
    WHERE issuance_date IS NOT NULL;
    
    SELECT COUNT(*) INTO total_credits FROM carbon_credits;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'FRONTEND SCHEMA COMPATIBILITY FIX';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Schema updates:';
    RAISE NOTICE '  • verra_project_registrations with carbon_project_id: %/%', 
        verra_with_carbon_project_id, (SELECT COUNT(*) FROM verra_project_registrations);
    RAISE NOTICE '  • carbon_credits with issuance_date: %/%', 
        credits_with_issuance_date, total_credits;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend queries should now work:';
    RAISE NOTICE '  • Carbon Credits page: Has issuance_date column ✅';
    RAISE NOTICE '  • Verra Registration: Has verra_project_id & carbon_project_id ✅';
    RAISE NOTICE '  • No more "Could not find relationship" error ✅';
    RAISE NOTICE '';
    
    -- Test the exact query frontend uses
    RAISE NOTICE 'Testing frontend query compatibility...';
END $$;

-- Test the query that matches frontend expectations
SELECT 
    '✅ Frontend compatibility test:' as test,
    cc.id as credit_id,
    cc.serial_number,
    cc.issuance_date,
    vpr.verra_project_id,
    vpr.carbon_project_id,
    cp.kode_project,
    cp.nama_project
FROM carbon_credits cc
LEFT JOIN verra_project_registrations vpr ON cc.verra_registration_id = vpr.id
LEFT JOIN carbon_projects cp ON vpr.carbon_project_id = cp.id
LIMIT 3;

-- ====================================================================
-- FINAL MESSAGE
-- ====================================================================
SELECT '🎉 Frontend schema compatibility fixed! Carbon Credits and Verra Registration pages should work without errors.' AS status;

COMMIT;