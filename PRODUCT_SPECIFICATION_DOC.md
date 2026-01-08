# Product Specification Document (PSD)
## Sistem Informasi Perhutanan Sosial & PKS
### Yayasan Antangpatahu Mahaga Lewu

**Versi Dokumen:** 1.0  
**Tanggal:** Januari 2025  
**Status:** Production

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Core Features](#4-core-features)
5. [Technical Architecture](#5-technical-architecture)
6. [Data Model](#6-data-model)
7. [User Interface & User Experience](#7-user-interface--user-experience)
8. [Security & Compliance](#8-security--compliance)
9. [Integration & APIs](#9-integration--apis)
10. [Performance Requirements](#10-performance-requirements)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Roadmap & Future Enhancements](#12-roadmap--future-enhancements)

---

## 1. Executive Summary

### 1.1 Purpose
Sistem Informasi Perhutanan Sosial & PKS adalah platform internal yang dikembangkan untuk Yayasan Antangpatahu Mahaga Lewu guna mengelola, memantau, dan mengevaluasi program Perhutanan Sosial (PS) di 4 kabupaten secara terpusat, real-time, dan terstruktur.

### 1.2 Key Objectives
- **Digitalisasi Manajemen Data**: Menggantikan sistem spreadsheet manual dengan platform terpusat
- **Program & Carbon Project Operating System**: Mendukung siklus lengkap perencanaan → implementasi → monitoring → evaluasi → pelaporan
- **Role-Based Access Control**: Memastikan akses data sesuai dengan tanggung jawab pengguna
- **Generasi Dokumen Otomatis**: Menghasilkan DRAM dan PDD secara otomatis dari data terstruktur
- **Audit Trail & Compliance**: Menyediakan jejak audit untuk kebutuhan verifikasi dan pelaporan

### 1.3 Target Users
- **Administrator**: Manajemen penuh sistem dan pengguna
- **Program Planner**: Perencana program dan DRAM
- **Program Implementer**: Pelaksana program di lapangan
- **Monev Officer**: Tim monitoring & evaluasi
- **Carbon Specialist**: Spesialis proyek karbon dan PDD
- **Viewer**: Pengguna read-only untuk melihat data

---

## 2. Product Overview

### 2.1 Product Vision
Menjadi platform terdepan untuk manajemen program Perhutanan Sosial yang mendukung pengelolaan data, perencanaan program, implementasi, monitoring, evaluasi, dan pengembangan proyek karbon secara terintegrasi.

### 2.2 Product Mission
Menyediakan sistem informasi yang memaksa disiplin kerja terstruktur berdasarkan siklus operasional organisasi, dengan output utama berupa DRAM, PDD, dan laporan implementasi serta monitoring yang siap untuk audit donor dan verifikasi karbon.

### 2.3 Key Value Propositions
1. **Efisiensi Operasional**: Data terpusat, pencarian cepat, reduksi kesalahan manual
2. **Monitoring Real-time**: Dashboard statistik dan progres program secara real-time
3. **Kolaborasi Terkendali**: Pembagian tugas berbasis role dengan keamanan data
4. **Pelaporan Otomatis**: Generasi dokumen (DRAM, PDD) dari data terstruktur
5. **Skalabilitas**: Arsitektur modular untuk ekspansi ke wilayah lain

### 2.4 Product Scope

#### In Scope
- ✅ Manajemen data Perhutanan Sosial (PS)
- ✅ Manajemen program dan proyek karbon
- ✅ DRAM (Dokumen Rencana Aksi Mitigasi) berbasis data aktif
- ✅ Implementasi program dengan tracking progres
- ✅ Monitoring & Evaluasi (Monev)
- ✅ Pemberdayaan ekonomi PS
- ✅ Stakeholder & FPIC management
- ✅ Legal & Carbon Rights management
- ✅ PDD Generator
- ✅ Upload & import data Excel
- ✅ Dashboard statistik dan visualisasi
- ✅ Role-based access control (6 roles)
- ✅ Multi-language support (Indonesia, Chinese Traditional)

#### Out of Scope (Current Version)
- ❌ Mobile native application
- ❌ Real-time chat/collaboration
- ❌ Advanced analytics dengan machine learning
- ❌ Integration dengan sistem eksternal (Kementerian LHK, dll)
- ❌ Payment gateway
- ❌ Public-facing website

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

```
Admin (Tertinggi)
├── Carbon Specialist
├── Program Planner
├── Program Implementer
├── Monev Officer
└── Viewer (Terendah)
```

### 3.2 Detailed Role Specifications

#### 3.2.1 Admin (Administrator)
**Tingkat:** Tertinggi - Akses penuh

**Hak Akses:**
- ✅ **READ** - Membaca semua data
- ✅ **EDIT** - Mengedit semua data
- ✅ **DELETE** - Menghapus data (hanya admin)
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
- ✅ **PDD_GENERATION** - Generate PDD

**Deskripsi:** Administrator memiliki akses penuh ke semua fitur dan data dalam sistem. Hanya admin yang dapat menghapus data dan mengelola user lain.

---

#### 3.2.2 Monev (Monitoring & Evaluasi)
**Tingkat:** Menengah - Fokus monitoring dan evaluasi

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

#### 3.2.3 Viewer (Penonton)
**Tingkat:** Dasar - Hanya membaca data (read-only)

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

#### 3.2.4 Program Planner (Perencana Program)
**Tingkat:** Spesialis - Fokus pada perencanaan program

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

#### 3.2.5 Program Implementer (Implementator Program)
**Tingkat:** Spesialis - Fokus pada implementasi program

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

#### 3.2.6 Carbon Specialist (Spesialis Karbon)
**Tingkat:** Spesialis - Fokus pada proyek karbon

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

### 3.3 Permission Matrix

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

## 4. Core Features

### 4.1 Authentication & Authorization

#### 4.1.1 User Authentication
- **Login System**: Email dan password authentication via Supabase Auth
- **Session Management**: JWT-based session dengan cookie storage
- **Password Security**: Hashing dan encryption oleh Supabase
- **Multi-language Support**: Login page tersedia dalam Bahasa Indonesia dan Chinese Traditional

#### 4.1.2 Role-Based Access Control (RBAC)
- **Role Assignment**: Role disimpan di tabel `profiles` di database
- **Permission Checking**: Middleware dan server-side validation
- **UI Adaptation**: Sidebar dan menu items disesuaikan berdasarkan role
- **Database-Level Security**: Row-Level Security (RLS) di Supabase

---

### 4.2 Dashboard Nasional

#### 4.2.1 Statistik Agregat
- **Total PS**: Jumlah unit Perhutanan Sosial
- **Total Luas**: Total luas lahan dalam hektar
- **RKPS Tersedia**: Jumlah PS dengan RKPS (Rencana Kerja Pengelolaan Sumberdaya)
- **Peta Tersedia**: Jumlah PS dengan peta digital
- **Total KK**: Total jumlah kepala keluarga

#### 4.2.2 Visualisasi Data
- **Statistik Cards**: Kartu statistik dengan ikon dan persentase
- **Ringkasan per Kabupaten**: Tabel statistik untuk setiap kabupaten
- **Status Indicators**: Ikon warna (hijau/merah) untuk status RKPS dan peta
- **Quick Actions**: Link cepat ke fitur utama (Upload, Data per Kabupaten)

#### 4.2.3 Dashboard Program (untuk role tertentu)
- **Ringkasan Program Aktif**: Daftar program yang sedang berjalan
- **Status DRAM**: Status DRAM (draft, approved, active, evaluated, closed)
- **Progres Implementasi**: Progress bar dan persentase realisasi
- **Alert Keterlambatan**: Notifikasi untuk program yang terlambat

---

### 4.3 Manajemen Data Perhutanan Sosial

#### 4.3.1 Data PS Overview
- **Tabel Data PS**: Daftar semua unit PS dengan filter dan pencarian
- **Data Potensi**: Manajemen data potensi hutan
- **Data per Kabupaten**: Eksplorasi data berdasarkan kabupaten

#### 4.3.2 Profil Detail PS (`/ps/[psId]`)
Setiap unit PS memiliki halaman profil lengkap dengan tab-tab berikut:

**Tab Ringkasan:**
- Informasi dasar: lokasi (desa, kecamatan, kabupaten)
- Skema PS
- Luas lahan (hektar)
- Tahun SK (Surat Keputusan)
- Status PS (Sehat / Perlu Pendampingan)
- Jumlah kepala keluarga

**Tab Kelembagaan:**
- Nama lembaga pengelola
- Ketua lembaga
- Jumlah anggota
- Kepala desa
- Kontak informasi

**Tab Dokumen:**
- Upload dan kelola dokumen pendukung
- RKPS (Rencana Kerja Pengelolaan Sumberdaya)
- Surat-surat resmi
- Dokumen legal lainnya

**Tab Peta:**
- Upload dan tampilkan peta digital wilayah PS
- Koordinat GPS
- Visualisasi geografis

**Tab Galeri:**
- Upload foto dokumentasi kegiatan
- Dokumentasi kondisi lapangan
- Foto kelembagaan

**Tab Kegiatan:**
- Daftar kegiatan yang telah dilakukan
- Timeline kegiatan
- Dokumentasi kegiatan
- Koordinat GPS kegiatan

**Tab Catatan:**
- Catatan penting terkait PS
- History perubahan
- Nota dinas

---

### 4.4 Carbon Project Management

#### 4.4.1 Manajemen Proyek Karbon
- **Buat Carbon Project**: Form untuk membuat proyek karbon baru
- **Pilih Standar**: Verra VCS, Gold Standard, atau standar lainnya
- **Pilih Metodologi**: Metodologi karbon yang digunakan
- **Hubungkan PS**: Link multiple PS ke satu carbon project
- **Status Tracking**: Status proyek (draft, active, verified, closed)

#### 4.4.2 Output
- **Project Description**: Deskripsi proyek untuk PDD
- **Carbon Credits Calculation**: Perhitungan kredit karbon
- **Verification Status**: Status verifikasi proyek

---

### 4.5 Program Management

#### 4.5.1 Manajemen Program
- **Buat Program**: Form untuk membuat program baru
  - Program Karbon
  - Program Pemberdayaan Ekonomi PS
- **Tujuan Program**: Definisi tujuan dan sasaran
- **Lokasi Program**: Penentuan lokasi (PS, kabupaten, dll)
- **Target & Indikator**: Target yang ingin dicapai
- **Risiko**: Identifikasi dan mitigasi risiko
- **Timeline**: Jadwal pelaksanaan program

#### 4.5.2 Output
- **Logical Framework**: Logical framework otomatis
- **Input DRAM**: Data untuk DRAM
- **Input PDD**: Data untuk Project Design Document

---

### 4.6 DRAM (Dokumen Rencana Aksi Mitigasi)

#### 4.6.1 Fitur DRAM
DRAM berbentuk **data aktif** (bukan file statis), dengan fitur:

- **Tujuan Mitigasi**: Tujuan dari aksi mitigasi
- **Aksi Mitigasi**: Daftar aksi yang akan dilakukan
- **Target & Indikator**: Target dan indikator keberhasilan
- **Timeline**: Jadwal pelaksanaan aksi
- **Anggaran**: Rencana anggaran
- **Penanggung Jawab**: PIC (Person In Charge)

#### 4.6.2 Status DRAM
- **draft**: Masih dalam draft
- **approved**: Sudah disetujui
- **active**: Sedang aktif
- **evaluated**: Sudah dievaluasi
- **closed**: Sudah ditutup

#### 4.6.3 Output
- **DRAM Otomatis**: Dokumen DRAM di-generate dari data
- **Section PDD**: Project Activities untuk PDD

---

### 4.7 Implementasi Program

#### 4.7.1 Fitur Implementasi
- **Breakdown DRAM**: Breakdown DRAM menjadi kegiatan-kegiatan
- **Penugasan PIC**: Assign Person In Charge untuk setiap kegiatan
- **Upload Bukti Lapangan**: Upload foto, dokumen, atau file sebagai bukti
- **Progres Realisasi**: Tracking progres realisasi vs target

#### 4.7.2 Output
- **Evidence Implementasi**: Bukti-bukti implementasi program
- **Input Monitoring**: Data untuk monitoring & evaluasi

---

### 4.8 Monitoring & Evaluasi (Monev)

#### 4.8.1 Fitur Monitoring
- **Monitoring Indikator Karbon**: Tracking indikator karbon
- **Monitoring Sosial & Ekonomi**: Tracking dampak sosial dan ekonomi
- **Target vs Realisasi**: Perbandingan target dengan realisasi
- **Catatan Evaluasi**: Catatan hasil evaluasi
- **Rekomendasi**: Rekomendasi perbaikan

#### 4.8.2 Output
- **Laporan Monev**: Laporan monitoring & evaluasi
- **Evidence PDD**: Bukti untuk PDD dan verifikasi karbon

---

### 4.9 Pemberdayaan Ekonomi PS

#### 4.9.1 Fitur Pemberdayaan Ekonomi
- **Data Unit Usaha PS**: Data unit usaha di setiap PS
- **Jenis Usaha & Produk**: Katalog jenis usaha dan produk
- **Pendapatan & Volume**: Tracking pendapatan dan volume produksi
- **Jumlah Anggota**: Data anggota yang terlibat

#### 4.9.2 Output
- **Community Benefit**: Data untuk section Community Benefit di PDD
- **Leakage Control Evidence**: Bukti kontrol leakage

---

### 4.10 Stakeholder & FPIC

#### 4.10.1 Fitur Stakeholder Management
- **Data Stakeholder**: Database stakeholder terkait program
- **Proses Konsultasi**: Tracking proses konsultasi dengan stakeholder
- **Persetujuan Masyarakat**: Dokumentasi persetujuan masyarakat (FPIC)
- **Catatan Keberatan**: Catatan keberatan atau concern dari stakeholder

#### 4.10.2 Output
- **Stakeholder Consultation**: Data untuk section Stakeholder Consultation di PDD

---

### 4.11 Legal & Carbon Rights

#### 4.11.1 Fitur Legal Management
- **Hak Kelola PS**: Dokumentasi hak kelola Perhutanan Sosial
- **Hak Karbon**: Dokumentasi hak karbon
- **Perjanjian Kerja Sama**: Dokumen perjanjian kerja sama
- **Skema Bagi Hasil**: Dokumentasi skema bagi hasil

#### 4.11.2 Output
- **Legal Title & Carbon Ownership**: Data untuk section Legal Title & Carbon Ownership di PDD

---

### 4.12 PDD Generator

#### 4.12.1 Fitur PDD Generator
- **Pilih Carbon Project**: Pilih proyek karbon yang akan di-generate PDD
- **Ambil Data Otomatis**: Sistem mengambil data dari database secara otomatis
- **Generate PDD**: Generate dokumen PDD dalam format DOCX atau PDF

#### 4.12.2 Section PDD yang Digenerate
- **Project Description**: Deskripsi proyek
- **Mitigation Actions**: Aksi mitigasi dari DRAM
- **Monitoring Plan**: Rencana monitoring
- **Community Benefits**: Manfaat untuk masyarakat
- **Stakeholder**: Data stakeholder consultation
- **Legal**: Legal title dan carbon ownership

**Catatan Penting:** AI dilarang mengarang data baru di PDD. Semua data harus berasal dari database.

---

### 4.13 Upload & Import Data Excel

#### 4.13.1 Fitur Upload
- **Antarmuka Upload**: Form upload file Excel dengan format yang telah ditentukan
- **Validasi Format**: Validasi format file sebelum import
- **Preview Data**: Preview data sebelum import
- **Import Batch**: Import data dalam jumlah besar

#### 4.13.2 API Import
- **Endpoint API**: `/api/excel/import/route.ts`
- **Processing**: Parsing dan validasi data Excel
- **Database Insert**: Menyimpan data ke Supabase
- **Error Handling**: Handling error dan rollback jika terjadi masalah

#### 4.13.3 Skrip CLI
- **Import Scripts**: Tersedia skrip Node.js untuk import batch di luar antarmuka web
- **Template Excel**: Template Excel untuk import data

---

### 4.14 Statistik & Reporting

#### 4.14.1 Dashboard Statistik
- **Statistik Nasional**: Statistik agregat seluruh data
- **Statistik per Kabupaten**: Breakdown statistik per kabupaten
- **Visualisasi**: Charts dan grafik untuk visualisasi data
- **Filter & Export**: Filter data dan export ke Excel/PDF

---

## 5. Technical Architecture

### 5.1 Technology Stack

#### 5.1.1 Frontend
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4
- **UI Components**: 
  - Radix UI primitives (@radix-ui/react-*)
  - shadcn/ui components
  - Lucide React icons
- **Form Management**: React Hook Form 7.70.0 + Zod 4.3.5
- **Internationalization**: next-intl 4.7.0
- **Date Handling**: date-fns 4.1.0
- **Excel Processing**: xlsx 0.18.5

#### 5.1.2 Backend & Database
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (JWT + cookies)
- **Database**: PostgreSQL dengan Row-Level Security (RLS)
- **Storage**: Supabase Storage untuk file upload
- **API**: Next.js API Routes (Server Actions)

#### 5.1.3 Deployment
- **Hosting**: Netlify (dengan @netlify/plugin-nextjs)
- **Build Tool**: Next.js build system
- **Environment**: Node.js (versi sesuai .nvmrc)

---

### 5.2 Architecture Patterns

#### 5.2.1 Application Structure
```
app/
├── (auth)/              # Auth routes
│   └── login/
├── [locale]/            # Internationalized routes
│   ├── (auth)/
│   └── layout.tsx
├── api/                 # API routes
│   └── excel/
│       └── import/
├── dashboard/           # Dashboard routes
│   ├── carbon-projects/
│   ├── data/
│   ├── kabupaten/
│   ├── potensi/
│   ├── programs/
│   ├── statistics/
│   └── upload/
└── ps/                  # PS detail pages
    └── [psId]/
        └── components/
```

#### 5.2.2 Component Architecture
- **Server Components**: Default untuk data fetching
- **Client Components**: Untuk interaktif UI (forms, buttons)
- **Shared Components**: Reusable UI components di `components/ui/`
- **Feature Components**: Feature-specific components di `app/[feature]/components/`

#### 5.2.3 Data Flow
1. **Server Components** fetch data dari Supabase
2. **Client Components** handle user interactions
3. **API Routes** process form submissions dan file uploads
4. **Supabase RLS** enforces data access at database level

---

### 5.3 Database Architecture

#### 5.3.1 Core Tables
- `perhutanan_sosial`: Data utama PS
- `kabupaten`: Data kabupaten
- `kecamatan`: Data kecamatan
- `desa`: Data desa
- `lembaga_pengelola`: Data lembaga pengelola PS
- `profiles`: User profiles dengan role
- `potensi`: Data potensi hutan

#### 5.3.2 Program & Carbon Tables
- `carbon_projects`: Proyek karbon
- `programs`: Program
- `dram`: Dokumen Rencana Aksi Mitigasi
- `aksi_mitigasi`: Aksi mitigasi
- `kegiatan`: Kegiatan implementasi
- `output`: Output kegiatan
- `indikator`: Indikator monitoring
- `monitoring_evaluasi`: Data monitoring & evaluasi

#### 5.3.3 Supporting Tables
- `dokumen`: Dokumen PS
- `galeri`: Foto galeri
- `peta`: Peta digital
- `kegiatan_ps`: Kegiatan per PS
- `catatan`: Catatan penting
- `stakeholder`: Data stakeholder
- `legal_documents`: Dokumen legal
- `pemberdayaan_ekonomi`: Data pemberdayaan ekonomi

---

## 6. Data Model

### 6.1 Hierarki Data Wajib

```
Carbon Project
 └── Program
      └── DRAM
           └── Aksi Mitigasi
                └── Kegiatan
                     └── Output
                          └── Indikator
                               └── Monitoring & Evaluasi
```

**Prinsip:** Semua data HARUS terhubung secara hierarkis. Tidak boleh ada input data tanpa konteks program & DRAM.

---

### 6.2 Entity Relationship

#### 6.2.1 Core Entities
- **Perhutanan Sosial (PS)**
  - Belongs to: Kabupaten, Kecamatan, Desa
  - Has one: Lembaga Pengelola
  - Has many: Dokumen, Galeri, Peta, Kegiatan, Catatan

- **Kabupaten**
  - Has many: PS, Kecamatan, Desa

- **Lembaga Pengelola**
  - Belongs to: PS
  - Has one: Ketua, Kepala Desa

#### 6.2.2 Program Entities
- **Carbon Project**
  - Has many: Programs
  - Has many: PS (many-to-many)

- **Program**
  - Belongs to: Carbon Project
  - Has one: DRAM
  - Has many: Kegiatan, Monitoring

- **DRAM**
  - Belongs to: Program
  - Has many: Aksi Mitigasi

- **Aksi Mitigasi**
  - Belongs to: DRAM
  - Has many: Kegiatan

- **Kegiatan**
  - Belongs to: Aksi Mitigasi
  - Has many: Output

- **Output**
  - Belongs to: Kegiatan
  - Has many: Indikator

- **Indikator**
  - Belongs to: Output
  - Has many: Monitoring & Evaluasi

---

## 7. User Interface & User Experience

### 7.1 Design Principles
- **Clean & Modern**: Desain bersih dan modern dengan Tailwind CSS
- **Responsive**: Mobile-first responsive design
- **Accessible**: Mengikuti accessibility best practices
- **Consistent**: Konsistensi komponen UI menggunakan shadcn/ui
- **Intuitive**: Navigasi yang intuitif dengan sidebar dan breadcrumbs

### 7.2 Color Scheme
- **Primary**: Sesuai dengan brand yayasan
- **Status Colors**: 
  - Green: Success, Active, Sehat
  - Red: Error, Perlu Pendampingan
  - Yellow: Warning
  - Blue: Information

### 7.3 Navigation Structure

#### 7.3.1 Sidebar Menu
Menu items disesuaikan berdasarkan role user:

1. **Dashboard** (Semua role)
2. **Data PS** (Semua role)
3. **Data Potensi** (Semua role)
4. **Per Kabupaten** (Semua role)
5. **Statistik** (Semua role)
6. **Dashboard Program** (Admin, Program Planner, Program Implementer, Carbon Specialist, Monev)
7. **Carbon Projects** (Admin, Carbon Specialist, Program Planner)
8. **Program Management** (Admin, Program Planner, Carbon Specialist)
9. **DRAM Management** (Admin, Program Planner)
10. **Implementasi Program** (Admin, Program Implementer, Program Planner)
11. **Monitoring & Evaluasi** (Admin, Monev, Program Planner, Carbon Specialist)
12. **Pemberdayaan Ekonomi** (Admin, Program Planner, Program Implementer)
13. **Stakeholder & FPIC** (Admin, Carbon Specialist, Program Planner)
14. **Legal & Carbon Rights** (Admin, Carbon Specialist)
15. **PDD Generator** (Admin, Carbon Specialist)
16. **Upload Excel** (Admin, Monev)
17. **Pengguna** (Admin only)
18. **Pengaturan** (Admin only)

### 7.4 Key User Flows

#### 7.4.1 Login Flow
1. User mengakses aplikasi
2. Redirect ke `/login` jika belum authenticated
3. Input email dan password
4. Submit → Supabase Auth
5. Redirect ke `/dashboard` setelah berhasil

#### 7.4.2 Data Entry Flow
1. User login dengan role yang sesuai
2. Navigate ke modul yang diinginkan
3. Klik "Tambah" atau "Create"
4. Isi form dengan validasi
5. Submit → Save ke database
6. Redirect ke detail atau list

#### 7.4.3 Upload Excel Flow
1. Admin/Monev login
2. Navigate ke "Upload Excel"
3. Pilih file Excel
4. Preview data
5. Confirm import
6. System process dan save ke database
7. Show success/error message

#### 7.4.4 PDD Generation Flow
1. Carbon Specialist login
2. Navigate ke "PDD Generator"
3. Pilih Carbon Project
4. System mengambil data dari database
5. Generate PDD (DOCX/PDF)
6. Download file

---

## 8. Security & Compliance

### 8.1 Authentication Security
- **Password Hashing**: Supabase Auth menggunakan bcrypt
- **JWT Tokens**: Secure JWT dengan expiration
- **Session Management**: Cookie-based session dengan httpOnly flag
- **CSRF Protection**: Next.js built-in CSRF protection

### 8.2 Authorization Security
- **Role-Based Access Control**: RBAC di application level
- **Row-Level Security (RLS)**: Database-level security di Supabase
- **Permission Checking**: Server-side validation untuk semua operations
- **UI Adaptation**: Hide/show UI elements berdasarkan role

### 8.3 Data Security
- **Encryption at Rest**: Supabase encrypts data at rest
- **Encryption in Transit**: HTTPS/TLS untuk semua komunikasi
- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **XSS Prevention**: React's built-in XSS protection

### 8.4 Security Headers
Security headers dikonfigurasi di `next.config.ts`:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`
- `X-DNS-Prefetch-Control: on`

### 8.5 Audit Trail
- **Created At/Updated At**: Timestamp untuk semua records
- **Created By/Updated By**: User ID untuk tracking perubahan
- **History Logs**: (Future enhancement) Log semua perubahan data

---

## 9. Integration & APIs

### 9.1 Internal APIs

#### 9.1.1 Excel Import API
- **Endpoint**: `/api/excel/import`
- **Method**: POST
- **Input**: Excel file (multipart/form-data)
- **Output**: Success/error response
- **Processing**: Parse Excel → Validate → Insert to database

### 9.2 External Integrations

#### 9.2.1 Supabase Integration
- **Auth**: Supabase Auth untuk authentication
- **Database**: PostgreSQL via Supabase client
- **Storage**: Supabase Storage untuk file uploads
- **Real-time**: (Future) Supabase Realtime untuk live updates

### 9.3 Future Integration Possibilities
- **Kementerian LHK API**: Integrasi dengan sistem pemerintah
- **Satellite Imagery API**: Integrasi dengan data satelit untuk monitoring
- **Payment Gateway**: (Jika diperlukan) Integrasi payment untuk komersialisasi
- **Email Service**: Email notifications untuk alerts

---

## 10. Performance Requirements

### 10.1 Response Time
- **Page Load**: < 2 seconds untuk initial load
- **API Response**: < 1 second untuk standard queries
- **File Upload**: Progress indicator untuk large files
- **Excel Import**: Background processing untuk large imports

### 10.2 Scalability
- **Concurrent Users**: Support 50+ concurrent users
- **Data Volume**: Support 10,000+ PS records
- **File Storage**: Scalable storage via Supabase Storage

### 10.3 Optimization
- **Server Components**: Default untuk optimal performance
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic code splitting by Next.js
- **Caching**: Browser caching untuk static assets

---

## 11. Deployment & Infrastructure

### 11.1 Deployment Platform
- **Primary**: Netlify
- **Alternative**: Vercel, AWS, atau platform Next.js lainnya

### 11.2 Environment Variables
Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)

### 11.3 Build Process
1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Deploy: Automatic via Netlify/Vercel

### 11.4 Database Migrations
- **Location**: `supabase/migrations/`
- **Execution**: Manual atau via Supabase CLI
- **Versioning**: Timestamp-based migration files

---

## 12. Roadmap & Future Enhancements

### 12.1 Short-term (3-6 months)
- ✅ Complete DRAM module implementation
- ✅ Complete PDD Generator
- ✅ Enhanced monitoring dashboard
- ✅ Mobile-responsive improvements
- ✅ Advanced search and filtering

### 12.2 Medium-term (6-12 months)
- 🔄 Mobile native application (iOS/Android)
- 🔄 Real-time collaboration features
- 🔄 Advanced analytics dengan charts
- 🔄 Email notifications system
- 🔄 Export to PDF/Excel enhancements

### 12.3 Long-term (12+ months)
- 🔮 AI/ML untuk prediksi dan analisis
- 🔮 Integration dengan satellite imagery
- 🔮 Integration dengan Kementerian LHK API
- 🔮 Public API untuk third-party integrations
- 🔮 Multi-tenant support untuk replikasi ke yayasan lain

---

## Appendix

### A. Glossary
- **PS**: Perhutanan Sosial
- **PKS**: Perhutanan Kemitraan Sosial
- **DRAM**: Dokumen Rencana Aksi Mitigasi
- **PDD**: Project Design Document
- **RKPS**: Rencana Kerja Pengelolaan Sumberdaya
- **Monev**: Monitoring & Evaluasi
- **FPIC**: Free, Prior and Informed Consent
- **RLS**: Row-Level Security
- **RBAC**: Role-Based Access Control

### B. References
- Next.js Documentation: https://nextjs.org/docs
- Supabase Documentation: https://supabase.com/docs
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- React Documentation: https://react.dev

### C. Contact Information
- **Organization**: Yayasan Antangpatahu Mahaga Lewu
- **Project Repository**: (Internal)
- **Support**: (Contact information)

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Januari 2025 | Development Team | Initial Product Specification Document |

---

*Dokumen ini merupakan spesifikasi produk untuk Sistem Informasi Perhutanan Sosial & PKS. Untuk informasi lebih lanjut, hubungi tim pengembang atau administrator sistem.*
