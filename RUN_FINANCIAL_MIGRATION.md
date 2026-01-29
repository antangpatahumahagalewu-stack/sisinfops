# Instruksi untuk Menjalankan Migration Financial Tables

## LANGKAH 1: Akses Supabase Dashboard

1. Buka: https://supabase.com/dashboard
2. Login dengan akun Anda
3. Pilih project yang sesuai (yang digunakan oleh aplikasi ini)

## LANGKAH 2: Jalankan SQL Migration

1. Di sidebar kiri, klik **"SQL Editor"**
2. Klik **"New query"**
3. Copy seluruh konten dari file: `supabase/migrations/20260131_create_sak_financial_tables.sql`
4. Paste ke SQL Editor
5. Klik **"Run"** untuk menjalankan migration

## LANGKAH 3: Verifikasi Migration Berhasil

Setelah migration selesai, jalankan script verifikasi:

```bash
cd /home/sangumang/Documents/sisinfops
node scripts/verify-financial-tables.js
```

## LANGKAH 4: Test Master Price List

1. Buka aplikasi di browser: `http://localhost:3000`
2. Login dengan user yang memiliki role `finance` atau `finance_manager`
3. Navigasi ke: Dashboard → Finance → Master Price List
4. Coba tambah, edit, dan hapus item price list

## DETAIL MIGRATION YANG AKAN DIJALANKAN

Migration ini akan membuat:

### 1. **Tabel Baru:**
- `master_price_list` - Tabel utama untuk price list
- `accounting_ledgers` - Sistem dual ledger (operasional vs proyek)
- `chart_of_accounts` - Chart of accounts SAK compliant
- `accounting_journal_entries` - Entri jurnal double-entry
- `journal_entry_lines` - Line items untuk entri jurnal
- `financial_budgets` - Manajemen anggaran

### 2. **Enhancement Tabel Existing:**
- `financial_transactions` - Ditambahkan kolom untuk double-entry accounting

### 3. **Data Initial:**
- Chart of accounts (SAK compliant)
- Accounting ledgers untuk operasional dan proyek
- Initial budgets untuk operasional dan proyek karbon

### 4. **Security & Audit:**
- RLS policies untuk semua tabel baru
- Audit triggers untuk tracking perubahan
- Indexes untuk performa

## TROUBLESHOOTING

### Jika ada error:
1. **Error permission**: Pastikan user memiliki service role key atau coba gunakan service role key
2. **Error table already exists**: Migration menggunakan `CREATE TABLE IF NOT EXISTS`, jadi aman
3. **Error column already exists**: Migration menggunakan `IF NOT EXISTS` untuk alter table

### Verifikasi Manual:
1. Di Supabase Dashboard, buka **Table Editor**
2. Cari tabel `master_price_list`
3. Jika ada, migration berhasil

## NEXT STEPS SETELAH MIGRATION

1. Test CRUD operations di Master Price List
2. Buat user dengan role `finance` dan `finance_manager`
3. Test permission-based access
4. Implementasi modul Transactions dan Budgets

## KONTAK BANTUAN

Jika ada masalah dengan migration, periksa:
- File migration lengkap: `supabase/migrations/20260131_create_sak_financial_tables.sql`
- Script verifikasi: `scripts/verify-financial-tables.js`
- API endpoint: `app/api/finance/price-list/route.ts`
- Komponen client: `components/dashboard/price-list-client.tsx`