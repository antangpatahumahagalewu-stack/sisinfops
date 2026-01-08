# Dokumen Desain Database - Sistem Informasi Perhutanan Sosial & PKS

## **1. Gambaran Umum Database**

Database aplikasi **Sistem Informasi Perhutanan Sosial & PKS** dibangun di atas **PostgreSQL** dengan menggunakan **Supabase** sebagai platform. Database ini dirancang untuk mengelola data Perhutanan Sosial (PS) di 4 kabupaten dengan fokus pada keamanan, auditabilitas, dan skalabilitas.

### **1.1 Karakteristik Utama**
- **UUID sebagai Primary Key**: Semua tabel menggunakan UUID untuk identifikasi unik
- **Referential Integrity**: Menggunakan foreign key dengan constraint ON DELETE CASCADE
- **Row Level Security (RLS)**: Implementasi keamanan granular berbasis peran pengguna
- **Audit Trail**: Sistem pencatatan otomatis untuk semua operasi CRUD
- **Time Tracking**: created_at dan updated_at pada setiap tabel
- **Indexing**: Indeks optimal untuk performa query

## **2. Struktur Tabel dan Relasi**

### **2.1 Diagram Relasi**
```
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│    kabupaten    │◄──────┤ perhutanan_sosial    ├──────►│     profiles     │
└─────────────────┘       └──────────────────────┘       └─────────────────┘
         │                           │
         │                           ├──────► ps_dokumen
         │                           ├──────► ps_kegiatan
         │                           ├──────► ps_galeri
         │                           ├──────► ps_catatan
         │                           ├──────► ps_peta
         │                           └──────► lembaga_pengelola
         │
┌─────────────────┐
│    audit_log    │
└─────────────────┘
```

### **2.2 Tabel Utama**

#### **2.2.1 Tabel `kabupaten`**
Tabel referensi untuk 4 kabupaten wilayah kerja yayasan.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| nama | VARCHAR(100) | NOT NULL, UNIQUE | Nama kabupaten |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembuatan |

```sql
INSERT INTO kabupaten (nama) VALUES
    ('KABUPATEN KATINGAN'),
    ('KABUPATEN KAPUAS'),
    ('KABUPATEN PULANG PISAU'),
    ('KABUPATEN GUNUNG MAS');
```

#### **2.2.2 Tabel `perhutanan_sosial` (Tabel Inti)**
Tabel utama untuk menyimpan data unit Perhutanan Sosial.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| kabupaten_id | UUID | FOREIGN KEY | Referensi ke kabupaten |
| skema | VARCHAR(50) | NOT NULL | Skema PS (HD, HTR, HA, dll) |
| pemegang_izin | VARCHAR(255) | NOT NULL | Nama pemegang izin |
| desa | VARCHAR(100) | - | Nama desa |
| kecamatan | VARCHAR(100) | - | Nama kecamatan |
| nomor_sk | VARCHAR(255) | - | Nomor SK Perhutanan Sosial |
| tanggal_sk | DATE | - | Tanggal penerbitan SK |
| luas_ha | DECIMAL(10,2) | - | Luas area (hektar) |
| rkps_status | VARCHAR(10) | CHECK ('ada','belum') | Status RKPS |
| peta_status | VARCHAR(10) | CHECK ('ada','belum') | Status peta |
| fasilitator | VARCHAR(100) | - | Nama fasilitator |
| jumlah_kk | INTEGER | - | Jumlah kepala keluarga |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembaruan |

**Relasi:**
- `kabupaten_id` → `kabupaten(id)` ON DELETE CASCADE

#### **2.2.3 Tabel `profiles`**
Ekstensi dari tabel auth.users Supabase untuk manajemen peran pengguna.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY, FOREIGN KEY | Referensi ke auth.users |
| full_name | VARCHAR(255) | - | Nama lengkap pengguna |
| role | VARCHAR(20) | CHECK ('admin','monev','viewer') | Peran pengguna |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembaruan |

#### **2.2.4 Tabel `lembaga_pengelola` (sebelumnya `lphd`)**
Informasi lembaga pengelola untuk setiap unit PS.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| perhutanan_sosial_id | UUID | UNIQUE, FOREIGN KEY | Referensi ke perhutanan_sosial |
| nama | VARCHAR(255) | NOT NULL | Nama lembaga |
| ketua | VARCHAR(255) | - | Nama ketua lembaga |
| jumlah_anggota | INTEGER | DEFAULT 0 | Jumlah anggota |
| kepala_desa | VARCHAR(255) | - | Nama kepala desa (ditambahkan migrasi) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembaruan |

**Relasi:**
- `perhutanan_sosial_id` → `perhutanan_sosial(id)` ON DELETE CASCADE

### **2.3 Tabel Tab (Modul Tambahan)**

#### **2.3.1 Tabel `ps_dokumen`**
Menyimpan dokumen legal dan administrasi PS.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| perhutanan_sosial_id | UUID | FOREIGN KEY | Referensi ke perhutanan_sosial |
| nama | VARCHAR(255) | NOT NULL | Nama dokumen |
| jenis | VARCHAR(50) | CHECK ('SK','PETA','RKPS','PKS','LAINNYA') | Jenis dokumen |
| file_url | TEXT | - | URL file di storage |
| file_name | VARCHAR(255) | - | Nama file |
| file_size | INTEGER | - | Ukuran file (bytes) |
| keterangan | TEXT | - | Keterangan dokumen |
| created_by | UUID | FOREIGN KEY | Pengguna pembuat |

#### **2.3.2 Tabel `ps_kegiatan`**
Menyimpan data kegiatan yang dilakukan dalam PS.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| perhutanan_sosial_id | UUID | FOREIGN KEY | Referensi ke perhutanan_sosial |
| nama_kegiatan | VARCHAR(255) | NOT NULL | Nama kegiatan |
| jenis_kegiatan | VARCHAR(100) | - | Jenis kegiatan |
| tanggal_mulai | DATE | - | Tanggal mulai |
| tanggal_selesai | DATE | - | Tanggal selesai |
| status | VARCHAR(50) | CHECK ('RENCANA','BERLANGSUNG','SELESAI','DITUNDA') | Status kegiatan |
| anggaran | DECIMAL(15,2) | - | Anggaran kegiatan |
| created_by | UUID | FOREIGN KEY | Pengguna pembuat |

#### **2.3.3 Tabel `ps_galeri`**
Menyimpan foto dokumentasi kegiatan PS.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| perhutanan_sosial_id | UUID | FOREIGN KEY | Referensi ke perhutanan_sosial |
| judul | VARCHAR(255) | - | Judul foto |
| foto_url | TEXT | NOT NULL | URL foto |
| foto_thumbnail_url | TEXT | - | URL thumbnail |
| tanggal_foto | DATE | - | Tanggal pengambilan foto |
| lokasi | TEXT | - | Lokasi pengambilan |
| created_by | UUID | FOREIGN KEY | Pengguna pembuat |

#### **2.3.4 Tabel `ps_catatan`**
Menyimpan catatan lapangan dan monitoring PS.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| perhutanan_sosial_id | UUID | FOREIGN KEY | Referensi ke perhutanan_sosial |
| judul | VARCHAR(255) | NOT NULL | Judul catatan |
| isi | TEXT | NOT NULL | Isi catatan |
| kategori | VARCHAR(50) | CHECK ('MONITORING','EVALUASI','MASALAH','PENCAPAIAN','LAINNYA') | Kategori catatan |
| tanggal_catatan | DATE | DEFAULT CURRENT_DATE | Tanggal catatan |
| created_by | UUID | FOREIGN KEY | Pengguna pembuat |

#### **2.3.5 Tabel `ps_peta`**
Menyimpan data peta dan koordinat PS.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| perhutanan_sosial_id | UUID | UNIQUE, FOREIGN KEY | Referensi ke perhutanan_sosial |
| geojson_data | JSONB | - | Data GeoJSON polygon |
| file_url | TEXT | - | URL file peta |
| koordinat_centroid | JSONB | - | Koordinat centroid {lat, lng} |
| luas_terukur | DECIMAL(10,2) | - | Luas terukur (ha) |
| created_by | UUID | FOREIGN KEY | Pengguna pembuat |

### **2.4 Tabel Sistem**

#### **2.4.1 Tabel `audit_log`**
Mencatat semua operasi CRUD untuk auditabilitas.

| **Kolom** | **Tipe Data** | **Constraint** | **Deskripsi** |
|-----------|---------------|----------------|---------------|
| id | UUID | PRIMARY KEY | Identifikasi unik |
| table_name | VARCHAR(100) | NOT NULL | Nama tabel yang diaudit |
| record_id | UUID | NOT NULL | ID record yang diaudit |
| operation | VARCHAR(10) | CHECK ('INSERT','UPDATE','DELETE') | Jenis operasi |
| old_data | JSONB | - | Data sebelum perubahan |
| new_data | JSONB | - | Data setelah perubahan |
| user_id | UUID | FOREIGN KEY | Pengguna yang melakukan operasi |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu operasi |

## **3. Keamanan (Row Level Security - RLS)**

### **3.1 Model Peran Pengguna**
- **Admin**: Hak akses penuh (CRUD semua data, kelola pengguna)
- **Monev (Monitoring & Evaluasi)**: Dapat membaca dan mengedit data
- **Viewer**: Hanya dapat membaca data (read-only)

### **3.2 Kebijakan RLS Utama**

#### **3.2.1 Tabel `perhutanan_sosial`**
```sql
-- Read: Semua pengguna terautentikasi
CREATE POLICY "PS readable by authenticated users" ON perhutanan_sosial
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert/Update: Admin dan Monev
CREATE POLICY "PS insertable by admin and monev" ON perhutanan_sosial
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monev')));

-- Delete: Hanya Admin
CREATE POLICY "PS deletable by admin only" ON perhutanan_sosial
    FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

#### **3.2.2 Tabel Tab (ps_dokumen, ps_kegiatan, dll)**
Kebijakan serupa diterapkan untuk semua tabel tab dengan pola yang sama:
- **SELECT**: Semua pengguna terautentikasi
- **INSERT/UPDATE**: Admin dan Monev
- **DELETE**: Hanya Admin

#### **3.2.3 Tabel `profiles`**
```sql
-- Pengguna hanya bisa melihat/mengedit profil sendiri
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Admin bisa melihat semua profil
CREATE POLICY "Admin can view all profiles" ON profiles
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
```

#### **3.2.4 Tabel `audit_log`**
```sql
-- Hanya Admin yang bisa melihat log audit
CREATE POLICY "Audit log readable by admin only" ON audit_log
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

## **4. Trigger dan Fungsi**

### **4.1 Fungsi `update_updated_at_column()`**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```
**Digunakan oleh:** Semua tabel dengan kolom `updated_at`

### **4.2 Fungsi `audit_trigger_function()`**
```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';
```
**Digunakan oleh:** `perhutanan_sosial`, `lembaga_pengelola`, dan semua tabel tab

## **5. Indeks untuk Performa**

### **5.1 Indeks pada Tabel Utama**

#### **`perhutanan_sosial`**
```sql
CREATE INDEX idx_perhutanan_sosial_kabupaten ON perhutanan_sosial(kabupaten_id);
CREATE INDEX idx_perhutanan_sosial_skema ON perhutanan_sosial(skema);
CREATE INDEX idx_perhutanan_sosial_status ON perhutanan_sosial(rkps_status, peta_status);
```

#### **`lembaga_pengelola`**
```sql
CREATE INDEX idx_lphd_perhutanan_sosial ON lembaga_pengelola(perhutanan_sosial_id);
```

#### **Tabel Tab**
```sql
-- Indeks pada foreign key untuk join yang cepat
CREATE INDEX idx_ps_dokumen_perhutanan_sosial ON ps_dokumen(perhutanan_sosial_id);
CREATE INDEX idx_ps_kegiatan_perhutanan_sosial ON ps_kegiatan(perhutanan_sosial_id);
CREATE INDEX idx_ps_galeri_perhutanan_sosial ON ps_galeri(perhutanan_sosial_id);
CREATE INDEX idx_ps_catatan_perhutanan_sosial ON ps_catatan(perhutanan_sosial_id);
CREATE INDEX idx_ps_peta_perhutanan_sosial ON ps_peta(perhutanan_sosial_id);

-- Indeks pada kolom yang sering di-filter
CREATE INDEX idx_ps_dokumen_jenis ON ps_dokumen(jenis);
CREATE INDEX idx_ps_kegiatan_status ON ps_kegiatan(status);
CREATE INDEX idx_ps_catatan_kategori ON ps_catatan(kategori);
```

#### **`audit_log`**
```sql
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

## **6. Migrasi Database**

### **6.1 Urutan Migrasi**
1. **20250106_initial.sql**: Tabel dasar (kabupaten, perhutanan_sosial, profiles, audit_log)
2. **20250107_create_potensi_table.sql**: Tabel potensi (tidak dibahas detail di sini)
3. **20250108_create_lphd_table.sql**: Tabel lembaga pengelola (awalnya lphd)
4. **20250109_create_ps_tabs_tables.sql**: Tabel tab (dokumen, kegiatan, galeri, catatan, peta)
5. **20250110_rename_lphd_to_lembaga_pengelola.sql**: Rename tabel lphd → lembaga_pengelola
6. **20250111_add_kepala_desa_to_lembaga_pengelola.sql**: Tambah kolom kepala_desa
7. **20250112_fix_rls_recursion.sql**: Perbaikan rekursi RLS
8. **20250113_auto_create_profile.sql**: Trigger auto-create profile
9. **20250113_update_all_rls_policies.sql**: Update kebijakan RLS
10. **20250114_create_missing_profiles.sql**: Buat profile yang hilang
11. **20250115_fix_check_user_role.sql**: Perbaikan fungsi check role
12. **20250116_debug_check_user_role.sql**: Debug fungsi check role
13. **20250117_fix_lembaga_pengelola_rls.sql**: Perbaikan RLS lembaga_pengelola
14. **20250118_cascade_ps_updates.sql**: Cascade update PS ke tabel terkait
15. **20250119_setup_storage_buckets.sql**: Setup Supabase Storage buckets

### **6.2 Kompatibilitas dan Dependensi**
- **PostgreSQL 15+**: Menggunakan fitur modern PostgreSQL
- **UUID Extension**: `uuid-ossp` untuk generate UUID
- **Supabase Auth**: Integrasi dengan tabel `auth.users`
- **Timezone Support**: `TIMESTAMP WITH TIME ZONE` untuk konsistensi waktu

## **7. Pola Desain yang Digunakan**

### **7.1 Soft Delete Pattern**
Meskipun tidak menggunakan flag `deleted_at`, sistem menggunakan:
- **Audit Trail**: Mencatat semua operasi DELETE di `audit_log`
- **Cascade Delete**: Foreign key dengan ON DELETE CASCADE untuk data terkait

### **7.2 Event Sourcing Lite**
Melalui tabel `audit_log`, sistem dapat:
- Melacak perubahan data dari waktu ke waktu
- Membuat laporan audit lengkap
- Memulihkan data yang tidak sengaja terhapus (dari old_data)

### **7.3 Role-Based Access Control (RBAC)**
Implementasi 3-tier RBAC:
1. **Viewer**: Read-only
2. **Monev**: Read + Write (kecuali delete)
3. **Admin**: Full access + user management

### **7.4 Modular Tab System**
Desain tabel tab yang konsisten:
- Foreign key ke `perhutanan_sosial_id`
- Kolom `created_by` untuk audit
- Trigger `updated_at` otomatis
- Kebijakan RLS yang seragam

## **8. Rekomendasi untuk Pengembangan**

### **8.1 Optimasi yang Dapat Dilakukan**
1. **Partitioning**: Partition tabel `audit_log` berdasarkan bulan/tahun untuk performa
2. **Materialized Views**: Buat materialized view untuk dashboard statistik
3. **Full-Text Search**: Tambahkan full-text search untuk pencarian catatan dan dokumen
4. **GIS Extension**: Gunakan PostGIS untuk query spasial yang lebih advanced

### **8.2 Monitoring Database**
1. **Query Performance**: Pantau query lambat menggunakan `pg_stat_statements`
2. **Index Usage**: Review penggunaan indeks secara berkala
3. **Storage Growth**: Monitor pertumbuhan tabel `audit_log` dan `ps_galeri`

### **8.3 Backup dan Recovery**
1. **Automated Backups**: Gunakan fitur backup otomatis Supabase
2. **Point-in-Time Recovery**: Konfigurasi PITR untuk recovery granular
3. **Export Regular**: Ekspor data penting secara berkala untuk arsip

## **9. Kesimpulan**

Database **Sistem Informasi Perhutanan Sosial & PKS** dirancang dengan prinsip:
1. **Security First**: RLS granular dengan 3-level RBAC
2. **Auditability**: Sistem audit trail lengkap
3. **Performance**: Indeks optimal untuk query umum
4. **Maintainability**: Struktur konsisten dan dokumentasi lengkap
5. **Scalability**: Arsitektur modular untuk penambahan fitur

Desain ini mendukung operasional Yayasan Antangpatahu Mahaga Lewu dalam mengelola data Perhutanan Sosial di 4 kabupaten, dengan potensi skalabilitas untuk ekspansi ke wilayah lain di masa depan.

---
**Dokumen ini disusun berdasarkan analisis file migrasi SQL per Januari 2025.**  
*Untuk informasi teknis lebih lanjut, lihat folder `supabase/migrations`.*