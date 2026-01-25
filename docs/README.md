# Dokumentasi Sistem Informasi Perhutanan Sosial & PKS

Dokumentasi lengkap untuk aplikasi Sistem Informasi Perhutanan Sosial & PKS milik Yayasan Antangpatahu Mahaga Lewu.

## Daftar Dokumentasi

### 📋 Spesifikasi dan Desain
- **[Spesifikasi Produk](./PRODUCT_SPECIFICATION_DOC.md)** - Dokumen spesifikasi produk lengkap dengan fitur, user roles, dan roadmap
- **[Dokumen Teknis](./TECHNICAL_DOC.md)** - Dokumentasi teknis arsitektur, alur autentikasi, dan implementasi

### 🗄️ Database
- **[Desain Database](./DESAIN_DATABASE_SISTEM_INFORMASI_PERHUTANAN_SOSIAL.md)** - Desain lengkap database termasuk tabel, relasi, RLS, dan migrasi

### 🔧 Deployment & Operasional
- **[Deployment Netlify](./NETLIFY_DEPLOYMENT.md)** - Panduan deployment aplikasi ke Netlify
- **[Diagnostik Supabase](./DIAGNOSTIK_SUPABASE.md)** - Panduan troubleshooting untuk Supabase

### 📊 Fungsionalitas
- **[Fungsi dan Manfaat Aplikasi](./FUNGSI_MANFAAT_APLIKASI-YAYASAN.md)** - Penjelasan fungsi dan manfaat aplikasi untuk yayasan
- **[Modul Keuangan ERP](./MODUL_KEUANGAN_ERP.md)** - Dokumentasi modul keuangan dan ERP
- **[Tingkatan User](./TINGKATAN_USER.md)** - Penjelasan hierarki dan hak akses pengguna

### 🤖 Prompt & AI
- **[Prompt Aplikasi](./PROMPT_APLIKASI.md)** - Kumpulan prompt untuk pengembangan dan operasional aplikasi

## Struktur Proyek

```
app-db/
├── app/                    # Next.js App Router
├── components/            # Komponen UI
├── lib/                   # Utilities dan libraries
├── supabase/             # Migrasi dan skema database
├── scripts/              # Skrip utilitas
├── docs/                 # 📁 Dokumentasi (berada di sini)
└── README.md             # Dokumentasi utama di root
```

## Cara Menggunakan Dokumentasi

1. **Untuk Developer Baru**: Mulai dengan [Dokumen Teknis](./TECHNICAL_DOC.md) untuk memahami arsitektur
2. **Untuk Setup Database**: Baca [Desain Database](./DESAIN_DATABASE_SISTEM_INFORMASI_PERHUTANAN_SOSIAL.md)
3. **Untuk Deployment**: Lihat [Deployment Netlify](./NETLIFY_DEPLOYMENT.md)
4. **Untuk Pemahaman Bisnis**: Baca [Spesifikasi Produk](./PRODUCT_SPECIFICATION_DOC.md)

## Kontribusi ke Dokumentasi

Dokumentasi ini dikelola dalam format Markdown. Untuk memperbarui:

1. Edit file Markdown yang sesuai
2. Pastikan link internal tetap berfungsi
3. Update daftar di file ini jika menambah dokumen baru

---

**Versi Dokumentasi**: Januari 2025  
**Terakhir Diperbarui**: 24 Januari 2025  
**Status**: Aktif dan Diperbarui