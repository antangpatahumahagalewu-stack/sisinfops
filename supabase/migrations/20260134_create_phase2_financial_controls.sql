-- Migration: Create Phase 2 Financial Controls & Workflow Tables
-- Date: 2026-01-27
-- Description: Add tables for spending limits, approval workflows, cashless policy enforcement, and bank account whitelist
-- PRINCIPLE: ADDITIVE ONLY - no alterations to existing tables, only new tables.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. SPENDING_LIMITS TABLE (Role-based limits)
-- ============================================
CREATE TABLE IF NOT EXISTS spending_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('DAILY', 'MONTHLY', 'PER_TRANSACTION', 'ANNUAL')),
    limit_amount DECIMAL(20,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    ledger_type VARCHAR(20) CHECK (ledger_type IN ('OPERASIONAL', 'PROYEK', 'ALL')),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_role_limit_type UNIQUE (role_name, limit_type, ledger_type)
);

COMMENT ON TABLE spending_limits IS 'Role-based spending limits for anti-fraud controls';
COMMENT ON COLUMN spending_limits.limit_type IS 'DAILY, MONTHLY, PER_TRANSACTION, or ANNUAL limit';
COMMENT ON COLUMN spending_limits.ledger_type IS 'Applies to specific ledger type or ALL';

-- ============================================
-- 2. APPROVAL_WORKFLOWS TABLE (Multi-level approval)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('TRANSACTION', 'BUDGET', 'GRANT', 'BENEFIT_DISTRIBUTION', 'REPORT')),
    min_approvals INTEGER NOT NULL DEFAULT 1,
    required_roles TEXT[] NOT NULL, -- Array of roles that can approve
    amount_threshold DECIMAL(20,2), -- Minimum amount to trigger this workflow
    ledger_type VARCHAR(20) CHECK (ledger_type IN ('OPERASIONAL', 'PROYEK', 'ALL')),
    auto_approve_days INTEGER DEFAULT 3, -- Auto-approve after X days if no action
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_workflow_name_type UNIQUE (workflow_name, workflow_type)
);

COMMENT ON TABLE approval_workflows IS 'Multi-level approval workflows with four-eyes principle';
COMMENT ON COLUMN approval_workflows.required_roles IS 'Array of roles that can approve (e.g., {finance_manager,admin})';

-- ============================================
-- 3. APPROVAL_REQUESTS TABLE (Individual requests)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('TRANSACTION', 'BUDGET', 'GRANT', 'BENEFIT_DISTRIBUTION', 'REPORT')),
    entity_id UUID NOT NULL,
    current_status VARCHAR(20) DEFAULT 'PENDING' CHECK (current_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    amount DECIMAL(20,2),
    currency VARCHAR(3) DEFAULT 'IDR',
    requester_id UUID REFERENCES profiles(id) NOT NULL,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    deadline_date TIMESTAMPTZ,
    description TEXT,
    supporting_docs TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE approval_requests IS 'Individual approval requests tracking';
COMMENT ON COLUMN approval_requests.entity_id IS 'ID of the entity being approved (transaction, budget, etc)';

-- ============================================
-- 4. APPROVAL_STEPS TABLE (Multi-step approvals)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    required_role VARCHAR(50) NOT NULL,
    approver_id UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED')),
    comments TEXT,
    approved_at TIMESTAMPTZ,
    deadline_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_step_per_request UNIQUE (approval_request_id, step_number)
);

COMMENT ON TABLE approval_steps IS 'Individual steps in multi-step approval process';
COMMENT ON COLUMN approval_steps.step_number IS 'Step number in sequence (1, 2, 3, ...)';

-- ============================================
-- 5. BANK_ACCOUNTS_WHITELIST TABLE (Verified accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts_whitelist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20),
    account_type VARCHAR(50) CHECK (account_type IN ('VENDOR', 'STAFF', 'COMMUNITY', 'DONOR', 'GOVERNMENT', 'OTHER')),
    beneficiary_type VARCHAR(50) CHECK (beneficiary_type IN ('INDIVIDUAL', 'COMPANY', 'ORGANIZATION', 'GOVERNMENT')),
    beneficiary_id UUID, -- Could reference profiles, vendors, etc.
    verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    verification_docs TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_bank_account UNIQUE (account_number, bank_name)
);

COMMENT ON TABLE bank_accounts_whitelist IS 'Whitelist of verified bank accounts for cashless policy enforcement';
COMMENT ON COLUMN bank_accounts_whitelist.beneficiary_id IS 'Reference to beneficiary profile/vendor if exists';

-- ============================================
-- 6. CASHLESS_POLICY_LOGS TABLE (Enforcement logs)
-- ============================================
CREATE TABLE IF NOT EXISTS cashless_policy_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('AMOUNT_THRESHOLD', 'BANK_ACCOUNT_VERIFICATION', 'PAYMENT_METHOD')),
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('PRE_TRANSACTION', 'POST_TRANSACTION', 'MANUAL_REVIEW')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'WARNING', 'EXEMPTED')),
    amount DECIMAL(20,2),
    threshold_amount DECIMAL(20,2),
    failure_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cashless_policy_logs IS 'Logs for cashless policy enforcement and validation';
COMMENT ON COLUMN cashless_policy_logs.threshold_amount IS 'Threshold amount for policy (e.g., 1000000 for >1 juta must be transfer)';

-- ============================================
-- 7. SEED INITIAL DATA
-- ============================================

-- Insert default spending limits for finance roles
INSERT INTO spending_limits (role_name, limit_type, limit_amount, ledger_type, description) VALUES
-- Finance Operational Specialist
('finance_operational', 'PER_TRANSACTION', 5000000, 'OPERASIONAL', 'Max 5 juta per transaksi operasional'),
('finance_operational', 'DAILY', 20000000, 'OPERASIONAL', 'Max 20 juta per hari operasional'),
('finance_operational', 'MONTHLY', 200000000, 'OPERASIONAL', 'Max 200 juta per bulan operasional'),
-- Finance Project Specialist
('finance_project_carbon', 'PER_TRANSACTION', 10000000, 'PROYEK', 'Max 10 juta per transaksi proyek karbon'),
('finance_project_carbon', 'DAILY', 50000000, 'PROYEK', 'Max 50 juta per hari proyek karbon'),
('finance_project_carbon', 'MONTHLY', 500000000, 'PROYEK', 'Max 500 juta per bulan proyek karbon'),
-- Finance Project Implementation
('finance_project_implementation', 'PER_TRANSACTION', 7500000, 'PROYEK', 'Max 7.5 juta per transaksi implementasi'),
('finance_project_implementation', 'DAILY', 30000000, 'PROYEK', 'Max 30 juta per hari implementasi'),
('finance_project_implementation', 'MONTHLY', 300000000, 'PROYEK', 'Max 300 juta per bulan implementasi'),
-- Finance Project Social
('finance_project_social', 'PER_TRANSACTION', 5000000, 'PROYEK', 'Max 5 juta per transaksi sosial'),
('finance_project_social', 'DAILY', 20000000, 'PROYEK', 'Max 20 juta per hari sosial'),
('finance_project_social', 'MONTHLY', 200000000, 'PROYEK', 'Max 200 juta per bulan sosial'),
-- Finance Manager (higher limits)
('finance_manager', 'PER_TRANSACTION', 25000000, 'ALL', 'Max 25 juta per transaksi semua ledger'),
('finance_manager', 'DAILY', 100000000, 'ALL', 'Max 100 juta per hari semua ledger'),
('finance_manager', 'MONTHLY', 1000000000, 'ALL', 'Max 1 milyar per bulan semua ledger')
ON CONFLICT (role_name, limit_type, ledger_type) DO NOTHING;

-- Insert default approval workflows
INSERT INTO approval_workflows (workflow_name, workflow_type, min_approvals, required_roles, amount_threshold, ledger_type, description) VALUES
-- Small transactions (self-approval for finance roles)
('Small Transaction', 'TRANSACTION', 1, ARRAY['finance_operational','finance_project_carbon','finance_project_implementation','finance_project_social','finance_manager'], 1000000, 'ALL', 'Self-approval for transactions up to 1 juta'),
-- Medium transactions (2 approvers)
('Medium Transaction', 'TRANSACTION', 2, ARRAY['finance_manager','admin','carbon_specialist','program_planner'], 5000000, 'ALL', 'Two approvers required for 5-10 juta transactions'),
-- Large transactions (3 approvers including admin/director)
('Large Transaction', 'TRANSACTION', 3, ARRAY['finance_manager','admin','director'], 10000000, 'ALL', 'Three approvers including director for >10 juta'),
-- Budget approvals
('Budget Approval', 'BUDGET', 2, ARRAY['finance_manager','admin','program_planner'], NULL, 'ALL', 'Budget approval workflow'),
-- Grant approvals
('Grant Approval', 'GRANT', 3, ARRAY['finance_manager','admin','director','carbon_specialist'], NULL, 'ALL', 'Grant approval workflow'),
-- Benefit distribution approvals
('Benefit Distribution', 'BENEFIT_DISTRIBUTION', 2, ARRAY['finance_manager','program_implementer','admin'], NULL, 'PROYEK', 'Benefit distribution approval')
ON CONFLICT (workflow_name, workflow_type) DO NOTHING;

-- Insert sample verified bank accounts
INSERT INTO bank_accounts_whitelist (account_number, account_name, bank_name, account_type, beneficiary_type, verification_status, is_active) VALUES
('1234567890', 'PT Supplier Bibit Unggul', 'BCA', 'VENDOR', 'COMPANY', 'VERIFIED', TRUE),
('0987654321', 'CV Alat Pertanian Modern', 'Mandiri', 'VENDOR', 'COMPANY', 'VERIFIED', TRUE),
('1122334455', 'John Doe - Fasilitator', 'BNI', 'STAFF', 'INDIVIDUAL', 'VERIFIED', TRUE),
('5566778899', 'Kelompok Tani Sejahtera', 'BRI', 'COMMUNITY', 'ORGANIZATION', 'VERIFIED', TRUE),
('6677889900', 'Dinas Kehutanan Provinsi', 'Bank Negara Indonesia', 'GOVERNMENT', 'GOVERNMENT', 'VERIFIED', TRUE)
ON CONFLICT (account_number, bank_name) DO NOTHING;

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

-- Spending Limits
CREATE INDEX IF NOT EXISTS idx_spending_limits_role ON spending_limits(role_name);
CREATE INDEX IF NOT EXISTS idx_spending_limits_type ON spending_limits(limit_type);
CREATE INDEX IF NOT EXISTS idx_spending_limits_active ON spending_limits(is_active);

-- Approval Workflows
CREATE INDEX IF NOT EXISTS idx_approval_workflows_type ON approval_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_active ON approval_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_threshold ON approval_workflows(amount_threshold);

-- Approval Requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(current_status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_date ON approval_requests(request_date);

-- Approval Steps
CREATE INDEX IF NOT EXISTS idx_approval_steps_request ON approval_steps(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_status ON approval_steps(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver ON approval_steps(approver_id);

-- Bank Accounts Whitelist
CREATE INDEX IF NOT EXISTS idx_bank_accounts_number ON bank_accounts_whitelist(account_number);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_verification ON bank_accounts_whitelist(verification_status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts_whitelist(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_beneficiary ON bank_accounts_whitelist(beneficiary_type, beneficiary_id);

-- Cashless Policy Logs
CREATE INDEX IF NOT EXISTS idx_cashless_logs_transaction ON cashless_policy_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cashless_logs_status ON cashless_policy_logs(status);
CREATE INDEX IF NOT EXISTS idx_cashless_logs_created ON cashless_policy_logs(created_at);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================
ALTER TABLE spending_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashless_policy_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Spending Limits: Readable by authenticated users, manageable by admin, finance_manager
DROP POLICY IF EXISTS "Spending limits readable by authenticated users" ON spending_limits;
CREATE POLICY "Spending limits readable by authenticated users" ON spending_limits
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Spending limits manageable by admin, finance_manager" ON spending_limits;
CREATE POLICY "Spending limits manageable by admin, finance_manager" ON spending_limits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- Approval Workflows: Readable by authenticated users, manageable by admin, finance_manager
DROP POLICY IF EXISTS "Approval workflows readable by authenticated users" ON approval_workflows;
CREATE POLICY "Approval workflows readable by authenticated users" ON approval_workflows
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Approval workflows manageable by admin, finance_manager" ON approval_workflows;
CREATE POLICY "Approval workflows manageable by admin, finance_manager" ON approval_workflows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- Approval Requests: Complex permissions
DROP POLICY IF EXISTS "Approval requests readable by authenticated users" ON approval_requests;
CREATE POLICY "Approval requests readable by authenticated users" ON approval_requests
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can see their own requests
DROP POLICY IF EXISTS "Users can manage own approval requests" ON approval_requests;
CREATE POLICY "Users can manage own approval requests" ON approval_requests
    FOR ALL USING (
        requester_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager', 'carbon_specialist', 'program_planner', 'director')
        )
    );

-- Approval Steps: Readable by authenticated, manageable by approvers
DROP POLICY IF EXISTS "Approval steps readable by authenticated users" ON approval_steps;
CREATE POLICY "Approval steps readable by authenticated users" ON approval_steps
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Approval steps manageable by approvers" ON approval_steps;
CREATE POLICY "Approval steps manageable by approvers" ON approval_steps
    FOR ALL USING (
        approver_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- Bank Accounts Whitelist: Readable by authenticated, manageable by admin, finance
DROP POLICY IF EXISTS "Bank accounts readable by authenticated users" ON bank_accounts_whitelist;
CREATE POLICY "Bank accounts readable by authenticated users" ON bank_accounts_whitelist
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Bank accounts manageable by admin, finance" ON bank_accounts_whitelist;
CREATE POLICY "Bank accounts manageable by admin, finance" ON bank_accounts_whitelist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 'finance_project_implementation', 'finance_project_social')
        )
    );

-- Cashless Policy Logs: Readable by authenticated, manageable by system
DROP POLICY IF EXISTS "Cashless logs readable by authenticated users" ON cashless_policy_logs;
CREATE POLICY "Cashless logs readable by authenticated users" ON cashless_policy_logs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Cashless logs manageable by admin, finance" ON cashless_policy_logs;
CREATE POLICY "Cashless logs manageable by admin, finance" ON cashless_policy_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'finance_manager')
        )
    );

-- ============================================
-- 11. TRIGGERS FOR UPDATED_AT
-- ============================================
-- Apply update_updated_at_column trigger to all new tables
DROP TRIGGER IF EXISTS update_spending_limits_updated_at ON spending_limits;
CREATE TRIGGER update_spending_limits_updated_at
    BEFORE UPDATE ON spending_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_workflows_updated_at ON approval_workflows;
CREATE TRIGGER update_approval_workflows_updated_at
    BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_steps_updated_at ON approval_steps;
CREATE TRIGGER update_approval_steps_updated_at
    BEFORE UPDATE ON approval_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_accounts_whitelist_updated_at ON bank_accounts_whitelist;
CREATE TRIGGER update_bank_accounts_whitelist_updated_at
    BEFORE UPDATE ON bank_accounts_whitelist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. AUDIT TRIGGERS FOR NEW TABLES
-- ============================================
-- Apply audit_trigger_function to all new tables
DROP TRIGGER IF EXISTS audit_spending_limits ON spending_limits;
CREATE TRIGGER audit_spending_limits
    AFTER INSERT OR UPDATE OR DELETE ON spending_limits
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_approval_workflows ON approval_workflows;
CREATE TRIGGER audit_approval_workflows
    AFTER INSERT OR UPDATE OR DELETE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_approval_requests ON approval_requests;
CREATE TRIGGER audit_approval_requests
    AFTER INSERT OR UPDATE OR DELETE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_approval_steps ON approval_steps;
CREATE TRIGGER audit_approval_steps
    AFTER INSERT OR UPDATE OR DELETE ON approval_steps
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_bank_accounts_whitelist ON bank_accounts_whitelist;
CREATE TRIGGER audit_bank_accounts_whitelist
    AFTER INSERT OR UPDATE OR DELETE ON bank_accounts_whitelist
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_cashless_policy_logs ON cashless_policy_logs;
CREATE TRIGGER audit_cashless_policy_logs
    AFTER INSERT OR UPDATE OR DELETE ON cashless_policy_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 13. FUNCTIONS FOR FINANCIAL CONTROLS
-- ============================================

-- Function to check spending limits
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

-- Function to enforce cashless policy (transactions > 1 juta must be bank transfer)
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
BEGIN
    -- Get transaction details
    SELECT ft.*, al.ledger_type INTO v_transaction
    FROM financial_transactions ft
    LEFT JOIN accounting_ledgers al ON ft.ledger_id = al.id
    WHERE ft.id = p_transaction_id;
    
    IF v_transaction IS NULL THEN
        RETURN QUERY SELECT FALSE, 'AMOUNT_THRESHOLD', 'Transaction not found', 'Verify transaction exists';
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

-- Function to trigger approval workflow
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
BEGIN
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

-- Trigger function to auto-create approval request for large transactions
CREATE OR REPLACE FUNCTION auto_create_transaction_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_approval_request_id UUID;
BEGIN
    -- Only create approval for new transactions that are not auto-approved
    IF NEW.status = 'DRAFT' OR NEW.status = 'SUBMITTED' THEN
        -- Get ledger type
        DECLARE
            v_ledger_type VARCHAR(20);
        BEGIN
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
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic approval workflow creation
DROP TRIGGER IF EXISTS auto_approval_workflow ON financial_transactions;
CREATE TRIGGER auto_approval_workflow
    BEFORE INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_transaction_approval();

-- ============================================
-- 14. MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration adds Phase 2 Financial Controls & Workflow features:
-- 1. Spending limits system with role-based limits
-- 2. Multi-level approval workflows with four-eyes principle
-- 3. Cashless policy enforcement (transactions > 1 juta must be bank transfer)
-- 4. Bank account whitelist system for verified accounts
-- 5. Automatic approval request creation for large transactions
-- 6. Comprehensive audit logging for all policy enforcement
-- 
-- All new tables have RLS policies, audit triggers, and proper indexes.
-- Seed data for default spending limits and approval workflows is provided.
-- Functions for automated policy enforcement are included.