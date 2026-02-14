# INSTRUKSI PERBAIKAN FOREIGN KEY DATABASE

## **MASALAH YANG TERDETEKSI**
MCP (Model Context Protocol) mendeteksi issue CRITICAL:
> **"Table carbon_projects references non-existent table projects"**

**Akar Masalah:** Ada foreign key constraint atau kode yang mengharapkan tabel bernama `projects`, tetapi tabel tersebut tidak ada di database. Yang ada adalah tabel `carbon_projects`.

## **ANALISIS HASIL DIAGNOSA**

### **Fakta yang Ditemukan:**
1. ✅ **Tabel `carbon_projects` ADA** - memiliki 4 data proyek karbon
2. ❌ **Tabel `projects` (tanpa 'carbon_') TIDAK ADA** 
3. ✅ **Relasi `programs.carbon_project_id` → `carbon_projects.id` VALID**
4. ⚠️ **MCP masih melaporkan issue CRITICAL** setelah scan terakhir

### **Dampak:**
- Sistem secara teknis berfungsi (karena relasi ke `carbon_projects` valid)
- Namun MCP melaporkan issue CRITICAL yang perlu diperbaiki untuk governance
- Potensi error jika ada kode yang langsung query ke tabel `projects`

## **SOLUSI YANG DISARANKAN**

### **Opsi 1: Membuat VIEW `projects` (REKOMENDASI)**
Membuat view `projects` sebagai alias ke `carbon_projects`. Ini adalah solusi aman karena:
- Tidak mengubah data existing
- Memberikan backward compatibility
- Mudah di-rollback jika diperlukan
- Memperbaiki issue MCP

### **Opsi 2: Membuat TABLE `projects`**
Membuat tabel fisik `projects` dan copy data dari `carbon_projects`. Lebih kompleks tetapi jika kode memerlukan tabel fisik (bukan view).

### **Opsi 3: Perbaiki Constraint Langsung**
Jika ada constraint foreign key yang broken, perbaiki langsung. Namun diagnosa menunjukkan tidak ada constraint yang broken.

## **LANGKAH PERBAIKAN (REKOMENDASI OPSI 1)**

### **Step 1: Jalankan SQL Fix di Supabase**

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy-Paste script berikut:

```sql
-- FIX FOREIGN KEY ISSUE: Create projects view as alias to carbon_projects
BEGIN;

-- Drop existing view if it exists
DROP VIEW IF EXISTS projects;

-- Create projects view
CREATE OR REPLACE VIEW projects AS
SELECT 
    id,
    nama_project as project_name,
    kabupaten,
    luas_total_ha,
    status,
    created_at,
    updated_at,
    project_code,
    project_type,
    standard,
    methodology,
    estimated_credits,
    issued_credits,
    investment_amount,
    roi_percentage,
    project_period_years
FROM carbon_projects;

-- Add documentation
COMMENT ON VIEW projects IS 'Alias view for carbon_projects table. Created to fix MCP foreign key issue: "Table carbon_projects references non-existent table projects".';

-- Grant permissions
GRANT SELECT ON projects TO postgres, anon, authenticated, service_role;

-- Verification
DO $$
DECLARE
    view_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    -- Check if view was created
    SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) INTO view_exists;
    
    RAISE NOTICE '1. View created: %', view_exists;
    
    -- Count rows
    SELECT COUNT(*) INTO row_count FROM projects;
    RAISE NOTICE '2. Row count: %', row_count;
    
    RAISE NOTICE '3. MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '   Created "projects" view as alias to "carbon_projects"';
END $$;

COMMIT;
```

3. Klik **"RUN"** untuk menjalankan script

### **Step 2: Verifikasi Perbaikan**

Setelah menjalankan script, verifikasi dengan:

#### **A. Test di Supabase SQL Editor:**
```sql
-- Test 1: Verify view works
SELECT * FROM projects LIMIT 3;

-- Test 2: Verify join with programs works
SELECT 
    p.program_name,
    pr.project_name,
    pr.kabupaten,
    pr.luas_total_ha
FROM programs p
JOIN projects pr ON p.carbon_project_id = pr.id
LIMIT 5;

-- Test 3: Verify row counts match
SELECT 
    (SELECT COUNT(*) FROM carbon_projects) as carbon_projects_count,
    (SELECT COUNT(*) FROM projects) as projects_count;
```

#### **B. Test dengan Script Python:**
```bash
cd /home/sangumang/Documents/sisinfops
python3 test_carbon_functions.py
```

**Hasil yang diharapkan:** Semua test PASS

#### **C. Run MCP Health Check:**
```bash
cd /home/sangumang/Documents/sisinfops
node mcp/governance-system/test-client.js
```

**Hasil yang diharapkan:** Issue CRITICAL tentang foreign key sudah tidak muncul di priority list.

### **Step 3: Test Frontend**

Test halaman frontend yang menggunakan data carbon projects:
1. Dashboard Investor
2. Halaman Carbon Projects
3. Halaman Programs yang terkait dengan carbon projects

## **FILE YANG DIBUAT**

### **1. Diagnostic Scripts:**
- `diagnose_foreign_key_issue.py` - Script diagnosa awal
- `fix_foreign_key_diagnostic.sql` - SQL diagnosa lengkap
- `fix_foreign_key_migration.sql` - Migration script lengkap
- `fix_foreign_key_simple.sql` - Script fix sederhana (gunakan ini)

### **2. Test Scripts:**
- `test_carbon_functions.py` - Test fungsi setelah perbaikan
- `run_foreign_key_fix.py` - Script otomatis (membutuhkan konfirmasi)

### **3. Dokumentasi:**
- `INSTRUCTIONS_FIX_FOREIGN_KEY.md` - File ini

## **TROUBLESHOOTING**

### **Jika SQL Error:**
- **"permission denied"**: Pastikan menggunakan service role key atau akun dengan hak DDL
- **"view already exists"**: Aman, script menggunakan `DROP VIEW IF EXISTS`
- **"table does not exist"**: Pastikan tabel `carbon_projects` ada

### **Jika Test Masih Gagal:**
1. Refresh schema cache Supabase:
   ```sql
   SELECT pg_notify('pgrst', 'reload schema');
   ```
   
2. Tunggu 1-2 menit untuk cache update

3. Jalankan test ulang

### **Jika MCP Masih Melaporkan Issue:**
1. Run MCP daily scan:
   ```bash
   node mcp/governance-system/test-client.js
   ```
   (Cari tool `mcp_daily_scan`)

2. Update MCP cache jika perlu

## **ROLLBACK INSTRUCTION**

Jika ada masalah setelah perbaikan:

```sql
-- Hapus view projects (rollback ke state awal)
DROP VIEW IF EXISTS projects;

-- Verifikasi rollback
SELECT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'projects'
) AS projects_view_exists;
```

## **KESIMPULAN**

**Status Saat Ini:**
- Issue terdeteksi oleh MCP sebagai CRITICAL
- Sistem tetap berfungsi karena relasi ke `carbon_projects` valid
- Perlu perbaikan untuk memenuhi standar governance

**Rekomendasi:** Jalankan **Step 1** (SQL fix) segera untuk menyelesaikan issue CRITICAL.

**Estimasi Waktu:** 5-10 menit (termasuk verifikasi)

**Risiko:** SANGAT RENDAH - Hanya membuat view, tidak mengubah data existing.

---

**Setelah menjalankan perbaikan, silakan jalankan test untuk konfirmasi:**

```bash
# Test database functions
python3 test_carbon_functions.py

# Test MCP health check
node mcp/governance-system/test-client.js
```

Jika semua test PASS, issue foreign key sudah teratasi. ✅