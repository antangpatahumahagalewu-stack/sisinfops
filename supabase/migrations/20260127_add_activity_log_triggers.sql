-- Migration: Add triggers to automatically log user activities
-- Date: 2026-01-27
-- Description: Creates triggers on auth.users and key tables to automatically log activities

-- 1. Trigger for auth.users to log login/logout activities
-- Note: auth.users is in auth schema, we need to create a function that can be called from auth schema

-- Create a function to log user login activity
CREATE OR REPLACE FUNCTION public.log_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log login activity
  PERFORM public.log_activity(
    NEW.id,
    'login',
    'auth.users'::VARCHAR(100),
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'provider', NEW.raw_app_meta_data->>'provider',
      'login_method', 'email/password'
    ),
    NULL::INET, -- IP address will be captured by application layer
    NULL::TEXT  -- User agent will be captured by application layer
  );
  
  RETURN NEW;
END;
$$;

-- Create a trigger on auth.users for login (after insert or update when confirmed_at changes)
-- Note: We cannot directly create trigger on auth.users in public schema
-- Instead, we'll create a trigger that application can call manually

-- 2. Create a function to log user logout (to be called from application)
CREATE OR REPLACE FUNCTION public.log_user_logout(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  SELECT public.log_activity(
    p_user_id,
    'logout',
    'auth.users'::VARCHAR(100),
    p_user_id,
    jsonb_build_object('action', 'user_logout'),
    NULL::INET,
    NULL::TEXT
  ) INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 3. Create audit triggers for key tables

-- Trigger for profiles table
CREATE OR REPLACE FUNCTION public.log_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_type VARCHAR(50);
  v_details JSONB;
BEGIN
  -- Determine activity type based on operation
  IF TG_OP = 'INSERT' THEN
    v_activity_type := 'data_create';
    v_details := jsonb_build_object(
      'new_data', row_to_json(NEW),
      'operation', 'CREATE'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_activity_type := 'data_update';
    v_details := jsonb_build_object(
      'old_data', row_to_json(OLD),
      'new_data', row_to_json(NEW),
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::jsonb)
        WHERE (row_to_json(OLD)::jsonb)->key IS DISTINCT FROM value
      ),
      'operation', 'UPDATE'
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_activity_type := 'data_delete';
    v_details := jsonb_build_object(
      'old_data', row_to_json(OLD),
      'operation', 'DELETE'
    );
  END IF;

  -- Log the activity
  PERFORM public.log_activity(
    COALESCE(NEW.id, OLD.id),
    v_activity_type,
    TG_TABLE_NAME::VARCHAR,
    COALESCE(NEW.id, OLD.id),
    v_details,
    NULL::INET,
    NULL::TEXT
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for profiles table
DROP TRIGGER IF EXISTS profiles_audit_trigger ON public.profiles;
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_activity();

-- 4. Trigger for perhutanan_sosial table (main PS data)
CREATE OR REPLACE FUNCTION public.log_ps_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_type VARCHAR(50);
  v_details JSONB;
  v_user_id UUID;
BEGIN
  -- Try to get current user from JWT
  v_user_id := auth.uid();
  
  -- If no authenticated user (e.g., from service role), use system user
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::UUID; -- System user UUID
  END IF;

  -- Determine activity type
  IF TG_OP = 'INSERT' THEN
    v_activity_type := 'data_create';
    v_details := jsonb_build_object(
      'new_data', row_to_json(NEW),
      'operation', 'CREATE',
      'table', 'perhutanan_sosial'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_activity_type := 'data_update';
    v_details := jsonb_build_object(
      'old_data', row_to_json(OLD),
      'new_data', row_to_json(NEW),
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::jsonb)
        WHERE (row_to_json(OLD)::jsonb)->key IS DISTINCT FROM value
      ),
      'operation', 'UPDATE',
      'table', 'perhutanan_sosial'
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_activity_type := 'data_delete';
    v_details := jsonb_build_object(
      'old_data', row_to_json(OLD),
      'operation', 'DELETE',
      'table', 'perhutanan_sosial'
    );
  END IF;

  -- Log the activity
  PERFORM public.log_activity(
    v_user_id,
    v_activity_type,
    TG_TABLE_NAME::VARCHAR,
    COALESCE(NEW.id, OLD.id),
    v_details,
    NULL::INET,
    NULL::TEXT
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for perhutanan_sosial table
DROP TRIGGER IF EXISTS perhutanan_sosial_audit_trigger ON public.perhutanan_sosial;
CREATE TRIGGER perhutanan_sosial_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.perhutanan_sosial
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ps_activity();

-- 5. Create function to manually log page views (to be called from application)
CREATE OR REPLACE FUNCTION public.log_page_view(
  p_user_id UUID,
  p_page_path TEXT,
  p_page_title TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  SELECT public.log_activity(
    p_user_id,
    'page_view',
    'page'::VARCHAR(100),
    NULL,
    jsonb_build_object(
      'path', p_page_path,
      'title', p_page_title,
      'referrer', p_referrer,
      'timestamp', NOW()
    ),
    NULL::INET,
    NULL::TEXT
  ) INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 6. Insert initial system activities to populate the activity_log table
-- This will create some sample data for testing
INSERT INTO public.activity_log (user_id, user_role, activity_type, resource_type, resource_id, details)
SELECT 
  id,
  role,
  'login',
  'auth.users',
  id,
  jsonb_build_object('initial_setup', true, 'timestamp', NOW())
FROM public.profiles
WHERE role = 'admin'
LIMIT 5
ON CONFLICT DO NOTHING;

-- Also insert some page view activities
INSERT INTO public.activity_log (user_id, user_role, activity_type, resource_type, details)
SELECT 
  p.id,
  p.role,
  'page_view',
  'page',
  jsonb_build_object(
    'path', '/dashboard',
    'title', 'Dashboard',
    'timestamp', NOW() - (random() * interval '7 days')
  )
FROM public.profiles p
WHERE p.role IN ('admin', 'monev')
ORDER BY random()
LIMIT 20
ON CONFLICT DO NOTHING;

-- 7. Create a view for easier activity log querying
CREATE OR REPLACE VIEW public.activity_log_enriched AS
SELECT 
  al.*,
  p.full_name as user_full_name,
  p.role as current_user_role,
  to_char(al.created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_time,
  CASE 
    WHEN al.activity_type = 'login' THEN 'Login'
    WHEN al.activity_type = 'logout' THEN 'Logout'
    WHEN al.activity_type = 'page_view' THEN 'View Page'
    WHEN al.activity_type = 'data_read' THEN 'Read Data'
    WHEN al.activity_type = 'data_create' THEN 'Create Data'
    WHEN al.activity_type = 'data_update' THEN 'Update Data'
    WHEN al.activity_type = 'data_delete' THEN 'Delete Data'
    WHEN al.activity_type = 'file_upload' THEN 'Upload File'
    WHEN al.activity_type = 'file_download' THEN 'Download File'
    ELSE al.activity_type
  END as activity_label
FROM public.activity_log al
LEFT JOIN public.profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.log_user_logout TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_page_view TO authenticated;
GRANT SELECT ON public.activity_log_enriched TO authenticated;

-- 9. Add comment
COMMENT ON VIEW public.activity_log_enriched IS 'Enriched activity log view with user names and formatted labels';
COMMENT ON FUNCTION public.log_page_view IS 'Log page view activities for user tracking';
COMMENT ON FUNCTION public.log_user_logout IS 'Log user logout activities';

-- Migration completed