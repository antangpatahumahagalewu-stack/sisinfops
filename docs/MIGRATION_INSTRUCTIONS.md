# INSTRUKSI MIGRATION INVESTOR DASHBOARD

## STATUS SAAT INI
✅ **4 Project Karbon telah berhasil dibuat** di database dengan data real PS:
1. Gunung Mas Forest Carbon Project (35 Unit PS • 72.800,99 Ha)
2. Kapuas Basin Carbon Initiative (25 Unit PS • 56.771 Ha)
3. Katingan Tropical Carbon Program (15 Unit PS • 29.239 Ha)
4. Pulang Pisau Peatland Carbon Project (17 Unit PS • 27.876 Ha)

## MASALAH YANG PERLU DIPERBAIKI
❌ **Investor Dashboard masih menggunakan mock data** karena:
1. Tabel `carbon_projects` belum memiliki kolom investor
2. View untuk investor dashboard belum dibuat
3. Data investor belum diisi

## SOLUSI: JALANKAN MIGRATION SQL

### LANGKAH 1: Buka Supabase Dashboard
1. Buka https://supabase.com/dashboard
2. Login dengan akun Anda
3. Pilih project: **saelrsljpneclsbfdxfy**

### LANGKAH 2: Buka SQL Editor
1. Klik menu **SQL Editor** di sidebar kiri
2. Klik **New query**

### LANGKAH 3: Jalankan Migration SQL (VERSI DIPERBAIKI)
1. Copy seluruh isi file: `supabase/migrations/202602100729_fix_investor_dashboard_corrected.sql`
2. Paste ke SQL Editor
3. Klik tombol **Run**

**CATATAN PENTING:** Migration sebelumnya gagal karena menggunakan kolom yang tidak ada. 
Migration yang diperbaiki ini menggunakan struktur tabel yang sebenarnya.

### LANGKAH 4: Verifikasi Migration
Setelah migration berhasil, Anda akan melihat:
- ✅ Kolom investor ditambahkan ke tabel `carbon_projects`
- ✅ View `v_investor_dashboard_data` dibuat
- ✅ View `v_investor_dashboard_summary` dibuat
- ✅ Data investor diisi untuk semua project

## LANGKAH SETELAH MIGRATION

### 1. Update Data Investor
Jalankan script untuk mengupdate data investor:
```bash
python3 update_investor_data.py
```

### 2. Verifikasi Dashboard
Jalankan script verifikasi:
```bash
python3 verify_investor_dashboard.py
```

### 3. Cek Investor Dashboard
Buka: http://localhost:3000/id/dashboard/investor

Dashboard sekarang harus menampilkan:
- ✅ **Data source**: `database_views` atau `database_direct` (bukan `fallback`)
- ✅ **4 project karbon** dengan data real
- ✅ **Investment amounts** (Rp)
- ✅ **ROI percentages** (%)
- ✅ **Carbon sequestration estimates** (tons)

## TROUBLESHOOTING

### Jika migration gagal:
1. **Error "column already exists"**: Abaikan, kolom sudah ada
2. **Error "view already exists"**: Abaikan, view sudah ada
3. **Error "permission denied"**: Pastikan menggunakan service role key

### Jika dashboard masih mock data:
1. Cek apakah migration benar-benar dijalankan
2. Refresh halaman browser (Ctrl+F5)
3. Cek console browser untuk error
4. Jalankan script verifikasi untuk debug

## SQL MIGRATION YANG AKAN DIJALANKAN

Migration akan:
1. **Tambahkan kolom investor** ke `carbon_projects`:
   - `investment_amount` DECIMAL(20,2)
   - `roi_percentage` DECIMAL(5,2)
   - `carbon_sequestration_estimated` DECIMAL(15,2)
   - `project_period_years` INTEGER
   - `investor_notes` TEXT
   - `performance_rating` VARCHAR(20)
   - `last_investor_update` TIMESTAMP

2. **Buat view untuk investor dashboard**:
   - `v_investor_dashboard_data` - data lengkap project
   - `v_investor_dashboard_summary` - ringkasan metrics
   - `mv_investor_performance_metrics` - materialized view

3. **Isi data investor** untuk semua project yang ada

## KONTAK
Jika ada masalah, cek file `INVESTOR_DASHBOARD_FIX_README.md` untuk detail teknis.