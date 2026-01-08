# Diagnostik Koneksi Supabase

## Masalah
Kesulitan mengupdate data dari frontend.

## Langkah Diagnostik

### 1. Test Koneksi
Buka halaman: `/dashboard/test-connection`

Halaman ini akan menjalankan serangkaian test untuk:
- ✅ Environment variables (NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY)
- ✅ Status autentikasi user
- ✅ User profile dan role
- ✅ Permission untuk edit (admin atau monev)
- ✅ Kemampuan SELECT pada tabel `perhutanan_sosial`
- ✅ Kemampuan SELECT pada tabel `lembaga_pengelola`
- ✅ Kemampuan UPDATE pada tabel `perhutanan_sosial`
- ✅ Kemampuan UPSERT pada tabel `lembaga_pengelola`
- ✅ RLS policies

### 2. Periksa Environment Variables
Pastikan file `.env.local` berisi:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Periksa User Role
User harus memiliki role `admin` atau `monev` di tabel `profiles` untuk dapat mengupdate data.

Cek di Supabase Dashboard:
```sql
SELECT id, email, role, full_name 
FROM profiles 
WHERE id = 'user-id-anda';
```

### 4. Periksa RLS Policies
Pastikan RLS policies sudah benar. Cek di Supabase Dashboard:
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('perhutanan_sosial', 'lembaga_pengelola')
ORDER BY tablename, policyname;
```

### 5. Periksa Debug Logs
Jika ada masalah dengan `check_user_role` function, cek debug logs:
```sql
SELECT * FROM debug_log 
ORDER BY timestamp DESC 
LIMIT 20;
```

### 6. Common Issues

#### Issue: "Profile tidak ditemukan"
**Solusi**: Buat profile untuk user:
```sql
INSERT INTO profiles (id, role, full_name)
VALUES ('user-id', 'admin', 'Nama User')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

#### Issue: "Akses ditolak" atau RLS error
**Solusi**: 
1. Pastikan user memiliki role `admin` atau `monev`
2. Pastikan RLS policies sudah benar (migrasi terbaru sudah diterapkan)
3. Cek apakah `check_user_role` function berfungsi:
```sql
SELECT check_user_role(ARRAY['admin', 'monev']);
```

#### Issue: "Cannot read property" atau connection error
**Solusi**:
1. Periksa environment variables
2. Periksa koneksi internet
3. Periksa apakah Supabase project masih aktif
4. Cek browser console untuk error details

### 7. Test Manual Update
Coba update langsung dari Supabase SQL Editor:
```sql
-- Test update (ganti dengan ID yang valid)
UPDATE perhutanan_sosial 
SET pemegang_izin = 'Test Update'
WHERE id = 'some-valid-id';
```

Jika ini berhasil, masalahnya ada di frontend/RLS.
Jika ini gagal, masalahnya ada di database/permissions.

## File yang Telah Diperbaiki

1. **lib/supabase/client.ts** - Ditambahkan error handling untuk environment variables
2. **app/dashboard/test-connection/page.tsx** - Halaman diagnostik baru

## Langkah Selanjutnya

1. Buka `/dashboard/test-connection` dan jalankan test
2. Periksa hasil test untuk mengidentifikasi masalah spesifik
3. Ikuti solusi sesuai dengan issue yang ditemukan
4. Jika masih ada masalah, periksa:
   - Browser console untuk error JavaScript
   - Network tab untuk melihat request/response
   - Supabase logs di dashboard

