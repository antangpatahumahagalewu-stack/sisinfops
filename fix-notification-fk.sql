-- Fix for notifications foreign key constraint issue
-- This SQL script should fix the "notifications_user_id_fkey" constraint violation

-- First, let's check what the current constraint references
-- Run this in Supabase SQL Editor or via psql

-- 1. First, let's see what table notifications.user_id should reference
-- Check if the foreign key exists and what it references
SELECT 
    tc.constraint_name,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'notifications'
  AND kcu.column_name = 'user_id';

-- 2. Option A: If notifications.user_id references auth.users.id (the auth schema)
-- We need to ensure all user IDs in programs table exist in auth.users
-- Check for invalid user IDs in programs.created_by and programs.submitted_by
SELECT 
    'created_by' as column_name,
    created_by as user_id,
    COUNT(*) as count
FROM programs
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (SELECT id FROM auth.users)
GROUP BY created_by
HAVING COUNT(*) > 0
UNION ALL
SELECT 
    'submitted_by' as column_name,
    submitted_by as user_id,
    COUNT(*) as count
FROM programs
WHERE submitted_by IS NOT NULL 
  AND submitted_by NOT IN (SELECT id FROM auth.users)
GROUP BY submitted_by
HAVING COUNT(*) > 0;

-- 3. Option B: If notifications.user_id references public.profiles.id (more likely)
-- We need to update the foreign key constraint if it's wrong
-- Check current constraint again
SELECT conname, confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname = 'notifications_user_id_fkey';

-- 4. Fix option 1: Update foreign key to reference profiles.id instead of auth.users.id
-- Only run this if you're sure notifications.user_id should reference profiles.id
/*
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
*/

-- 5. Fix option 2: Create missing profile entries for users in auth.users
-- If users exist in auth.users but not in profiles
INSERT INTO profiles (id, full_name, role)
SELECT 
    au.id,
    COALESCE(au.email, 'User ' || au.id::text) as full_name,
    'program_planner' as role
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
  AND au.id IN (
    SELECT DISTINCT created_by FROM programs WHERE created_by IS NOT NULL
    UNION
    SELECT DISTINCT submitted_by FROM programs WHERE submitted_by IS NOT NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Fix option 3: Clean up orphaned references in programs table
-- Set NULL for user IDs that don't exist in auth.users
UPDATE programs
SET created_by = NULL
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (SELECT id FROM auth.users);

UPDATE programs
SET submitted_by = NULL
WHERE submitted_by IS NOT NULL 
  AND submitted_by NOT IN (SELECT id FROM auth.users);

-- 7. Temporary workaround for API: Allow notifications without user_id
-- This is a last resort if we can't fix the foreign key issue
/*
ALTER TABLE notifications
ALTER COLUMN user_id DROP NOT NULL;

-- Update existing notifications to have user_id = NULL if invalid
UPDATE notifications
SET user_id = NULL
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM profiles);
*/

-- 8. Verify the fix
SELECT 
    'Total programs' as metric,
    COUNT(*) as value
FROM programs
UNION ALL
SELECT 
    'Programs with valid created_by',
    COUNT(*)
FROM programs p
WHERE p.created_by IS NOT NULL 
  AND p.created_by IN (SELECT id FROM auth.users)
UNION ALL
SELECT 
    'Programs with valid submitted_by',
    COUNT(*)
FROM programs p
WHERE p.submitted_by IS NOT NULL 
  AND p.submitted_by IN (SELECT id FROM auth.users)
UNION ALL
SELECT
    'Test notification insert',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM notifications 
            WHERE user_id IN (SELECT id FROM auth.users LIMIT 1)
        ) THEN 1
        ELSE 0
    END;

-- 9. Create test notification to verify fix works
-- Get a valid user ID
DO $$
DECLARE
    valid_user_id UUID;
BEGIN
    SELECT id INTO valid_user_id FROM auth.users LIMIT 1;
    
    IF valid_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, data, created_at)
        VALUES (
            valid_user_id,
            'test',
            'Test Notification',
            'This is a test notification to verify foreign key fix',
            '{"test": true, "timestamp": "' || CURRENT_TIMESTAMP || '"}',
            NOW()
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Test notification inserted for user: %', valid_user_id;
    ELSE
        RAISE NOTICE 'No valid users found in auth.users';
    END IF;
END $$;

-- Clean up test notification
DELETE FROM notifications WHERE type = 'test';