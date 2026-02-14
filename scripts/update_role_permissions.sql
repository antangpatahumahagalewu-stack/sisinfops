-- ====================================================
-- UPDATE ROLE_PERMISSIONS TABLE (11 ROLES - EXCEPT ADMIN)
-- ====================================================
-- This script updates 11 roles in the role_permissions table
-- Admin role is NOT updated (left as is)
-- Uses UPSERT (INSERT ... ON CONFLICT DO UPDATE) for idempotency
-- ====================================================

-- Disable transaction for Supabase SQL Editor
BEGIN;

-- 1. monev - Monitoring & Evaluasi
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'monev',
  'Monitoring & Evaluasi',
  'Fokus pada monitoring dan evaluasi data. Dapat membaca dan mengedit data (tidak bisa menghapus). Dapat upload data Excel.',
  '{
    "read": ["all"],
    "edit": ["ps_data", "potensi", "kabupaten"],
    "upload": ["excel"],
    "modules": ["dashboard", "ps_data", "potensi", "kabupaten", "monitoring"],
    "no_access": ["delete", "user_management", "carbon_projects", "program_management", "pdd_generation", "financial_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 2. viewer - Viewer
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'viewer',
  'Viewer',
  'Hanya membaca data (read-only). Cocok untuk user yang hanya perlu melihat informasi tanpa kemampuan mengedit.',
  '{
    "read": ["ps_data", "potensi", "kabupaten", "statistics"],
    "modules": ["dashboard", "ps_data", "potensi", "kabupaten"],
    "no_access": ["edit", "delete", "upload", "all_management", "financial_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 3. program_planner - Program Planner
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'program_planner',
  'Program Planner',
  'Fokus pada perencanaan program. Dapat mengelola program, DRAM, implementasi, monitoring, pemberdayaan ekonomi, dan manajemen stakeholder.',
  '{
    "read": ["all"],
    "edit": ["programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder"],
    "modules": ["dashboard", "programs", "dram", "implementation", "monitoring", "economic_empowerment", "stakeholder"],
    "no_access": ["delete", "excel_upload", "carbon_projects", "pdd_generation", "financial_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 4. program_implementer - Program Implementer
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'program_implementer',
  'Program Implementer',
  'Fokus pada implementasi program di lapangan dan pemberdayaan ekonomi. Tidak memiliki akses ke perencanaan program atau manajemen proyek karbon.',
  '{
    "read": ["all"],
    "edit": ["implementation", "economic_empowerment"],
    "modules": ["dashboard", "implementation", "economic_empowerment"],
    "no_access": ["delete", "excel_upload", "program_management", "dram", "carbon_projects", "financial_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 5. carbon_specialist - Carbon Specialist
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'carbon_specialist',
  'Carbon Specialist',
  'Fokus pada proyek karbon. Mengelola proyek karbon, generate PDD, manajemen legal, dan stakeholder terkait proyek karbon.',
  '{
    "read": ["all"],
    "edit": ["carbon_projects", "programs", "monitoring", "stakeholder", "legal", "pdd"],
    "modules": ["dashboard", "carbon_projects", "programs", "monitoring", "stakeholder", "legal", "pdd"],
    "no_access": ["delete", "excel_upload", "dram", "implementation", "financial_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 6. finance_manager - Finance Manager
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'finance_manager',
  'Finance Manager',
  'Mengelola semua aspek keuangan dan anggaran. Dapat approve transaksi keuangan, akses penuh ke semua ledger keuangan.',
  '{
    "read": ["all_financial"],
    "edit": ["budgets", "transactions", "reports", "benefit_distributions"],
    "approve": ["financial_transactions"],
    "modules": ["financial_dashboard", "budget_management", "transaction_management", "reporting", "benefit_distribution"],
    "no_access": ["user_management", "carbon_projects", "program_management", "excel_upload"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 7. finance_operational - Finance Operational
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'finance_operational',
  'Finance Operational',
  'Menangani transaksi harian dan operasional. Hanya bisa akses ledger operasional. Limit transaksi: Rp 5 juta per transaksi.',
  '{
    "read": ["transactions", "budgets"],
    "edit": ["transactions"],
    "create": ["transactions"],
    "modules": ["transaction_management", "budget_tracking"],
    "limits": {
      "per_transaction": 5000000,
      "daily": 50000000,
      "monthly": 500000000
    },
    "no_access": ["approve_transactions", "delete", "user_management", "carbon_projects", "program_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 8. finance_project_carbon - Finance Project Carbon
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'finance_project_carbon',
  'Finance Project Carbon',
  'Mengelola keuangan proyek karbon. Hanya bisa akses ledger proyek karbon. Limit transaksi: Rp 10 juta per transaksi.',
  '{
    "read": ["carbon_finance", "transactions"],
    "edit": ["carbon_transactions"],
    "create": ["carbon_transactions"],
    "modules": ["carbon_finance", "transaction_management"],
    "limits": {
      "per_transaction": 10000000,
      "daily": 100000000,
      "monthly": 1000000000
    },
    "no_access": ["approve_transactions", "delete", "budget_management", "user_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 9. finance_project_implementation - Finance Project Implementation
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'finance_project_implementation',
  'Finance Project Implementation',
  'Mengelola keuangan implementasi program. Hanya bisa akses ledger implementasi. Limit transaksi: Rp 7.5 juta per transaksi.',
  '{
    "read": ["implementation_finance", "transactions"],
    "edit": ["implementation_transactions"],
    "create": ["implementation_transactions"],
    "modules": ["implementation_finance", "transaction_management"],
    "limits": {
      "per_transaction": 7500000,
      "daily": 75000000,
      "monthly": 750000000
    },
    "no_access": ["approve_transactions", "delete", "budget_management", "user_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 10. finance_project_social - Finance Project Social
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'finance_project_social',
  'Finance Project Social',
  'Mengelola keuangan program sosial. Hanya bisa akses ledger sosial. Limit transaksi: Rp 5 juta per transaksi.',
  '{
    "read": ["social_finance", "transactions"],
    "edit": ["social_transactions"],
    "create": ["social_transactions"],
    "modules": ["social_finance", "transaction_management"],
    "limits": {
      "per_transaction": 5000000,
      "daily": 50000000,
      "monthly": 500000000
    },
    "no_access": ["approve_transactions", "delete", "budget_management", "user_management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- 11. investor - Investor
INSERT INTO role_permissions (role_name, display_name, description, permissions, updated_at)
VALUES (
  'investor',
  'Investor',
  'Akses read-only untuk monitoring dana mereka. Hanya bisa melihat laporan proyek yang diinvestasikan. Tidak bisa melakukan transaksi apapun.',
  '{
    "read": ["financial_reports", "performance"],
    "modules": ["financial_reports", "performance_dashboard"],
    "no_access": ["edit", "create", "delete", "approve", "upload", "management"]
  }'::jsonb,
  NOW()
)
ON CONFLICT (role_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;

-- ====================================================
-- VERIFICATION QUERY
-- ====================================================
SELECT 
  role_name,
  display_name,
  description,
  jsonb_pretty(permissions) as permissions,
  updated_at
FROM role_permissions 
WHERE role_name != 'admin'
ORDER BY 
  CASE 
    WHEN role_name IN ('monev', 'viewer', 'program_planner', 'program_implementer', 'carbon_specialist') THEN 1
    WHEN role_name LIKE 'finance%' THEN 2
    WHEN role_name = 'investor' THEN 3
    ELSE 4
  END,
  role_name;

-- ====================================================
-- FINAL MESSAGE
-- ====================================================
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count 
  FROM role_permissions 
  WHERE role_name != 'admin';
  
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'ROLE PERMISSIONS UPDATE COMPLETE';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Updated roles: % (excluding admin)', role_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Roles updated:';
  RAISE NOTICE '  • monev - Monitoring & Evaluasi';
  RAISE NOTICE '  • viewer - Viewer';
  RAISE NOTICE '  • program_planner - Program Planner';
  RAISE NOTICE '  • program_implementer - Program Implementer';
  RAISE NOTICE '  • carbon_specialist - Carbon Specialist';
  RAISE NOTICE '  • finance_manager - Finance Manager';
  RAISE NOTICE '  • finance_operational - Finance Operational';
  RAISE NOTICE '  • finance_project_carbon - Finance Project Carbon';
  RAISE NOTICE '  • finance_project_implementation - Finance Project Implementation';
  RAISE NOTICE '  • finance_project_social - Finance Project Social';
  RAISE NOTICE '  • investor - Investor';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin role: NOT UPDATED (left as is)';
  RAISE NOTICE '=========================================';
END $$;

COMMIT;