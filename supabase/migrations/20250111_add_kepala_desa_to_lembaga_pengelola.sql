-- Add kepala_desa field to lembaga_pengelola table
ALTER TABLE lembaga_pengelola 
ADD COLUMN IF NOT EXISTS kepala_desa VARCHAR(255);

-- Add comment to the column
COMMENT ON COLUMN lembaga_pengelola.kepala_desa IS 'Nama Kepala Desa untuk lembaga pengelola perhutanan sosial';

