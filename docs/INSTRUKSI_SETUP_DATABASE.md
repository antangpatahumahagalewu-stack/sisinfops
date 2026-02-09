# INSTRUKSI SETUP DATABASE DAN ROLE-BASED ACCESS CONTROL

## Status Saat Ini:
✅ Environment variables sudah terkonfigurasi di `.env.local`
❌ Tabel database belum ada atau tidak dapat diakses
❌ RLS (Row Level Security) belum diimplementasikan
❌ Role dan permission belum terhubung dengan baik

## SOLUSI: Jalankan SQL Setup Lengkap

### Langkah 1: Akses Supabase SQL Editor
1. Buka: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql
2. Login dengan akun Supabase Anda
3. Pastikan Anda berada di project yang benar: `rrvhekjdhdhtkmswjgwk`

### Langkah 2: Jalankan SQL Setup Lengkap
1. Copy seluruh isi file `setup_database_complete.sql`
2. Paste ke SQL Editor di Supabase
3. Klik tombol **RUN** atau **Execute**

### Langkah 3: Verifikasi Hasil
Setelah SQL berhasil dijalankan, Anda akan melihat output dengan informasi:
- ✅ Tabel yang dibuat: `kabupaten`, `perhutanan_sosial`, `potensi`, `profiles`, `role_permissions`
- ✅ RLS Policies di-enable untuk semua tabel
- ✅ 14 role di-insert ke `role_permissions`
- ✅ User yang ada di-assign role otomatis

### Langkah 4: Test Database Connection
Jalankan script verifikasi:
```bash
cd /home/sangumang/Documents/sisinfops
node check_simple_tables.js
```

Expected output:
```
✅ kabupaten: exists (5 rows)
✅ perhutanan_sosial: exists (0 rows)
✅ potensi: exists (0 rows)
✅ profiles: exists (X rows)
✅ role_permissions: exists (14 rows)
```

## Fitur yang Diimplementasikan:

### 1. **Database Schema Lengkap**
- `kabupaten` - Data kabupaten/regency
- `perhutanan_sosial` - Data PS dengan semua field
- `potensi` - Data potensi area
- `profiles` - User profiles dengan role
- `role_permissions` - Definisi permission untuk 14 role

### 2. **14 Role yang Diimplementasikan**
#### Core Roles (6):
1. `admin` - Full access semua fitur
2. `monev` - Monitoring & Evaluasi
3. `viewer` - Read-only access
4. `program_planner` - Perencanaan program
5. `program_implementer` - Implementasi program
6. `carbon_specialist` - Proyek karbon

#### Finance Roles (8):
7. `finance_manager` - Manajer keuangan
8. `finance_operational` - Operasional keuangan
9. `finance_project_carbon` - Keuangan proyek karbon
10. `finance_project_implementation` - Keuangan implementasi
11. `finance_project_social` - Keuangan program sosial
12. `investor` - Investor (read-only laporan)

### 3. **Row Level Security (RLS) Policies**
- `kabupaten`: Public read, Admin full access
- `perhutanan_sosial`: Public read, Admin & Monev write
- `potensi`: Public read, Admin & Monev write
- `profiles`: User bisa lihat/edit sendiri, Admin manage semua
- `role_permissions`: Public read

### 4. **Automatic User Assignment**
User yang ada di `auth.users` akan otomatis:
- Mendapatkan profile di tabel `profiles`
- Di-assign role berdasarkan email:
  - `axel@yayasan.com` → `admin`
  - `amrin@yayasan.com` → `monev`
  - `faris@yayasan.com` → `program_planner`
  - `beben@yayasan.com` → `program_implementer`
  - `ocay@yayasan.com` → `carbon_specialist`
  - `finance@yayasan.com` → `finance_manager`
  - Lainnya → `viewer`

## Testing Setelah Setup:

### Test 1: Verifikasi Database
```bash
node check_simple_tables.js
```

### Test 2: Verifikasi Role RBAC
```bash
node check_user_role.js
```

### Test 3: Test Frontend
1. Jalankan development server:
```bash
npm run dev
```
2. Buka: http://localhost:3000
3. Login dengan credentials:
   - Email: `admin@yayasan.com` / Password: `admin123`
   - Email: `monev@yayasan.com` / Password: `monev123`
   - Email: `viewer@yayasan.com` / Password: `viewer123`

## Troubleshooting:

### Jika "permission denied" masih muncul:
1. Pastikan SQL di Supabase berhasil dijalankan
2. Cek apakah tabel benar-benar terbuat:
```sql
-- Jalankan di Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Jika user tidak muncul di profiles:
1. Pastikan user sudah sign up/login minimal sekali
2. Jalankan SQL untuk create profile manual:
```sql
INSERT INTO profiles (id, role, full_name, created_at, updated_at)
SELECT 
    id,
    'viewer',
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    NOW(),
    NOW()
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.users.id);
```

## Next Steps Setelah Database Setup:

1. **Import Data PS** - Gunakan Excel import feature di frontend
2. **Test Role Access** - Login dengan berbagai role, verifikasi menu yang muncul
3. **Setup Data Sample** - Import file CSV di `data/` folder jika diperlukan
4. **Test API Endpoints** - Pastikan semua endpoint mengembalikan data sesuai role

## File SQL yang Tersedia:

1. `setup_database_complete.sql` - **UTAMA**: Setup lengkap semua tabel + RLS + roles
2. `run_migration_manual.sql` - Migration untuk update role existing users
3. `implement_user_roles.sql` - Implementasi role dengan RLS policies detail
4. `supabase/migrations/` - Migration files untuk future updates

---

**Jika ada masalah, jalankan file `setup_database_complete.sql` di Supabase SQL Editor, lalu test dengan `check_simple_tables.js`.**