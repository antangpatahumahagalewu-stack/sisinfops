-- Migration: Fix Function Search Path Mutable
-- Date: 2026-01-28
-- Description: Set search_path = public for functions to prevent search_path mutable warnings
-- This fixes the Supabase Linter warning: "Function has a role mutable search_path"

-- ============================================
-- 1. ALTER FUNCTIONS to set search_path = public
-- ============================================

ALTER FUNCTION public.audit_trigger_function() SET search_path = public;
ALTER FUNCTION public.auto_create_transaction_approval() SET search_path = public;
ALTER FUNCTION public.calculate_cost_per_hectare(p_program_id uuid, p_year integer) SET search_path = public;
ALTER FUNCTION public.calculate_cost_per_ton_carbon(p_carbon_project_id uuid, p_year integer) SET search_path = public;
ALTER FUNCTION public.check_spending_limit(p_user_id uuid, p_amount numeric, p_ledger_type character varying, p_limit_type character varying) SET search_path = public;
ALTER FUNCTION public.cleanup_inactive_users() SET search_path = public;
ALTER FUNCTION public.create_journal_entry_for_transaction() SET search_path = public;
ALTER FUNCTION public.enforce_cashless_policy(p_transaction_id uuid) SET search_path = public;
ALTER FUNCTION public.export_financial_report(p_report_type character varying, p_export_type character varying, p_parameters jsonb, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.generate_financial_report(p_report_type character varying, p_report_period character varying, p_year integer, p_month integer, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_online_users() SET search_path = public;
ALTER FUNCTION public.log_page_view(p_user_id uuid, p_page_path text, p_page_title text, p_referrer text) SET search_path = public;
ALTER FUNCTION public.log_profile_activity() SET search_path = public;
ALTER FUNCTION public.log_ps_activity() SET search_path = public;
ALTER FUNCTION public.log_user_login() SET search_path = public;
ALTER FUNCTION public.log_user_logout(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.mark_user_offline(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.trigger_approval_workflow(p_entity_type character varying, p_entity_id uuid, p_requester_id uuid, p_amount numeric, p_ledger_type character varying) SET search_path = public;
ALTER FUNCTION public.update_last_seen_on_activity() SET search_path = public;
ALTER FUNCTION public.update_ledger_balances() SET search_path = public;
ALTER FUNCTION public.update_user_last_seen(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.validate_financial_foreign_keys() SET search_path = public;

-- ============================================
-- 2. NOTES ON AUTH LEAKED PASSWORD PROTECTION
-- ============================================
-- Warning: "auth_leaked_password_protection - Leaked Password Protection Disabled"
-- This is a Supabase Auth setting, not a database schema issue.
-- To enable leaked password protection:
-- 1. Go to Supabase Dashboard → Authentication → Settings
-- 2. Enable "Leaked Password Protection"
-- 3. This checks passwords against HaveIBeenPwned.org
-- 
-- This migration only fixes function search_path issues.
-- Auth settings must be configured separately in Supabase Dashboard.
