-- Migration: Add user online tracking to profiles table
-- Date: 2026-01-28
-- Description: Adds last_seen_at and is_online columns to profiles table for tracking user activity status

-- 1. Add new columns to profiles table for online tracking
DO $$ 
BEGIN
    -- Add last_seen_at column (timestamp of last user activity)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_seen_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add is_online column (computed based on last_seen_at)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_online'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add online_status column for more detailed status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'online_status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN online_status VARCHAR(20) DEFAULT 'offline';
        -- Add constraint for valid status values
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_online_status_check 
            CHECK (online_status IN ('online', 'away', 'offline', 'busy'));
    END IF;

END $$;

-- 2. Create index for last_seen_at for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);

-- 3. Create function to update user's last seen timestamp
CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        last_seen_at = NOW(),
        is_online = TRUE,
        online_status = 'online'
    WHERE id = p_user_id;
END;
$$;

-- 4. Create function to mark user as offline (to be called on logout or session timeout)
CREATE OR REPLACE FUNCTION public.mark_user_offline(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        is_online = FALSE,
        online_status = 'offline'
    WHERE id = p_user_id;
END;
$$;

-- 5. Create function to get online users (users active in last 5 minutes)
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    role VARCHAR(50),
    last_seen_at TIMESTAMPTZ,
    online_status VARCHAR(20),
    is_online BOOLEAN,
    minutes_ago NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.full_name,
        p.role,
        p.last_seen_at,
        p.online_status,
        p.is_online,
        EXTRACT(EPOCH FROM (NOW() - p.last_seen_at)) / 60 as minutes_ago
    FROM public.profiles p
    WHERE 
        p.last_seen_at IS NOT NULL 
        AND p.last_seen_at > (NOW() - INTERVAL '5 minutes')
    ORDER BY p.last_seen_at DESC;
END;
$$;

-- 6. Create trigger to automatically update last_seen_at when activity is logged
CREATE OR REPLACE FUNCTION public.update_last_seen_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update last_seen_at for the user who performed the activity
    -- Skip system user (00000000-0000-0000-0000-000000000000)
    IF NEW.user_id IS NOT NULL AND NEW.user_id != '00000000-0000-0000-0000-000000000000'::UUID THEN
        PERFORM public.update_user_last_seen(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on activity_log table
DROP TRIGGER IF EXISTS activity_log_update_last_seen ON public.activity_log;
CREATE TRIGGER activity_log_update_last_seen
    AFTER INSERT ON public.activity_log
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_seen_on_activity();

-- 7. Create function to cleanup old online status (mark users offline after 5 minutes of inactivity)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_users()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        is_online = FALSE,
        online_status = 'offline'
    WHERE 
        is_online = TRUE 
        AND last_seen_at IS NOT NULL 
        AND last_seen_at <= (NOW() - INTERVAL '5 minutes');
END;
$$;

-- 8. Create a view for online users with enhanced information
CREATE OR REPLACE VIEW public.online_users_view AS
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.last_seen_at,
    p.online_status,
    p.is_online,
    CASE 
        WHEN p.last_seen_at >= (NOW() - INTERVAL '1 minute') THEN 'Just now'
        WHEN p.last_seen_at >= (NOW() - INTERVAL '5 minutes') THEN 'Active recently'
        WHEN p.last_seen_at >= (NOW() - INTERVAL '30 minutes') THEN 'Away'
        ELSE 'Offline'
    END as activity_status,
    COUNT(al.id) as total_activities,
    MAX(al.created_at) as last_activity_at
FROM public.profiles p
LEFT JOIN public.activity_log al ON p.id = al.user_id
WHERE p.last_seen_at IS NOT NULL
GROUP BY p.id, p.full_name, p.role, p.last_seen_at, p.online_status, p.is_online
ORDER BY p.last_seen_at DESC;

-- 9. Create a view for user activity dashboard
CREATE OR REPLACE VIEW public.user_activity_dashboard AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.role,
    p.last_seen_at,
    p.is_online,
    p.online_status,
    COUNT(DISTINCT al.id) as total_activities,
    COUNT(DISTINCT CASE WHEN al.activity_type = 'login' THEN al.id END) as login_count,
    COUNT(DISTINCT CASE WHEN al.activity_type = 'page_view' THEN al.id END) as page_view_count,
    COUNT(DISTINCT CASE WHEN al.activity_type = 'data_update' THEN al.id END) as data_update_count,
    MAX(al.created_at) as last_activity_at,
    NOW() - p.last_seen_at as time_since_last_activity
FROM public.profiles p
LEFT JOIN public.activity_log al ON p.id = al.user_id
GROUP BY p.id, p.full_name, p.role, p.last_seen_at, p.is_online, p.online_status
ORDER BY p.last_seen_at DESC NULLS LAST;

-- 10. Update existing profiles with initial last_seen_at based on their last activity
UPDATE public.profiles p
SET 
    last_seen_at = COALESCE(
        (SELECT MAX(created_at) FROM public.activity_log al WHERE al.user_id = p.id),
        NOW() - INTERVAL '1 day'
    ),
    is_online = CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.activity_log al 
            WHERE al.user_id = p.id 
            AND al.created_at > (NOW() - INTERVAL '5 minutes')
        ) THEN TRUE 
        ELSE FALSE 
    END,
    online_status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.activity_log al 
            WHERE al.user_id = p.id 
            AND al.created_at > (NOW() - INTERVAL '5 minutes')
        ) THEN 'online' 
        ELSE 'offline' 
    END
WHERE p.last_seen_at IS NULL;

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_user_last_seen TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_user_offline TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_inactive_users TO authenticated;
GRANT SELECT ON public.online_users_view TO authenticated;
GRANT SELECT ON public.user_activity_dashboard TO authenticated;

-- 12. Add comments for documentation
COMMENT ON COLUMN public.profiles.last_seen_at IS 'Timestamp of last user activity (page view, data operation, etc.)';
COMMENT ON COLUMN public.profiles.is_online IS 'Boolean indicating if user is currently online (active within last 5 minutes)';
COMMENT ON COLUMN public.profiles.online_status IS 'Detailed online status: online, away, offline, busy';
COMMENT ON FUNCTION public.update_user_last_seen IS 'Updates user last seen timestamp and marks as online';
COMMENT ON FUNCTION public.mark_user_offline IS 'Marks user as offline (call on logout or session timeout)';
COMMENT ON FUNCTION public.get_online_users IS 'Returns list of users active in last 5 minutes';
COMMENT ON FUNCTION public.cleanup_inactive_users IS 'Automatically marks users as offline after 5 minutes of inactivity';
COMMENT ON VIEW public.online_users_view IS 'View showing online users with activity statistics';
COMMENT ON VIEW public.user_activity_dashboard IS 'Comprehensive view of user activity for dashboard display';

-- Migration completed successfully