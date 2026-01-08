-- Create missing profiles for existing users
-- This migration ensures all existing users have a profile entry
-- Run after 20250113_auto_create_profile.sql

DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT 
            au.id,
            COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.profiles (id, role, full_name)
            VALUES (user_record.id, 'viewer', user_record.full_name)
            ON CONFLICT (id) DO NOTHING;
            
            RAISE NOTICE 'Created profile for user: %', user_record.id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create profile for user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Verify the fix
SELECT 
    COUNT(*) as total_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    COUNT(*) - (SELECT COUNT(*) FROM public.profiles) as missing_profiles
FROM auth.users;
