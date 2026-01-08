-- Create ps_dokumen table for storing documents (SK, peta, legal documents)
CREATE TABLE ps_dokumen (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
  nama VARCHAR(255) NOT NULL,
  jenis VARCHAR(50) NOT NULL CHECK (jenis IN ('SK', 'PETA', 'RKPS', 'PKS', 'LAINNYA')),
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create ps_kegiatan table for storing activities
CREATE TABLE ps_kegiatan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
  nama_kegiatan VARCHAR(255) NOT NULL,
  jenis_kegiatan VARCHAR(100),
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  lokasi TEXT,
  deskripsi TEXT,
  status VARCHAR(50) CHECK (status IN ('RENCANA', 'BERLANGSUNG', 'SELESAI', 'DITUNDA')),
  anggaran DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create ps_galeri table for storing photos
CREATE TABLE ps_galeri (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
  judul VARCHAR(255),
  deskripsi TEXT,
  foto_url TEXT NOT NULL,
  foto_thumbnail_url TEXT,
  tanggal_foto DATE,
  lokasi TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create ps_catatan table for storing field notes
CREATE TABLE ps_catatan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  perhutanan_sosial_id UUID NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
  judul VARCHAR(255) NOT NULL,
  isi TEXT NOT NULL,
  kategori VARCHAR(50) CHECK (kategori IN ('MONITORING', 'EVALUASI', 'MASALAH', 'PENCAPAIAN', 'LAINNYA')),
  tanggal_catatan DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create ps_peta table for storing map data
CREATE TABLE ps_peta (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  perhutanan_sosial_id UUID UNIQUE NOT NULL REFERENCES perhutanan_sosial(id) ON DELETE CASCADE,
  geojson_data JSONB,
  file_url TEXT,
  file_name VARCHAR(255),
  koordinat_centroid JSONB, -- {lat, lng}
  luas_terukur DECIMAL(10, 2),
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create triggers to update updated_at column
CREATE TRIGGER update_ps_dokumen_updated_at
  BEFORE UPDATE ON ps_dokumen
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ps_kegiatan_updated_at
  BEFORE UPDATE ON ps_kegiatan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ps_galeri_updated_at
  BEFORE UPDATE ON ps_galeri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ps_catatan_updated_at
  BEFORE UPDATE ON ps_catatan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ps_peta_updated_at
  BEFORE UPDATE ON ps_peta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ps_dokumen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_galeri ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_catatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_peta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ps_dokumen
CREATE POLICY "ps_dokumen readable by authenticated users" ON ps_dokumen
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ps_dokumen insertable by admin and monev" ON ps_dokumen
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_dokumen updatable by admin and monev" ON ps_dokumen
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_dokumen deletable by admin only" ON ps_dokumen
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for ps_kegiatan
CREATE POLICY "ps_kegiatan readable by authenticated users" ON ps_kegiatan
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ps_kegiatan insertable by admin and monev" ON ps_kegiatan
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_kegiatan updatable by admin and monev" ON ps_kegiatan
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_kegiatan deletable by admin only" ON ps_kegiatan
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for ps_galeri
CREATE POLICY "ps_galeri readable by authenticated users" ON ps_galeri
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ps_galeri insertable by admin and monev" ON ps_galeri
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_galeri updatable by admin and monev" ON ps_galeri
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_galeri deletable by admin only" ON ps_galeri
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for ps_catatan
CREATE POLICY "ps_catatan readable by authenticated users" ON ps_catatan
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ps_catatan insertable by admin and monev" ON ps_catatan
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_catatan updatable by admin and monev" ON ps_catatan
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_catatan deletable by admin only" ON ps_catatan
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for ps_peta
CREATE POLICY "ps_peta readable by authenticated users" ON ps_peta
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ps_peta insertable by admin and monev" ON ps_peta
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_peta updatable by admin and monev" ON ps_peta
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'monev')
    )
  );

CREATE POLICY "ps_peta deletable by admin only" ON ps_peta
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create audit triggers
CREATE TRIGGER audit_ps_dokumen
  AFTER INSERT OR UPDATE OR DELETE ON ps_dokumen
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_ps_kegiatan
  AFTER INSERT OR UPDATE OR DELETE ON ps_kegiatan
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_ps_galeri
  AFTER INSERT OR UPDATE OR DELETE ON ps_galeri
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_ps_catatan
  AFTER INSERT OR UPDATE OR DELETE ON ps_catatan
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_ps_peta
  AFTER INSERT OR UPDATE OR DELETE ON ps_peta
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create indexes for performance
CREATE INDEX idx_ps_dokumen_perhutanan_sosial ON ps_dokumen(perhutanan_sosial_id);
CREATE INDEX idx_ps_dokumen_jenis ON ps_dokumen(jenis);
CREATE INDEX idx_ps_kegiatan_perhutanan_sosial ON ps_kegiatan(perhutanan_sosial_id);
CREATE INDEX idx_ps_kegiatan_status ON ps_kegiatan(status);
CREATE INDEX idx_ps_galeri_perhutanan_sosial ON ps_galeri(perhutanan_sosial_id);
CREATE INDEX idx_ps_catatan_perhutanan_sosial ON ps_catatan(perhutanan_sosial_id);
CREATE INDEX idx_ps_catatan_kategori ON ps_catatan(kategori);
CREATE INDEX idx_ps_peta_perhutanan_sosial ON ps_peta(perhutanan_sosial_id);

-- Add comments
COMMENT ON TABLE ps_dokumen IS 'Dokumen legal dan administrasi untuk Perhutanan Sosial';
COMMENT ON TABLE ps_kegiatan IS 'Daftar kegiatan yang dilakukan dalam Perhutanan Sosial';
COMMENT ON TABLE ps_galeri IS 'Foto dokumentasi kegiatan Perhutanan Sosial';
COMMENT ON TABLE ps_catatan IS 'Catatan lapangan dan monitoring Perhutanan Sosial';
COMMENT ON TABLE ps_peta IS 'Data peta dan koordinat untuk Perhutanan Sosial';

