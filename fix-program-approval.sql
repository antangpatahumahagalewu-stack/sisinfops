-- Fix for program approval workflow
-- Addresses: missing created_by column, foreign key constraint issues

BEGIN;

-- 1. Add created_by column to programs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE programs ADD COLUMN created_by UUID;
        RAISE NOTICE 'Added created_by column to programs table';
    ELSE
        RAISE NOTICE 'created_by column already exists in programs table';
    END IF;
END $$;

-- 2. Check and fix foreign key constraint for reviewed_by
-- First, check if the constraint exists and what it references
DO $$
DECLARE
    constraint_exists BOOLEAN;
    constraint_name TEXT;
    target_table TEXT;
BEGIN
    -- Check if programs_reviewed_by_fkey exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'programs'
          AND tc.constraint_name = 'programs_reviewed_by_fkey'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        -- Get the referenced table
        SELECT ccu.table_name INTO target_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'programs'
          AND tc.constraint_name = 'programs_reviewed_by_fkey'
          AND tc.constraint_type = 'FOREIGN KEY';
        
        RAISE NOTICE 'Foreign key programs_reviewed_by_fkey exists, references table: %', target_table;
        
        -- If it references 'users' but we have 'profiles' table, we need to fix
        IF target_table = 'users' THEN
            -- Check if users table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
                RAISE NOTICE 'users table exists, constraint may be correct';
            ELSE
                RAISE NOTICE 'users table does not exist, constraint may be invalid';
                -- Option: Drop and recreate with correct reference
                -- ALTER TABLE programs DROP CONSTRAINT programs_reviewed_by_fkey;
                -- ALTER TABLE programs ADD CONSTRAINT programs_reviewed_by_fkey 
                --   FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'No programs_reviewed_by_fkey constraint found';
    END IF;
END $$;

-- 3. Ensure foreign key references auth.users (Supabase's auth system)
-- Check if reviewed_by should reference auth.users.id instead of public.users
DO $$
BEGIN
    -- First, drop the constraint if it exists and is problematic
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'programs' 
          AND constraint_name = 'programs_reviewed_by_fkey'
    ) THEN
        -- Check if it references wrong table
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
              ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'programs'
              AND tc.constraint_name = 'programs_reviewed_by_fkey'
              AND ccu.table_name = 'users'
              AND ccu.table_schema = 'public'
        ) THEN
            ALTER TABLE programs DROP CONSTRAINT programs_reviewed_by_fkey;
            RAISE NOTICE 'Dropped programs_reviewed_by_fkey (references public.users)';
        END IF;
    END IF;
    
    -- Create new constraint referencing auth.users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'programs' 
          AND constraint_name = 'programs_reviewed_by_fkey'
    ) THEN
        ALTER TABLE programs ADD CONSTRAINT programs_reviewed_by_fkey 
          FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
        RAISE NOTICE 'Created programs_reviewed_by_fkey referencing auth.users';
    END IF;
END $$;

-- 4. Do the same for created_by and submitted_by columns
-- For created_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'programs' 
          AND constraint_name = 'programs_created_by_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE programs ADD CONSTRAINT programs_created_by_fkey 
          FOREIGN KEY (created_by) REFERENCES auth.users(id);
        RAISE NOTICE 'Created programs_created_by_fkey referencing auth.users';
    END IF;
END $$;

-- For submitted_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'programs' 
          AND constraint_name = 'programs_submitted_by_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' AND column_name = 'submitted_by'
    ) THEN
        ALTER TABLE programs ADD CONSTRAINT programs_submitted_by_fkey 
          FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
        RAISE NOTICE 'Created programs_submitted_by_fkey referencing auth.users';
    END IF;
END $$;

-- 5. Update existing programs to have created_by if missing
-- Use submitted_by as fallback, or set to a default if needed
UPDATE programs 
SET created_by = submitted_by 
WHERE created_by IS NULL AND submitted_by IS NOT NULL;

-- 6. Make notification insertion more robust
-- Create a function to safely insert notifications even if created_by is null
CREATE OR REPLACE FUNCTION safe_insert_program_notification(
    p_program_id UUID,
    p_created_by UUID,
    p_program_name TEXT,
    p_status TEXT,
    p_review_notes TEXT,
    p_reviewer_id UUID
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Only insert notification if we have a valid created_by
    IF p_created_by IS NOT NULL THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            p_created_by,
            CASE p_status
                WHEN 'approved' THEN 'program_approved'
                WHEN 'rejected' THEN 'program_rejected'
                ELSE 'revision_requested'
            END,
            CASE p_status
                WHEN 'approved' THEN 'Program Disetujui'
                WHEN 'rejected' THEN 'Program Ditolak'
                ELSE 'Revisi Diperlukan'
            END,
            CASE p_status
                WHEN 'approved' 
                    THEN 'Program "' || p_program_name || '" telah disetujui oleh Finance Team.'
                WHEN 'rejected'
                    THEN 'Program "' || p_program_name || '" ditolak oleh Finance Team.'
                ELSE 'Program "' || p_program_name || '" memerlukan revisi dari tim program.'
            END,
            jsonb_build_object(
                'program_id', p_program_id,
                'program_name', p_program_name,
                'reviewer_id', p_reviewer_id,
                'status', p_status,
                'review_notes', p_review_notes,
                'timestamp', NOW()
            ),
            NOW()
        ) RETURNING id INTO notification_id;
        
        RETURN notification_id;
    ELSE
        -- Return null if no notification was created
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Verification queries
DO $$
DECLARE
    program_count INTEGER;
    programs_without_created_by INTEGER;
BEGIN
    SELECT COUNT(*) INTO program_count FROM programs;
    SELECT COUNT(*) INTO programs_without_created_by 
    FROM programs WHERE created_by IS NULL;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PROGRAM APPROVAL FIX COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Total programs: %', program_count;
    RAISE NOTICE 'Programs without created_by: %', programs_without_created_by;
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  1. Added created_by column if missing';
    RAISE NOTICE '  2. Fixed foreign key constraints to reference auth.users';
    RAISE NOTICE '  3. Created safe_insert_program_notification function';
    RAISE NOTICE '  4. Updated existing programs with created_by from submitted_by';
    RAISE NOTICE '';
    RAISE NOTICE 'API should now handle:';
    RAISE NOTICE '  • Missing created_by gracefully';
    RAISE NOTICE '  • Correct foreign key references for reviewed_by';
    RAISE NOTICE '  • Safe notification insertion';
    RAISE NOTICE '=========================================';
END $$;

COMMIT;