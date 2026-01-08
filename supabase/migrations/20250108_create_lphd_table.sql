-- Create lphd table for storing LPHD details
CREATE TABLE lphd (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  perhutanan_sosial_id UUID UNIQUE NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
  nama VARCHAR(255) NOT NULL,
  ketua VARCHAR(255),
  jumlah_anggota INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to update updated_at column
CREATE TRIGGER update_lphd_updated_at
  BEFORE UPDATE ON lphd
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE lphd ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lphd (same as perhutanan_sosial)
CREATE POLICY "lphd readable by authenticated users" ON lphd
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "lphd insertable by admin and monev" ON lphd
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "lphd updatable by admin and monev" ON lphd
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "lphd deletable by admin only" ON lphd
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create audit trigger for lphd
CREATE TRIGGER audit_lphd
  AFTER INSERT OR UPDATE OR DELETE ON lphd
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create index for performance
CREATE INDEX idx_lphd_perhutanan_sosial ON lphd(perhutanan_sosial_id);

-- Insert existing LPHD data from perhutanan_sosial
INSERT INTO lphd (perhutanan_sosial_id, nama, jumlah_anggota)
SELECT 
  ps.id,
  'LPHD ' || ps.pemegang_izin,
  ps.jumlah_kk
FROM perhutanan_sosial ps
WHERE NOT EXISTS (
  SELECT 1 FROM lphd l WHERE l.perhutanan_sosial_id = ps.id
);

-- Add a comment to the table
COMMENT ON TABLE lphd IS 'Lembaga Pengelola Hutan Desa (LPHD) information linked to perhutanan sosial records';
