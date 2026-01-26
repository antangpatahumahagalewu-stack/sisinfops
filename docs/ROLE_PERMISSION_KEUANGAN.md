# ROLE & PERMISSION MATRIX SISTEM KEUANGAN

## **OVERVIEW**

Dokumen ini mendefinisikan struktur role, permission, dan akses kontrol untuk modul keuangan sistem ERP Yayasan. Sistem ini mengadopsi **Role-Based Access Control (RBAC)** dengan **Row Level Security (RLS)** untuk memastikan setiap user hanya dapat mengakses data yang sesuai dengan role-nya.

## **STRUKTUR ROLE KEUANGAN**

### **A. Core Finance Team (5 Orang)**

| Role ID | Nama Role | Deskripsi | Jumlah Staff |
|---------|-----------|-----------|--------------|
| `finance_manager` | Finance Manager | Overall financial management, final approval, strategic planning | 1 |
| `finance_operational` | Finance Operational Specialist | Operasional kantor, pembelian barang, administrasi keuangan harian | 1 |
| `finance_project_carbon` | Finance Project Specialist - Carbon | Proyek karbon, MRV, verification, carbon credit transactions | 1 |
| `finance_project_implementation` | Finance Project Specialist - Implementation | Implementasi lapangan, safeguard, community engagement | 1 |
| `finance_project_social` | Finance Project Specialist - Social Economic | Sosial-ekonomi, benefit sharing, livelihood programs | 1 |

### **B. Supporting Roles**

| Role ID | Nama Role | Deskripsi | Akses Keuangan |
|---------|-----------|-----------|----------------|
| `investor` | Investor / Donor | Read-only access untuk monitoring dana mereka | View only |
| `program_planner` | Program Planner | Perencanaan anggaran program (tidak bisa input transaksi) | Budget view only |
| `monev_officer` | Monev Officer | Monitoring & evaluasi keuangan | View & report only |
| `admin` | System Administrator | Technical system management | Full technical access |
| `viewer` | General Viewer | Akses terbatas untuk publik | Limited public view |

## **PERMISSION MATRIX DETAIL**

### **1. Finance Manager (Full Access)**
```sql
-- Permission untuk Finance Manager
INSERT INTO role_permissions (role_name, permission, description) VALUES
('finance_manager', 'FINANCIAL_TRANSACTION_CREATE', 'Buat transaksi keuangan baru'),
('finance_manager', 'FINANCIAL_TRANSACTION_EDIT', 'Edit transaksi yang ada'),
('finance_manager', 'FINANCIAL_TRANSACTION_DELETE', 'Hapus transaksi (dengan approval)'),
('finance_manager', 'FINANCIAL_TRANSACTION_APPROVE', 'Approve transaksi dari staff'),
('finance_manager', 'BUDGET_CREATE', 'Buat anggaran baru'),
('finance_manager', 'BUDGET_EDIT', 'Edit anggaran'),
('finance_manager', 'BUDGET_APPROVE', 'Approve anggaran'),
('finance_manager', 'LEDGER_MANAGEMENT', 'Kelola ledger (tambah/edit/hapus)'),
('finance_manager', 'CHART_OF_ACCOUNTS_MANAGE', 'Kelola chart of accounts'),
('finance_manager', 'BANK_ACCOUNT_MANAGE', 'Kelola rekening bank'),
('finance_manager', 'FINANCIAL_REPORT_GENERATE', 'Generate laporan keuangan'),
('finance_manager', 'FINANCIAL_REPORT_EXPORT', 'Export laporan (PDF, Excel)'),
('finance_manager', 'AUDIT_TRAIL_VIEW', 'Lihat audit trail'),
('finance_manager', 'USER_PERMISSION_MANAGE', 'Kelola permission user lain'),
('finance_manager', 'SYSTEM_CONFIG_FINANCE', 'Konfigurasi sistem keuangan');
```

### **2. Finance Operational Specialist**
```sql
-- Permission untuk Finance Operational
INSERT INTO role_permissions (role_name, permission, description) VALUES
('finance_operational', 'FINANCIAL_TRANSACTION_CREATE', 'Buat transaksi keuangan baru - OPERATIONAL ONLY'),
('finance_operational', 'FINANCIAL_TRANSACTION_EDIT', 'Edit transaksi sendiri - OPERATIONAL ONLY'),
('finance_operational', 'FINANCIAL_REPORT_VIEW', 'Lihat laporan keuangan operasional'),
('finance_operational', 'BUDGET_VIEW', 'Lihat anggaran operasional'),
('finance_operational', 'EXPENSE_SUBMIT', 'Submit pengajuan pengeluaran'),
('finance_operational', 'CASH_FLOW_VIEW', 'Lihat cash flow operasional'),
('finance_operational', 'BANK_RECONCILIATION', 'Rekonsiliasi bank operasional'),
('finance_operational', 'DOCUMENT_UPLOAD', 'Upload bukti transaksi');
```

### **3. Finance Project Specialist - Carbon**
```sql
-- Permission untuk Finance Project Carbon
INSERT INTO role_permissions (role_name, permission, description) VALUES
('finance_project_carbon', 'FINANCIAL_TRANSACTION_CREATE', 'Buat transaksi proyek karbon'),
('finance_project_carbon', 'FINANCIAL_TRANSACTION_EDIT', 'Edit transaksi proyek karbon'),
('finance_project_carbon', 'CARBON_PROJECT_BUDGET_VIEW', 'Lihat anggaran proyek karbon'),
('finance_project_carbon', 'CARBON_CREDIT_TRANSACTION', 'Transaksi kredit karbon'),
('finance_project_carbon', 'MRV_EXPENSE_MANAGEMENT', 'Kelola biaya MRV'),
('finance_project_carbon', 'CARBON_REPORT_GENERATE', 'Generate laporan karbon'),
('finance_project_carbon', 'PROJECT_EXPENSE_TRACKING', 'Tracking pengeluaran proyek'),
('finance_project_carbon', 'DONOR_REPORTING', 'Laporan untuk donor karbon');
```

### **4. Finance Project Specialist - Implementation**
```sql
-- Permission untuk Finance Project Implementation
INSERT INTO role_permissions (role_name, permission, description) VALUES
('finance_project_implementation', 'FINANCIAL_TRANSACTION_CREATE', 'Buat transaksi implementasi'),
('finance_project_implementation', 'FINANCIAL_TRANSACTION_EDIT', 'Edit transaksi implementasi'),
('finance_project_implementation', 'FIELD_EXPENSE_MANAGEMENT', 'Kelola biaya lapangan'),
('finance_project_implementation', 'SAFEGUARD_BUDGET_VIEW', 'Lihat anggaran safeguard'),
('finance_project_implementation', 'COMMUNITY_PAYMENT_PROCESS', 'Proses pembayaran masyarakat'),
('finance_project_implementation', 'IMPLEMENTATION_REPORTING', 'Laporan implementasi'),
('finance_project_implementation', 'ASSET_PURCHASE_REQUEST', 'Request pembelian aset proyek');
```

### **5. Finance Project Specialist - Social Economic**
```sql
-- Permission untuk Finance Project Social Economic
INSERT INTO role_permissions (role_name, permission, description) VALUES
('finance_project_social', 'FINANCIAL_TRANSACTION_CREATE', 'Buat transaksi sosial-ekonomi'),
('finance_project_social', 'FINANCIAL_TRANSACTION_EDIT', 'Edit transaksi sosial-ekonomi'),
('finance_project_social', 'BENEFIT_SHARING_MANAGEMENT', 'Kelola distribusi bagi hasil'),
('finance_project_social', 'LIVELIHOOD_PROGRAM_BUDGET', 'Anggaran program livelihood'),
('finance_project_social', 'COMMUNITY_TRAINING_EXPENSE', 'Biaya pelatihan masyarakat'),
('finance_project_social', 'SOCIAL_IMPACT_REPORTING', 'Laporan dampak sosial'),
('finance_project_social', 'KK_PAYMENT_PROCESSING', 'Proses pembayaran ke kepala keluarga');
```

### **6. Investor / Donor (Read-Only)**
```sql
-- Permission untuk Investor
INSERT INTO role_permissions (role_name, permission, description) VALUES
('investor', 'FINANCIAL_REPORT_VIEW', 'Lihat laporan keuangan proyek mereka'),
('investor', 'BUDGET_VIEW', 'Lihat anggaran proyek mereka'),
('investor', 'TRANSACTION_HISTORY_VIEW', 'Lihat history transaksi proyek mereka'),
('investor', 'EXPORT_REPORTS', 'Export laporan (PDF, Excel)'),
('investor', 'DASHBOARD_VIEW', 'Akses investor dashboard'),
('investor', 'IMPACT_METRICS_VIEW', 'Lihat metrik impact'),
('investor', 'DOCUMENT_DOWNLOAD', 'Download dokumen laporan');
```

## **LEDGER ACCESS MATRIX**

### **Dual Ledger System Access**

| Role | LEDGER-OPR (Operasional) | LEDGER-PRJ-CARBON | LEDGER-PRJ-IMPLEMENTATION | LEDGER-PRJ-SOCIAL |
|------|--------------------------|-------------------|---------------------------|-------------------|
| **Finance Manager** | FULL ACCESS | FULL ACCESS | FULL ACCESS | FULL ACCESS |
| **Finance Operational** | CREATE, EDIT, VIEW | NO ACCESS | NO ACCESS | NO ACCESS |
| **Finance Project Carbon** | VIEW ONLY | CREATE, EDIT, VIEW | NO ACCESS | NO ACCESS |
| **Finance Project Implementation** | VIEW ONLY | NO ACCESS | CREATE, EDIT, VIEW | NO ACCESS |
| **Finance Project Social** | VIEW ONLY | NO ACCESS | NO ACCESS | CREATE, EDIT, VIEW |
| **Investor** | NO ACCESS | VIEW ONLY (proyek mereka) | VIEW ONLY (proyek mereka) | VIEW ONLY (proyek mereka) |
| **Program Planner** | VIEW ONLY | VIEW ONLY | VIEW ONLY | VIEW ONLY |
| **Monev Officer** | VIEW ONLY | VIEW ONLY | VIEW ONLY | VIEW ONLY |

## **APPROVAL WORKFLOW MATRIX**

### **Spending Approval Limits**

| Role | Max Approval per Transaction | Max Approval Monthly | Require 2nd Approval > |
|------|-----------------------------|----------------------|------------------------|
| **Finance Operational** | Rp 5,000,000 | Rp 50,000,000 | Rp 2,500,000 |
| **Finance Project Carbon** | Rp 10,000,000 | Rp 100,000,000 | Rp 5,000,000 |
| **Finance Project Implementation** | Rp 7,500,000 | Rp 75,000,000 | Rp 3,750,000 |
| **Finance Project Social** | Rp 5,000,000 | Rp 50,000,000 | Rp 2,500,000 |
| **Finance Manager** | Rp 25,000,000 | Unlimited | Rp 10,000,000 |

### **Approval Chain Rules:**
1. **Transaksi ≤ Rp 2.5 juta**: Auto-approve untuk finance staff
2. **Transaksi Rp 2.5 - 10 juta**: Butuh approval Finance Manager
3. **Transaksi > Rp 10 juta**: Butuh approval Finance Manager + Director
4. **Transaksi > Rp 25 juta**: Butuh approval Committee (3 orang)

## **DATABASE IMPLEMENTATION**

### **A. Role Enum Extension**
```sql
-- Extend existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_operational';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_project_carbon';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_project_implementation';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_project_social';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'investor';

-- Create role_permissions table if not exists
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_name, permission)
);

-- Create finance_ledger_permissions table
CREATE TABLE finance_ledger_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ledger_id UUID REFERENCES accounting_ledgers(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) CHECK (permission_level IN ('VIEW', 'CREATE', 'EDIT', 'APPROVE', 'FULL')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, ledger_id)
);
```

### **B. RLS Policies Implementation**
```sql
-- RLS Policy untuk financial_transactions
CREATE POLICY "Finance team can view their ledger transactions"
ON financial_transactions FOR SELECT
USING (
    -- Finance Manager bisa lihat semua
    (auth.role() = 'finance_manager') OR
    -- Finance Operational hanya bisa lihat ledger operasional
    (auth.role() = 'finance_operational' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_type = 'OPERATIONAL'
    )) OR
    -- Finance Project Carbon hanya bisa lihat ledger carbon
    (auth.role() = 'finance_project_carbon' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-CARBON'
    )) OR
    -- Finance Project Implementation hanya bisa lihat ledger implementation
    (auth.role() = 'finance_project_implementation' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-IMPLEMENTATION'
    )) OR
    -- Finance Project Social hanya bisa lihat ledger social
    (auth.role() = 'finance_project_social' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-SOCIAL'
    )) OR
    -- Investor hanya bisa lihat transaksi proyek mereka
    (auth.role() = 'investor' AND project_id IN (
        SELECT project_id FROM investor_projects WHERE investor_id = auth.uid()
    ))
);

-- RLS Policy untuk INSERT
CREATE POLICY "Finance team can insert transactions based on ledger access"
ON financial_transactions FOR INSERT
WITH CHECK (
    -- Finance Manager bisa insert ke semua ledger
    (auth.role() = 'finance_manager') OR
    -- Finance Operational hanya bisa insert ke ledger operasional
    (auth.role() = 'finance_operational' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_type = 'OPERATIONAL'
    )) OR
    -- Finance Project Carbon hanya bisa insert ke ledger carbon
    (auth.role() = 'finance_project_carbon' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-CARBON'
    )) OR
    -- Finance Project Implementation hanya bisa insert ke ledger implementation
    (auth.role() = 'finance_project_implementation' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-IMPLEMENTATION'
    )) OR
    -- Finance Project Social hanya bisa insert ke ledger social
    (auth.role() = 'finance_project_social' AND ledger_id IN (
        SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-SOCIAL'
    ))
);
```

### **C. Spending Limits Function**
```sql
-- Function untuk validasi spending limits
CREATE OR REPLACE FUNCTION validate_spending_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_daily_total DECIMAL(20,2);
    v_monthly_total DECIMAL(20,2);
    v_limit_per_transaction DECIMAL(20,2);
    v_limit_daily DECIMAL(20,2);
    v_limit_monthly DECIMAL(20,2);
BEGIN
    -- Get user role
    SELECT role INTO v_user_role 
    FROM profiles 
    WHERE id = NEW.created_by;
    
    -- Get limits for this role
    SELECT 
        COALESCE(MAX(CASE WHEN limit_type = 'PER_TRANSACTION' THEN limit_amount END), 0),
        COALESCE(MAX(CASE WHEN limit_type = 'DAILY' THEN limit_amount END), 0),
        COALESCE(MAX(CASE WHEN limit_type = 'MONTHLY' THEN limit_amount END), 0)
    INTO v_limit_per_transaction, v_limit_daily, v_limit_monthly
    FROM spending_limits
    WHERE role_name = v_user_role
      AND is_active = TRUE;
    
    -- Check per transaction limit
    IF NEW.jumlah_idr > v_limit_per_transaction AND v_user_role != 'finance_manager' THEN
        RAISE EXCEPTION 'Transaction amount (Rp %) exceeds your per transaction limit (Rp %)', 
            NEW.jumlah_idr, v_limit_per_transaction;
    END IF;
    
    -- Check daily limit
    SELECT COALESCE(SUM(jumlah_idr), 0) INTO v_daily_total
    FROM financial_transactions
    WHERE created_by = NEW.created_by
      AND DATE(created_at) = CURRENT_DATE
      AND jenis_transaksi = 'PENGELUARAN';
    
    IF (v_daily_total + NEW.jumlah_idr) > v_limit_daily AND v_user_role != 'finance_manager' THEN
        RAISE EXCEPTION 'Daily spending limit (Rp %) would be exceeded. Current: Rp %, This transaction: Rp %', 
            v_limit_daily, v_daily_total, NEW.jumlah_idr;
    END IF;
    
    -- Check monthly limit
    SELECT COALESCE(SUM(jumlah_idr), 0) INTO v_monthly_total
    FROM financial_transactions
    WHERE created_by = NEW.created_by
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND jenis_transaksi = 'PENGELUARAN';
    
    IF (v_monthly_total + NEW.jumlah_idr) > v_limit_monthly AND v_user_role != 'finance_manager' THEN
        RAISE EXCEPTION 'Monthly spending limit (Rp %) would be exceeded. Current: Rp %, This transaction: Rp %', 
            v_limit_monthly, v_monthly_total, NEW.jumlah_idr;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk spending limits
CREATE TRIGGER check_spending_limits
    BEFORE INSERT ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_spending_limit();
```

## **USER ONBOARDING WORKFLOW**

### **A. New Finance Staff Setup:**
1. **HR creates user account** dengan role dasar
2. **System Admin assigns specific finance role**
3. **Finance Manager configures ledger permissions**
4. **Auto-generated onboarding tasks:**
   - [ ] Complete finance policy training
   - [ ] Setup digital signature
   - [ ] Configure approval limits
   - [ ] Test transaction submission

### **B. Investor Account Setup:**
1. **Finance team creates investor profile**
2. **Link investor to specific projects/grants**
3. **Auto-generate investor dashboard access**
4. **Send welcome email with credentials**

## **AUDIT & COMPLIANCE FEATURES**

### **A. Permission Change Logging:**
```sql
CREATE TABLE permission_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id),
    changed_by UUID REFERENCES profiles(id),
    change_type VARCHAR(20) CHECK (change_type IN ('ROLE_CHANGE', 'PERMISSION_ADD', 'PERMISSION_REMOVE')),
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **B. Regular Permission Reviews:**
1. **Monthly**: Finance Manager reviews all permissions
2. **Quarterly**: Internal audit of role assignments
3. **Annually**: Complete permission matrix review
4. **Ad-hoc**: When staff change roles or leave

## **SECURITY BEST PRACTICES**

### **1. Principle of Least Privilege:**
- Setiap user hanya dapat akses data yang diperlukan untuk pekerjaannya
- Default permission adalah "no access"
- Permission diberikan secara eksplisit

### **2. Separation of Duties:**
- Orang yang input transaksi ≠ orang yang approve
- Orang yang manage budget ≠ orang yang execute payment
- Orang yang manage bank account ≠ orang yang record transactions

### **3. Four-Eyes Principle:**
- Transaksi > Rp 2.5 juta butuh 2 approval
- Transaksi > Rp 10 juta butuh 3 approval
- Critical changes butuh managerial approval

### **4. Regular Access Reviews:**
- Monthly review of user access
- Quarterly audit of permission logs
- Annual comprehensive security review

## **IMPLEMENTATION TIMELINE**

### **Phase 1 (Week 1-2): Basic RBAC**
- [x] Define role structure
- [x] Create permission matrix
- [x] Extend user_role enum
- [x] Setup basic RLS policies

### **Phase 2 (Week 3-4): Advanced Controls**
- [ ] Implement spending limits
- [ ] Setup approval workflows
- [ ] Create ledger permission system
- [ ] Implement audit logging

### **Phase 3 (Week 5-6): Integration & Testing**
- [ ] Integrate with existing auth system
- [ ] Test all permission scenarios
- [ ] User acceptance testing
- [ ] Security penetration testing

### **Phase 4 (Week 7-8): Optimization**
- [ ] Performance tuning
- [ ] Mobile access optimization
- [ ] Automated permission reviews
- [ ] Advanced analytics on access patterns

## **TROUBLESHOOTING COMMON ISSUES**

### **Issue 1: User cannot access ledger**
**Solution:**
1. Check `finance_ledger_permissions` table
2. Verify user role in `profiles` table
3. Check RLS policies are active
4. Validate ledger is active in `accounting_ledgers`

### **Issue 2: Transaction approval stuck**
**Solution:**
1. Check `approval_workflows` configuration
2. Verify approver has sufficient permission level
3. Check spending limits not exceeded
4. Validate workflow steps completion

### **Issue 3: Investor cannot see project data**
**Solution:**
1. Verify `investor_projects` mapping
2. Check project status is active
3. Validate investor role assignment
4. Check RLS policies for investor role

## **DOKUMENTASI TERKAIT**

1. **IMPLEMENTASI_KEUANGAN_PHASE1.md** - Roadmap implementasi
2. **DESAIN_SISTEM_KEUANGAN_SAK.md** - Desain sistem SAK
3. **DATABASE_SCHEMA_KEUANGAN.md** - Skema database
4. **API_ENDPOINTS_KEUANGAN.md** - Endpoint API

---
**Dokumen Terakhir Diupdate**: 26 Januari 2026  
**Versi**: 1.0.0  
**Status**: Ready for Implementation Phase 1