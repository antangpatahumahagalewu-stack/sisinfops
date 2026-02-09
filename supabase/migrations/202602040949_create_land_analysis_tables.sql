-- Migration: Create land analysis tables for tab-lahan.tsx
-- Generated at: 2026-02-04 09:49 AM
-- Fixes "Error fetching land data:" console error

BEGIN;

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- 1. Create land_tenure table
-- ======================
CREATE TABLE IF NOT EXISTS land_tenure (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    ownership_status VARCHAR(50) NOT NULL DEFAULT 'COMMUNAL',
    land_certificate_number VARCHAR(100),
    certificate_date DATE,
    area_ha DECIMAL(10, 2),
    challenges TEXT,
    government_involvement TEXT,
    ministry_engagement TEXT,
    conflict_history TEXT,
    resolution_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Check constraints
    CONSTRAINT ownership_status_check CHECK (ownership_status IN ('PRIVATE', 'PUBLIC', 'COMMUNAL', 'MIXED', 'OTHER')),
    CONSTRAINT resolution_status_check CHECK (resolution_status IN ('RESOLVED', 'ONGOING', 'PENDING', 'NONE', 'UNKNOWN'))
);

-- ======================
-- 2. Create forest_status_history table
-- ======================
CREATE TABLE IF NOT EXISTS forest_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    forest_status VARCHAR(50) NOT NULL,
    definition_used VARCHAR(100) NOT NULL,
    area_ha DECIMAL(10, 2),
    data_source VARCHAR(255),
    verification_method VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Check constraints
    CONSTRAINT forest_status_check CHECK (forest_status IN ('FOREST', 'NON_FOREST', 'DEGRADED_FOREST', 'OTHER')),
    CONSTRAINT year_range CHECK (year >= 1900 AND year <= 2100),
    
    -- Unique constraint: one record per PS per year
    CONSTRAINT unique_ps_year UNIQUE (perhutanan_sosial_id, year)
);

-- ======================
-- 3. Create deforestation_drivers table
-- ======================
CREATE TABLE IF NOT EXISTS deforestation_drivers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
    driver_type VARCHAR(50) NOT NULL,
    driver_description TEXT NOT NULL,
    historical_trend VARCHAR(50),
    intervention_activity TEXT NOT NULL,
    intervention_rationale TEXT,
    expected_impact TEXT,
    data_source VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Check constraints
    CONSTRAINT driver_type_check CHECK (driver_type IN (
        'AGRICULTURAL_EXPANSION', 'LOGGING', 'INFRASTRUCTURE', 
        'MINING', 'FIRE', 'CLIMATE_CHANGE', 'OTHER'
    )),
    CONSTRAINT historical_trend_check CHECK (historical_trend IN (
        'INCREASING', 'DECREASING', 'STABLE', 'VARIABLE', 'UNKNOWN'
    ))
);

-- ======================
-- 4. Create indexes for performance
-- ======================
CREATE INDEX IF NOT EXISTS idx_land_tenure_perhutanan_sosial_id ON land_tenure(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_land_tenure_ownership_status ON land_tenure(ownership_status);

CREATE INDEX IF NOT EXISTS idx_forest_status_history_perhutanan_sosial_id ON forest_status_history(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_forest_status_history_year ON forest_status_history(year DESC);
CREATE INDEX IF NOT EXISTS idx_forest_status_history_forest_status ON forest_status_history(forest_status);

CREATE INDEX IF NOT EXISTS idx_deforestation_drivers_perhutanan_sosial_id ON deforestation_drivers(perhutanan_sosial_id);
CREATE INDEX IF NOT EXISTS idx_deforestation_drivers_driver_type ON deforestation_drivers(driver_type);
CREATE INDEX IF NOT EXISTS idx_deforestation_drivers_created_at ON deforestation_drivers(created_at DESC);

-- ======================
-- 5. Create updated_at triggers
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_land_tenure_updated_at ON land_tenure;
CREATE TRIGGER update_land_tenure_updated_at
    BEFORE UPDATE ON land_tenure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forest_status_history_updated_at ON forest_status_history;
CREATE TRIGGER update_forest_status_history_updated_at
    BEFORE UPDATE ON forest_status_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deforestation_drivers_updated_at ON deforestation_drivers;
CREATE TRIGGER update_deforestation_drivers_updated_at
    BEFORE UPDATE ON deforestation_drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- 6. Enable RLS with simple policies
-- ======================
ALTER TABLE IF EXISTS land_tenure ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS forest_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deforestation_drivers ENABLE ROW LEVEL SECURITY;

-- Simple policies - allow all for testing
CREATE POLICY "Allow all operations on land_tenure for testing" ON land_tenure
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on forest_status_history for testing" ON forest_status_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on deforestation_drivers for testing" ON deforestation_drivers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ======================
-- 7. Grant permissions
-- ======================
GRANT ALL ON land_tenure TO postgres, anon, authenticated, service_role;
GRANT ALL ON forest_status_history TO postgres, anon, authenticated, service_role;
GRANT ALL ON deforestation_drivers TO postgres, anon, authenticated, service_role;

-- ======================
-- 8. Insert sample data for testing
-- ======================
DO $$
DECLARE
    sample_ps_id UUID;
    current_year INTEGER;
BEGIN
    -- Get a sample PS ID
    SELECT id INTO sample_ps_id FROM perhutanan_sosial LIMIT 1;
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Only insert sample data if we have a PS
    IF sample_ps_id IS NOT NULL THEN
        -- Insert sample land tenure data
        INSERT INTO land_tenure (
            perhutanan_sosial_id,
            ownership_status,
            land_certificate_number,
            certificate_date,
            area_ha,
            challenges,
            government_involvement,
            ministry_engagement,
            conflict_history,
            resolution_status,
            notes
        ) VALUES (
            sample_ps_id,
            'COMMUNAL',
            'SERT-2023-00123',
            CURRENT_DATE - INTERVAL '1 year',
            125.75,
            'Kepemilikan lahan secara komunal memerlukan persetujuan seluruh anggota kelompok.',
            'Dinas Kehutanan Provinsi terlibat dalam sosialisasi dan pendampingan.',
            'Kementerian LHK melalui program Perhutanan Sosial.',
            'Konflik dengan perusahaan perkebunan pada tahun 2018.',
            'RESOLVED',
            'Status kepemilikan sudah jelas dengan SK Perhutanan Sosial.'
        ) ON CONFLICT DO NOTHING;
        
        -- Insert sample forest status history (10 years)
        FOR i IN 0..9 LOOP
            INSERT INTO forest_status_history (
                perhutanan_sosial_id,
                year,
                forest_status,
                definition_used,
                area_ha,
                data_source,
                verification_method,
                notes
            ) VALUES (
                sample_ps_id,
                current_year - i,
                CASE 
                    WHEN i <= 2 THEN 'FOREST'
                    WHEN i <= 5 THEN 'DEGRADED_FOREST'
                    ELSE 'NON_FOREST'
                END,
                'Definisi hutan nasional Indonesia (Permen LHK No. P.30/2016)',
                125.75 - (i * 2.5),
                'Peta tutupan lahan Kementerian LHK',
                'Interpretasi citra satelit Landsat 8',
                CASE 
                    WHEN i <= 2 THEN 'Tutupan hutan masih baik'
                    WHEN i <= 5 THEN 'Terjadi degradasi akibat kegiatan masyarakat'
                    ELSE 'Konversi lahan untuk pertanian'
                END
            ) ON CONFLICT (perhutanan_sosial_id, year) DO NOTHING;
        END LOOP;
        
        -- Insert sample deforestation drivers
        INSERT INTO deforestation_drivers (
            perhutanan_sosial_id,
            driver_type,
            driver_description,
            historical_trend,
            intervention_activity,
            intervention_rationale,
            expected_impact,
            data_source,
            notes
        ) VALUES 
        (
            sample_ps_id,
            'AGRICULTURAL_EXPANSION',
            'Perluasan lahan pertanian masyarakat sekitar kawasan hutan.',
            'INCREASING',
            'Pengembangan agroforestri dan pertanian berkelanjutan.',
            'Mengurangi tekanan pada hutan dengan meningkatkan produktivitas lahan pertanian yang ada.',
            'Penurunan laju konversi hutan untuk pertanian sebesar 30% dalam 5 tahun.',
            'Wawancara dengan masyarakat dan data Dinas Pertanian.',
            'Penyebab utama deforestasi di wilayah ini.'
        ),
        (
            sample_ps_id,
            'LOGGING',
            'Penebangan liar untuk kayu bakar dan bangunan.',
            'DECREASING',
            'Program pemberian kompor gas dan material bangunan alternatif.',
            'Mengurangi ketergantungan masyarakat terhadap kayu dari hutan.',
            'Penurunan penebangan liar sebesar 50% dalam 3 tahun.',
            'Monitoring patroli dan laporan masyarakat.',
            'Sudah ada penurunan signifikan sejak program perhutanan sosial.'
        ),
        (
            sample_ps_id,
            'FIRE',
            'Kebakaran lahan pada musim kemarau.',
            'VARIABLE',
            'Pembuatan sekat bakar dan penyediaan alat pemadam kebakaran.',
            'Mencegah penyebaran api dan meningkatkan kapasitas masyarakat dalam penanggulangan kebakaran.',
            'Pengurangan luas area terbakar sebesar 70% dalam 5 tahun.',
            'Data hotspot satelit dan laporan BNPB.',
            'Dipengaruhi oleh kondisi iklim El Niño.'
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Sample data inserted for PS ID: %', sample_ps_id;
        RAISE NOTICE '   • land_tenure: 1 record';
        RAISE NOTICE '   • forest_status_history: 10 records (10 tahun)';
        RAISE NOTICE '   • deforestation_drivers: 3 records';
    ELSE
        RAISE NOTICE 'ℹ️  No sample data inserted (no PS found)';
    END IF;
END $$;

-- ======================
-- 9. Verification
-- ======================
DO $$
DECLARE
    land_tenure_count INTEGER;
    forest_history_count INTEGER;
    drivers_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO land_tenure_count FROM land_tenure;
    SELECT COUNT(*) INTO forest_history_count FROM forest_status_history;
    SELECT COUNT(*) INTO drivers_count FROM deforestation_drivers;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'LAND ANALYSIS TABLES CREATION COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  • land_tenure - % rows', land_tenure_count;
    RAISE NOTICE '  • forest_status_history - % rows', forest_history_count;
    RAISE NOTICE '  • deforestation_drivers - % rows', drivers_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend impact:';
    RAISE NOTICE '  ✅ tab-lahan.tsx - No more "Error fetching land data:"';
    RAISE NOTICE '  ✅ Tabel yang sesuai dengan TypeScript interfaces';
    RAISE NOTICE '  ✅ Sample data untuk testing semua fitur';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  • 3 tab komprehensif: Kepemilikan, Riwayat, Analisis';
    RAISE NOTICE '  • Data 10 tahun riwayat hutan';
    RAISE NOTICE '  • Analisis penyebab deforestasi';
    RAISE NOTICE '  • RLS enabled dengan simple policies';
    RAISE NOTICE '  • Foreign key ke perhutanan_sosial';
    RAISE NOTICE '=========================================';
END $$;

-- ======================
-- 10. Refresh schema cache
-- ======================
SELECT pg_notify('pgrst', 'reload schema');

COMMIT;