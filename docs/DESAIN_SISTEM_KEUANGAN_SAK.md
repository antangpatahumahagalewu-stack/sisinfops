# DESAIN SISTEM KEUANGAN SESUAI STANDAR AKUNTANSI INDONESIA (SAK)

## **OVERVIEW**

Dokumen ini menjelaskan desain sistem keuangan yang compliant dengan **Standar Akuntansi Indonesia (SAK)** untuk Yayasan yang mengelola proyek perhutanan sosial dan karbon. Sistem ini mengadopsi **dual ledger approach** dengan pemisahan jelas antara keuangan operasional kantor dan proyek/program.

## **PRINSIP DASAR SAK YANG DIADOPSI**

### **1. Prinsip Akuntansi yang Diterapkan:**
- **Entity Concept**: Yayasan sebagai entitas terpisah dari pengurusnya
- **Going Concern**: Asumsi kelangsungan usaha yayasan
- **Periodicity**: Pelaporan periode bulanan, kuartalan, tahunan
- **Historical Cost**: Pencatatan berdasarkan biaya perolehan
- **Matching Principle**: Pengakuan beban sesuai periode penerimaan pendapatan
- **Full Disclosure**: Pengungkapan lengkap dalam laporan keuangan

### **2. Karakteristik Kualitatif Laporan Keuangan:**
- **Relevance**: Informasi relevan untuk pengambilan keputusan
- **Faithful Representation**: Penyajian jujur dan lengkap
- **Comparability**: Dapat dibandingkan antar periode
- **Verifiability**: Dapat diverifikasi oleh pihak independen
- **Timeliness**: Tersedia tepat waktu
- **Understandability**: Dapat dipahami oleh pengguna

## **STRUKTUR CHART OF ACCOUNTS (COA) SESUAI SAK**

### **A. Klasifikasi Akun Utama SAK:**

```
1. AKTIVA (ASSETS)
   ├── 1-xxxx: Aktiva Lancar (Current Assets)
   ├── 1-xxxx: Aktiva Tetap (Fixed Assets)
   └── 1-xxxx: Aktiva Lainnya (Other Assets)

2. KEWAJIBAN (LIABILITIES)
   ├── 2-xxxx: Kewajiban Jangka Pendek (Short-term Liabilities)
   └── 2-xxxx: Kewajiban Jangka Panjang (Long-term Liabilities)

3. EKUITAS (EQUITY)
   ├── 3-xxxx: Modal (Capital)
   ├── 3-xxxx: Saldo Laba (Retained Earnings)
   └── 3-xxxx: Laba Tahun Berjalan (Current Year Earnings)

4. PENDAPATAN (INCOME)
   ├── 4-xxxx: Pendapatan Operasional (Operational Income)
   ├── 4-xxxx: Pendapatan Non-Operasional (Non-Operational Income)
   └── 4-xxxx: Pendapatan Lain-lain (Other Income)

5. BEBAN (EXPENSES)
   ├── 5-xxxx: Beban Operasional (Operational Expenses)
   ├── 5-xxxx: Beban Non-Operasional (Non-Operational Expenses)
   └── 5-xxxx: Beban Lain-lain (Other Expenses)
```

### **B. Detail Chart of Accounts untuk Yayasan:**

#### **1. AKTIVA (1-xxxx)**
```sql
-- Aktiva Lancar (1110-1199)
1110 - Kas dan Setara Kas
1111 - Kas di Tangan
1112 - Kas Kecil
1120 - Bank - Operasional (BCA 123-456-789)
1121 - Bank - Proyek Karbon (BCA 123-456-790)
1122 - Bank - Proyek Implementasi (BCA 123-456-791)
1123 - Bank - Proyek Sosial (BCA 123-456-792)
1130 - Deposito Berjangka
1140 - Piutang Usaha
1141 - Piutang Donor
1142 - Piutang Lain-lain
1150 - Persediaan
1151 - Persediaan ATK
1152 - Persediaan Bibit
1153 - Persediaan Alat Pertanian

-- Aktiva Tetap (1410-1499)
1410 - Tanah
1411 - Gedung Kantor
1412 - Kendaraan Operasional
1413 - Kendaraan Proyek
1420 - Peralatan Kantor
1421 - Komputer & Laptop
1422 - Furniture
1423 - Peralatan Komunikasi
1430 - Akumulasi Penyusutan Gedung
1431 - Akumulasi Penyusutan Kendaraan
1432 - Akumulasi Penyusutan Peralatan
```

#### **2. KEWAJIBAN (2-xxxx)**
```sql
-- Kewajiban Jangka Pendek (2110-2199)
2110 - Hutang Usaha
2111 - Hutang kepada Supplier
2112 - Hutang kepada Kontraktor
2120 - Hutang Pajak
2121 - Hutang PPh 21
2122 - Hutang PPh 23
2123 - Hutang PPN
2130 - Pendapatan Diterima Dimuka
2131 - Uang Muka dari Donor
2132 - Uang Muka dari Penerima Manfaat

-- Kewajiban Jangka Panjang (2210-2299)
2210 - Hutang Bank Jangka Panjang
2220 - Hutang kepada Donor Jangka Panjang
```

#### **3. EKUITAS (3-xxxx)**
```sql
3110 - Modal Yayasan
3120 - Donasi Modal
3130 - Saldo Laba
3140 - Laba Tahun Berjalan
3150 - Defisit Tahun Berjalan
```

#### **4. PENDAPATAN (4-xxxx)**
```sql
-- Pendapatan Operasional (4110-4199)
4110 - Pendapatan dari Donor
4111 - Grant Proyek Karbon
4112 - Grant Proyek Implementasi
4113 - Grant Proyek Sosial Ekonomi
4114 - Administrative Fee dari Donor
4120 - Pendapatan Jasa Konsultasi
4130 - Pendapatan Pelatihan

-- Pendapatan Non-Operasional (4210-4299)
4210 - Pendapatan Bunga Bank
4220 - Keuntungan Selisih Kurs
4230 - Pendapatan Lain-lain
```

#### **5. BEBAN (5-xxxx)**
```sql
-- Beban Operasional Kantor (5110-5199)
5110 - Beban Gaji dan Upah
5111 - Gaji Staff Tetap
5112 - Honorarium Konsultan
5113 - Tunjangan dan Benefit
5120 - Beban Sewa
5121 - Sewa Gedung Kantor
5122 - Sewa Kendaraan
5130 - Beban Listrik, Air, Telepon
5131 - Listrik Kantor
5132 - Air dan PDAM
5133 - Telepon dan Internet
5140 - Beban Transportasi
5141 - Bensin dan Parkir
5142 - Transportasi Staff
5150 - Beban ATK
5151 - Kertas dan Supplies
5152 - Printing dan Fotocopy
5160 - Beban Maintenance
5161 - Maintenance Gedung
5162 - Maintenance Kendaraan
5163 - Maintenance Peralatan

-- Beban Proyek/Program (5210-5299)
5210 - Beban Bibit Pohon
5211 - Pembelian Bibit
5212 - Transportasi Bibit
5220 - Beban Alat Pertanian
5221 - Cangkul, Sabit, Parang
5222 - Alat Keselamatan
5230 - Beban Pelatihan Masyarakat
5231 - Honor Instruktur
5232 - Materi Pelatihan
5233 - Konsumsi Peserta
5240 - Beban Monitoring & Evaluasi
5241 - Tim Monitor Lapangan
5242 - Peralatan Monitoring
5243 - Laporan dan Dokumentasi
5250 - Beban Bagi Hasil Masyarakat
5251 - Distribusi Tunai
5252 - Distribusi Barang
5253 - Program Pemberdayaan

-- Beban Non-Operasional (5310-5399)
5310 - Beban Pajak
5311 - PPh 21
5312 - PPh 23
5313 - PPN
5320 - Beban Bunga
5330 - Beban Selisih Kurs
5340 - Beban Lain-lain
```

## **SISTEM DOUBLE ENTRY ACCOUNTING**

### **A. Jurnal Umum (General Journal)**
Setiap transaksi keuangan dicatat dengan **sistem double entry**:
- **DEBIT** dan **KREDIT** harus balance
- **Minimal 2 akun** terpengaruh per transaksi
- **Referensi lengkap** (invoice, receipt, dokumen pendukung)

### **B. Format Jurnal:**
```
Tanggal: 2026-01-26
No. Jurnal: JRU-20260126-001
Deskripsi: Pembayaran gaji staff Januari 2026

DEBIT: 5111 - Gaji Staff Tetap     Rp 15,000,000
KREDIT: 1120 - Bank Operasional    Rp 15,000,000
```

### **C. Buku Besar (General Ledger)**
- **Auto-post** dari jurnal ke buku besar
- **Saldo per akun** otomatis terupdate
- **Histori transaksi** lengkap per akun

## **LAPORAN KEUANGAN WAJIB SAK**

### **1. Neraca (Balance Sheet)**
```sql
-- View untuk Neraca
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

### **2. Laporan Laba Rugi (Income Statement)**
```sql
-- View untuk Laporan Laba Rugi
CREATE VIEW income_statement AS
WITH period_income AS (
    SELECT 
        'PENDAPATAN' as category,
        coa.account_name,
        SUM(je.credit_amount - je.debit_amount) as amount
    FROM journal_entries je
    JOIN chart_of_accounts coa ON je.account_code = coa.account_code
    JOIN general_journal gj ON je.journal_id = gj.id
    WHERE coa.account_type = 'INCOME'
      AND gj.journal_date BETWEEN :start_date AND :end_date
      AND gj.posted = TRUE
    GROUP BY coa.account_code, coa.account_name
),
period_expense AS (
    SELECT 
        'BEBAN' as category,
        coa.account_name,
        SUM(je.debit_amount - je.credit_amount) as amount
    FROM journal_entries je
    JOIN chart_of_accounts coa ON je.account_code = coa.account_code
    JOIN general_journal gj ON je.journal_id = gj.id
    WHERE coa.account_type = 'EXPENSE'
      AND gj.journal_date BETWEEN :start_date AND :end_date
      AND gj.posted = TRUE
    GROUP BY coa.account_code, coa.account_name
)
SELECT * FROM period_income
UNION ALL
SELECT * FROM period_expense
ORDER BY category, account_name;
```

### **3. Laporan Arus Kas (Cash Flow Statement)**
```sql
-- View untuk Laporan Arus Kas
CREATE VIEW cash_flow_statement AS
WITH cash_activities AS (
    -- Operating Activities
    SELECT 
        'AKTIVITAS OPERASI' as category,
        gj.journal_date,
        CASE 
            WHEN coa.account_code IN ('4110', '4111', '4112', '4113', '4114', '4120', '4130') 
                THEN 'PENERIMAAN OPERASI'
            WHEN coa.account_code LIKE '51%' OR coa.account_code LIKE '52%' 
                THEN 'PENGELUARAN OPERASI'
            ELSE 'LAINNYA'
        END as subcategory,
        CASE WHEN je.debit_amount > 0 THEN je.debit_amount ELSE -je.credit_amount END as amount
    FROM journal_entries je
    JOIN chart_of_accounts coa ON je.account_code = coa.account_code
    JOIN general_journal gj ON je.journal_id = gj.id
    WHERE coa.account_code IN ('4110', '4111', '4112', '4113', '4114', '4120', '4130', 
                               '5110', '5111', '5112', '5113', '5120', '5121', '5122',
                               '5130', '5131', '5132', '5133', '5140', '5141', '5142',
                               '5150', '5151', '5152', '5160', '5161', '5162', '5163',
                               '5210', '5211', '5212', '5220', '5221', '5222', '5230',
                               '5231', '5232', '5233', '5240', '5241', '5242', '5243',
                               '5250', '5251', '5252', '5253')
      AND gj.posted = TRUE
    
    UNION ALL
    
    -- Investing Activities
    SELECT 
        'AKTIVITAS INVESTASI' as category,
        gj.journal_date,
        'PEMBELIAN ASET TETAP' as subcategory,
        CASE WHEN je.debit_amount > 0 THEN je.debit_amount ELSE -je.credit_amount END as amount
    FROM journal_entries je
    JOIN chart_of_accounts coa ON je.account_code = coa.account_code
    JOIN general_journal gj ON je.journal_id = gj.id
    WHERE coa.account_code LIKE '14%' -- Fixed Assets
      AND gj.posted = TRUE
    
    UNION ALL
    
    -- Financing Activities
    SELECT 
        'AKTIVITAS PENDANAAN' as category,
        gj.journal_date,
        'MODAL' as subcategory,
        CASE WHEN je.debit_amount > 0 THEN je.debit_amount ELSE -je.credit_amount END as amount
    FROM journal_entries je
    JOIN chart_of_accounts coa ON je.account_code = coa.account_code
    JOIN general_journal gj ON je.journal_id = gj.id
    WHERE coa.account_code LIKE '3%' -- Equity
      AND gj.posted = TRUE
)
SELECT 
    category,
    subcategory,
    SUM(amount) as amount
FROM cash_activities
WHERE journal_date BETWEEN :start_date AND :end_date
GROUP BY category, subcategory
ORDER BY category, subcategory;
```

## **DUAL LEDGER IMPLEMENTATION**

### **A. Pemisahan Transaksi:**
```sql
-- Setiap transaksi harus memiliki ledger_id
ALTER TABLE financial_transactions 
ADD COLUMN ledger_id UUID REFERENCES accounting_ledgers(id);

-- Trigger untuk validasi ledger sesuai role
CREATE OR REPLACE FUNCTION validate_ledger_access()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_ledger_type VARCHAR(20);
BEGIN
    -- Get user role
    SELECT role INTO v_user_role 
    FROM profiles 
    WHERE id = NEW.created_by;
    
    -- Get ledger type
    SELECT ledger_type INTO v_ledger_type
    FROM accounting_ledgers
    WHERE id = NEW.ledger_id;
    
    -- Validation rules
    IF v_user_role = 'finance_operational' AND v_ledger_type != 'OPERATIONAL' THEN
        RAISE EXCEPTION 'Finance operational hanya bisa akses ledger operasional';
    END IF;
    
    IF v_user_role = 'finance_project_carbon' AND NEW.ledger_id != (SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-CARBON') THEN
        RAISE EXCEPTION 'Finance project carbon hanya bisa akses ledger proyek karbon';
    END IF;
    
    -- Add similar validations for other roles
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_ledger_access
    BEFORE INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_ledger_access();
```

### **B. Ledger-specific Reporting:**
```sql
-- Balance per ledger
CREATE VIEW ledger_balances AS
SELECT 
    al.ledger_code,
    al.ledger_name,
    al.ledger_type,
    SUM(CASE 
        WHEN ft.jenis_transaksi = 'PENERIMAAN' THEN ft.jumlah_idr
        WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN -ft.jumlah_idr
        ELSE 0
    END) as net_balance
FROM accounting_ledgers al
LEFT JOIN financial_transactions ft ON al.id = ft.ledger_id
GROUP BY al.id, al.ledger_code, al.ledger_name, al.ledger_type
ORDER BY al.ledger_code;
```

## **IMPACT METRICS CALCULATION**

### **A. Cost per Hectare:**
```sql
CREATE VIEW cost_per_hectare AS
SELECT 
    p.project_name,
    p.total_area_hectares,
    SUM(CASE 
        WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.jumlah_idr
        ELSE 0
    END) as total_project_cost,
    ROUND(
        SUM(CASE 
            WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.jumlah_idr
            ELSE 0
        END) / NULLIF(p.total_area_hectares, 0),
        2
    ) as cost_per_hectare
FROM carbon_projects p
LEFT JOIN financial_transactions ft ON p.id = ft.project_id
WHERE ft.ledger_id = (SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-CARBON')
GROUP BY p.id, p.project_name, p.total_area_hectares;
```

### **B. Cost per Ton Carbon:**
```sql
CREATE VIEW cost_per_ton_carbon AS
SELECT 
    p.project_name,
    p.estimated_carbon_storage_tons,
    SUM(CASE 
        WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.jumlah_idr
        ELSE 0
    END) as total_project_cost,
    ROUND(
        SUM(CASE 
            WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.jumlah_idr
            ELSE 0
        END) / NULLIF(p.estimated_carbon_storage_tons, 0),
        2
    ) as cost_per_ton
FROM carbon_projects p
LEFT JOIN financial_transactions ft ON p.id = ft.project_id
WHERE ft.ledger_id = (SELECT id FROM accounting_ledgers WHERE ledger_code = 'LEDGER-PRJ-CARBON')
GROUP BY p.id, p.project_name, p.estimated_carbon_storage_tons;
```

## **COMPLIANCE & AUDIT FEATURES**

### **A. Audit Trail System:**
```sql
-- Tabel untuk audit trail
CREATE TABLE financial_audit_trail (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger untuk audit trail
CREATE OR REPLACE FUNCTION audit_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO financial_audit_trail (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO financial_audit_trail (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO financial_audit_trail (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), OLD.updated_by);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to financial tables
CREATE TRIGGER audit_financial_transactions
    AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
```

### **B. Compliance Dashboard:**
```sql
-- View untuk compliance status
CREATE VIEW compliance_status AS
SELECT 
    'SAK_COMPLIANCE' as compliance_area,
    COUNT(*) as total_requirements,
    SUM(CASE WHEN status = 'COMPLIANT' THEN 1 ELSE 0 END) as compliant_count,
    ROUND(SUM(CASE WHEN status = 'COMPLIANT' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2) as compliance_rate
FROM sak_requirements
UNION ALL
SELECT 
    'TAX_COMPLIANCE' as compliance_area,
    COUNT(*) as total_requirements,
    SUM(CASE WHEN filing_status = 'PAID' THEN 1 ELSE 0 END) as compliant_count,
    ROUND(SUM(CASE WHEN filing_status = 'PAID' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2) as compliance_rate
FROM tax_management
UNION ALL
SELECT 
    'DONOR_COMPLIANCE' as compliance_area,
    COUNT(*) as total_requirements,
    SUM(CASE WHEN report_status = 'SUBMITTED' THEN 1 ELSE 0 END) as compliant_count,
    ROUND(SUM(CASE WHEN report_status = 'SUBMITTED' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2) as compliance_rate
FROM donor_reporting_requirements;
```

## **IMPLEMENTATION CHECKLIST**

### **Phase 1: Foundation**
- [x] Define Chart of Accounts sesuai SAK
- [x] Setup double entry accounting system
- [x] Create general journal & ledger tables
- [x] Implement dual ledger structure

### **Phase 2: Reporting**
- [ ] Develop balance sheet view
- [ ] Develop income statement view  
- [ ] Develop cash flow statement view
- [ ] Create financial statement generator

### **Phase 3: Integration**
- [ ] Integrate with existing transaction system
- [ ] Implement audit trail
- [ ] Setup compliance monitoring
- [ ] Create impact metrics calculations

### **Phase 4: Optimization**
- [ ] Performance tuning for large datasets
- [ ] Advanced analytics and forecasting
- [ ] Mobile reporting capabilities
- [ ] Automated compliance alerts

## **DOKUMENTASI TERKAIT**

1. **IMPLEMENTASI_KEUANGAN_PHASE1.md** - Roadmap implementasi 8 minggu
2. **ROLE_PERMISSION_KEUANGAN.md** - Matriks role & permission
3. **DATABASE_SCHEMA_KEUANGAN.md** - Skema database lengkap
4. **API_ENDPOINTS_KEUANGAN.md** - Endpoint API untuk integrasi

---
**Dokumen Terakhir Diupdate**: 26 Januari 2026  
**Versi**: 1.0.0  
**Status**: Ready for Implementation Phase 1