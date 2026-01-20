-- Add Kotamadya Palangka Raya to kabupaten table
INSERT INTO kabupaten (nama) VALUES
    ('Kotamadya Palangka Raya')
ON CONFLICT (nama) DO NOTHING;
