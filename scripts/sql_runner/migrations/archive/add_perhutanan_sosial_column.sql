-- ADD PERHUTANAN_SOSIAL_ID COLUMN TO PROGRAMS TABLE
-- This SQL should be executed in Supabase SQL Editor

-- 1. Add the column if it doesn't exist
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS perhutanan_sosial_id UUID;

-- 2. Add foreign key constraint
ALTER TABLE programs 
ADD CONSTRAINT programs_perhutanan_sosial_id_fkey 
FOREIGN KEY (perhutanan_sosial_id) 
REFERENCES perhutanan_sosial(id) 
ON DELETE SET NULL;

-- 3. Update existing programs with perhutanan_sosial_id based on kabupaten
-- First, let's see what we have
SELECT 
    p.program_code,
    p.kode_program,
    cp.kode_project,
    cp.kabupaten,
    ps.pemegang_izin,
    ps.desa
FROM programs p
JOIN carbon_projects cp ON p.carbon_project_id = cp.id
LEFT JOIN perhutanan_sosial ps ON cp.kabupaten = (
    SELECT k.nama 
    FROM kabupaten k 
    WHERE k.id = ps.kabupaten_id
    LIMIT 1
)
ORDER BY p.program_code
LIMIT 10;

-- 4. Update programs with perhutanan_sosial_id from matching kabupaten
UPDATE programs p
SET perhutanan_sosial_id = ps.id
FROM carbon_projects cp
JOIN perhutanan_sosial ps ON ps.kabupaten_id IN (
    SELECT k.id 
    FROM kabupaten k 
    WHERE k.nama ILIKE '%' || cp.kabupaten || '%'
)
WHERE p.carbon_project_id = cp.id
AND p.perhutanan_sosial_id IS NULL;

-- Alternative simpler approach: use the first perhutanan_sosial for each kabupaten
WITH ps_by_kabupaten AS (
    SELECT 
        k.nama as kabupaten_name,
        ps.id as ps_id,
        ROW_NUMBER() OVER (PARTITION BY k.nama ORDER BY ps.id) as rn
    FROM perhutanan_sosial ps
    JOIN kabupaten k ON ps.kabupaten_id = k.id
)
UPDATE programs p
SET perhutanan_sosial_id = psb.ps_id
FROM carbon_projects cp
JOIN ps_by_kabupaten psb ON psb.kabupaten_name ILIKE '%' || cp.kabupaten || '%' AND psb.rn = 1
WHERE p.carbon_project_id = cp.id
AND p.perhutanan_sosial_id IS NULL;

-- 5. Verify the updates
SELECT 
    COUNT(*) as total_programs,
    COUNT(perhutanan_sosial_id) as with_ps_id,
    ROUND(COUNT(perhutanan_sosial_id)::DECIMAL / COUNT(*) * 100, 1) as percentage_with_ps
FROM programs;

-- 6. Show sample results
SELECT 
    p.program_code as "Kode Program",
    p.nama_program as "Nama Program",
    p.program_type as "Jenis",
    cp.kode_project as "Carbon Project",
    cp.nama_project as "Nama Carbon Project",
    ps.pemegang_izin as "Perhutanan Sosial",
    ps.desa as "Desa",
    p.status as "Status"
FROM programs p
LEFT JOIN carbon_projects cp ON p.carbon_project_id = cp.id
LEFT JOIN perhutanan_sosial ps ON p.perhutanan_sosial_id = ps.id
ORDER BY p.program_code
LIMIT 15;