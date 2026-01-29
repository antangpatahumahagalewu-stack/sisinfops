# Supabase SQL Runner

Python CLI tool untuk mengeksekusi file SQL ke database Supabase PostgreSQL langsung dari development environment. Tool ini memberikan feedback error yang detail seperti SQL Editor di Supabase Dashboard.

## Fitur Utama

✅ **Eksekusi SQL File** - Jalankan file SQL dengan multiple statements  
✅ **Error Reporting** - Tampilkan error dengan detail lengkap (line number, position, context)  
✅ **Connection Testing** - Test koneksi ke database Supabase  
✅ **Migration Management** - List dan manage database migrations  
✅ **Rich Output** - Interface console yang informatif dengan warna dan formatting  
✅ **Stop on Error** - Opsi untuk berhenti saat menemukan error pertama  

## Instalasi

### 1. Install Dependencies

```bash
cd /home/sangumang/Documents/sisinfops
pip3 install --break-system-packages -r scripts/sql_runner/requirements.txt
```

### 2. Konfigurasi Otomatis

Tool akan membaca konfigurasi dari `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key untuk koneksi database

Jika konfigurasi otomatis gagal, Anda akan diminta untuk memasukkan:
- **Database Host**: `db.rrvhekjdhdhtkmswjgwk.supabase.co`
- **Database Password**: Password dari Supabase Dashboard

## Penggunaan

### Cara 1: Menggunakan Script Wrapper (Direkomendasikan)

```bash
# Dari root project
python3 run-supabase-sql.py --help

# Test koneksi
python3 run-supabase-sql.py test

# Jalankan file SQL
python3 run-supabase-sql.py run supabase/migrations/20260136_fix_security_definer_views.sql

# Jalankan dengan continue on error
python3 run-supabase-sql.py run --no-stop-on-error file.sql

# Tampilkan konfigurasi
python3 run-supabase-sql.py config

# List semua migration
python3 run-supabase-sql.py migrations
```

### Cara 2: Direct Execution

```bash
# Dari directory sql_runner
cd scripts/sql_runner
python3 run.py --help
```

## Contoh Penggunaan

### 1. Fix Security Definer Views

```bash
# Jalankan migration untuk memperbaiki security definer views
python3 run-supabase-sql.py run supabase/migrations/20260136_fix_security_definer_views.sql
```

### 2. Test Koneksi Database

```bash
python3 run-supabase-sql.py test
```

Output contoh:
```
🔧 Testing Supabase Connection
✅ Database connection successful!
✅ Test query executed successfully
   PostgreSQL Version: Returned 1 row(s)
```

### 3. Jalankan Query Tunggal

```bash
python3 run-supabase-sql.py query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;"
```

### 4. List Semua Migrasi

```bash
python3 run-supabase-sql.py migrations
```

## Error Handling

Tool ini menampilkan error dengan detail lengkap:

```
❌ ERROR relation "non_existent_table" does not exist

Error at line 1, position 15:
   1 | SELECT * FROM non_existent_table;
     |               ^
```

## Struktur File

```
scripts/sql_runner/
├── __init__.py
├── README.md                 # Dokumentasi ini
├── requirements.txt          # Python dependencies
├── run.py                   # CLI entry point
├── config.py                # Load environment configuration
├── executor.py              # SQL execution engine
└── (files lain)
```

## Troubleshooting

### 1. "ModuleNotFoundError: No module named 'psycopg2'"
```bash
pip3 install --break-system-packages psycopg2-binary
```

### 2. "JWT failed verification" (API Error 401)
- Service role key di `.env.local` mungkin expired
- Gunakan manual configuration dengan memasukkan database host dan password

### 3. "Connection refused" atau "Timeout"
- Pastikan database host dan password benar
- Cek koneksi internet
- Verifikasi di Supabase Dashboard bahwa database running

### 4. "ImportError: attempted relative import"
- Gunakan script wrapper `run-supabase-sql.py` dari root directory
- Atau jalankan dari dalam directory `scripts/sql_runner`

## Contoh File SQL

```sql
-- Contoh migration file
-- ============================================
-- 1. Create table
-- ============================================
CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. Insert sample data
-- ============================================
INSERT INTO test_table (name) VALUES 
    ('Test 1'),
    ('Test 2'),
    ('Test 3');

-- ============================================
-- 3. Select to verify
-- ============================================
SELECT * FROM test_table ORDER BY id;
```

## Integrasi dengan Development Workflow

### Pre-commit Hook
Tambahkan ke `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Test SQL migration sebelum commit
python3 run-supabase-sql.py test || exit 1
```

### CI/CD Pipeline
```yaml
# Contoh GitHub Actions
- name: Test Database Connection
  run: python3 run-supabase-sql.py test
  
- name: Run Migrations
  run: python3 run-supabase-sql.py run supabase/migrations/latest.sql
```

## Keamanan

⚠️ **PERINGATAN KEAMANAN**:
1. **Service Role Key** memiliki akses penuh ke database
2. **Jangan commit** `.env.local` ke repository public
3. **Gunakan environment variables** di production
4. **Backup database** sebelum menjalankan migration

## License

MIT License - bebas digunakan untuk project internal.