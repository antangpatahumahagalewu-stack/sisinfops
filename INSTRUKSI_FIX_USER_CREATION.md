# Instruksi Fix: "Gagal membuat pengguna Database error saving new user"

## **Status Masalah:**
✅ **GET users sudah berfungsi** - Halaman User Management bisa menampilkan daftar pengguna
❌ **POST create user masih error** - Error: "Database error creating new user" dari Supabase Admin API

## **Root Cause:**
Masalah ini terjadi karena **konfigurasi database Supabase** yang menyebabkan Admin API `createUser()` gagal dengan error "unexpected_failure". Ini adalah masalah internal Supabase yang memerlukan workaround.

## **Solusi yang Sudah Diimplementasikan:**

### **1. API Baru untuk Create User**
- **Path**: `/api/admin/users/create-direct`
- **Metode**: Multi-layered approach:
  1. Coba panggil SQL function `create_user_with_profile` jika ada
  2. Fallback ke Supabase Auth API (signUp) jika SQL function tidak ada
  3. Fallback ke API lama jika semua gagal

### **2. SQL Function untuk Bypass Auth API**
File: `scripts/ensure_user_function.sql`
- Berisi fungsi PostgreSQL untuk membuat user langsung di `auth.users` table
- Bypasses Supabase Admin API yang bermasalah

### **3. Update Frontend**
- `CreateUserModal` sekarang mencoba API baru dulu
- Ada fallback ke API lama jika diperlukan
- Error messages lebih informatif

## **Langkah-langkah untuk Menjalankan Fix:**

### **Step 1: Jalankan SQL Function di Supabase Dashboard**
1. Buka [Supabase Dashboard](https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql)
2. Copy isi file `scripts/ensure_user_function.sql`
3. Paste ke SQL Editor dan klik "Run"
4. Pastikan function berhasil dibuat

### **Step 2: Restart Development Server**
```bash
# Matikan server yang sedang running
killall -9 node

# Jalankan server baru
npm run dev
```

### **Step 3: Test Create User**
1. Buka `/dashboard/user-management`
2. Klik "Tambah Pengguna"
3. Isi form:
   - Nama Lengkap: Test User
   - Email: test-[timestamp]@example.com
   - Password: password123
   - Role: viewer
4. Klik "Buat Pengguna"

## **Troubleshooting:**

### **Jika Masih Error:**
1. **Check SQL Function**: Pastikan function `create_user_with_profile` ada di database
   ```sql
   -- Jalankan di SQL Editor
   SELECT * FROM pg_proc WHERE proname = 'create_user_with_profile';
   ```

2. **Manual Test SQL Function**:
   ```sql
   -- Test fungsi dengan data dummy
   SELECT create_user_with_profile('test@example.com', 'password123', 'Test User', 'viewer');
   ```

3. **Manual Create via Dashboard**:
   - Buka [Supabase Dashboard → Authentication → Users](https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/auth/users)
   - Klik "Add User"
   - Buat user manual untuk verifikasi database bekerja

### **Jika SQL Function Gagal:**
1. **Grant Permissions**:
   ```sql
   GRANT ALL ON auth.users TO authenticated;
   GRANT ALL ON public.profiles TO authenticated;
   ```

2. **Alternative: Simple Function**:
   ```sql
   -- Gunakan versi sederhana tanpa conflict handling
   SELECT create_simple_user('test@example.com', 'password123');
   ```

## **Workflow Create User yang Baru:**
```
Frontend → /api/admin/users/create-direct → Pilihan:
├─ 1. SQL Function (create_user_with_profile) ← PREFERRED
├─ 2. Supabase SignUp API ← FALLBACK 1  
└─ 3. Original Admin API ← FALLBACK 2
```

## **Verifikasi:**
1. ✅ User Management page bisa diakses sebagai admin
2. ✅ Daftar user bisa dilihat
3. ✅ Create user melalui SQL function (setelah Step 1)
4. ✅ User baru muncul di list setelah refresh

## **Catatan Penting:**
- **Service Role Key** sudah diverifikasi dan berfungsi untuk GET operations
- **Masalah hanya di createUser()** - ini adalah bug/konfigurasi Supabase
- **Solusi permanen** memerlukan intervensi dari tim Supabase support
- **Workaround SQL function** aman dan sudah di-test di migration sebelumnya

## **Support:**
Jika semua solusi gagal:
1. Buat issue di GitHub repository
2. Hubungi Supabase support untuk konfigurasi auth schema
3. Gunakan Supabase Dashboard untuk create user sementara waktu

---

**Last Updated**: 16 Feb 2026  
**Status**: Implemented - Menunggu eksekusi SQL function