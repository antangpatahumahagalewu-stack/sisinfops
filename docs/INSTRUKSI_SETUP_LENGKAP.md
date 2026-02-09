# INSTRUKSI SETUP DATABASE LENGKAP

## LANGKAH 1: Setup Database di Supabase

### 1. Buka Supabase SQL Editor
- Buka: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql
- Login dengan akun Anda

### 2. Jalankan SQL Setup
1. Klik **"New query"**
2. Copy seluruh konten dari file `setup_database_complete.sql`
3. Paste ke SQL Editor
4. Klik **"Run"** untuk menjalankan script

### 3. Verifikasi Setup
Setelah SQL berhasil dijalankan, Anda akan melihat pesan:
```
✅ Database setup completed successfully!
```

## LANGKAH 2: Import Data Perhutanan Sosial

### 1. Install dependency (jika belum)
```bash
cd /home/sangumang/Documents/sisinfops
npm install csv-parser --save-dev
```

### 2. Jalankan script import
```bash
node import_perhutanan_sosial_data.js
```

Script ini akan:
1. Membaca data dari `data/perhutanan_sosial_row.csv`
2. Mapping kabupaten nama ke ID
3. Import ke tabel `perhutanan_sosial`

### 3. Jika ada error mapping kabupaten:
Edit file `import_perhutanan_sosial_data.js` pada bagian mapping jika diperlukan.

## LANGKAH 3: Verifikasi Setup Lengkap

### 1. Jalankan test
```bash
node simple_setup_test.js
```

Harus menampilkan:
```
✅ Database connection successful
✅ kabupaten table exists
✅ perhutanan_sosial table exists
✅ profiles table exists
```

### 2. Cek data di Supabase Dashboard
- Buka: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/editor
- Cari tabel `perhutanan_sosial`
- Pastikan ada sekitar 80+ records

## LANGKAH 4: Test Frontend

### 1. Start development server
```bash
npm run dev
```

### 2. Akses aplikasi
- Buka: http://localhost:3000
- Login dengan user:
  - Email: boby@yayasan.com
  - Password: (password yang didaftarkan)

### 3. Navigasi ke dashboard data
- Setelah login, klik menu **"Data"** atau akses langsung:
  - http://localhost:3000/id/dashboard/data

## TROUBLESHOOTING

### Error: "permission denied for table kabupaten"
- **Penyebab**: Tabel ada tapi RLS (Row Level Security) aktif
- **Solusi**: Jalankan setup_database_complete.sql lagi untuk setup RLS policies

### Error: "table does not exist"
- **Penyebab**: Tabel belum dibuat
- **Solusi**: Jalankan setup_database_complete.sql di Supabase SQL Editor

### Data tidak muncul di frontend
- **Penyebab 1**: Database kosong
  - Solusi: Jalankan script import data
  
- **Penyebab 2**: RLS policies mencegah akses
  - Solusi: Pastikan user sudah memiliki profile dengan role yang sesuai
  - Jalankan query di Supabase SQL Editor:
    ```sql
    SELECT * FROM profiles;
    ```

- **Penyebab 3**: Auth user belum dibuat
  - Solusi: Sign up user terlebih dahulu di aplikasi
  - Atau buat user via Supabase Auth

### CSV import error
- **Penyebab**: Format CSV tidak sesuai
- **Solusi**: Cek file `data/perhutanan_sosial_row.csv`
  - Pastikan ada header kolom
  - Pastikan format tanggal sesuai

## VERIFIKASI DATA

### Query manual di Supabase SQL Editor:
```sql
-- Cek jumlah data
SELECT COUNT(*) as total_ps FROM perhutanan_sosial;

-- Cek data per kabupaten
SELECT 
  k.nama as kabupaten,
  COUNT(ps.id) as jumlah_ps,
  SUM(ps.luas_ha) as total_luas
FROM perhutanan_sosial ps
LEFT JOIN kabupaten k ON ps.kabupaten_id = k.id
GROUP BY k.nama
ORDER BY jumlah_ps DESC;

-- Cek user roles
SELECT 
  role,
  COUNT(*) as jumlah_user
FROM profiles
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;
```

## NEXT STEPS

Setelah database setup dan data di-import:

1. **Test semua user roles**: Login dengan user berbeda (admin, monev, viewer)
2. **Test CRUD operations**: Coba tambah/edit/hapus data PS (untuk role admin/monev)
3. **Test filter dan search**: Coba filter data per kabupaten, skema, status
4. **Test export**: Coba export data ke Excel (jika fitur tersedia)
5. **Test dashboard statistics**: Pastikan statistik di dashboard menampilkan data yang benar

## KONTAK BANTUAN

Jika masih ada masalah:

1. Periksa error message di console
2. Cek logs di Supabase Dashboard → Logs
3. Verifikasi env variables di `.env.local`
4. Pastikan service role key valid

File-file penting:
- `setup_database_complete.sql` - SQL setup lengkap
- `import_perhutanan_sosial_data.js` - Import data dari CSV
- `simple_setup_test.js` - Test database connection
- `app/[locale]/dashboard/data/page.tsx` - Halaman dashboard data