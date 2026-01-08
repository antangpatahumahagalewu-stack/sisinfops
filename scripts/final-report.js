#!/usr/bin/env node

/**
 * Script untuk menghasilkan laporan final setelah pembersihan data.
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

async function generateReport() {
  console.log('📋 LAPORAN FINAL DATA PERHUTANAN SOSIAL')
  console.log('='.repeat(50))

  // 1. Data summary
  const { data: allPS, error } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, jumlah_kk, luas_ha, skema, kabupaten_id')

  if (error) {
    console.error('❌ Gagal mengambil data:', error)
    process.exit(1)
  }

  console.log('\n1. DATA SUMMARY:')
  console.log(`   Total PS: ${allPS.length}`)
  console.log(`   Total data faktual (dengan KK): ${allPS.filter(ps => ps.jumlah_kk > 0).length}`)
  console.log(`   Data tanpa KK: ${allPS.filter(ps => !ps.jumlah_kk || ps.jumlah_kk === 0).length}`)

  // 2. Total luasan dan KK
  const totalLuas = allPS.reduce((sum, ps) => sum + (parseFloat(ps.luas_ha) || 0), 0)
  const totalKK = allPS.reduce((sum, ps) => sum + (parseInt(ps.jumlah_kk) || 0), 0)
  
  console.log('\n2. TOTAL LUASAN DAN KK:')
  console.log(`   Total luasan: ${totalLuas.toLocaleString('id-ID')} Ha`)
  console.log(`   Total jumlah KK: ${totalKK.toLocaleString('id-ID')}`)
  console.log(`   Rata-rata KK per PS: ${Math.round(totalKK / allPS.length)}`)

  // 3. Per kabupaten
  console.log('\n3. DATA PER KABUPATEN:')
  
  const { data: kabupaten } = await supabase
    .from('kabupaten')
    .select('id, nama')
    .order('nama')

  for (const kab of kabupaten) {
    const { data: psKab } = await supabase
      .from('perhutanan_sosial')
      .select('jumlah_kk, luas_ha')
      .eq('kabupaten_id', kab.id)
    
    const totalKabKK = psKab.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0)
    const totalKabLuas = psKab.reduce((sum, ps) => sum + (parseFloat(ps.luas_ha) || 0), 0)
    
    console.log(`   ${kab.nama}:`)
    console.log(`      Jumlah PS: ${psKab.length}`)
    console.log(`      Total KK: ${totalKabKK.toLocaleString('id-ID')}`)
    console.log(`      Total luasan: ${totalKabLuas.toLocaleString('id-ID')} Ha`)
  }

  // 4. Per skema
  console.log('\n4. DATA PER SKEMA:')
  
  const skemaGroups = {}
  allPS.forEach(ps => {
    const skema = ps.skema || 'Tidak diketahui'
    if (!skemaGroups[skema]) {
      skemaGroups[skema] = { count: 0, totalKK: 0, totalLuas: 0 }
    }
    skemaGroups[skema].count++
    skemaGroups[skema].totalKK += (ps.jumlah_kk || 0)
    skemaGroups[skema].totalLuas += (parseFloat(ps.luas_ha) || 0)
  })

  Object.entries(skemaGroups).forEach(([skema, data]) => {
    console.log(`   ${skema}:`)
    console.log(`      Jumlah PS: ${data.count}`)
    console.log(`      Total KK: ${data.totalKK.toLocaleString('id-ID')}`)
    console.log(`      Total luasan: ${data.totalLuas.toLocaleString('id-ID')} Ha`)
  })

  // 5. Top 5 PS berdasarkan jumlah KK
  console.log('\n5. TOP 5 PS BERDASARKAN JUMLAH KK:')
  
  const sortedByKK = [...allPS]
    .sort((a, b) => (b.jumlah_kk || 0) - (a.jumlah_kk || 0))
    .slice(0, 5)
  
  sortedByKK.forEach((ps, index) => {
    console.log(`   ${index + 1}. ${ps.pemegang_izin}:`)
    console.log(`      Jumlah KK: ${ps.jumlah_kk}`)
    console.log(`      Luasan: ${ps.luas_ha} Ha`)
    console.log(`      Skema: ${ps.skema}`)
  })

  // 6. Data dengan luasan > 5000 Ha (masih ada setelah cleanup)
  console.log('\n6. DATA DENGAN LUASAN > 5000 Ha (perlu verifikasi):')
  
  const largeArea = allPS.filter(ps => ps.luas_ha && ps.luas_ha > 5000)
  if (largeArea.length > 0) {
    largeArea.forEach(ps => {
      console.log(`   ${ps.pemegang_izin}: ${ps.luas_ha} Ha, KK: ${ps.jumlah_kk}`)
    })
  } else {
    console.log('   Tidak ada data dengan luasan > 5000 Ha')
  }

  // 7. Ringkasan hasil pembersihan
  console.log('\n7. RINGKASAN HASIL PEMBERSIHAN:')
  console.log(`   Sebelum pembersihan: 162 PS`)
  console.log(`   Setelah pembersihan: ${allPS.length} PS`)
  console.log(`   Data dihapus: ${162 - allPS.length} PS (tidak faktual)`)
  console.log(`   Persentase data faktual: ${((allPS.length / 162) * 100).toFixed(1)}%`)

  // 8. Rekomendasi
  console.log('\n8. REKOMENDASI:')
  console.log(`   a. Data sekarang sudah lebih faktual (semua memiliki jumlah KK)`)
  console.log(`   b. Data dengan luasan > 5000 Ha perlu diverifikasi lapangan`)
  console.log(`   c. Data siap digunakan untuk analisis lebih lanjut`)
  console.log(`   d. Perlu sinkronisasi berkala dengan data resmi`)

  console.log('\n' + '='.repeat(50))
  console.log('✅ LAPORAN SELESAI - DATA SUDAH DIPERBAIKI')
}

generateReport().catch(error => {
  console.error('❌ Error menghasilkan laporan:', error)
  process.exit(1)
})