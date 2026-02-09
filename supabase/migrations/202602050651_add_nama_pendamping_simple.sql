-- Simple migration: Add nama_pendamping column to perhutanan_sosial table
ALTER TABLE perhutanan_sosial 
ADD COLUMN IF NOT EXISTS nama_pendamping VARCHAR(100);

COMMENT ON COLUMN perhutanan_sosial.nama_pendamping IS 'Nama individu pendamping (person) yang mendampingi PS (bukan organisasi fasilitator)';