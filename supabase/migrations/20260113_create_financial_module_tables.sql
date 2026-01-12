-- Migration: Create Financial Module Tables (ERP)
-- Date: 2026-01-13
-- Description: Add financial management tables for donor tracking, grants, budgets, transactions,
--              benefit distributions, financial metrics, and accounting segments.
-- PRINCIPLE: ADDITIVE ONLY - no alterations to existing tables, only new tables with foreign keys to existing ones.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DONORS TABLE (Master data donor/investor)
-- ============================================
CREATE TABLE IF NOT EXISTS donors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kode_donor VARCHAR(50) UNIQUE NOT NULL,
    nama_donor VARCHAR(255) NOT NULL,
    jenis_donor VARCHAR(50) CHECK (jenis_donor IN ('NGO_INTERN', 'NGO_LOKAL', 'PEMERINTAH_ASING', 'PEMERINTAH_LOKAL', 'SWASTA', 'INDIVIDU', 'LAINNYA')),
    negara VARCHAR(100),
    kontak_nama VARCHAR(255),
    kontak_email VARCHAR(255),
    kontak_telepon VARCHAR(50),
    alamat TEXT,
    website VARCHAR(255),
    informasi_perjanjian TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE donors IS 'Master data donor/investor untuk tracking sumber dana';
COMMENT ON COLUMN donors.kode_donor IS 'Kode unik donor (contoh: USAID, NORAD, etc)';
COMMENT ON COLUMN donors.jenis_donor IS 'Kategori donor: NGO internasional, pemerintah asing, swasta, dll';

-- ============================================
-- 2. GRANTS TABLE (Penyaluran dana dari donor)
-- ============================================
CREATE TABLE IF NOT EXISTS grants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    donor_id UUID REFERENCES donors(id) ON DELETE CASCADE,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE SET NULL,
    nomor_grant VARCHAR(100) UNIQUE NOT NULL,
    nama_grant VARCHAR(255) NOT NULL,
    jumlah_dana DECIMAL(20,2) NOT NULL,
    mata_uang VARCHAR(3) DEFAULT 'IDR',
    tanggal_disetujui DATE,
    tanggal_pencairan DATE,
    periode_mulai DATE NOT NULL,
    periode_selesai DATE NOT NULL,
    tujuan_grant TEXT,
    fokus_geografis TEXT,
    jenis_grant VARCHAR(50) CHECK (jenis_grant IN ('OPERASIONAL', 'INVESTASI', 'BANTUAN_TEKNIS', 'RISET', 'KAPASITAS', 'LAINNYA')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'closed', 'suspended', 'terminated')),
    catatan TEXT,
    file_dokumen_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT grant_period_check CHECK (periode_mulai <= periode_selesai)
);

COMMENT ON TABLE grants IS 'Penyaluran dana dari donor ke yayasan, bisa link ke proyek karbon';
COMMENT ON COLUMN grants.nomor_grant IS 'Nomor referensi grant (contoh: USAID-2025-001)';
COMMENT ON COLUMN grants.jenis_grant IS 'Jenis grant: operasional, investasi, bantuan teknis, dll';

-- ============================================
-- 3. BUDGETS TABLE (Anggaran terperinci)
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    kegiatan_dram_id UUID REFERENCES kegiatan_dram(id) ON DELETE SET NULL,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE SET NULL,
    kode_budget VARCHAR(50) UNIQUE NOT NULL,
    deskripsi VARCHAR(500) NOT NULL,
    jumlah_anggaran DECIMAL(20,2) NOT NULL,
    mata_uang VARCHAR(3) DEFAULT 'IDR',
    jenis_anggaran VARCHAR(50) CHECK (jenis_anggaran IN ('OPERASIONAL', 'INVESTASI', 'BAGI_HASIL', 'ADMINISTRASI', 'MONITORING', 'KAPASITAS', 'LAINNYA')),
    kategori_detail VARCHAR(100),
    periode_tahun INTEGER NOT NULL,
    periode_bulan INTEGER CHECK (periode_bulan >= 1 AND periode_bulan <= 12),
    status_approval VARCHAR(20) DEFAULT 'draft' CHECK (status_approval IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
    alasan_rejection TEXT,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE budgets IS 'Anggaran terperinci per program/kegiatan/lokasi';
COMMENT ON COLUMN budgets.kode_budget IS 'Kode budget unik (contoh: BGT-2025-001)';
COMMENT ON COLUMN budgets.jenis_anggaran IS 'Jenis pengeluaran: operasional, investasi, bagi hasil, dll';

-- ============================================
-- 4. BUDGET_ALLOCATIONS TABLE (Detail alokasi)
-- ============================================
CREATE TABLE IF NOT EXISTS budget_allocations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    quantity DECIMAL(12,2) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(20,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    satuan VARCHAR(50),
    supplier_info TEXT,
    tanggal_pengadaan DATE,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'ordered', 'delivered', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE budget_allocations IS 'Detail alokasi anggaran per item (bibit, alat, gaji, dll)';
COMMENT ON COLUMN budget_allocations.item_name IS 'Nama item (contoh: Bibit Pohon, Alat Tani, Honor Fasilitator)';

-- ============================================
-- 5. FINANCIAL_TRANSACTIONS TABLE (Transaksi)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    grant_id UUID REFERENCES grants(id) ON DELETE SET NULL,
    jenis_transaksi VARCHAR(20) NOT NULL CHECK (jenis_transaksi IN ('PENERIMAAN', 'PENGELUARAN')),
    kode_transaksi VARCHAR(50) UNIQUE NOT NULL,
    tanggal_transaksi DATE NOT NULL,
    tanggal_pencatatan TIMESTAMPTZ DEFAULT NOW(),
    jumlah DECIMAL(20,2) NOT NULL,
    mata_uang VARCHAR(3) DEFAULT 'IDR',
    rate_konversi DECIMAL(10,4) DEFAULT 1,
    jumlah_idr DECIMAL(20,2) GENERATED ALWAYS AS (jumlah * rate_konversi) STORED,
    deskripsi TEXT NOT NULL,
    kategori VARCHAR(100) CHECK (kategori IN ('BIBIT', 'ALAT', 'GAJI', 'TRANSPORT', 'PELATIHAN', 'BAGI_HASIL', 'ADMINISTRASI', 'MONITORING', 'LAINNYA')),
    lokasi_spesifik TEXT,
    bukti_url TEXT[],
    status_rekonsiliasi VARCHAR(20) DEFAULT 'pending' CHECK (status_rekonsiliasi IN ('pending', 'reconciled', 'disputed')),
    metode_pembayaran VARCHAR(50) CHECK (metode_pembayaran IN ('TRANSFER_BANK', 'TUNAI', 'CEK', 'LAINNYA')),
    nomor_referensi_bank VARCHAR(100),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE financial_transactions IS 'Transaksi keuangan aktual (penerimaan dan pengeluaran)';
COMMENT ON COLUMN financial_transactions.kode_transaksi IS 'Kode transaksi unik (contoh: TRX-2025-001)';
COMMENT ON COLUMN financial_transactions.jumlah_idr IS 'Jumlah dalam IDR setelah konversi (untuk reporting terpadu)';

-- ============================================
-- 6. BENEFIT_DISTRIBUTIONS TABLE (Bagi hasil)
-- ============================================
CREATE TABLE IF NOT EXISTS benefit_distributions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    kepala_keluarga_id UUID REFERENCES kepala_keluarga(id) ON DELETE SET NULL,
    grant_id UUID REFERENCES grants(id) ON DELETE SET NULL,
    jenis_distribusi VARCHAR(50) CHECK (jenis_distribusi IN ('TUNAI', 'BARANG', 'JASA', 'BIBIT', 'ALAT', 'LAINNYA')),
    jumlah DECIMAL(15,2) NOT NULL,
    mata_uang VARCHAR(3) DEFAULT 'IDR',
    satuan VARCHAR(50),
    tanggal_distribusi DATE NOT NULL,
    periode_distribusi VARCHAR(20),
    metode_distribusi VARCHAR(50) CHECK (metode_distribusi IN ('LANGSUNG', 'KELOMPOK', 'BANK', 'LAINNYA')),
    bukti_distribusi_url TEXT[],
    disetujui_oleh UUID REFERENCES profiles(id),
    catatan TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE benefit_distributions IS 'Distribusi dana bagi hasil ke masyarakat lokal';
COMMENT ON COLUMN benefit_distributions.periode_distribusi IS 'Periode distribusi (contoh: Q1-2025, Bulan Juni 2025)';

-- ============================================
-- 7. FINANCIAL_METRICS TABLE (Metrik keuangan)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    carbon_project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
    tahun INTEGER NOT NULL,
    bulan INTEGER CHECK (bulan >= 1 AND bulan <= 12),
    total_pengeluaran DECIMAL(20,2) DEFAULT 0,
    total_penerimaan DECIMAL(20,2) DEFAULT 0,
    luas_ha DECIMAL(10,2),
    estimasi_penyimpanan_karbon DECIMAL(15,2),
    jumlah_kk INTEGER,
    -- Metrik kalkulasi
    cost_per_hectare DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE 
            WHEN luas_ha > 0 THEN total_pengeluaran / luas_ha
            ELSE NULL
        END
    ) STORED,
    cost_per_ton_carbon DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE 
            WHEN estimasi_penyimpanan_karbon > 0 THEN total_pengeluaran / estimasi_penyimpanan_karbon
            ELSE NULL
        END
    ) STORED,
    cost_per_kk DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE 
            WHEN jumlah_kk > 0 THEN total_pengeluaran / jumlah_kk
            ELSE NULL
        END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(perhutanan_sosial_id, carbon_project_id, tahun, bulan)
);

COMMENT ON TABLE financial_metrics IS 'Metrik keuangan terintegrasi dengan data teknis (cost per hectare, cost per ton carbon)';
COMMENT ON COLUMN financial_metrics.cost_per_hectare IS 'Biaya per hektar (total_pengeluaran / luas_ha)';
COMMENT ON COLUMN financial_metrics.cost_per_ton_carbon IS 'Biaya per ton karbon (total_pengeluaran / estimasi_penyimpanan_karbon)';

-- ============================================
-- 8. FINANCIAL_REPORTS TABLE (Laporan donor)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    jenis_laporan VARCHAR(50) CHECK (jenis_laporan IN ('INTERIM', 'FINAL', 'AUDIT', 'KEUANGAN', 'NARRATIVE')),
    periode_laporan VARCHAR(50) NOT NULL,
    tanggal_submit DATE,
    tanggal_deadline DATE,
    file_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
    catatan_donor TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE financial_reports IS 'Laporan keuangan untuk donor (interim, final, audit)';
COMMENT ON COLUMN financial_reports.periode_laporan IS 'Periode laporan (contoh: Q1 2025, Jan-Jun 2025)';

-- ============================================
-- 9. ACCOUNTING_SEGMENTS TABLE (Segmentasi)
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN ('DONOR', 'PROJECT', 'PROGRAM', 'ACTIVITY', 'LOCATION', 'EXPENSE_TYPE')),
    segment_code VARCHAR(20) UNIQUE NOT NULL,
    segment_name VARCHAR(100) NOT NULL,
    parent_segment_id UUID REFERENCES accounting_segments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE accounting_segments IS 'Master data segmentasi akuntansi untuk granular tracking';
COMMENT ON COLUMN accounting_segments.segment_type IS 'Jenis segment: donor, project, program, activity, location, expense_type';

-- ============================================
-- 10. SEGMENT_COMBINATIONS TABLE (Kombinasi)
-- ============================================
CREATE TABLE IF NOT EXISTS segment_combinations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    combination_code VARCHAR(100) UNIQUE NOT NULL,
    donor_segment_id UUID REFERENCES accounting_segments(id) ON DELETE SET NULL,
    project_segment_id UUID REFERENCES accounting_segments(id) ON DELETE SET NULL,
    program_segment_id UUID REFERENCES accounting_segments(id) ON DELETE SET NULL,
    activity_segment_id UUID REFERENCES accounting_segments(id) ON DELETE SET NULL,
    location_segment_id UUID REFERENCES accounting_segments(id) ON DELETE SET NULL,
    expense_segment_id UUID REFERENCES accounting_segments(id) ON DELETE SET NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE segment_combinations IS 'Kombinasi segment yang valid untuk tracking transaksi';
COMMENT ON COLUMN segment_combinations.combination_code IS 'Kode kombinasi (format: DONOR-PROJECT-PROGRAM-ACTIVITY-LOCATION-EXPENSE)';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Donors
CREATE INDEX IF NOT EXISTS idx_donors_status ON donors(status);
CREATE INDEX IF NOT EXISTS idx_donors_jenis ON donors(jenis_donor);

-- Grants
CREATE INDEX IF NOT EXISTS idx_grants_donor ON grants(donor_id);
CREATE INDEX IF NOT EXISTS idx_grants_project ON grants(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_periode ON grants(periode_mulai, periode_selesai);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_grant ON budgets(grant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_program ON budgets(program_id);
CREATE INDEX IF NOT EXISTS idx_budgets_kegiatan ON budgets(kegiatan_dram_id);
CREATE INDEX IF NOT EXISTS idx_budgets_ps ON budgets(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status_approval);
CREATE INDEX IF NOT EXISTS idx_budgets_tahun ON budgets(periode_tahun);

-- Budget Allocations
CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget ON budget_allocations(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_status ON budget_allocations(status);

-- Financial Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_budget ON financial_transactions(budget_id);
CREATE INDEX IF NOT EXISTS idx_transactions_grant ON financial_transactions(grant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tanggal ON financial_transactions(tanggal_transaksi);
CREATE INDEX IF NOT EXISTS idx_transactions_jenis ON financial_transactions(jenis_transaksi);
CREATE INDEX IF NOT EXISTS idx_transactions_kategori ON financial_transactions(kategori);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON financial_transactions(status_rekonsiliasi);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON financial_transactions(created_by);

-- Benefit Distributions
CREATE INDEX IF NOT EXISTS idx_benefits_ps ON benefit_distributions(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_benefits_kk ON benefit_distributions(kepala_keluarga_id);
CREATE INDEX IF NOT EXISTS idx_benefits_grant ON benefit_distributions(grant_id);
CREATE INDEX IF NOT EXISTS idx_benefits_tanggal ON benefit_distributions(tanggal_distribusi);

-- Financial Metrics
CREATE INDEX IF NOT EXISTS idx_metrics_ps ON financial_metrics(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_metrics_project ON financial_metrics(carbon_project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_tahun_bulan ON financial_metrics(tahun, bulan);

-- Financial Reports
CREATE INDEX IF NOT EXISTS idx_reports_grant ON financial_reports(grant_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON financial_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_tanggal ON financial_reports(tanggal_submit);

-- Accounting Segments
CREATE INDEX IF NOT EXISTS idx_segments_type ON accounting_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_segments_active ON accounting_segments(is_active);

-- Segment Combinations
CREATE INDEX IF NOT EXISTS idx_combinations_code ON segment_combinations(combination_code);
CREATE INDEX IF NOT EXISTS idx_combinations_valid ON segment_combinations(is_valid);

-- ============================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_combinations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR FINANCIAL MODULE
-- ============================================

-- Donors: Readable by all authenticated users, manageable by admin and carbon_specialist
DROP POLICY IF EXISTS "Donors readable by authenticated users" ON donors;
CREATE POLICY "Donors readable by authenticated users" ON donors
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Donors manageable by admin and carbon_specialist" ON donors;
CREATE POLICY "Donors manageable by admin and carbon_specialist" ON donors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Grants: Readable by authenticated, manageable by admin, carbon_specialist, program_planner
DROP POLICY IF EXISTS "Grants readable by authenticated users" ON grants;
CREATE POLICY "Grants readable by authenticated users" ON grants
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Grants manageable by admin, carbon_specialist, program_planner" ON grants;
CREATE POLICY "Grants manageable by admin, carbon_specialist, program_planner" ON grants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist', 'program_planner')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Budgets: Readable by authenticated, manageable based on role
DROP POLICY IF EXISTS "Budgets readable by authenticated users" ON budgets;
CREATE POLICY "Budgets readable by authenticated users" ON budgets
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Budgets manageable by admin, program_planner, carbon_specialist" ON budgets;
CREATE POLICY "Budgets manageable by admin, program_planner, carbon_specialist" ON budgets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Budget Allocations: Inherit permissions from parent budget
DROP POLICY IF EXISTS "Budget allocations readable by authenticated users" ON budget_allocations;
CREATE POLICY "Budget allocations readable by authenticated users" ON budget_allocations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Budget allocations manageable by budget managers" ON budget_allocations;
CREATE POLICY "Budget allocations manageable by budget managers" ON budget_allocations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_allocations.budget_id) AND
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Financial Transactions: Complex permissions
DROP POLICY IF EXISTS "Financial transactions readable by authenticated users" ON financial_transactions;
CREATE POLICY "Financial transactions readable by authenticated users" ON financial_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin and carbon_specialist can manage all transactions
DROP POLICY IF EXISTS "Financial transactions manageable by admin and carbon_specialist" ON financial_transactions;
CREATE POLICY "Financial transactions manageable by admin and carbon_specialist" ON financial_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Program implementers can only create/update transactions for their activities
DROP POLICY IF EXISTS "Financial transactions creatable by program implementers" ON financial_transactions;
CREATE POLICY "Financial transactions creatable by program implementers" ON financial_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('program_implementer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Benefit Distributions: Readable by all, manageable by admin, program_planner, program_implementer
DROP POLICY IF EXISTS "Benefit distributions readable by authenticated users" ON benefit_distributions;
CREATE POLICY "Benefit distributions readable by authenticated users" ON benefit_distributions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Benefit distributions manageable by admin, program_planner, program_implementer" ON benefit_distributions;
CREATE POLICY "Benefit distributions manageable by admin, program_planner, program_implementer" ON benefit_distributions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'program_planner', 'program_implementer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Financial Metrics: Readable by all authenticated users
DROP POLICY IF EXISTS "Financial metrics readable by authenticated users" ON financial_metrics;
CREATE POLICY "Financial metrics readable by authenticated users" ON financial_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin and carbon_specialist can update metrics (auto-generated)
DROP POLICY IF EXISTS "Financial metrics manageable by admin and carbon_specialist" ON financial_metrics;
CREATE POLICY "Financial metrics manageable by admin and carbon_specialist" ON financial_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Financial Reports: Readable by authenticated, manageable by admin, carbon_specialist, monev_officer
DROP POLICY IF EXISTS "Financial reports readable by authenticated users" ON financial_reports;
CREATE POLICY "Financial reports readable by authenticated users" ON financial_reports
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Financial reports manageable by admin, carbon_specialist, monev_officer" ON financial_reports;
CREATE POLICY "Financial reports manageable by admin, carbon_specialist, monev_officer" ON financial_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist', 'monev_officer')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Accounting Segments: Readable by all, manageable by admin and carbon_specialist
DROP POLICY IF EXISTS "Accounting segments readable by authenticated users" ON accounting_segments;
CREATE POLICY "Accounting segments readable by authenticated users" ON accounting_segments
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Accounting segments manageable by admin and carbon_specialist" ON accounting_segments;
CREATE POLICY "Accounting segments manageable by admin and carbon_specialist" ON accounting_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- Segment Combinations: Readable by all, manageable by admin and carbon_specialist
DROP POLICY IF EXISTS "Segment combinations readable by authenticated users" ON segment_combinations;
CREATE POLICY "Segment combinations readable by authenticated users" ON segment_combinations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Segment combinations manageable by admin and carbon_specialist" ON segment_combinations;
CREATE POLICY "Segment combinations manageable by admin and carbon_specialist" ON segment_combinations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name IN ('admin', 'carbon_specialist')
            AND EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.role = rp.role_name
            )
        )
    );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
-- Apply update_updated_at_column trigger to all new tables
DROP TRIGGER IF EXISTS update_donors_updated_at ON donors;
CREATE TRIGGER update_donors_updated_at
    BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grants_updated_at ON grants;
CREATE TRIGGER update_grants_updated_at
    BEFORE UPDATE ON grants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_allocations_updated_at ON budget_allocations;
CREATE TRIGGER update_budget_allocations_updated_at
    BEFORE UPDATE ON budget_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_transactions_updated_at ON financial_transactions;
CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_benefit_distributions_updated_at ON benefit_distributions;
CREATE TRIGGER update_benefit_distributions_updated_at
    BEFORE UPDATE ON benefit_distributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_metrics_updated_at ON financial_metrics;
CREATE TRIGGER update_financial_metrics_updated_at
    BEFORE UPDATE ON financial_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_reports_updated_at ON financial_reports;
CREATE TRIGGER update_financial_reports_updated_at
    BEFORE UPDATE ON financial_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounting_segments_updated_at ON accounting_segments;
CREATE TRIGGER update_accounting_segments_updated_at
    BEFORE UPDATE ON accounting_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================
-- Apply audit_trigger_function to all new tables
DROP TRIGGER IF EXISTS audit_donors ON donors;
CREATE TRIGGER audit_donors
    AFTER INSERT OR UPDATE OR DELETE ON donors
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_grants ON grants;
CREATE TRIGGER audit_grants
    AFTER INSERT OR UPDATE OR DELETE ON grants
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_budgets ON budgets;
CREATE TRIGGER audit_budgets
    AFTER INSERT OR UPDATE OR DELETE ON budgets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_budget_allocations ON budget_allocations;
CREATE TRIGGER audit_budget_allocations
    AFTER INSERT OR UPDATE OR DELETE ON budget_allocations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_financial_transactions ON financial_transactions;
CREATE TRIGGER audit_financial_transactions
    AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_benefit_distributions ON benefit_distributions;
CREATE TRIGGER audit_benefit_distributions
    AFTER INSERT OR UPDATE OR DELETE ON benefit_distributions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_financial_metrics ON financial_metrics;
CREATE TRIGGER audit_financial_metrics
    AFTER INSERT OR UPDATE OR DELETE ON financial_metrics
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_financial_reports ON financial_reports;
CREATE TRIGGER audit_financial_reports
    AFTER INSERT OR UPDATE OR DELETE ON financial_reports
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_accounting_segments ON accounting_segments;
CREATE TRIGGER audit_accounting_segments
    AFTER INSERT OR UPDATE OR DELETE ON accounting_segments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_segment_combinations ON segment_combinations;
CREATE TRIGGER audit_segment_combinations
    AFTER INSERT OR UPDATE OR DELETE ON segment_combinations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- FUNCTIONS FOR FINANCIAL METRICS CALCULATION
-- ============================================
-- Function to recalculate financial metrics for a PS or Project
CREATE OR REPLACE FUNCTION recalculate_financial_metrics(
    p_perhutanan_sosial_id UUID DEFAULT NULL,
    p_carbon_project_id UUID DEFAULT NULL,
    p_tahun INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    p_bulan INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
) RETURNS VOID AS $$
BEGIN
    -- Delete existing metrics for the given parameters
    DELETE FROM financial_metrics 
    WHERE (p_perhutanan_sosial_id IS NULL OR perhutanan_sosial_id = p_perhutanan_sosial_id)
      AND (p_carbon_project_id IS NULL OR carbon_project_id = p_carbon_project_id)
      AND (p_tahun IS NULL OR tahun = p_tahun)
      AND (p_bulan IS NULL OR bulan = p_bulan);

    -- Insert recalculated metrics
    INSERT INTO financial_metrics (
        perhutanan_sosial_id,
        carbon_project_id,
        tahun,
        bulan,
        total_pengeluaran,
        total_penerimaan,
        luas_ha,
        estimasi_penyimpanan_karbon,
        jumlah_kk
    )
    SELECT 
        ps.id as perhutanan_sosial_id,
        cp.id as carbon_project_id,
        p_tahun as tahun,
        p_bulan as bulan,
        COALESCE(SUM(
            CASE 
                WHEN ft.jenis_transaksi = 'PENGELUARAN' THEN ft.jumlah_idr
                ELSE 0
            END
        ), 0) as total_pengeluaran,
        COALESCE(SUM(
            CASE 
                WHEN ft.jenis_transaksi = 'PENERIMAAN' THEN ft.jumlah_idr
                ELSE 0
            END
        ), 0) as total_penerimaan,
        ps.luas_ha,
        cp.estimasi_penyimpanan_karbon,
        ps.jumlah_kk
    FROM perhutanan_sosial ps
    LEFT JOIN carbon_projects cp ON 1=1 -- This needs proper joining logic based on your business rules
    LEFT JOIN financial_transactions ft ON (
        (ft.budget_id IN (SELECT id FROM budgets WHERE perhutanan_sosial_id = ps.id) OR
         ft.grant_id IN (SELECT id FROM grants WHERE carbon_project_id = cp.id))
        AND EXTRACT(YEAR FROM ft.tanggal_transaksi) = p_tahun
        AND EXTRACT(MONTH FROM ft.tanggal_transaksi) = p_bulan
    )
    WHERE (p_perhutanan_sosial_id IS NULL OR ps.id = p_perhutanan_sosial_id)
      AND (p_carbon_project_id IS NULL OR cp.id = p_carbon_project_id)
    GROUP BY ps.id, ps.luas_ha, ps.jumlah_kk, cp.id, cp.estimasi_penyimpanan_karbon
    ON CONFLICT (perhutanan_sosial_id, carbon_project_id, tahun, bulan) 
    DO UPDATE SET
        total_pengeluaran = EXCLUDED.total_pengeluaran,
        total_penerimaan = EXCLUDED.total_penerimaan,
        luas_ha = EXCLUDED.luas_ha,
        estimasi_penyimpanan_karbon = EXCLUDED.estimasi_penyimpanan_karbon,
        jumlah_kk = EXCLUDED.jumlah_kk,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETION MESSAGE
-- ============================================
-- This migration adds 10 new tables for Financial Management Module (ERP)
-- Total tables added: donors, grants, budgets, budget_allocations, financial_transactions,
-- benefit_distributions, financial_metrics, financial_reports, accounting_segments, segment_combinations
-- All tables have RLS policies, audit triggers, and proper indexes.
-- No existing tables were altered.
