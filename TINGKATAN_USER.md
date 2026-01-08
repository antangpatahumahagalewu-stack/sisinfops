# Tingkatan User (User Roles)

Aplikasi Sistem Informasi Perhutanan Sosial menggunakan **Role-Based Access Control (RBAC)** dengan **6 tingkatan user** yang memiliki hak akses berbeda.

## 📋 Daftar Tingkatan User

### 1. **Admin** (Administrator)
**Tingkat tertinggi** - Akses penuh ke semua fitur

**Hak Akses:**
- ✅ **READ** - Membaca semua data
- ✅ **EDIT** - Mengedit semua data
- ✅ **DELETE** - Menghapus data
- ✅ **MANAGE_USERS** - Mengelola user (hanya admin)
- ✅ **UPLOAD_EXCEL** - Upload dan import data Excel
- ✅ **CARBON_PROJECTS** - Mengelola proyek karbon
- ✅ **PROGRAM_MANAGEMENT** - Mengelola program
- ✅ **DRAM_MANAGEMENT** - Mengelola DRAM
- ✅ **IMPLEMENTATION** - Implementasi program
- ✅ **MONITORING_EVALUATION** - Monitoring & Evaluasi
- ✅ **ECONOMIC_EMPOWERMENT** - Pemberdayaan ekonomi
- ✅ **STAKEHOLDER_MANAGEMENT** - Manajemen stakeholder
- ✅ **LEGAL_MANAGEMENT** - Manajemen dokumen legal
- ✅ **PDD_GENERATION** - Generate PDD (Project Design Document)

**Deskripsi:** Administrator memiliki akses penuh ke semua fitur dan data dalam sistem. Hanya admin yang dapat menghapus data dan mengelola user lain.

---

### 2. **Monev** (Monitoring & Evaluasi)
**Tingkat menengah** - Fokus pada monitoring dan evaluasi data

**Hak Akses:**
- ✅ **READ** - Membaca semua data
- ✅ **EDIT** - Mengedit data (kecuali delete)
- ✅ **UPLOAD_EXCEL** - Upload dan import data Excel
- ✅ **MONITORING_EVALUATION** - Monitoring & Evaluasi
- ❌ **DELETE** - Tidak dapat menghapus data
- ❌ **MANAGE_USERS** - Tidak dapat mengelola user
- ❌ **CARBON_PROJECTS** - Tidak dapat mengelola proyek karbon
- ❌ **PROGRAM_MANAGEMENT** - Tidak dapat mengelola program
- ❌ **PDD_GENERATION** - Tidak dapat generate PDD

**Deskripsi:** Tim Monitoring & Evaluasi dapat membaca dan mengedit data untuk keperluan pemantauan dan evaluasi, serta dapat mengupload data Excel. Namun tidak dapat menghapus data atau mengakses fitur manajemen program dan karbon.

---

### 3. **Viewer** (Penonton)
**Tingkat dasar** - Hanya membaca data (read-only)

**Hak Akses:**
- ✅ **READ** - Membaca semua data
- ✅ **PS_DATA_ACCESS** - Akses data Perhutanan Sosial
- ✅ **POTENSI_DATA_ACCESS** - Akses data potensi
- ✅ **KABUPATEN_DATA_ACCESS** - Akses data kabupaten
- ✅ **STATISTICS_ACCESS** - Akses statistik
- ❌ **EDIT** - Tidak dapat mengedit data
- ❌ **DELETE** - Tidak dapat menghapus data
- ❌ **UPLOAD_EXCEL** - Tidak dapat upload Excel
- ❌ Semua fitur manajemen lainnya

**Deskripsi:** Viewer hanya dapat melihat dan membaca data. Tidak memiliki akses untuk mengedit, menghapus, atau melakukan operasi lainnya. Cocok untuk user yang hanya perlu melihat informasi.

---

### 4. **Program Planner** (Perencana Program)
**Tingkat spesialis** - Fokus pada perencanaan program

**Hak Akses:**
- ✅ **READ** - Membaca semua data
- ✅ **EDIT** - Mengedit data
- ✅ **PROGRAM_MANAGEMENT** - Mengelola program
- ✅ **DRAM_MANAGEMENT** - Mengelola DRAM
- ✅ **IMPLEMENTATION** - Implementasi program
- ✅ **MONITORING_EVALUATION** - Monitoring & Evaluasi
- ✅ **ECONOMIC_EMPOWERMENT** - Pemberdayaan ekonomi
- ✅ **STAKEHOLDER_MANAGEMENT** - Manajemen stakeholder
- ❌ **DELETE** - Tidak dapat menghapus data
- ❌ **UPLOAD_EXCEL** - Tidak dapat upload Excel
- ❌ **CARBON_PROJECTS** - Tidak dapat mengelola proyek karbon
- ❌ **PDD_GENERATION** - Tidak dapat generate PDD

**Deskripsi:** Program Planner bertanggung jawab untuk merencanakan dan mengelola program, termasuk DRAM, implementasi, monitoring, pemberdayaan ekonomi, dan manajemen stakeholder.

---

### 5. **Program Implementer** (Implementator Program)
**Tingkat spesialis** - Fokus pada implementasi program

**Hak Akses:**
- ✅ **READ** - Membaca semua data
- ✅ **EDIT** - Mengedit data
- ✅ **IMPLEMENTATION** - Implementasi program
- ✅ **ECONOMIC_EMPOWERMENT** - Pemberdayaan ekonomi
- ❌ **DELETE** - Tidak dapat menghapus data
- ❌ **UPLOAD_EXCEL** - Tidak dapat upload Excel
- ❌ **PROGRAM_MANAGEMENT** - Tidak dapat mengelola program
- ❌ **DRAM_MANAGEMENT** - Tidak dapat mengelola DRAM
- ❌ **CARBON_PROJECTS** - Tidak dapat mengelola proyek karbon

**Deskripsi:** Program Implementer fokus pada pelaksanaan program di lapangan dan pemberdayaan ekonomi. Tidak memiliki akses ke perencanaan program atau manajemen proyek karbon.

---

### 6. **Carbon Specialist** (Spesialis Karbon)
**Tingkat spesialis** - Fokus pada proyek karbon

**Hak Akses:**
- ✅ **READ** - Membaca semua data
- ✅ **EDIT** - Mengedit data
- ✅ **CARBON_PROJECTS** - Mengelola proyek karbon
- ✅ **PROGRAM_MANAGEMENT** - Mengelola program
- ✅ **MONITORING_EVALUATION** - Monitoring & Evaluasi
- ✅ **STAKEHOLDER_MANAGEMENT** - Manajemen stakeholder
- ✅ **LEGAL_MANAGEMENT** - Manajemen dokumen legal
- ✅ **PDD_GENERATION** - Generate PDD (Project Design Document)
- ❌ **DELETE** - Tidak dapat menghapus data
- ❌ **UPLOAD_EXCEL** - Tidak dapat upload Excel
- ❌ **DRAM_MANAGEMENT** - Tidak dapat mengelola DRAM
- ❌ **IMPLEMENTATION** - Tidak dapat implementasi program

**Deskripsi:** Carbon Specialist mengelola proyek karbon, termasuk generate PDD, manajemen legal, dan stakeholder terkait proyek karbon.

---

## 📊 Ringkasan Permissions

| Permission | Admin | Monev | Viewer | Program Planner | Program Implementer | Carbon Specialist |
|------------|:-----:|:-----:|:------:|:----------------:|:-------------------:|:-----------------:|
| **READ** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **EDIT** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **DELETE** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **MANAGE_USERS** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **UPLOAD_EXCEL** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CARBON_PROJECTS** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PROGRAM_MANAGEMENT** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **DRAM_MANAGEMENT** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **IMPLEMENTATION** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **MONITORING_EVALUATION** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **ECONOMIC_EMPOWERMENT** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **STAKEHOLDER_MANAGEMENT** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **LEGAL_MANAGEMENT** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PDD_GENERATION** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🔐 Data Access Permissions

Semua role memiliki akses untuk membaca:
- ✅ **PS_DATA_ACCESS** - Data Perhutanan Sosial
- ✅ **POTENSI_DATA_ACCESS** - Data potensi
- ✅ **KABUPATEN_DATA_ACCESS** - Data kabupaten
- ✅ **STATISTICS_ACCESS** - Statistik

---

## 📝 Catatan Penting

1. **Hanya Admin** yang dapat:
   - Menghapus data
   - Mengelola user lain
   - Mengakses semua fitur tanpa batasan

2. **Monev dan Admin** yang dapat:
   - Upload dan import data Excel
   - Mengedit data Perhutanan Sosial

3. **Viewer** adalah role dengan akses terbatas:
   - Hanya dapat membaca data
   - Tidak dapat melakukan perubahan apapun

4. **Role Spesialis** (Program Planner, Program Implementer, Carbon Specialist):
   - Memiliki akses ke modul spesifik sesuai bidangnya
   - Dapat mengedit data dalam lingkup modul yang diizinkan
   - Tidak dapat menghapus data atau upload Excel

---

## 🔧 Implementasi Teknis

Role disimpan di tabel `profiles` di database Supabase dengan kolom `role` yang berisi salah satu dari:
- `'admin'`
- `'monev'`
- `'viewer'`
- `'program_planner'`
- `'program_implementer'`
- `'carbon_specialist'`

Sistem menggunakan Row-Level Security (RLS) di Supabase untuk memastikan user hanya dapat mengakses data sesuai dengan role mereka.


Role user:
admin → "Administrator"
monev → "Monitoring & Evaluasi"
viewer → "Viewer"
program_planner → "Program Planner"
program_implementer → "Program Implementer"
carbon_specialist → "Carbon Specialist"