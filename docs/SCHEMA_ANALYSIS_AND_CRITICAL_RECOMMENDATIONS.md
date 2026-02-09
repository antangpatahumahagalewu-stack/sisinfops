# ANALISIS SCHEMA DATABASE & REKOMENDASI KRITIS

## 🎯 STATUS SAAT INI

### ✅ **YANG SUDAH BERHASIL**
1. **Database Schema Lengkap** - 22 tabel Phase 1 & 2 sudah tercreate
2. **Data Sample Tersedia** - 92 PS records, 5 kabupaten, 13 roles
3. **RLS Temporarily Disabled** - Untuk testing cepat
4. **Migration Scripts Ready** - Semua SQL fix sudah tersedia

### ❌ **MASALAH UTAMA TERIDENTIFIKASI**

## 🔴 **MASALAH KRITIS #1: API CONNECTIVITY BLOCKED**

**Gejala**: 
- Anon key & service role key menghasilkan error "permission denied for table kabupaten" (401/403)
- REST API blocked meski RLS sudah disabled

**Root Cause**:
1. **Anon Key Expired/Invalid** - Kemungkinan besar keys di `.env.local` sudah expired
2. **Project Configuration Issue** - Supabase project mungkin perlu reconfiguration
3. **Network/CORS Issues** - Konfigurasi network di Supabase dashboard

**Solution**:
```bash
# IMMEDIATE FIX (Testing):
1. Buka Supabase Dashboard → Authentication → URL & Keys
2. Regenerate anon key dan service role key  
3. Update .env.local dengan keys baru
4. Test dengan: node check-ps-data.js

# QUICK WORKAROUND (Development only):
# Ganti sementara NEXT_PUBLIC_SUPABASE_ANON_KEY dengan SUPABASE_SERVICE_ROLE_KEY
# Hanya untuk testing - JANGAN deploy ke production
```

## 🔴 **MASALAH KRITIS #2: SCHEMA MISMATCH**

**Analisis dari Schema yang Diberikan**:

### **1. Role Constraints Tidak Lengkap**
```sql
-- Di schema yang ada (hanya 12 roles):
role character varying CHECK (role::text = ANY (ARRAY[
  'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 
  'carbon_specialist', 'finance_manager', 'finance_operational', 
  'finance_project_carbon', 'finance_project_implementation', 
  'finance_project_social', 'investor'::character varying]::text[]))

-- Di migration kita (14 roles):
-- Missing: 'finance_project_social' dan 'investor' tidak ada di CHECK constraint
-- Tapi di role_permissions kita punya 13 roles termasuk finance_project_social dan investor
```

**Impact**: User dengan role 'finance_project_social' atau 'investor' tidak bisa disimpan di profiles table.

**Fix**:
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role::text IN (
    'admin', 'monev', 'viewer', 'program_planner', 'program_implementer',
    'carbon_specialist', 'finance_manager', 'finance_operational',
    'finance_project_carbon', 'finance_project_implementation', 
    'finance_project_social', 'investor'
  ));
```

### **2. Foreign Key Naming Inconsistency**
- `perhutanan_sosial.kabupaten_fk` vs `potensi.kabupaten_fk` (konsisten)
- Tapi di beberapa table lain menggunakan `_fkey` suffix

### **3. Missing Indexes untuk Performance**
- Tidak ada indexes di schema yang diberikan
- Migration kita sudah membuat indexes tapi mungkin tidak terapply

## 🔴 **MASALAH KRITIS #3: FRONTEND INTEGRATION**

### **Table Name Mismatch**:
- **Old schema mungkin**: `ps_data` 
- **New schema**: `perhutanan_sosial`

**Check yang perlu dilakukan**:
```bash
# Cari semua references ke table lama
grep -r "ps_data" app/ components/ --include="*.ts" --include="*.tsx"
grep -r "from ps_data" . --include="*.ts" --include="*.tsx"
```

### **API Endpoints Update**:
Semua API endpoints perlu diupdate untuk:
1. Gunakan `perhutanan_sosial` bukan `ps_data`
2. Gunakan `potensi` bukan `potentials` (jika ada)
3. Update query filters sesuai schema baru

## 🔴 **MASALAH KRITIS #4: ROLE-BASED ACCESS CONTROL (RBAC)**

### **Current State**:
- `role_permissions` table ada dengan 13 roles
- Tapi `profiles.role` CHECK constraint hanya support 12 roles
- Frontend components perlu diupdate untuk 14 roles baru

### **Missing Integration**:
1. **Frontend Navigation**: Menu harus filter berdasarkan role permissions
2. **API Middleware**: Check role permissions sebelum akses data
3. **UI Components**: Show/hide components berdasarkan role

## 🚀 **REKOMENDASI ACTION PLAN**

### **PHASE 1: IMMEDIATE FIXES (Hari ini)**
1. **✅ Regenerate Supabase Keys** - Dashboard → Authentication → URL & Keys
2. **✅ Fix Role Constraint** - Jalankan SQL fix di atas
3. **✅ Test API Connectivity** - `node check-ps-data.js` harus work
4. **✅ Start Frontend** - `npm run dev` dan test dashboard

### **PHASE 2: SCHEMA VALIDATION (Hari ini)**
1. **Verify All Tables Exist** - Bandingkan 22 tabel migration vs schema yang ada
2. **Check Data Consistency** - Pastikan foreign key relationships valid
3. **Apply Missing Indexes** - Jalankan index creation dari migration

### **PHASE 3: FRONTEND UPDATE (1-2 hari)**
1. **Update All Queries** - Ganti `ps_data` → `perhutanan_sosial`
2. **Implement RBAC Frontend** - Gunakan `role_permissions` untuk UI control
3. **Test All Features** - Dashboard, filters, excel upload, dll

### **PHASE 4: PRODUCTION READINESS (2-3 hari)**
1. **Enable RLS dengan Policies** - Jalankan `fix_recursion.sql`
2. **Import Real Data** - Gunakan Excel upload atau script import
3. **Performance Testing** - Test dengan data volume tinggi
4. **Security Audit** - Review semua RLS policies

## 📋 **DETAILED SQL FIXES**

### **1. Fix Role Constraint**:
```sql
-- Drop existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add complete constraint (14 roles)
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role::text IN (
    'admin', 'monev', 'viewer', 'program_planner', 'program_implementer',
    'carbon_specialist', 'finance_manager', 'finance_operational',
    'finance_project_carbon', 'finance_project_implementation', 
    'finance_project_social', 'investor',
    'finance_project_social', 'investor'  -- Duplicate, perlu dihapus salah satu
  ));

-- Versi yang benar (12 roles sesuai constraint di schema):
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role::text IN (
    'admin', 'monev', 'viewer', 'program_planner', 'program_implementer',
    'carbon_specialist', 'finance_manager', 'finance_operational',
    'finance_project_carbon', 'finance_project_implementation', 
    'finance_project_social', 'investor'
  ));
```

### **2. Create Missing Indexes**:
```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_kabupaten_id ON perhutanan_sosial(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_skema ON perhutanan_sosial(skema);
CREATE INDEX IF NOT EXISTS idx_potensi_kabupaten_id ON potensi(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_carbon_projects_status ON carbon_projects(validation_status);
```

### **3. Enable RLS dengan Policies Fix**:
```sql
-- Enable RLS
ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE perhutanan_sosial ENABLE ROW LEVEL SECURITY;
-- ... semua tabel lainnya

-- Jalankan fix_recursion.sql untuk recreate policies
```

## 🎯 **PRIORITAS BERDASARKAN IMPACT**

### **HIGH PRIORITY (Blocking)**
1. ✅ API Connectivity - Tanpa ini, frontend tidak bisa apa-apa
2. ✅ Role Constraint Fix - User dengan role tertentu tidak bisa login
3. ✅ Frontend Queries Update - Data tidak muncul di dashboard

### **MEDIUM PRIORITY (Important)**
1. RBAC Implementation - Security dan user experience
2. Performance Indexes - Scalability
3. Data Import - Real data untuk testing

### **LOW PRIORITY (Nice to have)**
1. Schema Naming Consistency
2. Advanced RLS Policies
3. Audit Trail Enhancement

## 📞 **SUPPORT & TROUBLESHOOTING**

### **Jika API masih blocked setelah regenerate keys**:
1. Check Supabase Project Status - Dashboard → Project Settings
2. Verify Network Configuration - Allowed origins, CORS settings
3. Test dengan curl langsung:
```bash
curl -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  "https://rrvhekjdhdhtkmswjgwk.supabase.co/rest/v1/kabupaten?select=id,nama&limit=1"
```

### **Jika frontend masih tidak show data**:
1. Check Browser Console untuk error details
2. Verify .env.local values match dashboard
3. Test dengan service role key sementara (development only)

## ✅ **SUCCESS CRITERIA**

1. **Frontend Dashboard** - Menampilkan 92 PS records
2. **Role-based Navigation** - Menu berbeda untuk admin, monev, viewer, dll
3. **API Endpoints Working** - Semua CRUD operations work
4. **Excel Upload** - Bisa import data ke `perhutanan_sosial`
5. **Performance** - Page load < 2 seconds dengan 100+ records

---

**ESTIMATED TIMELINE**: 3-5 hari untuk full integration
**RISK LEVEL**: MEDIUM (tergantung complexity frontend changes)
**SUCCESS PROBABILITY**: HIGH (database migration sudah complete, tinggal integration)

**NEXT ACTION**: Regenerate Supabase keys dan test API connectivity!