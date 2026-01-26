-- Migration: Fix type mismatch in activity log triggers
-- Date: 2026-01-29
-- Description: Fix the comparison of text and jsonb in the UPDATE block of log_profile_activity and log_ps_activity functions

-- 1. Fix log_profile_activity function
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

-- 2. Fix log_ps_activity function
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

-- 3. Note: The triggers already exist, so we don't need to recreate them.
--    The above CREATE OR REPLACE will update the functions.

-- 4. Add comment
COMMENT ON FUNCTION public.log_profile_activity IS 'Log profile activities with fixed type comparison (jsonb vs jsonb)';
COMMENT ON FUNCTION public.log_ps_activity IS 'Log perhutanan_sosial activities with fixed type comparison (jsonb vs jsonb)';

-- Migration completed