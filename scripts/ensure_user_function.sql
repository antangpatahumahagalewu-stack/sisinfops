-- Ensure create_user_with_profile function exists
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql

CREATE OR REPLACE FUNCTION public.create_user_with_profile(
    p_email TEXT,
    p_password TEXT DEFAULT 'password123',
    p_full_name TEXT,
    p_role TEXT
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- First, check if user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'User with email % already exists', p_email;
    END IF;
    
    -- Create user in auth.users directly (bypassing Auth API)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', p_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO v_user_id;
    
    -- Create profile
    INSERT INTO public.profiles (id, role, full_name, updated_at)
    VALUES (v_user_id, p_role, p_full_name, NOW())
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user %: %', p_email, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_with_profile TO authenticated;

-- Create a simpler version that doesn't require full parameters (for testing)
CREATE OR REPLACE FUNCTION public.create_simple_user(
    p_email TEXT,
    p_password TEXT DEFAULT 'password123'
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Create user in auth.users directly
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', split_part(p_email, '@', 1)),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO v_user_id;
    
    -- Create default profile as viewer
    INSERT INTO public.profiles (id, role, full_name, updated_at)
    VALUES (v_user_id, 'viewer', split_part(p_email, '@', 1), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating simple user %: %', p_email, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_simple_user TO authenticated;

-- Verify the function was created
SELECT 
    'Function created successfully' as status,
    proname as function_name,
    pronargs as parameter_count
FROM pg_proc 
WHERE proname IN ('create_user_with_profile', 'create_simple_user')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');