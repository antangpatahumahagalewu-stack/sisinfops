# PHASE 2 IMPLEMENTATION GUIDE
## Migrasi Database & Integrasi Frontend-Backend

### 📋 **SITUASI SAAT INI**

#### **✅ YANG SUDAH DISIAPKAN:**
1. **Fixed Migration SQL** (`complete_schema_migration_fixed.sql`) - IDEMPOTENT, no trigger errors
2. **Migration Runner** (`run-fixed-migration.js`) - Panduan manual ke Supabase
3. **Verification Tools** (`check-db-status.js`, `check-ps-data.js`)
4. **API Endpoints** - Sudah ada untuk semua modul (Carbon, Finance, Programs, dll)
5. **Frontend Components** - Sudah ada dengan navigation role-based

#### **❌ MASALAH YANG TERDETEKSI:**
1. **Database migration belum dijalankan** - Tabel tidak bisa diakses
2. **Frontend tidak menampilkan data PS** - Karena tabel kosong/tidak ada
3. **Role integration belum optimal** - Karena migration belum membuat role_permissions

---

## 🚀 **LANGKAH EKSEKUSI PRIORITAS**

### **STEP 1: JALANKAN DATABASE MIGRATION (KRITIS)**

```bash
# Jalankan migration guide
node run-fixed-migration.js
```

**Pilih Option 1 (Manual) dan ikuti instruksi:**

1. **Buka Supabase SQL Editor:**
   - URL: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql
   - Login dengan akun Supabase Anda

2. **Copy SQL:**
   ```bash
   # Tampilkan isi SQL untuk copy-paste
   cat complete_schema_migration_fixed.sql
   ```
   Atau buka file di editor teks.

3. **Paste & Execute:**
   - Paste seluruh konten SQL ke SQL Editor
   - Klik tombol **"RUN"**
   - Tunggu 30-60 detik

4. **Verifikasi Success:**
   Cari pesan ini di output:
   ```
   ✅ Complete Phase 2 Database Migration Successful! (Fixed - No Trigger Errors)
   ```

---

### **STEP 2: VERIFIKASI MIGRATION**

```bash
# Test dengan service role (bypass RLS)
node check-db-status.js

# Test dengan anon key (public access)
node check-ps-data.js
```

**Expected Output:**
- ✅ Tabel `kabupaten`: 5 rows (Kabupaten Katingan, Kapuas, dll)
- ✅ Tabel `perhutanan_sosial`: 2+ rows (sample data)
- ✅ Tabel `role_permissions`: 14 roles (admin, monev, finance_*, dll)
- ✅ Public access working untuk `kabupaten` dan `perhutanan_sosial`

---

### **STEP 3: ANALISIS API ENDPOINTS**

#### **API YANG SUDAH ADA & STATUS:**

| Endpoint | Module | Status | Action Needed |
|----------|--------|--------|---------------|
| `/api/ps` | Perhutanan Sosial | ✅ **READY** | Compatible dengan schema baru |
| `/api/ps/list` | PS Listing | ✅ **READY** | Compatible dengan schema baru |
| `/api/carbon-projects` | Carbon Projects | ⚠️ **PLACEHOLDER** | Update untuk schema baru |
| `/api/finance/*` | Finance Module | ⚠️ **NEEDS CHECK** | Verifikasi kolom tabel |
| `/api/programs` | Program Management | ⚠️ **NEEDS CHECK** | Verifikasi kolom tabel |
| `/api/dashboard/*` | Dashboard Stats | ⚠️ **NEEDS CHECK** | Update queries |

---

### **STEP 4: UPDATE API ENDPOINTS (jika diperlukan)**

#### **Carbon Projects API Example:**
File: `app/api/carbon-projects/route.ts`

**PERUBAHAN YANG DIBUTUHKAN:**
```typescript
// FROM (old schema):
const { data: carbonProjects, error: carbonError } = await supabase
  .from("carbon_projects")
  .select("id, kode_project, nama_project, status, luas_total_ha")

// TO (new schema):
const { data: carbonProjects, error: carbonError } = await supabase
  .from("carbon_projects")
  .select("id, project_code, project_name, validation_status, estimated_credits")
```

#### **Kolom Mapping (Old → New):**
| Old Column | New Column | Notes |
|------------|------------|-------|
| `kode_project` | `project_code` | Sama |
| `nama_project` | `project_name` | Sama |
| `status` | `validation_status` | "draft", "validated", dll |
| `luas_total_ha` | (Tidak ada langsung) | Gunakan `ps.luas_ha` via join |
| `estimasi_penyimpanan_karbon` | `estimated_credits` | Dalam ton CO2 |

---

### **STEP 5: UPDATE FRONTEND QUERIES**

#### **Lokasi Komponen Penting:**
1. **Dashboard Stats**: `app/page.tsx`, `components/dashboard/`
2. **PS Management**: `components/ps/`
3. **Carbon Module**: `components/carbon/`
4. **Finance Module**: `components/finance/`

#### **Example Query Update:**
```typescript
// OLD (mungkin masih menggunakan schema lama):
const { data: ps } = await supabase
  .from('perhutanan_sosial')
  .select('id, pemegang_izin, luas_ha, jumlah_kk')
  .eq('status', 'active')

// NEW (schema sudah compatible - tidak perlu perubahan):
const { data: ps } = await supabase
  .from('perhutanan_sosial')
  .select('id, pemegang_izin, luas_ha, jumlah_kk, skema, kabupaten_id')
```

---

### **STEP 6: IMPLEMENT ROLE-BASED ACCESS**

#### **Role Configuration (Sudah di SQL Migration):**
1. **admin**: Full access semua modul
2. **monev**: PS data, potensi, kabupaten (read/edit)
3. **finance_manager**: Semua modul keuangan
4. **program_planner**: Program management
5. **carbon_specialist**: Carbon projects

#### **Frontend Implementation:**
File: `lib/auth/rbac.ts`

```typescript
// Contoh role checking:
import { getCurrentUserRole } from '@/lib/auth/rbac'

export async function canAccessCarbonModule() {
  const role = await getCurrentUserRole()
  return ['admin', 'carbon_specialist', 'finance_project_carbon'].includes(role)
}
```

---

## 🎯 **SARAN KRITIS & REKOMENDASI**

### **1. PRIORITAS TINGGI:**
- **Jalankan migration SQL SEKARANG** - Tanpa ini, semua komponen tidak berfungsi
- **Test dashboard setelah migration** - Pastikan PS data muncul
- **Verifikasi user role assignments** - Login dengan admin credentials

### **2. STRATEGI MIGRATION BERJALAN:**
- **Phase 1**: Jalankan migration, test core tables (kabupaten, perhutanan_sosial)
- **Phase 2**: Update API endpoints yang broken (carbon-projects, finance)
- **Phase 3**: Test semua modul dengan data dummy
- **Phase 4**: Import data real via Excel upload

### **3. RISK MITIGATION:**
- **Backup database** sebelum migration via Supabase Dashboard
- **SQL transactional** - Rollback otomatis jika error
- **Idempotent** - Bisa dijalankan ulang tanpa efek samping

### **4. TESTING CHECKLIST:**
- [ ] Database migration success
- [ ] Public read access untuk kabupaten & PS data
- [ ] Login dengan role admin
- [ ] Dashboard menampilkan PS data
- [ ] Role-based navigation bekerja
- [ ] Carbon module accessible (jika role sesuai)
- [ ] Finance module accessible (jika role sesuai)

---

## 🔧 **TROUBLESHOOTING**

### **Jika migration gagal:**
1. **Error "permission denied"**: Pastikan menggunakan Service Role di .env.local
2. **Error "table already exists"**: SQL sudah idempotent, bisa dijalankan ulang
3. **Error "trigger already exists"**: SQL sudah handle dengan DROP TRIGGER IF EXISTS

### **Jika frontend masih tidak menampilkan data:**
1. **Check RLS policies**: `check-db-status.js` akan menunjukkan status
2. **Check API responses**: Gunakan browser DevTools → Network tab
3. **Check Supabase logs**: Dashboard Supabase → Logs

### **Jika role tidak bekerja:**
1. **Check profiles table**: Pastikan user memiliki role di kolom `role`
2. **Check role_permissions table**: Pastikan 14 roles terdaftar
3. **Check RLS policies**: Policies sudah menggunakan role checking

---

## 📞 **SUPPORT & NEXT STEPS**

### **Setelah migration success:**
1. **Update saya** dengan hasil `check-db-status.js`
2. **Test frontend** dan laporkan modul mana yang masih bermasalah
3. **Kita akan update** API endpoints yang perlu penyesuaian

### **Timeline Estimasi:**
- **Hari 1**: Migration + Core testing (2-3 jam)
- **Hari 2**: API updates + Module testing (4-6 jam)
- **Hari 3**: Role implementation + Final testing (3-4 jam)

---

**🚀 ACTION ITEM #1: Jalankan migration SQL di Supabase Editor SEKARANG!**