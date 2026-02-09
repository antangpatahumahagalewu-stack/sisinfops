# 📋 INVESTOR DASHBOARD MIGRATION GUIDE

## 🎯 **MASALAH YANG DIPERBAIKI**

**Investor Dashboard** (`http://localhost:3000/id/dashboard/investor`) menggunakan **mock data/hardcoded data** sedangkan **Carbon Projects page** (`http://localhost:3000/id/dashboard/carbon-projects`) menggunakan **data real dari database**.

### **INKONSISTENSI:**
| Metric | Carbon Projects (Real) | Investor Dashboard (Dummy) |
|--------|-----------------------|---------------------------|
| Total Projects | Dari database `carbon_projects` | Hardcoded: 3 projects |
| Project Names | Dari `nama_project` | Hardcoded: "Hutan Tropis Kalimantan", dll |
| Status | Dari `status` field | Hardcoded: "ACTIVE", "PLANNING" |
| Financial Data | Tidak ada di carbon_projects | Hardcoded financial summary |

## 🚀 **SOLUSI YANG DIIMPLEMENTASIKAN**

### **1. DATABASE ENHANCEMENT**
Migration script: `supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql`

**Kolom yang ditambahkan ke `carbon_projects`:**
- `investment_amount` DECIMAL(20,2) - Total investasi proyek
- `roi_percentage` DECIMAL(5,2) - Estimasi ROI
- `carbon_sequestration_estimated` DECIMAL(15,2) - Estimasi penyerapan karbon
- `project_period_years` INTEGER DEFAULT 10 - Periode proyek
- `investor_notes` TEXT - Catatan untuk investor
- `performance_rating` VARCHAR(20) - Rating performa
- `last_investor_update` TIMESTAMP - Last update timestamp

**Views yang dibuat:**
- `v_investor_dashboard_data` - Data terintegrasi untuk investor
- `v_investor_dashboard_summary` - Summary metrics
- `mv_investor_performance_metrics` - Materialized view untuk performance

### **2. API ENDPOINT**
`GET /api/investor/dashboard-data`

**Fitur:**
- ✅ Authentication & authorization check
- ✅ Graceful fallback jika views belum ada
- ✅ Multiple data sources:
  - `database_views` - Jika migration sudah dijalankan
  - `database_direct` - Query langsung ke `carbon_projects`
  - `database_basic` - Data basic dengan estimasi
  - `fallback` - Zero data jika semua gagal

### **3. FRONTEND UPDATE**
`components/dashboard/investor-carbon-dashboard.tsx`

**Perbaikan:**
- ✅ Ganti semua mock data dengan API calls
- ✅ Implementasi loading states
- ✅ Error handling dengan migration instructions
- ✅ Real-time data source indicator
- ✅ Refresh functionality

## 📋 **STEP-BY-STEP MIGRATION**

### **STEP 1: JALANKAN MIGRATION SCRIPT**

```sql
-- 1. Buka Supabase Dashboard: https://supabase.com/dashboard
-- 2. Pilih project Anda
-- 3. Buka SQL Editor
-- 4. Copy seluruh konten dari file:
--    supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql
-- 5. Paste dan klik "Run"
```

### **STEP 2: VERIFIKASI MIGRATION**

Setelah migration selesai, verifikasi dengan query berikut:

```sql
-- Cek apakah kolom sudah ditambahkan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'carbon_projects' 
AND column_name IN ('investment_amount', 'roi_percentage', 'carbon_sequestration_estimated');

-- Cek apakah views sudah dibuat
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name IN ('v_investor_dashboard_data', 'v_investor_dashboard_summary', 'mv_investor_performance_metrics');
```

### **STEP 3: TEST API ENDPOINT**

```bash
# Test API dengan fallback mode
curl "http://localhost:3000/api/investor/dashboard-data?fallback=true"

# Test API normal (butuh authentication)
# Buka browser: http://localhost:3000/id/dashboard/investor
```

### **STEP 4: VERIFIKASI FRONTEND**

1. **Buka** `http://localhost:3000/id/dashboard/investor`
2. **Periksa** data source indicator di header:
   - ✅ `database_views` - Migration berhasil
   - ✅ `database_direct` - Views belum ada, tapi data real
   - ✅ `database_basic` - Basic data dengan estimasi
   - ⚠️ `fallback` - Migration required

3. **Bandingkan** dengan `http://localhost:3000/id/dashboard/carbon-projects`
   - Data harus konsisten antara kedua halaman
   - Tidak ada lagi mock data

## 🔧 **TROUBLESHOOTING**

### **Error 500: Internal Server Error**
**Penyebab:** API mencoba mengakses views yang belum ada
**Solusi:** Jalankan migration script terlebih dahulu

### **Error 401: Unauthorized**
**Penyebab:** User tidak login atau tidak punya akses
**Solusi:** Login dengan role yang sesuai (admin, carbon_specialist, program_planner, investor)

### **Data Masih Kosong**
**Penyebab:** Tidak ada data di tabel `carbon_projects`
**Solusi:** Tambah sample data atau impor data carbon projects

### **Views Tidak Ditemukan**
**Penyebab:** Migration gagal atau belum dijalankan
**Solusi:** 
1. Cek error log di Supabase
2. Jalankan migration ulang
3. Pastikan user punya permission untuk create views

## 🎯 **HASIL YANG DIHARAPKAN**

Setelah migration berhasil:

### **✅ INVESTOR DASHBOARD**
- Menampilkan **data real** dari database
- **Sinkron sempurna** dengan Carbon Projects page
- **Real-time updates** - Perubahan langsung terlihat
- **Tidak ada mock data** - 100% data real

### **✅ DATA CONSISTENCY**
- Carbon Projects page ↔ Investor Dashboard = **DATA SAMA**
- Semua metrics berdasarkan **database records**
- Financial data terintegrasi (jika ada)

### **✅ PERFORMANCE**
- Materialized views untuk fast queries
- Caching mechanism di API
- Optimized queries dengan indexes

## 📊 **DATA FLOW ARCHITECTURE**

```
carbon_projects (table)
        ↓
v_investor_dashboard_data (view)
        ↓
GET /api/investor/dashboard-data
        ↓
InvestorCarbonDashboard (component)
        ↓
http://localhost:3000/id/dashboard/investor
```

## 🚨 **EMERGENCY FALLBACK**

Jika migration tidak bisa dijalankan segera, sistem memiliki **4-layer fallback**:

1. **Layer 1:** Database views (optimal)
2. **Layer 2:** Direct queries ke `carbon_projects`
3. **Layer 3:** Basic data dengan estimasi
4. **Layer 4:** Zero data dengan migration instructions

## 📞 **SUPPORT**

Jika ada masalah:
1. Cek error log di browser console
2. Cek API response di Network tab
3. Verifikasi database connection
4. Pastikan migration script berhasil dijalankan

**Migration script:** `supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql`
**API endpoint:** `GET /api/investor/dashboard-data`
**Frontend:** `components/dashboard/investor-carbon-dashboard.tsx`

---

**Status:** ✅ **IMPLEMENTATION COMPLETE**
**Next Step:** Jalankan migration script di Supabase SQL Editor