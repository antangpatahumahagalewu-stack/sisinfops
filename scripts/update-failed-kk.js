#!/usr/bin/env node

/**
 * Script khusus untuk update data Jumlah KK yang gagal diimport sebelumnya.
 * Data yang gagal: KTH RIMBA LESTARI dan GAPOKTAN TUMBANG MUROI
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

// Data yang gagal dari CSV (hanya dua baris ini)
const failedData = [
  {
    pemegangIzin: 'KTH RIMBA LESTARI',
    kabupaten: 'Kabupaten Kapuas',
    skema: 'HKM',
    jenisHutan: 'Mineral/Gambut',
    luasHa: 100,
    rkps: 'Belum',
    peta: 'Ada',
    jumlahKK: 35
  },
  {
    pemegangIzin: 'GAPOKTAN TUMBANG MUROI',
    kabupaten: 'Kabupaten Kapuas',
    skema: 'HKM',
    jenisHutan: 'Mineral/Gambut',
    luasHa: 807,
    rkps: 'Belum',
    peta: 'Ada',
    jumlahKK: 98
  }
]

function normalizeKabupatenName(name) {
  const nameUpper = name.toUpperCase()
  if (nameUpper.startsWith('KABUPATEN ')) {
    return nameUpper
  }
  return `KABUPATEN ${nameUpper}`
}

function normalizeStatus(status) {
  const s = status.trim().toLowerCase()
  return s === 'ada' ? 'ada' : 'belum'
}

async function updateFailedData() {
  console.log('🔍 Memulai update data yang gagal...')
  
  // Ambil mapping kabupaten
  const { data: kabupatenData, error: kabError } = await supabase
    .from('kabupaten')
    .select('id, nama')
  
  if (kabError) {
    console.error('❌ Gagal mengambil data kabupaten:', kabError)
    process.exit(1)
  }
  
  const kabupatenMap = new Map()
  kabupatenData.forEach(k => {
    kabupatenMap.set(k.nama.toUpperCase(), k.id)
  })
  
  for (const item of failedData) {
    const normalizedKabupaten = normalizeKabupatenName(item.kabupaten)
    const kabupatenId = kabupatenMap.get(normalizedKabupaten.toUpperCase())
    
    if (!kabupatenId) {
      console.error(`❌ Kabupaten tidak ditemukan: ${item.kabupaten}`)
      continue
    }
    
    // Cek data existing
    const { data: existingPS, error: fetchError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, jumlah_kk, rkps_status, peta_status')
      .eq('pemegang_izin', item.pemegangIzin)
      .eq('kabupaten_id', kabupatenId)
      .maybeSingle()
    
    if (fetchError) {
      console.error(`❌ Error fetching ${item.pemegangIzin}:`, fetchError.message)
      continue
    }
    
    if (!existingPS) {
      console.error(`❌ Data tidak ditemukan: ${item.pemegangIzin}`)
      continue
    }
    
    console.log(`\n📝 Data sebelum update ${item.pemegangIzin}:`)
    console.log(`   Jumlah KK: ${existingPS.jumlah_kk}`)
    console.log(`   RKPS Status: ${existingPS.rkps_status}`)
    console.log(`   Peta Status: ${existingPS.peta_status}`)
    
    // Update data
    const updateData = {
      jumlah_kk: item.jumlahKK,
      luas_ha: item.luasHa,
      rkps_status: normalizeStatus(item.rkps),
      peta_status: normalizeStatus(item.peta),
      updated_at: new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('perhutanan_sosial')
      .update(updateData)
      .eq('id', existingPS.id)
    
    if (updateError) {
      console.error(`❌ Gagal update ${item.pemegangIzin}:`, updateError.message)
    } else {
      console.log(`✅ Berhasil update ${item.pemegangIzin}:`)
      console.log(`   Jumlah KK: ${existingPS.jumlah_kk} → ${item.jumlahKK}`)
      console.log(`   Luas Ha: ${item.luasHa}`)
      console.log(`   RKPS Status: ${existingPS.rkps_status} → ${updateData.rkps_status}`)
      console.log(`   Peta Status: ${existingPS.peta_status} → ${updateData.peta_status}`)
    }
  }
  
  // Verifikasi akhir
  console.log('\n🔍 Verifikasi akhir data...')
  const { data: totalKKData, error: totalError } = await supabase
    .from('perhutanan_sosial')
    .select('jumlah_kk')
  
  if (!totalError) {
    const totalKK = totalKKData.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0)
    const totalPS = totalKKData.length
    const psWithKK = totalKKData.filter(ps => ps.jumlah_kk > 0).length
    
    console.log(`   Total PS di database: ${totalPS}`)
    console.log(`   Total KK di database: ${totalKK.toLocaleString('id-ID')}`)
    console.log(`   PS dengan data KK: ${psWithKK}/${totalPS}`)
    console.log(`   Rata-rata KK per PS: ${totalPS > 0 ? Math.round(totalKK / totalPS) : 0}`)
  }
  
  console.log('\n✅ Update selesai!')
}

updateFailedData().catch(error => {
  console.error('❌ Error dalam proses update:', error)
  process.exit(1)
})