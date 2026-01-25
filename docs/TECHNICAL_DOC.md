## Dokumen Teknis Aplikasi – Sistem Informasi Perhutanan Sosial & PKS

### 1. Ringkasan Aplikasi

Aplikasi ini adalah **Sistem Informasi Perhutanan Sosial & PKS** yang digunakan secara internal oleh **Yayasan Antangpatahu Mahaga Lewu** untuk mengelola dan memantau data Perhutanan Sosial (PS) di 4 kabupaten (Katingan, Kapuas, Pulang Pisau, Gunung Mas). Fitur utama:

- **Autentikasi pengguna** berbasis email/password dengan Supabase Auth.
- **Dashboard nasional** yang menampilkan statistik PS (jumlah unit, luas, status RKPS, status peta).
- **Manajemen dan profil detail PS** per lokasi (`/ps/[psId]`) dengan 7 tab informasi.
- **Upload & import data Excel** ke database Supabase melalui API endpoint.
- **Dashboard per kabupaten** dan tampilan data terperinci.
- **Role-based access control (RBAC)** dengan 6 peran: `admin`, `carbon_specialist`, `program_planner`, `program_implementer`, `monev`, `viewer`.
- **Internationalization (i18n)** dengan dukungan Bahasa Indonesia dan Chinese Traditional.
- **Carbon Project Management** untuk mengelola proyek karbon dan PDD generator.
- **Program Management** untuk manajemen program dan DRAM (Dokumen Rencana Aksi Mitigasi).
- **Multiple API endpoints** untuk berbagai fitur: chat, compliance-check, financial-model, dll.

---

### 2. Arsitektur Teknis

- **Framework**: Next.js 16.1.1 (App Router, direktori `app/`).
- **Bahasa**: TypeScript 5 + React 19.
- **UI**: Tailwind CSS 4 + shadcn/ui components + Radix UI primitives.
- **Backend & Database**: Supabase (PostgreSQL dengan Row-Level Security, Auth, Storage).
- **Autentikasi & Session**: Supabase Auth dengan JWT + cookies via middleware Next.js.
- **Internationalization**: next-intl untuk multi-language support (id, zh-TW).
- **Validation**: Zod untuk schema validation + React Hook Form untuk form handling.
- **Hosting**: Netlify dengan @netlify/plugin-nextjs.

#### Struktur Direktori Utama:

```
app/
├── [locale]/                    # Internationalized routes
│   ├── (auth)/login/           # Halaman login
│   ├── dashboard/              # Dashboard utama
│   └── ps/[psId]/              # Profil detail PS
├── api/                        # API Routes
│   ├── carbon-projects/        # Manajemen proyek karbon
│   ├── chat/                   # Chat functionality
│   ├── compliance-check/       # Compliance checking
│   ├── dashboard/              # Dashboard data
│   ├── excel/import/           # Import Excel
│   ├── financial-model/        # Model keuangan
│   └── ... (13 total endpoints)
└── ... (other app routes)

lib/
├── supabase/                   # Supabase clients
│   ├── client.ts              # Browser client
│   └── server.ts              # Server client
├── auth/                       # Authentication utilities
│   └── rbac.ts                # RBAC dengan 6 roles
├── excel/                      # Excel processing
│   └── parser.ts              # Parser untuk data Excel
├── types/                      # TypeScript definitions
│   └── pks.ts                 # Tipe data domain
└── utils.ts                   # Utility functions

supabase/migrations/           # Database migrations (15+ files)
components/                    # UI Components
├── ui/                        # shadcn/ui components
├── dashboard/                 # Dashboard components
└── chat/                      # Chat components

scripts/                       # CLI utilities untuk data import
testsprite_tests/              # Automated tests dengan Testsprite
docs/                          # 📚 Dokumentasi lengkap
```

#### API Endpoints yang Tersedia:

1. **`/api/carbon-projects`** - Manajemen proyek karbon (GET/POST)
2. **`/api/carbon-model-details`** - Detail model karbon
3. **`/api/chat`** - Chat functionality
4. **`/api/compliance-check`** - Compliance checking
5. **`/api/dashboard`** - Data dashboard
6. **`/api/deforestation-drivers`** - Data drivers deforestasi
7. **`/api/excel/import`** - Import data Excel
8. **`/api/financial-model`** - Model keuangan
9. **`/api/forest-status-history`** - History status hutan
10. **`/api/implementation-timeline`** - Timeline implementasi
11. **`/api/land-tenure`** - Data land tenure
12. **`/api/organizations`** - Manajemen organisasi
13. **`/api/potensi`** - Data potensi
14. **`/api/profile`** - Manajemen profil user
15. **`/api/ps`** - Data Perhutanan Sosial

Semua endpoint dilindungi dengan autentikasi dan authorization berdasarkan RBAC.

---

### 3. Alur Autentikasi & Middleware

#### 3.1 Middleware (`middleware.ts`)

Fungsi:

- Membuat Supabase server client (`createServerClient`) dengan integrasi cookies.
- Mengecek session Supabase pada setiap request.

Logika utama:

- Menentukan apakah path termasuk halaman auth:
  - `"/"` dan `"/login"` dianggap halaman auth.
- **Jika tidak ada session dan bukan halaman auth** → redirect ke `"/login"`.
- **Jika sudah login dan mengakses `"/"` atau `"/login"`** → redirect ke `"/dashboard"`.

Middleware diterapkan ke semua path kecuali:

- `/_next/static`, `/_next/image`, `favicon.ico`, dan path di bawah `public/`.

#### 3.2 Halaman Login (`app/(auth)/login/page.tsx`)

- **Client Component** dengan `useState` dan `useRouter`.
- Menggunakan `createClient` dari `lib/supabase/client` untuk memanggil:
  - `supabase.auth.signInWithPassword({ email, password })`.
- Fitur:
  - Form login standar (email/password).
  - Redirect ke `"/dashboard"` saat login berhasil (`router.push("/dashboard")` + `router.refresh()`).
  - Penanganan error dengan komponen `Alert`.
  - **Demo login** dengan tiga role:
    - `admin@yayasan.com` / `admin123`
    - `monev@yayasan.com` / `monev123`
    - `viewer@yayasan.com` / `viewer123`

#### 3.3 Supabase Client

- `lib/supabase/client.ts`:
  - Menggunakan `createBrowserClient` dari `@supabase/ssr`.
  - Membaca `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Melempar error jika environment variable tidak tersedia.

- `lib/supabase/server.ts`:
  - Menggunakan `createServerClient` dari `@supabase/ssr`.
  - Mengakses cookies via `next/headers`.
  - Menyediakan `createClient()` async untuk dipakai di Server Component / route handler.

---

### 4. Manajemen Role & Hak Akses (RBAC)

File: `lib/auth/rbac.ts`

Konsep:

- **Roles**: 6 peran yang didefinisikan: `'admin'`, `'carbon_specialist'`, `'program_planner'`, `'program_implementer'`, `'monev'`, `'viewer'`.
- Tabel `profiles` menyimpan `role` dan informasi pengguna.

Fungsi utama:

- **`getUserRole(userId?)`**  
  Mengambil role user dari tabel `profiles` berdasarkan `id` (default: user yang sedang login).
- **`getUserProfile(userId?)`**  
  Mengambil profil lengkap dari `profiles`.
- **`checkUserRole(requiredRoles, userId?)`**  
  Mengecek apakah role user termasuk dalam salah satu `requiredRoles`.

Helper functions untuk permission checking:

- **`canEdit`** → `admin` atau `monev`.
- **`isAdmin`** → hanya `admin`.
- **`canDelete`** → hanya `admin`.
- **`canManageCarbonProjects`** → `admin` atau `carbon_specialist`
- **`canManagePrograms`** → `admin` atau `program_planner`
- **`canManageDRAM`** → `admin` atau `program_planner`
- **`canImplementPrograms`** → `admin` atau `program_implementer`
- **`canDoMonitoring`** → `admin` atau `monev`
- **`canGeneratePDD`** → `admin` atau `carbon_specialist`
- **`canManageLegal`** → `admin` atau `carbon_specialist`
- **`canManageStakeholders`** → `admin`, `carbon_specialist`, atau `program_planner`
- **`canManageEconomicEmpowerment`** → `admin` atau `program_planner`

Permissions terpusat (didefinisikan dalam `Permissions` object):

- `READ`: Semua 6 role
- `EDIT`: `['admin', 'monev', 'program_planner', 'program_implementer', 'carbon_specialist']`
- `DELETE`: Hanya `['admin']`
- `MANAGE_USERS`: Hanya `['admin']`
- `CARBON_PROJECTS`: `['admin', 'carbon_specialist']`
- `PROGRAM_MANAGEMENT`: `['admin', 'program_planner', 'carbon_specialist']`
- `DRAM_MANAGEMENT`: `['admin', 'program_planner']`
- `IMPLEMENTATION`: `['admin', 'program_implementer', 'program_planner']`
- `MONITORING_EVALUATION`: `['admin', 'monev', 'program_planner', 'carbon_specialist']`
- `ECONOMIC_EMPOWERMENT`: `['admin', 'program_planner', 'program_implementer']`
- `STAKEHOLDER_MANAGEMENT`: `['admin', 'carbon_specialist', 'program_planner']`
- `LEGAL_MANAGEMENT`: `['admin', 'carbon_specialist']`
- `PDD_GENERATION`: `['admin', 'carbon_specialist']`
- `UPLOAD_EXCEL`: `['admin', 'monev']`

Fungsi `hasPermission(permission, userId?)` dan `getUserPermissions(userId?)` tersedia untuk permission checking yang lebih fleksibel.

RLS di Supabase (lihat folder `supabase/migrations`) menguatkan pembatasan ini di level database.

---

### 5. Fitur Dashboard

File utama: `app/dashboard/page.tsx`

Karakteristik:

- **Server Component async** yang:
  - Membuat Supabase client server via `lib/supabase/server`.
  - Query:
    - Tabel `perhutanan_sosial` (kolom: `id`, `kabupaten_id`, `luas_ha`, `rkps_status`, `peta_status`).
    - Tabel `kabupaten` (`id`, `nama`).

Perhitungan utama:

- `totalPS`: jumlah baris di `perhutanan_sosial`.
- `totalLuas`: penjumlahan `luas_ha` (default 0 jika null).
- `totalRKPSAda`: jumlah PS dengan `rkps_status = 'ada'`.
- `totalPetaAda`: jumlah PS dengan `peta_status = 'ada'`.

Statistik per kabupaten:

- Untuk setiap kabupaten:
  - `jumlah_ps`, `luas_ha`, `rkps_ada`, `peta_ada` dihitung dari data PS yang terkait `kabupaten_id`.

UI:

- Kartu statistik (Total PS, Total Luas, RKPS Tersedia, Peta Tersedia).
- Kartu aksi:
  - Upload Excel (`/dashboard/upload`).
  - Data per kabupaten (`/dashboard/kabupaten/[id]`).
- Tabel ringkasan per kabupaten, termasuk persentase dan icon status.

---

### 6. Halaman Profil Perhutanan Sosial (`/ps/[psId]`)

File: `app/ps/[psId]/page.tsx`

Alur data:

1. **`getPsProfile(psId)`**
   - Menggunakan Supabase server client.
   - Query tabel `perhutanan_sosial` dengan join ke `kabupaten`:
     - Mendapatkan informasi dasar: lokasi (desa, kecamatan, kabupaten), skema, luas, tanggal SK, status RKPS dan peta.
   - Query tabel `lembaga_pengelola` untuk:
     - `nama`, `ketua`, `jumlah_anggota`, `kepala_desa` berdasarkan `perhutanan_sosial_id`.

2. **Penentuan status (`PsStatus`)**
   - Default: `SEHAT`.
   - Jika `rkps_status = 'belum'` atau `peta_status = 'belum'` → `PERLU_PENDAMPINGAN`.

3. **Penentuan nama lembaga**
   - Fungsi `getDefaultLembagaName(skema, pemegangIzin)`:
     - `skema` mengandung `"desa"` → `LPHD {pemegangIzin}`.
     - `skema` mengandung `"kemasyarakatan"` → `KUPS {pemegangIzin}`.
     - `skema` mengandung `"tanaman"` → `KTH {pemegangIzin}`.
     - `skema` mengandung `"adat"` → `Lembaga Adat {pemegangIzin}`.
     - Lainnya → `Lembaga Pengelola {pemegangIzin}`.
   - Fungsi `cleanLembagaName(nama, skema)`:
     - Jika nama kosong → gunakan default di atas.
     - Jika `skema` bukan Hutan Desa tetapi nama diawali `LPHD` → prefix `LPHD` dihapus.
     - Jika setelah dibersihkan nama kosong → fallback ke default.

4. **Mapping ke tipe `PsProfile`**
   - Field: `id`, `namaPs`, `desa`, `kecamatan`, `kabupaten`, `skema`, `luasHa`, `tahunSk`, `status`.
   - Field lembaga: `nama`, `ketua`, `jumlahAnggota`, `kepalaDesa`.

5. **Component halaman**
   - Jika data PS tidak ditemukan:
     - Menampilkan pesan “Data Tidak Ditemukan” dan tombol kembali ke `/dashboard/data`.
   - Jika ditemukan:
     - Merender `PsProfileContent` dengan props `ps` dan `psId`.
   - Detail tab (ringkasan, kelembagaan, dokumen, peta, galeri, kegiatan, catatan) diatur dalam folder `app/ps/[psId]/components/`.

---

### 7. Lapisan Data & Database (Supabase)

Skema database dikelola melalui file migrasi di `supabase/migrations` (misal: `20250106_initial.sql`, `20250107_create_potensi_table.sql`, dll.).

Secara garis besar:

- **Tabel inti**:
  - `perhutanan_sosial`: data unit PS (luas, lokasi, skema, status dokumen, status peta, dll.).
  - `kabupaten`: daftar kabupaten.
  - `lembaga_pengelola`: informasi lembaga pengelola per unit PS.
  - Tabel tab PS (kegiatan, dokumen, peta, galeri, catatan, ringkasan, dsb.) sesuai migrasi `*_ps_tabs_tables.sql`.
- **Relasi utama**:
  - `perhutanan_sosial.kabupaten_id` → `kabupaten.id`.
  - `lembaga_pengelola.perhutanan_sosial_id` → `perhutanan_sosial.id`.
- **Keamanan (RLS)**:
  - Migrasi seperti `*_rls_*.sql` dan fungsi `check_user_role` mengatur akses berdasarkan role yang disimpan di `profiles`.
- **Storage**:
  - Migrasi `20250119_setup_storage_buckets.sql` mengindikasikan adanya bucket untuk file (dokumen, peta, galeri, dsb.).

---

### 8. Import Data Excel

Pipeline import:

- Endpoint API: `app/api/excel/import/route.ts`
  - Menerima file Excel dari frontend.
  - Menggunakan helper di `lib/excel/parser.ts` untuk parsing data.
  - Menyimpan data ke tabel-tabel Supabase (misalnya `perhutanan_sosial`, potensi, dsb.).

- Skrip CLI di folder `scripts/`:
  - `import-pks.js`, `import-potensi.js`, `import-potensi-v2.js`, `init-kabupaten.js`, `check-potensi-data.js`, dll.
  - Digunakan untuk import batch dan pengecekan data di luar antarmuka web.

Frontend:

- Dashboard menyediakan entry point `Upload Data Excel` yang mengarah ke halaman `/dashboard/upload`.

---

### 9. Alur Utama Penggunaan Sistem

1. **Akses awal**
   - User membuka root `"/"` → halaman login dirender.
   - Middleware:
     - Jika belum login → tetap di login.
     - Jika sudah login → redirect otomatis ke `"/dashboard"`.

2. **Login**
   - User mengisi email/password.
   - `supabase.auth.signInWithPassword` dipanggil.
   - Jika sukses → session disimpan di cookie; user diarahkan ke `"/dashboard"`.

3. **Dashboard nasional**
   - Halaman `/dashboard` mengambil data dari Supabase dan menampilkan:
     - Total PS, total luas, jumlah PS dengan RKPS dan peta tersedia.
     - Ringkasan per kabupaten.
     - Aksi seperti upload Excel dan navigasi ke data per kabupaten.

4. **Eksplorasi data**
   - User memilih kabupaten → melihat daftar PS per kabupaten.
   - User memilih satu PS → masuk ke `/ps/[psId]` untuk melihat profil lengkap dan tab-tab terkait.

5. **Pengelolaan data (admin/monev)**
   - Berdasarkan role:
     - `admin` dan `monev` dapat mengedit data (melalui form dan fitur upload/import).
     - `admin` dapat menghapus data dan mengelola pengguna (sesuai definisi permission).

---

### 10. Dependensi & Konfigurasi

- **Dependensi utama (high level)**:
  - `next`, `react`, `react-dom`.
  - `@supabase/ssr` untuk integrasi Supabase di Next.js App Router.
  - `lucide-react` untuk ikon.
  - Tailwind CSS + PostCSS (lihat `globals.css`, `postcss.config.mjs`).
  - ESLint (`eslint.config.mjs`) untuk linting.

- **Environment variables yang wajib**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 11. Catatan Pengembangan Lanjutan

- Penambahan fitur baru sebaiknya mengikuti pola:
  - Buat migrasi SQL untuk tabel/kolom baru di `supabase/migrations`.
  - Tambah tipe di `lib/types` bila perlu.
  - Tambah komponen dan halaman di `app/` sebagai Server/Client Component sesuai kebutuhan.
  - Gunakan helper RBAC di `lib/auth/rbac.ts` untuk membatasi hak akses.
- Untuk integrasi eksternal atau laporan:
  - Dapat memanfaatkan route API Next.js di `app/api/` yang membaca langsung dari Supabase.

