# Sistem Informasi Perhutanan Sosial & PKS

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)
![React](https://img.shields.io/badge/React-19.2.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-purple)

Aplikasi internal untuk **Yayasan Antangpatahu Mahaga Lewu** yang digunakan untuk mengelola, memantau, dan mengevaluasi data Perhutanan Sosial (PS) di 4 kabupaten secara terpusat dan real-time.

## 🚀 Fitur Utama

- **Dashboard Nasional** - Statistik agregat PS (jumlah unit, luas lahan, status RKPS/Peta)
- **Manajemen Data PS** - Profil detail setiap unit PS dengan tab informasi lengkap
- **Role-Based Access Control** - Sistem hak akses 3 level: Admin, Monev, Viewer
- **Import Data Excel** - Upload dan import data batch dari file Excel
- **Multi-language Support** - Dukungan Bahasa Indonesia dan Chinese Traditional
- **Carbon Project Management** - Manajemen proyek karbon dan PDD Generator
- **Program Management** - Manajemen program dan DRAM (Dokumen Rencana Aksi Mitigasi)

## 🏗️ Arsitektur Teknis

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Database**: PostgreSQL dengan Row-Level Security (RLS)
- **Deployment**: Netlify (dengan Next.js plugin)

### Struktur Proyek
```
app-db/
├── app/                    # Next.js App Router pages
├── components/            # Reusable UI components
├── lib/                   # Utilities & libraries
│   ├── supabase/         # Supabase client config
│   ├── auth/             # RBAC utilities
│   └── excel/            # Excel parser
├── supabase/             # Database migrations & schema
├── scripts/              # CLI utilities for data import
├── docs/                 # 📚 Documentation (technical, database, etc.)
├── public/               # Static assets
└── testsprite_tests/     # Automated tests
```

## 📦 Instalasi dan Setup

### Prasyarat
- Node.js 18+ (lihat `.nvmrc` untuk versi yang disarankan)
- npm atau yarn
- Akun Supabase (untuk database dan auth)

### Langkah-langkah
1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd app-db
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` dan tambahkan:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Setup database**
   - Jalankan migrasi SQL di folder `supabase/migrations/`
   - Atau gunakan Supabase CLI: `supabase db push`

5. **Jalankan development server**
   ```bash
   npm run dev
   ```

6. **Buka browser**
   Navigasi ke [http://localhost:3000](http://localhost:3000)

## 👥 Pengguna dan Hak Akses

### Credentials Demo
| Email | Password | Role | Hak Akses |
|-------|----------|------|-----------|
| `admin@yayasan.com` | `admin123` | Admin | Full access |
| `monev@yayasan.com` | `monev123` | Monev | Read + Edit (no delete) |
| `viewer@yayasan.com` | `viewer123` | Viewer | Read-only |

### Role Hierarchy
```
Admin (Full Access)
├── Carbon Specialist
├── Program Planner
├── Program Implementer
├── Monev Officer
└── Viewer (Read-only)
```

## 📖 Dokumentasi Lengkap

Semua dokumentasi teknis telah dipindahkan ke direktori [`docs/`](./docs/). Lihat [README dokumentasi](./docs/README.md) untuk navigasi lengkap.

### Dokumentasi Penting:
- **[📋 Spesifikasi Produk](./docs/PRODUCT_SPECIFICATION_DOC.md)** - Fitur lengkap, user roles, roadmap
- **[🔧 Dokumen Teknis](./docs/TECHNICAL_DOC.md)** - Arsitektur, alur autentikasi, implementasi
- **[🗄️ Desain Database](./docs/DESAIN_DATABASE_SISTEM_INFORMASI_PERHUTANAN_SOSIAL.md)** - Skema tabel, relasi, RLS, migrasi
- **[🚀 Deployment](./docs/NETLIFY_DEPLOYMENT.md)** - Panduan deployment ke Netlify

## 🧪 Testing

Proyek ini menggunakan **Testsprite** untuk automated testing. Test cases dapat ditemukan di folder `testsprite_tests/`.

### Menjalankan Testsprite
```bash
# Bootstrap Testsprite (sesuaikan port jika diperlukan)
npx @testsprite/testsprite-mcp@latest

# Generate dan execute tests
npm run test:sprite
```

## 🚢 Deployment

### Deploy ke Netlify
1. Push kode ke repository Git
2. Connect repository ke Netlify
3. Konfigurasi environment variables di Netlify dashboard
4. Deploy otomatis akan berjalan

### Build untuk Production
```bash
npm run build:prod
```

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

### Code Style
- Gunakan TypeScript strict mode
- Ikuti konvensi naming Next.js App Router
- Gunakan ESLint untuk linting (`npm run lint`)
- Format kode dengan Prettier (terintegrasi dengan ESLint)

## 📄 Lisensi

Proyek ini adalah software proprietary milik **Yayasan Antangpatahu Mahaga Lewu**. Penggunaan, modifikasi, dan distribusi dibatasi untuk keperluan internal yayasan.

## 🆘 Support

Untuk bantuan teknis atau pertanyaan:
- Dokumentasi: Lihat folder [`docs/`](./docs/)
- Issues: Buat issue di repository internal
- Tim Pengembang: Hubungi tim pengembang internal yayasan

---

**Yayasan Antangpatahu Mahaga Lewu** © 2025 - Sistem Informasi Perhutanan Sosial & PKS