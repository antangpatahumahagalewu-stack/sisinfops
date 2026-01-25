-- Migration: Set JWT expiry to 24 hours for session tokens
-- Date: 2026-01-24
-- Description: Configure Supabase Auth JWT expiry time to 24 hours (86400 seconds)
--              This ensures session tokens automatically expire after 24 hours
--              Note: JWT expiry is configured via Supabase Dashboard or API, not via database tables.
--              This migration provides instructions and attempts to use available functions if they exist.

-- Attempt to set JWT expiry using auth.set_config function if it exists
DO $$
BEGIN
  -- Try to use auth.set_config function (available in some Supabase versions)
  EXECUTE 'SELECT auth.set_config(''JWT_EXP'', ''86400'', false)';
  RAISE NOTICE 'JWT expiry set to 24 hours using auth.set_config';
EXCEPTION
  WHEN undefined_function OR undefined_table THEN
    RAISE NOTICE 'auth.set_config function not available. JWT expiry must be configured manually via Supabase Dashboard.';
END $$;

-- Attempt to set refresh token expiry
DO $$
BEGIN
  EXECUTE 'SELECT auth.set_config(''REFRESH_TOKEN_EXP'', ''86400'', false)';
  RAISE NOTICE 'Refresh token expiry set to 24 hours using auth.set_config';
EXCEPTION
  WHEN undefined_function OR undefined_table THEN
    RAISE NOTICE 'auth.set_config function not available for refresh token.';
END $$;

-- Provide manual configuration instructions
DO $$
BEGIN
  RAISE NOTICE '
MANUAL CONFIGURATION REQUIRED
To set JWT expiry to 24 hours (86400 seconds):

OPTION 1: Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/_/auth/url-settings
2. Replace "_" with your project ID
3. Set "JWT expiry" to 86400 seconds (24 hours)
4. Set "Refresh token expiry" to 86400 seconds (24 hours)

OPTION 2: Supabase CLI
Run: supabase secrets set JWT_EXP=86400
Run: supabase secrets set REFRESH_TOKEN_EXP=86400

OPTION 3: REST API
curl -X PUT "https://rrvhekjdhdhtkmswjgwk.supabase.co/auth/v1/settings" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d ''{"JWT_EXP":86400,"REFRESH_TOKEN_EXP":86400}''

';
END $$;
