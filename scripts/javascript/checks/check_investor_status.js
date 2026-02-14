#!/usr/bin/env node

/**
 * Script untuk mengecek status investor dashboard
 * dan memberikan instruksi migration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 INVESTOR DASHBOARD STATUS CHECK');
console.log('===================================\n');

// Cek apakah migration file ada
const migrationFile = 'supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql';
if (!fs.existsSync(migrationFile)) {
  console.log('❌ Migration file tidak ditemukan:', migrationFile);
  process.exit(1);
}

console.log('✅ Migration file ditemukan:', migrationFile);
console.log('   Size:', fs.statSync(migrationFile).size, 'bytes\n');

// Baca .env.local untuk mendapatkan konfigurasi Supabase
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
}

console.log('📊 KONFIGURASI SUPABASE:');
console.log('   URL:', supabaseUrl || '❌ Tidak ditemukan');
console.log('   Anon Key:', supabaseAnonKey ? '✅ Ada' : '❌ Tidak ditemukan');
console.log('');

// Tampilkan instruksi
console.log('🚀 INSTRUKSI MIGRATION:');
console.log('=======================\n');

console.log('OPTION 1: MANUAL MIGRATION (RECOMMENDED)');
console.log('----------------------------------------');
console.log('1. Buka Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. Login dan pilih project Anda');
console.log('3. Buka SQL Editor');
console.log('4. Copy seluruh konten dari file:');
console.log('   ', migrationFile);
console.log('5. Paste ke SQL Editor dan klik "Run"');
console.log('6. Tunggu hingga migration selesai');
console.log('');

console.log('OPTION 2: OTOMATIS DENGAN SERVICE ROLE KEY');
console.log('------------------------------------------');
console.log('1. Dapatkan service role key baru:');
console.log('   - Buka Supabase Dashboard → Settings → API');
console.log('   - Copy "service_role" key');
console.log('2. Update .env.local:');
console.log('   SUPABASE_SERVICE_ROLE_KEY=<key-baru>');
console.log('3. Jalankan migration:');
console.log('   node scripts/run-sql-migration.js', migrationFile);
console.log('');

console.log('🔍 VERIFIKASI SETELAH MIGRATION:');
console.log('===============================\n');

console.log('Setelah migration berhasil, verifikasi dengan:');
console.log('');
console.log('1. Buka halaman investor dashboard:');
console.log('   http://localhost:3000/id/dashboard/investor');
console.log('');
console.log('2. Periksa data source indicator di header:');
console.log('   - ✅ database_views : Migration berhasil');
console.log('   - ✅ database_direct : Views belum ada, tapi data real');
console.log('   - ⚠️  database_basic : Basic data dengan estimasi');
console.log('   - ❌ fallback : Migration belum dijalankan');
console.log('');
console.log('3. Bandingkan dengan carbon projects page:');
console.log('   http://localhost:3000/id/dashboard/carbon-projects');
console.log('   Data harus konsisten antara kedua halaman');
console.log('');

console.log('📋 SQL VERIFICATION QUERIES:');
console.log('============================\n');

console.log('-- Cek apakah views sudah dibuat');
console.log(`SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name IN ('v_investor_dashboard_data', 'v_investor_dashboard_summary', 'mv_investor_performance_metrics');`);
console.log('');
console.log('-- Cek kolom investor di carbon_projects');
console.log(`SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'carbon_projects' 
AND column_name IN ('investment_amount', 'roi_percentage', 'carbon_sequestration_estimated');`);
console.log('');

console.log('💡 TIPS:');
console.log('=======');
console.log('- Migration aman: hanya menambah kolom dan membuat views');
console.log('- Tidak menghapus atau mengubah data existing');
console.log('- Views akan otomatis terupdate ketika data berubah');
console.log('- Sample data akan ditambahkan untuk project yang ada');
console.log('');

// Buat file SQL terpisah untuk kemudahan copy-paste
const sqlContent = fs.readFileSync(migrationFile, 'utf8');
const outputFile = 'investor_migration_ready_to_copy.sql';
fs.writeFileSync(outputFile, sqlContent);
console.log(`✅ File SQL siap copy-paste: ${outputFile}`);
console.log('   Gunakan file ini untuk migration manual di Supabase Dashboard');