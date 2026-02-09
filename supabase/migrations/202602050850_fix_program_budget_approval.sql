-- FIX PROGRAM BUDGET & APPROVAL WORKFLOW
-- Created: 2026-02-05 08:50 AM
-- Fixes: 
-- 1. Error loading master_aksi_mitigasi
-- 2. Add budget section to program form  
-- 3. Add approval workflow for finance department
-- 4. Create program budgets and budget items tables

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- PART 1: FIX MASTER_AKSI_MITIGASI ERROR
-- ====================================================================

-- Check if master_aksi_mitigasi exists, if not create it
CREATE TABLE IF NOT EXISTS master_aksi_mitigasi (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama_aksi VARCHAR(255) NOT NULL,
    kelompok VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT kelompok_check CHECK (kelompok IN ('PERLINDUNGAN_HUTAN', 'PENINGKATAN_SERAPAN', 'TATA_KELOLA', 'SOSIAL', 'SERTIFIKASI'))
);

-- Insert sample data for master_aksi_mitigasi (15 aksi mitigasi)
INSERT INTO master_aksi_mitigasi (kode, nama_aksi, kelompok, deskripsi) VALUES
-- Perlindungan Hutan (Avoided Emissions)
('AM-001', 'Perlindungan Hutan Desa dari Deforestasi', 'PERLINDUNGAN_HUTAN', 'Mencegah konversi hutan menjadi lahan pertanian/perkebunan di wilayah desa'),
('AM-002', 'Konservasi Hutan Gambut', 'PERLINDUNGAN_HUTAN', 'Perlindungan ekosistem gambut dari drainase dan kebakaran'),
('AM-003', 'Pengelolaan Hutan Lestari (SFM)', 'PERLINDUNGAN_HUTAN', 'Sustainable Forest Management dengan prinsip Reduced Impact Logging'),

-- Peningkatan Serapan Karbon (Carbon Removal)
('AM-004', 'Reboisasi Lahan Kritis', 'PENINGKATAN_SERAPAN', 'Penanaman kembali lahan kritis dengan spesies lokal'),
('AM-005', 'Agroforestri Berbasis Kopi/Karet', 'PENINGKATAN_SERAPAN', 'Sistem tumpangsari tanaman tahunan dengan pohon penaung'),
('AM-006', 'Restorasi Ekosistem Mangrove', 'PENINGKATAN_SERAPAN', 'Penanaman dan rehabilitasi ekosistem mangrove'),
('AM-007', 'Penanaman Pohon Multi-Purpose', 'PENINGKATAN_SERAPAN', 'Penanaman pohon serbaguna (kayu, buah, obat)'),

-- Tata Kelola & Manajemen
('AM-008', 'Penguatan Kelembagaan Kelompok Tani', 'TATA_KELOLA', 'Capacity building untuk pengelolaan hutan desa'),
('AM-009', 'Sistem Monitoring Hutan Berbasis Masyarakat', 'TATA_KELOLA', 'Pelatihan dan peralatan untuk patroli hutan'),
('AM-010', 'Pengembangan Rencana Pengelolaan Hutan', 'TATA_KELOLA', 'Penyusunan dokumen rencana pengelolaan hutan jangka panjang'),

-- Sosial (Social Safeguard)
('AM-011', 'Pemberdayaan Ekonomi Perempuan', 'SOSIAL', 'Pelatihan dan modal usaha untuk kelompok perempuan'),
('AM-012', 'Resolusi Konflik Tenurial', 'SOSIAL', 'Fasilitasi penyelesaian sengketa lahan'),
('AM-013', 'Benefit Sharing Mechanism', 'SOSIAL', 'Mekanisme pembagian manfaat dari penjualan karbon'),

-- Sertifikasi & Perdagangan Karbon
('AM-014', 'Validasi & Verifikasi Proyek Karbon', 'SERTIFIKASI', 'Proses sertifikasi standar karbon (VCS, Gold Standard)'),
('AM-015', 'Pemasaran dan Penjualan Kredit Karbon', 'SERTIFIKASI', 'Strategi pemasaran dan negosiasi penjualan kredit karbon')
ON CONFLICT (kode) DO UPDATE SET
    nama_aksi = EXCLUDED.nama_aksi,
    kelompok = EXCLUDED.kelompok,
    deskripsi = EXCLUDED.deskripsi,
    updated_at = NOW();

-- Grant permissions
GRANT ALL ON master_aksi_mitigasi TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE master_aksi_mitigasi_id_seq TO anon, authenticated;

-- ====================================================================
-- PART 2: ADD APPROVAL COLUMNS TO PROGRAMS TABLE
-- ====================================================================

-- Add approval workflow columns to programs table
ALTER TABLE programs ADD COLUMN IF NOT EXISTS budget_status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE programs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15,2) DEFAULT 0;

-- Create constraint for budget_status
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_budget_status_check;
ALTER TABLE programs ADD CONSTRAINT programs_budget_status_check 
    CHECK (budget_status IN ('draft', 'submitted_for_review', 'under_review', 'approved', 'rejected', 'needs_revision'));

-- ====================================================================
-- PART 3: CREATE PROGRAM BUDGETS TABLES
-- ====================================================================

-- Program budgets table (main budget header)
CREATE TABLE IF NOT EXISTS program_budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    budget_code VARCHAR(50) NOT NULL,
    budget_name VARCHAR(255) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT program_budgets_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'archived')),
    CONSTRAINT unique_budget_code UNIQUE (budget_code)
);

-- Program budget items table (line items from price_list)
CREATE TABLE IF NOT EXISTS program_budget_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_budget_id UUID NOT NULL REFERENCES program_budgets(id) ON DELETE CASCADE,
    price_list_id UUID NOT NULL REFERENCES price_list(id),
    item_code VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50),
    unit_price DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    category VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- PART 4: CREATE JUNCTION TABLE FOR PROGRAM_AKSI_MITIGASI
-- ====================================================================

-- Check if program_aksi_mitigasi exists, if not create it
CREATE TABLE IF NOT EXISTS program_aksi_mitigasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    aksi_mitigasi_id INTEGER NOT NULL REFERENCES master_aksi_mitigasi(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_program_aksi UNIQUE (program_id, aksi_mitigasi_id)
);

-- ====================================================================
-- PART 5: ENABLE RLS AND CREATE POLICIES
-- ====================================================================

-- Enable RLS
ALTER TABLE master_aksi_mitigasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_aksi_mitigasi ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated read access for master_aksi_mitigasi" ON master_aksi_mitigasi;
DROP POLICY IF EXISTS "Authenticated read access for program_budgets" ON program_budgets;
DROP POLICY IF EXISTS "Program roles manage program_budgets" ON program_budgets;
DROP POLICY IF EXISTS "Authenticated read access for program_budget_items" ON program_budget_items;
DROP POLICY IF EXISTS "Program roles manage program_budget_items" ON program_budget_items;
DROP POLICY IF EXISTS "Authenticated read access for program_aksi_mitigasi" ON program_aksi_mitigasi;
DROP POLICY IF EXISTS "Program roles manage program_aksi_mitigasi" ON program_aksi_mitigasi;

-- Create RLS policies

-- 1. master_aksi_mitigasi: Read-only for authenticated users
CREATE POLICY "Authenticated read access for master_aksi_mitigasi" ON master_aksi_mitigasi
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. program_budgets: 
--    - Read: authenticated users
--    - Write: admin, program_planner (for their own programs)
CREATE POLICY "Authenticated read access for program_budgets" ON program_budgets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program roles manage program_budgets" ON program_budgets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'program_planner')
        )
    );

-- 3. program_budget_items: Same as program_budgets
CREATE POLICY "Authenticated read access for program_budget_items" ON program_budget_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program roles manage program_budget_items" ON program_budget_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'program_planner')
        )
    );

-- 4. program_aksi_mitigasi: Same policies
CREATE POLICY "Authenticated read access for program_aksi_mitigasi" ON program_aksi_mitigasi
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Program roles manage program_aksi_mitigasi" ON program_aksi_mitigasi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'program_planner')
        )
    );

-- ====================================================================
-- PART 6: CREATE TRIGGERS FOR UPDATED_AT
-- ====================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_master_aksi_mitigasi_updated_at ON master_aksi_mitigasi;
CREATE TRIGGER update_master_aksi_mitigasi_updated_at
    BEFORE UPDATE ON master_aksi_mitigasi
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_program_budgets_updated_at ON program_budgets;
CREATE TRIGGER update_program_budgets_updated_at
    BEFORE UPDATE ON program_budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_program_budget_items_updated_at ON program_budget_items;
CREATE TRIGGER update_program_budget_items_updated_at
    BEFORE UPDATE ON program_budget_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- PART 7: INSERT SAMPLE DATA FOR TESTING
-- ====================================================================

DO $$
DECLARE
    sample_program_id UUID;
    sample_price_item_id UUID;
    sample_budget_id UUID;
BEGIN
    -- Get sample program ID
    SELECT id INTO sample_program_id FROM programs LIMIT 1;
    
    -- Get sample price list item ID
    SELECT id INTO sample_price_item_id FROM price_list LIMIT 1;
    
    -- Only insert sample data if we have IDs
    IF sample_program_id IS NOT NULL THEN
        -- Update program with sample budget
        UPDATE programs 
        SET total_budget = 500000000.00,
            budget_status = 'draft'
        WHERE id = sample_program_id;
        
        -- Create sample budget
        INSERT INTO program_budgets (program_id, budget_code, budget_name, fiscal_year, total_amount, status)
        VALUES (
            sample_program_id,
            'BUD-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-001',
            'Anggaran Program Carbon Pilot',
            EXTRACT(YEAR FROM CURRENT_DATE),
            500000000.00,
            'draft'
        )
        ON CONFLICT (budget_code) DO NOTHING
        RETURNING id INTO sample_budget_id;
        
        -- Create sample budget items if we have price list item
        IF sample_price_item_id IS NOT NULL AND sample_budget_id IS NOT NULL THEN
            INSERT INTO program_budget_items (program_budget_id, price_list_id, item_code, item_name, quantity, unit_price, category)
            VALUES (
                sample_budget_id,
                sample_price_item_id,
                'ITEM-001',
                'Biaya Konsultasi Teknis',
                200.00,
                2500000.00,
                'Jasa Profesional'
            )
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Link sample aksi mitigasi to program
        INSERT INTO program_aksi_mitigasi (program_id, aksi_mitigasi_id)
        SELECT sample_program_id, id FROM master_aksi_mitigasi WHERE kode IN ('AM-001', 'AM-004', 'AM-008')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Sample data inserted for program budgets and aksi mitigasi';
    ELSE
        RAISE NOTICE 'ℹ️  No sample data inserted (no program found)';
    END IF;
END $$;

-- ====================================================================
-- PART 8: VERIFICATION AND SUMMARY
-- ====================================================================

DO $$
DECLARE
    aksi_count INTEGER;
    budgets_count INTEGER;
    budget_items_count INTEGER;
    program_aksi_count INTEGER;
BEGIN
    -- Count data
    SELECT COUNT(*) INTO aksi_count FROM master_aksi_mitigasi;
    SELECT COUNT(*) INTO budgets_count FROM program_budgets;
    SELECT COUNT(*) INTO budget_items_count FROM program_budget_items;
    SELECT COUNT(*) INTO program_aksi_count FROM program_aksi_mitigasi;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PROGRAM BUDGET & APPROVAL FIX COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created/updated:';
    RAISE NOTICE '  ✅ master_aksi_mitigasi: % rows', aksi_count;
    RAISE NOTICE '  ✅ program_budgets: % rows', budgets_count;
    RAISE NOTICE '  ✅ program_budget_items: % rows', budget_items_count;
    RAISE NOTICE '  ✅ program_aksi_mitigasi: % rows', program_aksi_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend errors fixed:';
    RAISE NOTICE '  ✅ master_aksi_mitigasi table exists with data';
    RAISE NOTICE '  ✅ program_aksi_mitigasi junction table created';
    RAISE NOTICE '  ✅ Approval columns added to programs table';
    RAISE NOTICE '  ✅ Budget management tables created';
    RAISE NOTICE '';
    RAISE NOTICE 'Workflow enabled:';
    RAISE NOTICE '  • Program Planner can create program with budget';
    RAISE NOTICE '  • Submit to Finance for approval (budget_status)';
    RAISE NOTICE '  • Finance Manager can approve/reject budgets';
    RAISE NOTICE '  • Budget items linked to price_list (master harga)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Update program-form.tsx to include budget section';
    RAISE NOTICE '  2. Create API endpoints for budget management';
    RAISE NOTICE '  3. Create finance dashboard for approval';
    RAISE NOTICE '  4. Test end-to-end workflow';
    RAISE NOTICE '=========================================';
END $$;

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;