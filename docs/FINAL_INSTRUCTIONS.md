# FINAL INSTRUCTIONS: Database Refactoring
## **USER ACTION REQUIRED**

## **🚨 STATUS SAAT INI**
- ✅ **Preparation complete**: Semua script SQL sudah dibuat
- ❌ **Database belum di-cleanup**: Tabel lain masih ada di Supabase
- ❌ **Cleanup belum dijalankan**: Script SQL belum di-run

## **🔧 LANGKAH EKSEKUSI (HARUS DIJALANKAN)**

### **STEP 1: Backup Data** *(Run di Supabase SQL Editor)*
1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy/paste **seluruh isi** file `backup_simple_tables.sql`
3. Klik **RUN**
4. Verifikasi: `SELECT COUNT(*) FROM backup_20260129.profiles;`

### **STEP 2: Check Current Tables** *(Optional, untuk verifikasi)*
1. Copy/paste **seluruh isi** file `check_remaining_tables.sql`
2. Klik **RUN**
3. Lihat tabel apa saja yang masih ada

### **STEP 3: Drop All Non-Essential Tables** *(RUN INI)*
1. Copy/paste **seluruh isi** file `drop_all_non_essential.sql`
2. Klik **RUN**
3. Ini akan menghapus ~40+ tabel (financial, carbon, audit, dll)
4. **WARNING**: Tables akan dihapus PERMANEN

### **STEP 4: Simplify Remaining Tables** *(RUN INI)*
1. Copy/paste **seluruh isi** file `simplify_remaining_tables.sql`
2. Klik **RUN**
3. Atau gunakan: `supabase/migrations/20260129_simple_schema.sql`

## **📋 FILE SQL YANG HARUS DI-RUN (URUTAN)**

1. **`backup_simple_tables.sql`** → Backup data
2. **`drop_all_non_essential.sql`** → Hapus tabel non-esensial  
3. **`simplify_remaining_tables.sql`** → Sederhanakan tabel tersisa

**ATAU** gunakan migration file yang sudah dibuat:
- `supabase/migrations/20260129_simple_schema.sql`

## **🔄 SETELAH SQL DIJALANKAN**

### **Restart Application Server**
```bash
cd /home/sangumang/Documents/sisinfops
pkill -f "next.*dev" 2>/dev/null
rm -rf .next
npm run dev
```

### **Test Basic Functionality**
1. Clear browser cache (Ctrl+Shift+Del)
2. Logout dan login kembali
3. Test akses: `http://localhost:3000/id/dashboard/ps`
4. Test create PS data (hanya admin)

## **📊 HASIL YANG DIHARAPKAN**

Setelah cleanup, database hanya akan memiliki **4-5 tabel**:

1. **`profiles`** - User profiles (role: admin, finance, viewer)
2. **`role_permissions`** - Simple JSON permissions  
3. **`perhutanan_sosial`** - PS data (core business)
4. **`kabupaten`** - Reference data
5. **`user_roles`** - Optional (jika ada)

## **⚠️ PERINGATAN PENTING**

### **API yang akan BROKEN:**
- `/api/finance/**` - Semua API finance
- `/api/carbon-projects/**` - Carbon projects  
- `/api/dashboard/carbon-stats/**` - Dashboard stats
- `/api/potensi/**` - Potensi management
- `/api/activity-logs/**` - Activity logs

### **Fitur yang akan HILANG:**
- Financial dashboard
- Carbon project management  
- Advanced reporting
- Audit logs
- Complex permission system

## **🛠️ PERLU UPDATE APLIKASI**

Setelah refactoring, Anda perlu:
1. **Update/disable API routes** yang mengakses tabel yang dihapus
2. **Update frontend** untuk hide fitur yang tidak tersedia
3. **Simplify permission logic** di kode

## **🧪 VERIFIKASI**

Jalankan perintah ini di Supabase SQL Editor setelah cleanup:
```sql
-- Cek tabel yang tersisa
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Cek RLS policies
SELECT * FROM pg_policies ORDER BY tablename, policyname;

-- Cek data
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as ps_count FROM perhutanan_sosial;
SELECT COUNT(*) as kabupaten_count FROM kabupaten;
```

## **📞 TROUBLESHOOTING**

### **Jika ada error foreign key constraint:**
```sql
-- Drop dengan CASCADE manual
DROP TABLE IF EXISTS nama_tabel CASCADE;
```

### **Jika tabel tidak bisa di-drop:**
```sql
-- Nonaktifkan RLS dulu
ALTER TABLE nama_tabel DISABLE ROW LEVEL SECURITY;
-- Kemudian drop
DROP TABLE IF EXISTS nama_tabel CASCADE;
```

### **Rollback jika perlu:**
```sql
-- Restore dari backup
DROP TABLE IF EXISTS profiles;
CREATE TABLE profiles AS SELECT * FROM backup_20260129.profiles;

DROP TABLE IF EXISTS perhutanan_sosial;
CREATE TABLE perhutanan_sosial AS SELECT * FROM backup_20260129.perhutanan_sosial;

DROP TABLE IF EXISTS kabupaten;
CREATE TABLE kabupaten AS SELECT * FROM backup_20260129.kabupaten;
```

## **✅ SUCCESS CRITERIA**

Refactoring berhasil jika:
1. Database hanya punya 4-5 tabel esensial
2. RLS policies sederhana dan bekerja
3. Authentication works
4. PS data management works
5. Permission system works dengan 3 role sederhana

---

**SILAKAN JALANKAN STEP 1-4 DI SUPABASE SQL EDITOR.**