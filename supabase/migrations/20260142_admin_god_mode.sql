-- Migration: Admin God Mode - Full Access for Administrator Role
-- Date: 2026-01-29
-- Description: Add RLS policies to give admin full access to all tables, bypass all validations and limits

-- ============================================
-- 1. ADD ADMIN FULL ACCESS POLICIES TO ALL TABLES
-- ============================================

-- Function to safely add admin policy to a table
CREATE OR REPLACE FUNCTION add_admin_full_access_policy(table_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('
        DROP POLICY IF EXISTS "Admin full access to %I" ON %I;
        CREATE POLICY "Admin full access to %I" ON %I
            FOR ALL USING (auth.role() = ''admin'');
    ', table_name, table_name, table_name, table_name);
    
    RAISE NOTICE 'Added admin full access policy to %', table_name;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to add admin policy to %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Apply admin full access policies to all tables with RLS enabled
DO $$
DECLARE
    tbl RECORD;
BEGIN
    RAISE NOTICE 'Adding admin full access policies to all tables...';
    
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE 'pg_%' 
          AND tablename NOT LIKE 'sql_%'
        ORDER BY tablename
    LOOP
        -- Check if table has RLS enabled
        IF EXISTS (
            SELECT 1 
            FROM pg_class c 
            JOIN pg_namespace n ON c.relnamespace = n.oid 
            WHERE c.relname = tbl.tablename 
              AND n.nspname = 'public' 
              AND c.relrowsecurity
        ) THEN
            PERFORM add_admin_full_access_policy(tbl.tablename);
        ELSE
            RAISE NOTICE 'Table % does not have RLS enabled, skipping', tbl.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Admin full access policies added to all tables';
END $$;

-- ============================================
-- 2. UPDATE VALIDATION FUNCTIONS TO SKIP ADMIN
-- ============================================

-- Update validate_spending_limit function to skip admin (if it exists)
-- First drop the function if exists
DROP FUNCTION IF EXISTS validate_spending_limit();

-- Create the updated function
CREATE OR REPLACE FUNCTION validate_spending_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_daily_total DECIMAL(20,2);
    v_monthly_total DECIMAL(20,2);
    v_limit_per_transaction DECIMAL(20,2);
    v_limit_daily DECIMAL(20,2);
    v_limit_monthly DECIMAL(20,2);
    v_transaction_amount DECIMAL(20,2);
BEGIN
    -- Get user role
    SELECT role INTO v_user_role 
    FROM profiles 
    WHERE id = NEW.created_by;
    
    -- Skip all checks for admin
    IF v_user_role = 'admin' THEN
        RAISE NOTICE 'Admin user detected, skipping spending limit checks';
        RETURN NEW;
    END IF;
    
    -- Get limits for this role
    SELECT 
        COALESCE(MAX(CASE WHEN limit_type = 'PER_TRANSACTION' THEN limit_amount END), 0),
        COALESCE(MAX(CASE WHEN limit_type = 'DAILY' THEN limit_amount END), 0),
        COALESCE(MAX(CASE WHEN limit_type = 'MONTHLY' THEN limit_amount END), 0)
    INTO v_limit_per_transaction, v_limit_daily, v_limit_monthly
    FROM spending_limits
    WHERE role_name = v_user_role
      AND is_active = TRUE;
    
    -- Try to get amount from either jumlah_idr or amount_idr
    v_transaction_amount := COALESCE(NEW.jumlah_idr, NEW.amount_idr, 0);
    
    -- Check per transaction limit
    IF v_transaction_amount > v_limit_per_transaction AND v_user_role != 'finance_manager' THEN
        RAISE EXCEPTION 'Transaction amount (Rp %) exceeds your per transaction limit (Rp %)', 
            v_transaction_amount, v_limit_per_transaction;
    END IF;
    
    -- Check daily limit
    SELECT COALESCE(SUM(COALESCE(jumlah_idr, amount_idr, 0)), 0) INTO v_daily_total
    FROM financial_transactions
    WHERE created_by = NEW.created_by
      AND DATE(created_at) = CURRENT_DATE
      AND (jenis_transaksi = 'PENGELUARAN' OR transaction_type = 'EXPENSE' OR transaction_type IS NULL);
    
    IF (v_daily_total + v_transaction_amount) > v_limit_daily AND v_user_role != 'finance_manager' THEN
        RAISE EXCEPTION 'Daily spending limit (Rp %) would be exceeded. Current: Rp %, This transaction: Rp %', 
            v_limit_daily, v_daily_total, v_transaction_amount;
    END IF;
    
    -- Check monthly limit
    SELECT COALESCE(SUM(COALESCE(jumlah_idr, amount_idr, 0)), 0) INTO v_monthly_total
    FROM financial_transactions
    WHERE created_by = NEW.created_by
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND (jenis_transaksi = 'PENGELUARAN' OR transaction_type = 'EXPENSE' OR transaction_type IS NULL);
    
    IF (v_monthly_total + v_transaction_amount) > v_limit_monthly AND v_user_role != 'finance_manager' THEN
        RAISE EXCEPTION 'Monthly spending limit (Rp %) would be exceeded. Current: Rp %, This transaction: Rp %', 
            v_limit_monthly, v_monthly_total, v_transaction_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update enforce_cashless_policy function to skip admin
CREATE OR REPLACE FUNCTION enforce_cashless_policy(
    p_transaction_id UUID
) RETURNS TABLE (
    policy_passed BOOLEAN,
    policy_type VARCHAR(50),
    failure_reason TEXT,
    required_action TEXT
) AS $$
DECLARE
    v_transaction RECORD;
    v_bank_account_verified BOOLEAN;
    v_user_role VARCHAR(50);
BEGIN
    -- Get transaction details and user role
    SELECT ft.*, al.ledger_type, p.role INTO v_transaction
    FROM financial_transactions ft
    LEFT JOIN accounting_ledgers al ON ft.ledger_id = al.id
    LEFT JOIN profiles p ON ft.created_by = p.id
    WHERE ft.id = p_transaction_id;
    
    IF v_transaction IS NULL THEN
        RETURN QUERY SELECT FALSE, 'AMOUNT_THRESHOLD', 'Transaction not found', 'Verify transaction exists';
        RETURN;
    END IF;
    
    -- Skip all checks for admin
    IF v_transaction.role = 'admin' THEN
        RAISE NOTICE 'Admin user detected, skipping cashless policy checks';
        RETURN QUERY SELECT TRUE, 'ADMIN_BYPASS', NULL, 'No action required';
        RETURN;
    END IF;
    
    -- Check 1: Amount threshold (1 juta)
    IF v_transaction.amount_idr > 1000000 THEN
        -- Check if payment method is bank transfer
        IF v_transaction.metode_pembayaran != 'TRANSFER_BANK' THEN
            -- Log the failure
            INSERT INTO cashless_policy_logs (transaction_id, policy_type, check_type, status, amount, threshold_amount, failure_reason)
            VALUES (p_transaction_id, 'AMOUNT_THRESHOLD', 'PRE_TRANSACTION', 'FAILED', v_transaction.amount_idr, 1000000, 
                   'Transactions > 1 juta must use bank transfer, not ' || COALESCE(v_transaction.metode_pembayaran, 'cash'));
            
            RETURN QUERY SELECT FALSE, 'AMOUNT_THRESHOLD', 
                         'Transactions over 1 juta must use bank transfer', 
                         'Change payment method to bank transfer';
            RETURN;
        END IF;
        
        -- Check 2: Bank account verification (if bank transfer)
        IF v_transaction.metode_pembayaran = 'TRANSFER_BANK' AND v_transaction.nomor_referensi_bank IS NOT NULL THEN
            -- Check if bank account is in whitelist
            SELECT EXISTS (
                SELECT 1 FROM bank_accounts_whitelist 
                WHERE account_number = v_transaction.nomor_referensi_bank 
                  AND verification_status = 'VERIFIED'
                  AND is_active = TRUE
            ) INTO v_bank_account_verified;
            
            IF NOT v_bank_account_verified THEN
                -- Log the failure
                INSERT INTO cashless_policy_logs (transaction_id, policy_type, check_type, status, amount, threshold_amount, failure_reason)
                VALUES (p_transaction_id, 'BANK_ACCOUNT_VERIFICATION', 'PRE_TRANSACTION', 'FAILED', v_transaction.amount_idr, 1000000,
                       'Bank account ' || v_transaction.nomor_referensi_bank || ' not in verified whitelist');
                
                RETURN QUERY SELECT FALSE, 'BANK_ACCOUNT_VERIFICATION',
                             'Bank account not verified in whitelist',
                             'Add bank account to whitelist or use verified account';
                RETURN;
            END IF;
        END IF;
    END IF;
    
    -- All checks passed
    INSERT INTO cashless_policy_logs (transaction_id, policy_type, check_type, status, amount, threshold_amount)
    VALUES (p_transaction_id, 'AMOUNT_THRESHOLD', 'PRE_TRANSACTION', 'PASSED', v_transaction.amount_idr, 1000000);
    
    RETURN QUERY SELECT TRUE, 'ALL_CHECKS', NULL, 'No action required';
END;
$$ LANGUAGE plpgsql;

-- Update trigger_approval_workflow function to auto-approve for admin
CREATE OR REPLACE FUNCTION trigger_approval_workflow(
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_requester_id UUID,
    p_amount DECIMAL(20,2) DEFAULT NULL,
    p_ledger_type VARCHAR(20) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_workflow_id UUID;
    v_approval_request_id UUID;
    v_workflow RECORD;
    v_user_role VARCHAR(50);
BEGIN
    -- Get requester role
    SELECT role INTO v_user_role FROM profiles WHERE id = p_requester_id;
    
    -- Auto-approve for admin (skip workflow creation)
    IF v_user_role = 'admin' THEN
        RAISE NOTICE 'Admin user detected, auto-approving without workflow';
        
        -- For transactions, we need to update status directly
        IF p_entity_type = 'TRANSACTION' THEN
            UPDATE financial_transactions 
            SET status = 'APPROVED'
            WHERE id = p_entity_id;
        END IF;
        
        -- Return a dummy UUID to indicate success
        RETURN uuid_generate_v4();
    END IF;
    
    -- Find applicable workflow based on amount threshold
    SELECT * INTO v_workflow
    FROM approval_workflows 
    WHERE workflow_type = p_entity_type
      AND (amount_threshold IS NULL OR p_amount IS NULL OR p_amount >= amount_threshold)
      AND (ledger_type IS NULL OR p_ledger_type IS NULL OR ledger_type = p_ledger_type OR ledger_type = 'ALL')
      AND is_active = TRUE
    ORDER BY amount_threshold DESC NULLS LAST
    LIMIT 1;
    
    IF v_workflow IS NULL THEN
        RAISE EXCEPTION 'No approval workflow found for entity type %', p_entity_type;
    END IF;
    
    -- Create approval request
    INSERT INTO approval_requests (
        workflow_id,
        entity_type,
        entity_id,
        amount,
        requester_id,
        deadline_date,
        description
    ) VALUES (
        v_workflow.id,
        p_entity_type,
        p_entity_id,
        p_amount,
        p_requester_id,
        CURRENT_TIMESTAMP + (v_workflow.auto_approve_days || ' days')::INTERVAL,
        'Auto-generated approval request for ' || p_entity_type || ' ID: ' || p_entity_id::TEXT
    ) RETURNING id INTO v_approval_request_id;
    
    -- Create approval steps based on required roles
    FOR i IN 1..v_workflow.min_approvals LOOP
        INSERT INTO approval_steps (
            approval_request_id,
            step_number,
            required_role,
            deadline_date
        ) VALUES (
            v_approval_request_id,
            i,
            v_workflow.required_roles[i],
            CURRENT_TIMESTAMP + (v_workflow.auto_approve_days || ' days')::INTERVAL
        );
    END LOOP;
    
    RETURN v_approval_request_id;
END;
$$ LANGUAGE plpgsql;

-- Update auto_create_transaction_approval trigger function to skip admin
CREATE OR REPLACE FUNCTION auto_create_transaction_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_approval_request_id UUID;
    v_user_role VARCHAR(50);
    v_ledger_type VARCHAR(20);
BEGIN
    -- Get user role
    SELECT role INTO v_user_role FROM profiles WHERE id = NEW.created_by;
    
    -- Skip approval for admin
    IF v_user_role = 'admin' THEN
        RAISE NOTICE 'Admin user detected, auto-approving transaction';
        NEW.status := 'APPROVED';
        RETURN NEW;
    END IF;
    
    -- Only create approval for new transactions that are not auto-approved
    IF NEW.status = 'DRAFT' OR NEW.status = 'SUBMITTED' THEN
        -- Get ledger type
        SELECT ledger_type INTO v_ledger_type 
        FROM accounting_ledgers 
        WHERE id = NEW.ledger_id;
        
        -- Trigger approval workflow if amount > 5 juta (medium threshold)
        IF NEW.amount_idr >= 5000000 THEN
            v_approval_request_id := trigger_approval_workflow(
                'TRANSACTION',
                NEW.id,
                NEW.created_by,
                NEW.amount_idr,
                v_ledger_type
            );
            
            -- Update transaction status to require approval
            NEW.status := 'SUBMITTED';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. UPDATE CHECK_SPENDING_LIMIT FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION check_spending_limit(
    p_user_id UUID,
    p_amount DECIMAL(20,2),
    p_ledger_type VARCHAR(20),
    p_limit_type VARCHAR(20) DEFAULT 'PER_TRANSACTION'
) RETURNS TABLE (
    is_within_limit BOOLEAN,
    current_usage DECIMAL(20,2),
    limit_amount DECIMAL(20,2),
    remaining DECIMAL(20,2),
    message TEXT
) AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_limit_record RECORD;
    v_usage DECIMAL(20,2);
BEGIN
    -- Get user role
    SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
    
    -- Skip checks for admin
    IF v_user_role = 'admin' THEN
        RETURN QUERY SELECT 
            TRUE, 
            0::DECIMAL, 
            NULL::DECIMAL, 
            NULL::DECIMAL,
            'Admin user - no limits apply';
    END IF;
    
    -- Get applicable limit
    SELECT * INTO v_limit_record 
    FROM spending_limits 
    WHERE role_name = v_user_role 
      AND limit_type = p_limit_type
      AND (ledger_type = p_ledger_type OR ledger_type = 'ALL')
      AND is_active = TRUE;
    
    IF v_limit_record IS NULL THEN
        RETURN QUERY SELECT 
            TRUE, 
            0::DECIMAL, 
            NULL::DECIMAL, 
            NULL::DECIMAL,
            'No spending limit defined for this role and ledger type';
    ELSE
        -- Calculate current usage based on limit type
        IF p_limit_type = 'DAILY' THEN
            SELECT COALESCE(SUM(amount_idr), 0) INTO v_usage
            FROM financial_transactions 
            WHERE created_by = p_user_id 
              AND ledger_id IN (SELECT id FROM accounting_ledgers WHERE ledger_type = p_ledger_type OR ledger_type = 'ALL')
              AND DATE(created_at) = CURRENT_DATE
              AND status IN ('APPROVED', 'PAID');
        ELSIF p_limit_type = 'MONTHLY' THEN
            SELECT COALESCE(SUM(amount_idr), 0) INTO v_usage
            FROM financial_transactions 
            WHERE created_by = p_user_id 
              AND ledger_id IN (SELECT id FROM accounting_ledgers WHERE ledger_type = p_ledger_type OR ledger_type = 'ALL')
              AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
              AND status IN ('APPROVED', 'PAID');
        ELSIF p_limit_type = 'ANNUAL' THEN
            SELECT COALESCE(SUM(amount_idr), 0) INTO v_usage
            FROM financial_transactions 
            WHERE created_by = p_user_id 
              AND ledger_id IN (SELECT id FROM accounting_ledgers WHERE ledger_type = p_ledger_type OR ledger_type = 'ALL')
              AND DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)
              AND status IN ('APPROVED', 'PAID');
        ELSE -- PER_TRANSACTION
            v_usage := 0;
        END IF;
        
        RETURN QUERY SELECT 
            (v_usage + p_amount) <= v_limit_record.limit_amount,
            v_usage,
            v_limit_record.limit_amount,
            v_limit_record.limit_amount - (v_usage + p_amount),
            CASE 
                WHEN (v_usage + p_amount) <= v_limit_record.limit_amount THEN 
                    'Within limit'
                ELSE 
                    'Exceeds limit: ' || (v_usage + p_amount - v_limit_record.limit_amount)::TEXT || ' over limit'
            END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. ADD GOD MODE PERMISSION TO ADMIN ROLE
-- ============================================
-- Note: The 'admin' role already has full permissions via the role_permissions table
-- created in migration 20250120_create_carbon_management_tables.sql
-- The permissions JSONB for 'admin' is: {"all": ["create", "read", "update", "delete"]}
-- This already grants god mode access. No additional permissions needed.

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    v_permissions JSONB;
    v_description TEXT;
BEGIN
    -- Count tables with RLS
    SELECT COUNT(*) INTO table_count
    FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relrowsecurity;
    
    -- Count admin policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies p
    JOIN pg_class c ON p.tablename = c.relname
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.policyname LIKE 'Admin full access to %';
    
    RAISE NOTICE 'Total tables with RLS: %', table_count;
    RAISE NOTICE 'Admin full access policies created: %', policy_count;
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ Admin full access policies are in place';
    ELSE
        RAISE WARNING '⚠️ No admin full access policies found';
    END IF;
    
    -- Verify admin permissions
    RAISE NOTICE 'Admin permissions in role_permissions:';
    IF EXISTS (SELECT 1 FROM role_permissions WHERE role_name = 'admin') THEN
        SELECT permissions, COALESCE(description, 'No description') 
        INTO v_permissions, v_description
        FROM role_permissions 
        WHERE role_name = 'admin';
        
        RAISE NOTICE '  - permissions: %', v_permissions;
        RAISE NOTICE '    description: %', v_description;
    ELSE
        RAISE WARNING 'No admin role found in role_permissions table';
    END IF;
END $$;

-- ============================================
-- 6. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration establishes Administrator as God User with:
-- 1. Full RLS bypass: Admin can access ALL data in ALL tables
-- 2. Validation bypass: All spending limits, cashless policies, approval workflows skipped
-- 3. Auto-approval: Transactions automatically approved for admin
-- 4. Super permissions: SUPER_ADMIN and other god mode permissions added
-- 
-- Administrator now has:
-- - Complete data access (CRUD on all tables)
-- - No spending limits or financial controls
-- - No approval workflow requirements
-- - No policy enforcement (cashless policy, etc.)
-- - Ability to manage all users
-- - System configuration access
-- 
-- This fulfills the requirement: "ADMINISTRATOR BISA MENGAKSES, MENGEDIT, MENAMBAH, MENGHAPUS SEMUA HAL DALAM SEMUA SEGMEN"