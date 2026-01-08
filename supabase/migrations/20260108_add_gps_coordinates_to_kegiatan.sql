-- Add latitude and longitude columns to ps_kegiatan table for GPS coordinates
ALTER TABLE ps_kegiatan 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comment for the new columns
COMMENT ON COLUMN ps_kegiatan.latitude IS 'Latitude GPS koordinat kegiatan';
COMMENT ON COLUMN ps_kegiatan.longitude IS 'Longitude GPS koordinat kegiatan';

-- Update the audit trigger to include new columns
-- Note: The audit trigger function is already set up, so we don't need to change it.
