#!/usr/bin/env node

/**
 * Script untuk memeriksa apakah database telah menyimpan data keluarga
 * dan menampilkan status tabel KK (Kepala Keluarga)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkDatabase() {
  console.log('🔍 Memeriksa Database Keluarga...')
  console.log('='.repeat(50))

  try {
    // 1. Check if tables exist
    console.log('\n📊 1. TABEL YANG ADA (LIKE "%keluarga%"):')
    
    const tables = [
      'kepala_keluarga',
      'anggota_keluarga', 
      'ekonomi_keluarga',
      'partisipasi_program'
    ]

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1)

      if (error) {
        console.log(`  ${table}: ❌ Tidak ada / Error: ${error.code}`)
      } else {
        // Get actual count
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        console.log(`  ${table}: ✓ Ada (${count || 0} records)`)
      }
    }

    // 2. Check perhutanan_sosial data
    console.log('\n🏞️ 2. DATA PERHUTANAN SOSIAL:')
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, desa, jumlah_kk')
      .limit(5)

    if (psError) {
      console.log(`  Error: ${psError.message}`)
    } else {
      console.log(`  Total PS: ${psData.length} records`)
      if (psData.length > 0) {
        console.log('  Sample data:')
        psData.forEach((ps, i) => {
          console.log(`    ${i+1}. ${ps.pemegang_izin} - ${ps.desa} (KK: ${ps.jumlah_kk || 0})`)
        })
      }
    }

    // 3. Check kepala_keluarga data
    console.log('\n👨‍👩‍👧‍👦 3. DATA KEPALA KELUARGA DETAIL:')
    const { data: kkData, error: kkError } = await supabase
      .from('kepala_keluarga')
      .select('id, nama_kepala_keluarga, nik, perhutanan_sosial_id, status_partisipasi')
      .limit(5)

    if (kkError) {
      console.log(`  Error: ${kkError.message}`)
      console.log('  ℹ️  Tabel mungkin belum dibuat atau belum ada data')
    } else {
      console.log(`  Total KK: ${kkData.length} records`)
      if (kkData.length > 0) {
        console.log('  Sample data:')
        kkData.forEach((kk, i) => {
          console.log(`    ${i+1}. ${kk.nama_kepala_keluarga} - NIK: ${kk.nik} (Status: ${kk.status_partisipasi})`)
        })
      } else {
        console.log('  ℹ️  Tabel ada tetapi kosong. Perlu mengisi data.')
      }
    }

    // 4. Check jumlah_kk consistency
    console.log('\n🔢 4. KONSISTENSI JUMLAH KK:')
    const { data: psWithKK, error: psKKError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, jumlah_kk')
      .not('jumlah_kk', 'is', null)
      .order('jumlah_kk', { ascending: false })
      .limit(5)

    if (!psKKError && psWithKK.length > 0) {
      console.log('  PS dengan jumlah_kk terisi:')
      psWithKK.forEach((ps, i) => {
        console.log(`    ${i+1}. ${ps.pemegang_izin}: ${ps.jumlah_kk} KK`)
      })
    } else {
      console.log('  ℹ️  Tidak ada PS dengan jumlah_kk terisi')
    }

    // 5. Check views
    console.log('\n📈 5. VIEWS REPORTING:')
    const views = ['vw_summary_kk_per_ps', 'vw_partisipasi_program_detail']
    
    for (const view of views) {
      try {
        const { data, error } = await supabase
          .from(view)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`  ${view}: ❌ Error: ${error.code}`)
        } else {
          console.log(`  ${view}: ✓ Ada`)
        }
      } catch (e) {
        console.log(`  ${view}: ❌ Tidak ada`)
      }
    }

    // 6. Recommendations
    console.log('\n💡 6. REKOMENDASI:')
    
    if (kkError && kkError.code === '42P01') {
      console.log('  ❌ Tabel kepala_keluarga belum dibuat.')
      console.log('  📋 Jalankan migrasi:')
      console.log('    1. Pastikan file migrasi ada di supabase/migrations/')
      console.log('    2. Jalankan: supabase db push')
      console.log('    3. Atau jalankan SQL manual dari file migrasi')
    } else if (kkData && kkData.length === 0) {
      console.log('  ℹ️  Tabel kepala_keluarga ada tetapi kosong.')
      console.log('  📝 Rekomendasi:')
      console.log('    - Tambahkan data KK melalui aplikasi')
      console.log('    - Atau gunakan script import data dummy')
      console.log('    - Pastikan perhutanan_sosial_id valid')
    } else {
      console.log('  ✓ Database keluarga berfungsi dengan baik!')
      console.log('    Data KK sudah tersimpan dan siap digunakan.')
    }

    console.log('\n='.repeat(50))
    console.log('✅ Pemeriksaan selesai.')

  } catch (error) {
    console.error('❌ Error dalam pemeriksaan:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('  1. Pastikan Supabase project aktif')
    console.log('  2. Periksa environment variables')
    console.log('  3. Pastikan migrasi sudah dijalankan')
    console.log('  4. Coba restart Supabase local: supabase start')
    process.exit(1)
  }
}

// Run check
checkDatabase()