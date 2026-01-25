-- Migration: Add additional fields to pemberdayaan_ekonomi table for enhanced economic empowerment tracking
-- Date: 2026-01-26
-- Description: Adds fields for characteristic, potential, challenges, social impact, ecosystem linkage, and photos

-- 1. Add new columns to pemberdayaan_ekonomi table if they don't exist
DO $$ 
BEGIN
    -- Add karakteristik_khusus column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi' 
        AND column_name = 'karakteristik_khusus'
    ) THEN
        ALTER TABLE pemberdayaan_ekonomi ADD COLUMN karakteristik_khusus TEXT;
    END IF;

    -- Add potensi_pengembangan column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi' 
        AND column_name = 'potensi_pengembangan'
    ) THEN
        ALTER TABLE pemberdayaan_ekonomi ADD COLUMN potensi_pengembangan TEXT;
    END IF;

    -- Add tantangan column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi' 
        AND column_name = 'tantangan'
    ) THEN
        ALTER TABLE pemberdayaan_ekonomi ADD COLUMN tantangan TEXT;
    END IF;

    -- Add dampak_sosial column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi' 
        AND column_name = 'dampak_sosial'
    ) THEN
        ALTER TABLE pemberdayaan_ekonomi ADD COLUMN dampak_sosial TEXT;
    END IF;

    -- Add keterkaitan_ekosistem column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi' 
        AND column_name = 'keterkaitan_ekosistem'
    ) THEN
        ALTER TABLE pemberdayaan_ekonomi ADD COLUMN keterkaitan_ekosistem TEXT;
    END IF;

    -- Add foto_usaha_urls column (array of text for multiple photos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi' 
        AND column_name = 'foto_usaha_urls'
    ) THEN
        ALTER TABLE pemberdayaan_ekonomi ADD COLUMN foto_usaha_urls TEXT[] DEFAULT '{}';
    END IF;

    -- Add status column for tracking approval/verification
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pemberdayaan_ekonomi' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE pemberdayaan_ekonomi ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'pemberdayaan_ekonomi_status_check'
        ) THEN
            ALTER TABLE pemberdayaan_ekonomi ADD CONSTRAINT pemberdayaan_ekonomi_status_check 
                CHECK (status IN ('draft', 'submitted', 'verified', 'rejected', 'archived'));
        END IF;
    END IF;

END $$;

-- 2. Create index for status field for better query performance
CREATE INDEX IF NOT EXISTS idx_pemberdayaan_ekonomi_status ON pemberdayaan_ekonomi(status);

-- 3. Update RLS policies to include new fields (policies already cover ALL operations, so no change needed)
-- Note: Existing policies "Pemberdayaan ekonomi readable by authenticated users" and 
-- "Pemberdayaan ekonomi manageable by admin and program_planner" already cover SELECT and ALL operations.

-- 4. Add comments for new columns
COMMENT ON COLUMN pemberdayaan_ekonomi.karakteristik_khusus IS 'Keunggulan/karakteristik unik usaha di PS tersebut';
COMMENT ON COLUMN pemberdayaan_ekonomi.potensi_pengembangan IS 'Potensi pengembangan usaha ke depan';
COMMENT ON COLUMN pemberdayaan_ekonomi.tantangan IS 'Tantangan yang dihadapi dalam mengembangkan usaha';
COMMENT ON COLUMN pemberdayaan_ekonomi.dampak_sosial IS 'Dampak sosial dari usaha ini terhadap masyarakat sekitar';
COMMENT ON COLUMN pemberdayaan_ekonomi.keterkaitan_ekosistem IS 'Keterkaitan usaha dengan ekosistem hutan setempat';
COMMENT ON COLUMN pemberdayaan_ekonomi.foto_usaha_urls IS 'Array URL foto dokumentasi usaha (multiple photos)';
COMMENT ON COLUMN pemberdayaan_ekonomi.status IS 'Status data: draft, submitted, verified, rejected, archived';

-- 5. Create a view for easier querying of pemberdayaan data with PS and Kabupaten info
CREATE OR REPLACE VIEW pemberdayaan_ekonomi_detail AS
SELECT 
    pe.*,
    ps.nama as ps_nama,
    ps.desa,
    ps.kecamatan,
    ps.skema,
    ps.luas_ha as ps_luas_ha,
    k.id as kabupaten_id,
    k.nama as kabupaten_nama,
    lp.nama_lembaga,
    lp.ketua_lembaga
FROM pemberdayaan_ekonomi pe
LEFT JOIN perhutanan_sosial ps ON pe.perhutanan_sosial_id = ps.id
LEFT JOIN kabupaten k ON ps.kabupaten_id = k.id
LEFT JOIN lembaga_pengelola lp ON ps.id = lp.perhutanan_sosial_id;

-- 6. Add comment for the view
COMMENT ON VIEW pemberdayaan_ekonomi_detail IS 'Detailed view of economic empowerment data with PS and Kabupaten information';

-- 7. Create function to get pemberdayaan statistics by kabupaten
CREATE OR REPLACE FUNCTION get_pemberdayaan_stats_by_kabupaten()
RETURNS TABLE (
    kabupaten_id UUID,
    kabupaten_nama VARCHAR(255),
    total_usaha BIGINT,
    total_anggota BIGINT,
    total_pendapatan DECIMAL,
    avg_pendapatan_per_usaha DECIMAL,
    jenis_usaha_count JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.id as kabupaten_id,
        k.nama as kabupaten_nama,
        COUNT(pe.id) as total_usaha,
        COALESCE(SUM(pe.jumlah_anggota), 0) as total_anggota,
        COALESCE(SUM(pe.pendapatan_per_bulan), 0) as total_pendapatan,
        CASE 
            WHEN COUNT(pe.id) > 0 THEN COALESCE(AVG(pe.pendapatan_per_bulan), 0)
            ELSE 0 
        END as avg_pendapatan_per_usaha,
        COALESCE(
            jsonb_object_agg(
                COALESCE(pe.jenis_usaha, 'Tidak Diketahui'), 
                jenis_count
            ) FILTER (WHERE pe.jenis_usaha IS NOT NULL),
            '{}'::jsonb
        ) as jenis_usaha_count
    FROM kabupaten k
    LEFT JOIN perhutanan_sosial ps ON k.id = ps.kabupaten_id
    LEFT JOIN pemberdayaan_ekonomi pe ON ps.id = pe.perhutanan_sosial_id
    LEFT JOIN (
        SELECT 
            jenis_usaha,
            COUNT(*) as jenis_count
        FROM pemberdayaan_ekonomi
        WHERE jenis_usaha IS NOT NULL
        GROUP BY jenis_usaha
    ) counts ON pe.jenis_usaha = counts.jenis_usaha
    GROUP BY k.id, k.nama
    ORDER BY k.nama;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Add comment for the function
COMMENT ON FUNCTION get_pemberdayaan_stats_by_kabupaten() IS 'Returns economic empowerment statistics grouped by kabupaten';

-- Migration completed successfully