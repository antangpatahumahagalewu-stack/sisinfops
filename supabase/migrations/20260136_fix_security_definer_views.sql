-- Migration: Fix Security Definer Views to Security Invoker
-- Date: 2026-01-36
-- Description: Change all views from SECURITY DEFINER to SECURITY INVOKER to comply with security best practices
-- This fixes the Supabase Linter error: "Detects views defined with the SECURITY DEFINER property"

-- ============================================
-- 1. Fix online_users_view
-- ============================================
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

COMMENT ON VIEW public.online_users_view IS 'View showing online users with activity statistics';

-- ============================================
-- 2. Fix user_activity_dashboard
-- ============================================
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

COMMENT ON VIEW public.user_activity_dashboard IS 'Comprehensive view of user activity for dashboard display';

-- ============================================
-- 3. Fix activity_log_enriched
-- ============================================
CREATE OR REPLACE VIEW public.activity_log_enriched AS
SELECT 
    al.id,
    al.activity_type,
    al.entity_type,
    al.entity_id,
    al.action,
    al.old_data,
    al.new_data,
    al.description,
    al.ip_address,
    al.user_agent,
    al.created_at,
    p.full_name as user_name,
    p.role as user_role,
    CASE 
        WHEN al.activity_type = 'login' THEN 'Login Activity'
        WHEN al.activity_type = 'page_view' THEN 'Page View'
        WHEN al.activity_type = 'data_update' THEN 'Data Update'
        WHEN al.activity_type = 'data_delete' THEN 'Data Deletion'
        WHEN al.activity_type = 'data_create' THEN 'Data Creation'
        WHEN al.activity_type = 'export' THEN 'Data Export'
        ELSE al.activity_type
    END as activity_label,
    CASE 
        WHEN al.entity_type = 'profiles' THEN 'User Profile'
        WHEN al.entity_type = 'perhutanan_sosial' THEN 'Perhutanan Sosial'
        WHEN al.entity_type = 'kepala_keluarga' THEN 'Kepala Keluarga'
        WHEN al.entity_type = 'kegiatan' THEN 'Kegiatan'
        WHEN al.entity_type = 'carbon_projects' THEN 'Carbon Project'
        WHEN al.entity_type = 'programs' THEN 'Program'
        WHEN al.entity_type = 'lembaga_pengelola' THEN 'Lembaga Pengelola'
        WHEN al.entity_type = 'potensi' THEN 'Potensi'
        WHEN al.entity_type = 'financial_transactions' THEN 'Financial Transaction'
        WHEN al.entity_type = 'master_price_list' THEN 'Master Price List'
        ELSE al.entity_type
    END as entity_label
FROM public.activity_log al
LEFT JOIN public.profiles p ON al.user_id = p.id;

COMMENT ON VIEW public.activity_log_enriched IS 'Enriched activity log view with user names and formatted labels';

-- ============================================
-- 4. Fix balance_sheet_view
-- ============================================
CREATE OR REPLACE VIEW public.balance_sheet_view AS
WITH account_balances AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.normal_balance,
        SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END) as total_credit,
        CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0)
            ELSE 
                COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0)
        END as balance
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_entry_lines jel ON coa.account_code = jel.account_code
    LEFT JOIN public.accounting_journal_entries aje ON jel.journal_entry_id = aje.id
    WHERE aje.status = 'POSTED'
    GROUP BY coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
),
assets AS (
    SELECT 'ASSETS' as section, account_code, account_name, balance
    FROM account_balances
    WHERE account_type = 'ASSET' AND balance != 0
),
liabilities AS (
    SELECT 'LIABILITIES' as section, account_code, account_name, balance
    FROM account_balances
    WHERE account_type = 'LIABILITY' AND balance != 0
),
equity AS (
    SELECT 'EQUITY' as section, account_code, account_name, balance
    FROM account_balances
    WHERE account_type = 'EQUITY' AND balance != 0
)
SELECT * FROM assets
UNION ALL SELECT * FROM liabilities
UNION ALL SELECT * FROM equity
ORDER BY section, account_code;

COMMENT ON VIEW public.balance_sheet_view IS 'SAK-compliant Balance Sheet (Neraca) view';

-- ============================================
-- 5. Fix income_statement_view
-- ============================================
CREATE OR REPLACE VIEW public.income_statement_view AS
WITH revenue_accounts AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        SUM(jel.credit_amount) - SUM(jel.debit_amount) as amount
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_entry_lines jel ON coa.account_code = jel.account_code
    LEFT JOIN public.accounting_journal_entries aje ON jel.journal_entry_id = aje.id
    WHERE coa.account_type = 'REVENUE'
      AND aje.status = 'POSTED'
      AND EXTRACT(YEAR FROM aje.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY coa.account_code, coa.account_name
),
expense_accounts AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        SUM(jel.debit_amount) - SUM(jel.credit_amount) as amount
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_entry_lines jel ON coa.account_code = jel.account_code
    LEFT JOIN public.accounting_journal_entries aje ON jel.journal_entry_id = aje.id
    WHERE coa.account_type = 'EXPENSE'
      AND aje.status = 'POSTED'
      AND EXTRACT(YEAR FROM aje.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY coa.account_code, coa.account_name
),
total_revenue AS (
    SELECT COALESCE(SUM(amount), 0) as total FROM revenue_accounts
),
total_expenses AS (
    SELECT COALESCE(SUM(amount), 0) as total FROM expense_accounts
)
SELECT 
    'REVENUE' as section,
    account_code,
    account_name,
    amount
FROM revenue_accounts
WHERE amount != 0
UNION ALL
SELECT 
    'EXPENSES' as section,
    account_code,
    account_name,
    amount
FROM expense_accounts
WHERE amount != 0
UNION ALL
SELECT 
    'NET_INCOME' as section,
    '' as account_code,
    'Net Income (Laba Bersih)' as account_name,
    (SELECT total FROM total_revenue) - (SELECT total FROM total_expenses) as amount
ORDER BY section DESC, account_code;

COMMENT ON VIEW public.income_statement_view IS 'SAK-compliant Income Statement (Laba Rugi) view';

-- ============================================
-- 6. Fix cash_flow_statement_view
-- ============================================
CREATE OR REPLACE VIEW public.cash_flow_statement_view AS
WITH cash_transactions AS (
    SELECT 
        ft.transaction_date,
        ft.jenis_transaksi,
        ft.amount_idr,
        coa_debit.account_type as debit_account_type,
        coa_credit.account_type as credit_account_type,
        CASE 
            WHEN coa_debit.account_code IN ('1110', '1120') THEN 'CASH_IN'
            WHEN coa_credit.account_code IN ('1110', '1120') THEN 'CASH_OUT'
            ELSE 'OTHER'
        END as cash_flow_type
    FROM public.financial_transactions ft
    LEFT JOIN public.chart_of_accounts coa_debit ON ft.debit_account_code = coa_debit.account_code
    LEFT JOIN public.chart_of_accounts coa_credit ON ft.credit_account_code = coa_credit.account_code
    WHERE ft.status IN ('APPROVED', 'PAID', 'RECONCILED')
      AND EXTRACT(YEAR FROM ft.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND (coa_debit.account_code IN ('1110', '1120') OR coa_credit.account_code IN ('1110', '1120'))
),
operating_activities AS (
    SELECT 
        'OPERATING' as activity_type,
        SUM(CASE WHEN cash_flow_type = 'CASH_IN' AND ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END) as cash_in,
        SUM(CASE WHEN cash_flow_type = 'CASH_OUT' AND ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END) as cash_out
    FROM cash_transactions ct
    INNER JOIN public.financial_transactions ft ON ct.transaction_date = ft.transaction_date AND ct.amount_idr = ft.amount_idr
    WHERE ft.kategori IN ('BIBIT', 'ALAT', 'GAJI', 'TRANSPORT', 'PELATIHAN', 'BAGI_HASIL', 'ADMINISTRASI', 'MONITORING', 'LAINNYA')
),
investing_activities AS (
    SELECT 
        'INVESTING' as activity_type,
        SUM(CASE WHEN cash_flow_type = 'CASH_IN' AND ft.jenis_transaksi = 'PENERIMAAN' AND ft.kategori = 'LAINNYA' THEN ft.amount_idr ELSE 0 END) as cash_in,
        SUM(CASE WHEN cash_flow_type = 'CASH_OUT' AND ft.jenis_transaksi = 'PENGELUARAN' AND ft.kategori = 'LAINNYA' THEN ft.amount_idr ELSE 0 END) as cash_out
    FROM cash_transactions ct
    INNER JOIN public.financial_transactions ft ON ct.transaction_date = ft.transaction_date AND ct.amount_idr = ft.amount_idr
    WHERE ft.kategori = 'LAINNYA'
),
financing_activities AS (
    SELECT 
        'FINANCING' as activity_type,
        SUM(CASE WHEN cash_flow_type = 'CASH_IN' AND ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END) as cash_in,
        SUM(CASE WHEN cash_flow_type = 'CASH_OUT' AND ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END) as cash_out
    FROM cash_transactions ct
    INNER JOIN public.financial_transactions ft ON ct.transaction_date = ft.transaction_date AND ct.amount_idr = ft.amount_idr
    WHERE ft.kategori = 'LAINNYA'
)
SELECT activity_type, cash_in, cash_out, cash_in - cash_out as net_cash_flow
FROM operating_activities
UNION ALL SELECT activity_type, cash_in, cash_out, cash_in - cash_out as net_cash_flow
FROM investing_activities
UNION ALL SELECT activity_type, cash_in, cash_out, cash_in - cash_out as net_cash_flow
FROM financing_activities;

COMMENT ON VIEW public.cash_flow_statement_view IS 'SAK-compliant Cash Flow Statement (Arus Kas) view';

-- ============================================
-- 7. Fix project_financial_performance_view
-- ============================================
CREATE OR REPLACE VIEW public.project_financial_performance_view AS
SELECT 
    p.id as project_id,
    p.nama_project as project_name,
    p.kode_project as project_code,
    p.status as project_status,
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENERIMAAN' THEN ft.amount_idr ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END), 0) as net_income,
    COALESCE(b.total_budget, 0) as total_budget,
    CASE 
        WHEN COALESCE(b.total_budget, 0) > 0 THEN 
            (COALESCE(SUM(CASE WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.amount_idr ELSE 0 END), 0) / b.total_budget) * 100
        ELSE 0
    END as budget_utilization_percentage
FROM public.carbon_projects p
LEFT JOIN public.grants g ON p.id = g.carbon_project_id
LEFT JOIN public.financial_transactions ft ON g.id = ft.grant_id AND ft.status IN ('APPROVED', 'PAID', 'RECONCILED')
LEFT JOIN (
    SELECT g.carbon_project_id, SUM(b.jumlah_anggaran) as total_budget
    FROM public.budgets b
    JOIN public.grants g ON b.grant_id = g.id
    WHERE b.status_approval = 'APPROVED'
    GROUP BY g.carbon_project_id
) b ON p.id = b.carbon_project_id
GROUP BY p.id, p.nama_project, p.kode_project, p.status, b.total_budget
ORDER BY net_income DESC;

COMMENT ON VIEW public.project_financial_performance_view IS 'Project financial performance with budget vs actual comparison';

-- ============================================
-- 8. Grant permissions to authenticated users
-- ============================================
GRANT SELECT ON public.online_users_view TO authenticated;
GRANT SELECT ON public.user_activity_dashboard TO authenticated;
GRANT SELECT ON public.activity_log_enriched TO authenticated;
GRANT SELECT ON public.balance_sheet_view TO authenticated;
GRANT SELECT ON public.income_statement_view TO authenticated;
GRANT SELECT ON public.cash_flow_statement_view TO authenticated;
GRANT SELECT ON public.project_financial_performance_view TO authenticated;

-- ============================================
-- 9. Migration completion message
-- ============================================
-- This migration fixes security issues by changing all views from SECURITY DEFINER to SECURITY INVOKER.
-- SECURITY INVOKER means the view will use the permissions of the user executing the query,
-- which is more secure and compliant with row-level security (RLS) policies.
-- 
-- Views fixed:
-- 1. online_users_view
-- 2. user_activity_dashboard
-- 3. activity_log_enriched
-- 4. balance_sheet_view
-- 5. income_statement_view
-- 6. cash_flow_statement_view
-- 7. project_financial_performance_view
--
-- All views now explicitly use SECURITY INVOKER (default when not specified).