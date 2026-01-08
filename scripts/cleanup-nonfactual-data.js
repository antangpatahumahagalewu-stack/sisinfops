#!/usr/bin/env node

/**
 * Script untuk membersihkan data PS yang tidak faktual.
 * Menghapus data lama tanpa jumlah_kk dan data duplikat.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
    }
  }
} else {
  console.error('.env.local file not found at:', envPath)
  process.exit(1)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanup() {
  console.log('🧹 MEMBERSIHKAN DATA TIDAK FAKTUAL')
  console.log('==================================\n')

  // 1. Ambil semua data
  const { data: allPS, error: fetchError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, jumlah_kk, luas_ha, skema, kabupaten_id, created_at')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('❌ Gagal mengambil data:', fetchError)
    process.exit(1)
  }

  console.log(`📊 Total data PS di database: ${allPS.length}`)

  // 2. Identifikasi data dengan jumlah_kk (data faktual dari CSV)
  const dataWithKK = allPS.filter(ps => ps.jumlah_kk && ps.jumlah_kk > 0)
  const dataWithoutKK = allPS.filter(ps => !ps.jumlah_kk || ps.jumlah_kk === 0)

  console.log(`✅ Data dengan jumlah KK (faktual): ${dataWithKK.length}`)
  console.log(`❌ Data tanpa jumlah KK (lama): ${dataWithoutKK.length}`)

  // 3. Cek duplikasi (berdasarkan nama case-insensitive dan kabupaten)
  const duplicateMap = new Map()
  const duplicatesToDelete = []

  allPS.forEach(ps => {
    const key = `${ps.pemegang_izin.toLowerCase().trim()}_${ps.kabupaten_id}`
    if (duplicateMap.has(key)) {
      // Tentukan mana yang akan dihapus: yang tanpa KK atau yang lebih lama
      const existing = duplicateMap.get(key)
      const psHasKK = ps.jumlah_kk && ps.jumlah_kk > 0
      const existingHasKK = existing.jumlah_kk && existing.jumlah_kk > 0

      if (psHasKK && !existingHasKK) {
        // PS ini punya KK, existing tidak punya -> hapus existing
        duplicatesToDelete.push(existing.id)
        duplicateMap.set(key, ps) // ganti dengan yang punya KK
      } else if (!psHasKK && existingHasKK) {
        // Existing punya KK, PS ini tidak -> hapus PS ini
        duplicatesToDelete.push(ps.id)
        // tetap pertahankan existing
      } else {
        // Keduanya sama-sama punya KK atau sama-sama tidak punya KK
        // Hapus yang lebih lama (created_at lebih awal)
        const psDate = new Date(ps.created_at)
        const existingDate = new Date(existing.created_at)
        if (psDate < existingDate) {
          duplicatesToDelete.push(ps.id)
        } else {
          duplicatesToDelete.push(existing.id)
          duplicateMap.set(key, ps)
        }
      }
    } else {
      duplicateMap.set(key, ps)
    }
  })

  console.log(`🔍 Duplikasi ditemukan: ${duplicatesToDelete.length}`)

  // 4. Data dengan luasan tidak realistis (> 5000 Ha) - hanya warning
  const unrealisticArea = allPS.filter(ps => ps.luas_ha && ps.luas_ha > 5000)
  console.log(`⚠️  Data dengan luasan > 5000 Ha: ${unrealisticArea.length}`)
  unrealisticArea.forEach(ps => {
    console.log(`   ${ps.pemegang_izin}: ${ps.luas_ha} Ha`)
  })

  // 5. Hapus data tanpa jumlah KK (kecuali ada alasan khusus)
  const idsToDelete = [
    ...dataWithoutKK.map(ps => ps.id),
    ...duplicatesToDelete
  ].filter((value, index, self) => self.indexOf(value) === index) // unik

  console.log(`\n🗑️  Akan menghapus ${idsToDelete.length} data:`)
  console.log(`   - Data tanpa jumlah KK: ${dataWithoutKK.length}`)
  console.log(`   - Data duplikat: ${duplicatesToDelete.length}`)

  if (idsToDelete.length === 0) {
    console.log('\n✅ Tidak ada data yang perlu dihapus.')
    return
  }

  // 6. Konfirmasi (opsional) - dalam script ini kita langsung hapus
  console.log('\n🚀 Menghapus data tidak faktual...')

  // Hapus dalam batch (Supabase batasan 50 per request)
  const batchSize = 50
  let deletedCount = 0
  let errorCount = 0

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize)
    
    // Pertama, hapus entri lembaga_pengelola terkait
    const { error: deleteLembagaError } = await supabase
      .from('lembaga_pengelola')
      .delete()
      .in('perhutanan_sosial_id', batch)

    if (deleteLembagaError) {
      console.error('❌ Gagal menghapus lembaga_pengelola:', deleteLembagaError.message)
    }

    // Kemudian hapus perhutanan_sosial
    const { error: deletePSError } = await supabase
      .from('perhutanan_sosial')
      .delete()
      .in('id', batch)

    if (deletePSError) {
      console.error('❌ Gagal menghapus perhutanan_sosial:', deletePSError.message)
      errorCount += batch.length
    } else {
      deletedCount += batch.length
      console.log(`   Progress: ${deletedCount}/${idsToDelete.length}`)
    }
  }

  // 7. Verifikasi setelah penghapusan
  console.log('\n🔍 Verifikasi setelah penghapusan...')
  
  const { data: remainingData, error: remainingError } = await supabase
    .from('perhutanan_sosial')
    .select('id, jumlah_kk', { count: 'exact' })

  if (remainingError) {
    console.error('❌ Gagal verifikasi:', remainingError)
  } else {
    const remainingWithKK = remainingData.filter(ps => ps.jumlah_kk && ps.jumlah_kk > 0).length
    console.log(`✅ Sisa data PS: ${remainingData.length}`)
    console.log(`✅ Data dengan jumlah KK: ${remainingWithKK}`)
    console.log(`✅ Data tanpa jumlah KK: ${remainingData.length - remainingWithKK}`)
  }

  // 8. Statistik akhir
  console.log('\n📈 STATISTIK AKHIR:')
  console.log(`   Data dihapus: ${deletedCount}`)
  console.log(`   Error saat penghapusan: ${errorCount}`)
  console.log(`   Data faktual tersisa: ${remainingData?.length || 0}`)

  console.log('\n✅ Pembersihan selesai!')
}

cleanup().catch(error => {
  console.error('❌ Error dalam proses pembersihan:', error)
  process.exit(1)
})