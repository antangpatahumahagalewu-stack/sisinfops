#!/usr/bin/env node

/**
 * Script sederhana untuk memeriksa apakah database telah menyimpan data keluarga
 * Menggunakan fetch langsung ke Supabase REST API tanpa dependency
 */

const SUPABASE_URL = 'https://rrvhekjdhdhtkmswjgwk.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_0d46iDqA-PwybVfzP0VX8g_SApjNQXI'

async function checkDatabase() {
  console.log('🔍 Memeriksa Database Keluarga...')
  console.log('='.repeat(50))

  try {
    // 1. Check perhutanan_sosial data
    console.log('\n🏞️ 1. DATA PERHUTANAN SOSIAL:')
    const psResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/perhutanan_sosial?select=id,pemegang_izin,desa,jumlah_kk&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    )

    if (!psResponse.ok) {
      console.log(`  Error: ${psResponse.status} ${psResponse.statusText}`)
    } else {
      const psData = await psResponse.json()
      console.log(`  Total PS: ${psData.length} records`)
      if (psData.length > 0) {
        console.log('  Sample data:')
        psData.forEach((ps, i) => {
          console.log(`    ${i+1}. ${ps.pemegang_izin} - ${ps.desa} (KK: ${ps.jumlah_kk || 0})`)
        })
      }
    }

    // 2. Check kepala_keluarga data
    console.log('\n👨‍👩‍👧‍👦 2. DATA KEPALA KELUARGA:')
    const kkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/kepala_keluarga?select=id,nama_kepala_keluarga,nik,perhutanan_sosial_id,status_partisipasi&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    )

    if (!kkResponse.ok) {
      if (kkResponse.status === 404) {
        console.log('  ❌ Tabel kepala_keluarga belum dibuat atau tidak ada.')
        console.log('  📋 Rekomendasi: Jalankan migrasi database terlebih dahulu.')
      } else {
        console.log(`  Error: ${kkResponse.status} ${kkResponse.statusText}`)
      }
    } else {
      const kkData = await kkResponse.json()
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

    // 3. Check other keluarga tables
    console.log('\n📊 3. TABEL KELUARGA LAINNYA:')
    const tables = ['anggota_keluarga', 'ekonomi_keluarga', 'partisipasi_program']
    
    for (const table of tables) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      )

      if (!response.ok) {
        console.log(`  ${table}: ❌ Tidak ada / Error: ${response.status}`)
      } else {
        const data = await response.json()
        console.log(`  ${table}: ✓ Ada (${data.length} records)`)
      }
    }

    // 4. Summary
    console.log('\n💡 4. KESIMPULAN:')
    
    // Check if migrations need to be run
    const hasKKTable = await fetch(
      `${SUPABASE_URL}/rest/v1/kepala_keluarga?select=id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    )

    if (!hasKKTable.ok) {
      console.log('  ❌ Database keluarga BELUM SIAP.')
      console.log('  📋 Tindakan yang diperlukan:')
      console.log('    1. Jalankan migrasi database:')
      console.log('       File: supabase/migrations/20250121_create_kepala_keluarga_tables.sql')
      console.log('    2. Gunakan Supabase CLI: supabase db push')
      console.log('    3. Atau jalankan SQL manual di Supabase Dashboard')
    } else {
      const kkData = await hasKKTable.json()
      if (kkData.length === 0) {
        console.log('  ℹ️  Database keluarga SIAP tetapi KOSONG.')
        console.log('  📝 Rekomendasi: Tambahkan data KK melalui aplikasi.')
      } else {
        console.log('  ✅ Database keluarga SIAP dan BERISI DATA.')
        console.log('     Data KK sudah tersimpan dan siap digunakan.')
      }
    }

    console.log('\n='.repeat(50))
    console.log('✅ Pemeriksaan selesai.')

  } catch (error) {
    console.error('❌ Error dalam pemeriksaan:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('  1. Periksa koneksi internet')
    console.log('  2. Pastikan Supabase project aktif')
    console.log('  3. Verifikasi API key di .env.local')
    console.log('  4. Cek Supabase Dashboard untuk status project')
  }
}

// Run check
checkDatabase()