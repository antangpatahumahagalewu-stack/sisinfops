# IMPLEMENTASI MODUL KEUANGAN - PHASE 1 (8 MINGGU)

## **OVERVIEW**

Dokumen ini merinci roadmap implementasi modul keuangan yang komprehensif untuk Sistem Informasi Perhutanan Sosial & Proyek Karbon. Sistem ini dirancang dengan **dual ledger system** (Operasional Kantor vs Proyek/Program), **SAK compliance**, dan **anti-fraud controls** untuk memastikan transparansi dan akuntabilitas keuangan yayasan.

## **VISI & TUJUAN**

### **Visi:**
Membangun sistem keuangan yang **100% transparan, auditable, dan compliant** dengan Standar Akuntansi Indonesia (SAK) untuk meningkatkan kepercayaan investor dan donor.

### **Tujuan:**
1. **Transparansi Total** untuk investor dan donor
2. **Akuntabilitas Penuh** dengan audit trail lengkap
3. **Pencegahan Fraud** dengan kontrol ketat
4. **Kepatuhan SAK** dan regulasi perpajakan Indonesia
5. **Efisiensi Operasional** dengan workflow yang terotomasi

## **STRUKTUR DASAR SISTEM**

### **A. Dual Ledger System (2 Pembukuan Terpisah)**
```
1. LEDGER-OPR (Operasional Kantor)
   ├── Sumber Dana: Administrative fee dari donor
   ├── Penggunaan: Gaji, listrik, internet, makan, pembelian barang kantor, maintenance
   ├── Rekening Bank: Terpisah khusus operasional
   └── Tim: Finance Manager + 1 Finance Operasional Specialist

2. LEDGER-PRJ (Proyek/Program)
   ├── Sumber Dana: Grant khusus donor per proyek
   ├── Penggunaan: Carbon projects, implementasi & MRV, sosial-ekonomi & safeguard
   ├── Rekening Bank: Terpisah per proyek/program
   └── Tim: Finance Manager + 3 Finance Project Specialists
```

### **B. Tim Keuangan (5 Orang)**
| Role | Jumlah | Tanggung Jawab | Akses Ledger |
|------|--------|----------------|--------------|
| **Finance Manager** | 1 | Overall financial management, final approval | Kedua ledger |
| **Finance Operasional Specialist** | 1 | Operasional kantor, pembelian barang | Hanya LEDGER-OPR |
| **Finance Project Specialist (Carbon)** | 1 | Proyek karbon, MRV, verification | Hanya LEDGER-PRJ (Carbon) |
| **Finance Project Specialist (Implementation)** | 1 | Implementasi lapangan, safeguard | Hanya LEDGER-PRJ (Implementation) |
| **Finance Project Specialist (Social Economic)** | 1 | Sosial-ekonomi, benefit sharing | Hanya LEDGER-PRJ (Social Economic) |

## **ROADMAP IMPLEMENTASI (8 MINGGU)**

### **PHASE 1: FOUNDATION (MINGGU 1-2)**

#### **Tujuan:**
Membangun foundation database, role system, dan basic permission matrix.

#### **Deliverables:**
1. **Database Migrations** untuk dual ledger system
2. **Role Creation** untuk finance team dan investor
3. **Basic Accounting Setup** dengan chart of accounts SAK
4. **Permission Matrix** implementasi

#### **Task Detail:**

**Minggu 1, Hari 1-3: Database Schema**
```sql
-- 1. Tabel accounting_ledgers untuk dual ledger
CREATE TABLE accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ledger_code VARCHAR(20) UNIQUE NOT NULL, -- LEDGER-OPR, LEDGER-PRJ-CARBON, dll
    ledger_name VARCHAR(100) NOT NULL,
    ledger_type VARCHAR(20) CHECK (ledger_type IN ('OPERATIONAL', 'PROJECT')),
    description TEXT,
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    opening_balance DECIMAL(20,2) DEFAULT 0,
    current_balance DECIMAL(20,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel finance_ledger_permissions untuk role-based access
CREATE TABLE finance_ledger_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ledger_id UUID REFERENCES accounting_ledgers(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) CHECK (permission_level IN ('VIEW', 'CREATE', 'EDIT', 'APPROVE', 'FULL')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, ledger_id)
);

-- 3. Tabel chart_of_accounts sesuai SAK
CREATE TABLE chart_of_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL, -- Format: 1-xxxx (Asset), 2-xxxx (Liability), dll
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    account_subtype VARCHAR(100),
    normal_balance VARCHAR(10) CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    ledger_type VARCHAR(20) CHECK (ledger_type IN ('OPERATIONAL', 'PROJECT', 'BOTH')),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Minggu 1, Hari 4-5: Role & Permission System**
```sql
-- Tambah role baru ke sistem
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_operational';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_project_carbon';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_project_implementation';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_project_social';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'investor';

-- Buat permission matrix di tabel role_permissions
INSERT INTO role_permissions (role_name, permission) VALUES
-- Finance Manager (akses semua)
('finance_manager', 'FINANCIAL_TRANSACTION_CREATE'),
('finance_manager', 'FINANCIAL_TRANSACTION_EDIT'),
('finance_manager', 'FINANCIAL_TRANSACTION_APPROVE'),
('finance_manager', 'FINANCIAL_REPORT_VIEW'),
('finance_manager', 'FINANCIAL_REPORT_GENERATE'),
('finance_manager', 'BUDGET_MANAGEMENT'),
('finance_manager', 'LEDGER_MANAGEMENT'),

-- Finance Operational (hanya operasional)
('finance_operational', 'FINANCIAL_TRANSACTION_CREATE'),
('finance_operational', 'FINANCIAL_TRANSACTION_EDIT'),
('finance_operational', 'FINANCIAL_REPORT_VIEW'),

-- Investor (read-only semua)
('investor', 'FINANCIAL_REPORT_VIEW'),
('investor', 'EXPORT_REPORTS'),
('investor', 'DASHBOARD_VIEW');
```

**Minggu 1, Hari 6-7: Sample Data & Testing**
```sql
-- Insert sample ledgers
INSERT INTO accounting_ledgers (ledger_code, ledger_name, ledger_type, description) VALUES
('LEDGER-OPR', 'Operasional Kantor', 'OPERATIONAL', 'Pembukuan untuk biaya operasional kantor'),
('LEDGER-PRJ-CARBON', 'Proyek Karbon', 'PROJECT', 'Pembukuan untuk proyek karbon'),
('LEDGER-PRJ-IMPLEMENTATION', 'Implementasi & MRV', 'PROJECT', 'Pembukuan untuk implementasi lapangan'),
('LEDGER-PRJ-SOCIAL', 'Sosial Ekonomi', 'PROJECT', 'Pembukuan untuk program sosial-ekonomi');

-- Insert sample chart of accounts (SAK compliant)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, normal_balance, ledger_type) VALUES
-- ASSETS (1-xxxx)
('1110', 'Kas dan Setara Kas', 'ASSET', 'DEBIT', 'BOTH'),
('1120', 'Bank - Operasional', 'ASSET', 'DEBIT', 'OPERATIONAL'),
('1130', 'Bank - Proyek Karbon', 'ASSET', 'DEBIT', 'PROJECT'),
('1140', 'Bank - Proyek Implementasi', 'ASSET', 'DEBIT', 'PROJECT'),
('1150', 'Bank - Proyek Sosial', 'ASSET', 'DEBIT', 'PROJECT'),

-- LIABILITIES (2-xxxx)
('2110', 'Hutang Usaha', 'LIABILITY', 'CREDIT', 'BOTH'),
('2210', 'Hutang Pajak', 'LIABILITY', 'CREDIT', 'OPERATIONAL'),

-- EQUITY (3-xxxx)
('3110', 'Modal Yayasan', 'EQUITY', 'CREDIT', 'BOTH'),
('3120', 'Saldo Laba', 'EQUITY', 'CREDIT', 'BOTH'),

-- INCOME (4-xxxx)
('4110', 'Pendapatan dari Donor', 'INCOME', 'CREDIT', 'BOTH'),
('4120', 'Pendapatan Bunga Bank', 'INCOME', 'CREDIT', 'BOTH'),

-- EXPENSES - OPERATIONAL (5-xxxx)
('5110', 'Beban Gaji dan Upah', 'EXPENSE', 'DEBIT', 'OPERATIONAL'),
('5120', 'Beban Sewa', 'EXPENSE', 'DEBIT', 'OPERATIONAL'),
('5130', 'Beban Listrik, Air, Telepon', 'EXPENSE', 'DEBIT', 'OPERATIONAL'),
('5140', 'Beban Transportasi', 'EXPENSE', 'DEBIT', 'OPERATIONAL'),
('5150', 'Beban ATK', 'EXPENSE', 'DEBIT', 'OPERATIONAL'),
('5160', 'Beban Maintenance', 'EXPENSE', 'DEBIT', 'OPERATIONAL'),

-- EXPENSES - PROJECT (5-xxxx)
('5210', 'Beban Bibit Pohon', 'EXPENSE', 'DEBIT', 'PROJECT'),
('5220', 'Beban Alat Pertanian', 'EXPENSE', 'DEBIT', 'PROJECT'),
('5230', 'Beban Pelatihan Masyarakat', 'EXPENSE', 'DEBIT', 'PROJECT'),
('5240', 'Beban Monitoring & Evaluasi', 'EXPENSE', 'DEBIT', 'PROJECT'),
('5250', 'Beban Bagi Hasil Masyarakat', 'EXPENSE', 'DEBIT', 'PROJECT');
```

**Minggu 2: Frontend Foundation & API Setup**
1. **Create Finance Dashboard Component** (`/components/dashboard/finance-dashboard.tsx`)
2. **Create API Routes** (`/app/api/financial/` endpoints)
3. **Setup RLS Policies** untuk security
4. **Basic UI Components** untuk transaction input

### **PHASE 2: CONTROLS & WORKFLOW (MINGGU 3-4)**

#### **Tujuan:**
Implementasi kontrol anti-fraud, approval workflow, dan spending limits.

#### **Deliverables:**
1. **Spending Limits System** berdasarkan role
2. **Approval Workflow** dengan four-eyes principle
3. **Cashless Policy Enforcement** (transaksi > 1 juta harus transfer)
4. **Bank Account Whitelist** untuk verifikasi penerima

#### **Task Detail:**

**Minggu 3: Anti-Fraud Controls**
```sql
-- 1. Tabel spending_limits
CREATE TABLE spending_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    limit_type VARCHAR(20) CHECK (limit_type IN ('DAILY', 'MONTHLY', 'PER_TRANSACTION')),
    limit_amount DECIMAL(20,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample limits
INSERT INTO spending_limits (role_name, limit_type, limit_amount) VALUES
('finance_operational', 'PER_TRANSACTION', 5000000), -- Max 5 juta per transaksi
('finance_project_carbon', 'PER_TRANSACTION', 10000000), -- Max 10 juta
('finance_project_implementation', 'PER_TRANSACTION', 7500000), -- Max 7.5 juta
('finance_project_social', 'PER_TRANSACTION', 5000000), -- Max 5 juta
('finance_manager', 'PER_TRANSACTION', 25000000); -- Max 25 juta

-- 2. Tabel approval_workflow
CREATE TABLE approval_workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL,
    min_approvals INTEGER DEFAULT 1,
    required_roles TEXT[], -- Array of roles yang bisa approve
    amount_threshold DECIMAL(20,2), -- Threshold untuk trigger workflow ini
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample workflows
INSERT INTO approval_workflows (workflow_name, min_approvals, required_roles, amount_threshold) VALUES
('Small Transaction', 1, ARRAY['finance_manager', 'finance_operational'], 1000000),
('Medium Transaction', 2, ARRAY['finance_manager', 'finance_operational'], 5000000),
('Large Transaction', 3, ARRAY['finance_manager', 'admin', 'director'], 10000000);
```

**Minggu 4: Cashless Policy & Bank Integration**
1. **Bank Account Whitelist System** - hanya transfer ke rekening terdaftar
2. **Cashless Enforcement** - validasi transaksi > 1 juta harus transfer
3. **Payment Method Validation** - cash vs transfer tracking
4. **Audit Trail Enhancement** - complete transaction history

### **PHASE 3: REPORTING & ANALYTICS (MINGGU 5-6)**

#### **Tujuan:**
Membangun sistem reporting SAK-compliant, investor dashboard, dan impact metrics.

#### **Deliverables:**
1. **SAK-Compliant Financial Statements** (Neraca, Laba Rugi, Arus Kas)
2. **Investor Dashboard** dengan read-only access dan export functionality
3. **Impact Metrics Calculation** (cost per hectare, cost per ton carbon)
4. **Master Price List System** untuk standardisasi harga

#### **Task Detail:**

**Minggu 5: Financial Reporting System**
```sql
-- 1. Tabel general_journal untuk double entry accounting
CREATE TABLE general_journal (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    journal_date DATE NOT NULL,
    journal_number VARCHAR(50) UNIQUE NOT NULL, -- Format: JRU-YYYYMMDD-001
    description TEXT NOT NULL,
    reference_id UUID, -- Link ke transaction/budget
    reference_type VARCHAR(50), -- 'TRANSACTION', 'BUDGET', 'ADJUSTMENT'
    ledger_id UUID REFERENCES accounting_ledgers(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ
);

-- 2. Tabel journal_entries (debit/credit)
CREATE TABLE journal_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    journal_id UUID REFERENCES general_journal(id) ON DELETE CASCADE,
    account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code),
    debit_amount DECIMAL(20,2) DEFAULT 0,
    credit_amount DECIMAL(20,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (debit_amount >= 0 AND credit_amount >= 0),
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (debit_amount = 0 AND credit_amount > 0))
);

-- 3. Views untuk financial statements
CREATE VIEW balance_sheet AS
WITH account_balances AS (
    SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.normal_balance,
        SUM(CASE WHEN coa.normal_balance = 'DEBIT' 
                 THEN je.debit_amount - je.credit_amount
                 ELSE je.credit_amount - je.debit_amount 
            END) as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_entries je ON coa.account_code = je.account_code
    LEFT JOIN general_journal gj ON je.journal_id = gj.id
    WHERE gj.posted = TRUE
    GROUP BY coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
)
SELECT 
    account_type,
    account_code,
    account_name,
    balance,
    CASE 
        WHEN account_type IN ('ASSET', 'EXPENSE') AND normal_balance = 'DEBIT' THEN balance
        WHEN account_type IN ('ASSET', 'EXPENSE') AND normal_balance = 'CREDIT' THEN -balance
        WHEN account_type IN ('LIABILITY', 'EQUITY', 'INCOME') AND normal_balance = 'CREDIT' THEN balance
        ELSE -balance
    END as reported_balance
FROM account_balances
ORDER BY account_code;
```

**Minggu 6: Investor Portal & Export Functionality**
1. **Investor Dashboard** (`/investor/dashboard`) - read-only access
2. **Export Features** (PDF, Excel, CSV, JSON)
3. **Impact Metrics Dashboard** dengan visual charts
4. **Master Price List Management** (`/finance/price-list`)

### **PHASE 4: ADVANCED FEATURES (MINGGU 7-8)**

#### **Tujuan:**
Implementasi fitur advanced: asset management, multi-currency, donor portal, dan compliance dashboard.

#### **Deliverables:**
1. **Asset Management & Depreciation** system
2. **Multi-currency Support** untuk donor internasional
3. **Donor Self-Service Portal** untuk transparansi
4. **Compliance Dashboard** untuk tracking SAK, Tax, Donor requirements

#### **Task Detail:**

**Minggu 7: Asset Management & Multi-currency**
```sql
-- 1. Tabel fixed_assets untuk asset management
CREATE TABLE fixed_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL, -- AST-001
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('IT_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'BUILDING', 'OTHER')),
    purchase_date DATE,
    purchase_price DECIMAL(20,2),
    useful_life_years INTEGER, -- Masa manfaat (tahun)
    depreciation_method VARCHAR(20) CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE')),
    current_book_value DECIMAL(20,2),
    location VARCHAR(100),
    responsible_person UUID REFERENCES profiles(id),
    status VARCHAR(20) CHECK (status IN ('ACTIVE', 'SOLD', 'DISCARDED', 'UNDER_MAINTENANCE')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel exchange_rates untuk multi-currency
CREATE TABLE exchange_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    base_currency VARCHAR(3) DEFAULT 'IDR',
    target_currency VARCHAR(3), -- USD, EUR, SGD
    exchange_rate DECIMAL(10,4),
    effective_date DATE,
    source VARCHAR(50) CHECK (source IN ('BI', 'MANUAL', 'API')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Minggu 8: Integration, Testing & Deployment**
1. **System Integration Testing** - semua modul bekerja bersama
2. **User Acceptance Testing** (UAT) dengan finance team
3. **Performance Optimization** - query tuning, indexing
4. **Production Deployment** dengan rollback plan

## **SUCCESS METRICS (KPIs)**

### **Technical KPIs:**
- **System Uptime**: > 99.5%
- **API Response Time**: < 500ms (95th percentile)
- **Data Accuracy**: 100% reconciliation
- **Security**: Zero critical vulnerabilities

### **Financial KPIs:**
- **Grant Utilization Rate**: 85-95%
- **Cost per Hectare**: Meet industry benchmark
- **Cost per Ton Carbon**: < Target threshold
- **Administrative Efficiency Ratio**: < 15%

### **Compliance KPIs:**
- **Audit Readiness Score**: > 90%
- **Tax Filing Compliance**: 100% on-time
- **Donor Reporting**: 100% timely delivery
- **Documentation Completeness**: 100%

## **RISK MITIGATION**

### **Technical Risks:**
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data Migration Issues | Medium | High | Staggered migration with validation scripts |
| Performance Degradation | Low | Medium | Query optimization, indexing strategy |
| Integration Failures | Medium | High | API versioning, fallback mechanisms |

### **Operational Risks:**
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| User Resistance | High | Medium | Training program, change management |
| Process Disruption | Medium | High | Phased rollout, pilot group testing |
| Compliance Gaps | Low | High | Regular audits, compliance dashboard |

## **RESOURCE REQUIREMENTS**

### **Development Team:**
- **1 Backend Developer** (Full-time, 8 minggu)
- **1 Frontend Developer** (Full-time, 8 minggu)  
- **1 Database Specialist** (Part-time, 2 minggu)
- **1 QA Tester** (Part-time, 4 minggu)

### **Infrastructure:**
- **Supabase** (existing infrastructure - sufficient)
- **Additional Storage**: 50GB untuk document upload
- **Backup System**: Daily automated backups
- **Monitoring**: Application performance monitoring (APM)

## **NEXT STEPS SETELAH PHASE 1**

### **Immediate (Week 9):**
1. **Post-Implementation Review** dengan semua stakeholders
2. **User Training Sessions** untuk finance team
3. **Documentation Finalization** dan knowledge transfer

### **Short-term (Month 3):**
1. **Advanced Analytics** implementation
2. **Mobile Approval App** development
3. **Bank API Integration** untuk auto-reconciliation

### **Long-term (Month 6):**
1. **AI-powered Insights** untuk predictive analytics
2. **Multi-tenant Architecture** untuk scalability
3. **External API** untuk donor system integration

## **DOKUMENTASI TERKAIT**

1. **Desain Sistem Keuangan SAK**: `DESAIN_SISTEM_KEUANGAN_SAK.md`
2. **Role & Permission Matrix**: `ROLE_PERMISSION_KEUANGAN.md`
3. **Database Schema**: `DATABASE_SCHEMA_KEUANGAN.md`
4. **API Endpoints**: `API_ENDPOINTS_KEUANGAN.md`

## **KONTAK & SUPPORT**

- **Project Manager**: [Nama PM]
- **Technical Lead**: [Nama Tech Lead]
- **Finance Lead**: [Nama Finance Lead]
- **Support Channel**: Slack #financial-module

---
**Dokumen Terakhir Diupdate**: 26 Januari 2026  
**Versi**: 1.0.0  
**Status**: Ready for Implementation