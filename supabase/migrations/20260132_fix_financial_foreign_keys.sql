-- Migration: Fix Financial Foreign Keys and Constraints
-- Date: 2026-01-32
-- Description: Ensure all foreign keys in financial tables are valid and add missing constraints
-- PRINCIPLE: SAFE - Only adds constraints if they don't exist, no data loss.

-- ============================================
-- 1. ENSURE REFERENCED TABLES EXIST
-- ============================================

-- Check and create profiles table reference if needed (should already exist)
DO $$ 
BEGIN
    -- Ensure profiles table has id column as UUID
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'profiles' AND column_name = 'id' 
                       AND data_type = 'uuid') THEN
            RAISE NOTICE 'profiles.id is not UUID, financial module may have issues';
        END IF;
    ELSE
        RAISE NOTICE 'profiles table does not exist, financial module may have issues';
    END IF;
END $$;

-- ============================================
-- 2. FIX FINANCIAL_TRANSACTIONS FOREIGN KEYS
-- ============================================

-- Add foreign key to budgets if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_transactions' 
                       AND constraint_name = 'financial_transactions_budget_id_fkey') THEN
            ALTER TABLE financial_transactions 
            ADD CONSTRAINT financial_transactions_budget_id_fkey 
            FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to grants if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grants') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_transactions' 
                       AND constraint_name = 'financial_transactions_grant_id_fkey') THEN
            ALTER TABLE financial_transactions 
            ADD CONSTRAINT financial_transactions_grant_id_fkey 
            FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (created_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_transactions' 
                       AND constraint_name = 'financial_transactions_created_by_fkey') THEN
            ALTER TABLE financial_transactions 
            ADD CONSTRAINT financial_transactions_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (approved_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_transactions' 
                       AND constraint_name = 'financial_transactions_approved_by_fkey') THEN
            ALTER TABLE financial_transactions 
            ADD CONSTRAINT financial_transactions_approved_by_fkey 
            FOREIGN KEY (approved_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- ============================================
-- 3. FIX BUDGETS FOREIGN KEYS
-- ============================================

-- Add foreign key to grants if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grants') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'budgets' 
                       AND constraint_name = 'budgets_grant_id_fkey') THEN
            ALTER TABLE budgets 
            ADD CONSTRAINT budgets_grant_id_fkey 
            FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key to programs if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'budgets' 
                       AND constraint_name = 'budgets_program_id_fkey') THEN
            ALTER TABLE budgets 
            ADD CONSTRAINT budgets_program_id_fkey 
            FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to kegiatan_dram if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kegiatan_dram') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'budgets' 
                       AND constraint_name = 'budgets_kegiatan_dram_id_fkey') THEN
            ALTER TABLE budgets 
            ADD CONSTRAINT budgets_kegiatan_dram_id_fkey 
            FOREIGN KEY (kegiatan_dram_id) REFERENCES kegiatan_dram(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to perhutanan_sosial if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perhutanan_sosial') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'budgets' 
                       AND constraint_name = 'budgets_perhutanan_sosial_id_fkey') THEN
            ALTER TABLE budgets 
            ADD CONSTRAINT budgets_perhutanan_sosial_id_fkey 
            FOREIGN KEY (perhutanan_sosial_id) REFERENCES perhutanan_sosial(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (created_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'budgets' 
                       AND constraint_name = 'budgets_created_by_fkey') THEN
            ALTER TABLE budgets 
            ADD CONSTRAINT budgets_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (approved_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'budgets' 
                       AND constraint_name = 'budgets_approved_by_fkey') THEN
            ALTER TABLE budgets 
            ADD CONSTRAINT budgets_approved_by_fkey 
            FOREIGN KEY (approved_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- ============================================
-- 4. FIX GRANTS FOREIGN KEYS
-- ============================================

-- Add foreign key to donors if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donors') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'grants' 
                       AND constraint_name = 'grants_donor_id_fkey') THEN
            ALTER TABLE grants 
            ADD CONSTRAINT grants_donor_id_fkey 
            FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key to carbon_projects if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carbon_projects') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'grants' 
                       AND constraint_name = 'grants_carbon_project_id_fkey') THEN
            ALTER TABLE grants 
            ADD CONSTRAINT grants_carbon_project_id_fkey 
            FOREIGN KEY (carbon_project_id) REFERENCES carbon_projects(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (created_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'grants' 
                       AND constraint_name = 'grants_created_by_fkey') THEN
            ALTER TABLE grants 
            ADD CONSTRAINT grants_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- ============================================
-- 5. FIX DONORS FOREIGN KEYS
-- ============================================

-- Add foreign key to profiles (created_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'donors' 
                       AND constraint_name = 'donors_created_by_fkey') THEN
            ALTER TABLE donors 
            ADD CONSTRAINT donors_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- ============================================
-- 6. FIX BENEFIT_DISTRIBUTIONS FOREIGN KEYS
-- ============================================

-- Add foreign key to perhutanan_sosial if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perhutanan_sosial') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'benefit_distributions' 
                       AND constraint_name = 'benefit_distributions_perhutanan_sosial_id_fkey') THEN
            ALTER TABLE benefit_distributions 
            ADD CONSTRAINT benefit_distributions_perhutanan_sosial_id_fkey 
            FOREIGN KEY (perhutanan_sosial_id) REFERENCES perhutanan_sosial(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key to kepala_keluarga if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kepala_keluarga') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'benefit_distributions' 
                       AND constraint_name = 'benefit_distributions_kepala_keluarga_id_fkey') THEN
            ALTER TABLE benefit_distributions 
            ADD CONSTRAINT benefit_distributions_kepala_keluarga_id_fkey 
            FOREIGN KEY (kepala_keluarga_id) REFERENCES kepala_keluarga(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to grants if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grants') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'benefit_distributions' 
                       AND constraint_name = 'benefit_distributions_grant_id_fkey') THEN
            ALTER TABLE benefit_distributions 
            ADD CONSTRAINT benefit_distributions_grant_id_fkey 
            FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (created_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'benefit_distributions' 
                       AND constraint_name = 'benefit_distributions_created_by_fkey') THEN
            ALTER TABLE benefit_distributions 
            ADD CONSTRAINT benefit_distributions_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (disetujui_oleh) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'benefit_distributions' 
                       AND constraint_name = 'benefit_distributions_disetujui_oleh_fkey') THEN
            ALTER TABLE benefit_distributions 
            ADD CONSTRAINT benefit_distributions_disetujui_oleh_fkey 
            FOREIGN KEY (disetujui_oleh) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- ============================================
-- 7. FIX FINANCIAL_METRICS FOREIGN KEYS
-- ============================================

-- Add foreign key to perhutanan_sosial if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perhutanan_sosial') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_metrics' 
                       AND constraint_name = 'financial_metrics_perhutanan_sosial_id_fkey') THEN
            ALTER TABLE financial_metrics 
            ADD CONSTRAINT financial_metrics_perhutanan_sosial_id_fkey 
            FOREIGN KEY (perhutanan_sosial_id) REFERENCES perhutanan_sosial(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key to carbon_projects if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carbon_projects') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_metrics' 
                       AND constraint_name = 'financial_metrics_carbon_project_id_fkey') THEN
            ALTER TABLE financial_metrics 
            ADD CONSTRAINT financial_metrics_carbon_project_id_fkey 
            FOREIGN KEY (carbon_project_id) REFERENCES carbon_projects(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- 8. FIX FINANCIAL_REPORTS FOREIGN KEYS
-- ============================================

-- Add foreign key to grants if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grants') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_reports' 
                       AND constraint_name = 'financial_reports_grant_id_fkey') THEN
            ALTER TABLE financial_reports 
            ADD CONSTRAINT financial_reports_grant_id_fkey 
            FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (created_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_reports' 
                       AND constraint_name = 'financial_reports_created_by_fkey') THEN
            ALTER TABLE financial_reports 
            ADD CONSTRAINT financial_reports_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- Add foreign key to profiles (reviewed_by) if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE table_name = 'financial_reports' 
                       AND constraint_name = 'financial_reports_reviewed_by_fkey') THEN
            ALTER TABLE financial_reports 
            ADD CONSTRAINT financial_reports_reviewed_by_fkey 
            FOREIGN KEY (reviewed_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- ============================================
-- 9. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================

-- Index for financial_transactions status (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'financial_transactions' 
                   AND indexname = 'idx_financial_transactions_status_btree') THEN
        CREATE INDEX idx_financial_transactions_status_btree ON financial_transactions(status);
    END IF;
END $$;

-- Index for financial_transactions transaction_date (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'financial_transactions' 
                   AND indexname = 'idx_financial_transactions_transaction_date_btree') THEN
        CREATE INDEX idx_financial_transactions_transaction_date_btree ON financial_transactions(transaction_date);
    END IF;
END $$;

-- Index for budgets status_approval (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'budgets' 
                   AND indexname = 'idx_budgets_status_approval_btree') THEN
        CREATE INDEX idx_budgets_status_approval_btree ON budgets(status_approval);
    END IF;
END $$;

-- Index for grants status (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'grants' 
                   AND indexname = 'idx_grants_status_btree') THEN
        CREATE INDEX idx_grants_status_btree ON grants(status);
    END IF;
END $$;

-- Index for benefit_distributions tanggal_distribusi (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'benefit_distributions' 
                   AND indexname = 'idx_benefit_distributions_tanggal_distribusi_btree') THEN
        CREATE INDEX idx_benefit_distributions_tanggal_distribusi_btree ON benefit_distributions(tanggal_distribusi);
    END IF;
END $$;

-- ============================================
-- 10. VALIDATE FOREIGN KEYS
-- ============================================

-- Function to validate foreign key relationships
CREATE OR REPLACE FUNCTION validate_financial_foreign_keys()
RETURNS TABLE (table_name TEXT, column_name TEXT, constraint_name TEXT, status TEXT) AS $$
BEGIN
    -- Check financial_transactions foreign keys
    RETURN QUERY
    SELECT 
        'financial_transactions'::TEXT as table_name,
        'budget_id'::TEXT as column_name,
        'financial_transactions_budget_id_fkey'::TEXT as constraint_name,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints 
                         WHERE table_name = 'financial_transactions' 
                         AND constraint_name = 'financial_transactions_budget_id_fkey') 
            THEN 'OK' 
            ELSE 'MISSING' 
        END as status
    UNION ALL
    SELECT 
        'financial_transactions'::TEXT,
        'grant_id'::TEXT,
        'financial_transactions_grant_id_fkey'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints 
                         WHERE table_name = 'financial_transactions' 
                         AND constraint_name = 'financial_transactions_grant_id_fkey') 
            THEN 'OK' 
            ELSE 'MISSING' 
        END
    UNION ALL
    SELECT 
        'financial_transactions'::TEXT,
        'created_by'::TEXT,
        'financial_transactions_created_by_fkey'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints 
                         WHERE table_name = 'financial_transactions' 
                         AND constraint_name = 'financial_transactions_created_by_fkey') 
            THEN 'OK' 
            ELSE 'MISSING' 
        END
    UNION ALL
    SELECT 
        'financial_transactions'::TEXT,
        'approved_by'::TEXT,
        'financial_transactions_approved_by_fkey'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints 
                         WHERE table_name = 'financial_transactions' 
                         AND constraint_name = 'financial_transactions_approved_by_fkey') 
            THEN 'OK' 
            ELSE 'MISSING' 
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration ensures all foreign keys in the financial module are properly defined.
-- It safely adds missing foreign key constraints without affecting existing data.
-- All operations are idempotent and can be run multiple times safely.
-- 
-- To validate foreign keys after migration, run:
-- SELECT * FROM validate_financial_foreign_keys();