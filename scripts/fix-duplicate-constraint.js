#!/usr/bin/env node

/**
 * Script untuk memperbaiki error duplicate key constraint di lembaga_pengelola.
 * Approach: Hapus entry lembaga_pengelola yang bermasalah, update perhutanan_sosial,
 * lalu buat entry lembaga_pengelola baru dengan data yang sesuai.
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

// Data yang gagal
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

async function fixData() {
  console.log('🔧 Memperbaiki duplicate key constraint...')
  
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
    
    // 1. Cari data PS
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, jumlah_kk, rkps_status, peta_status, skema')
      .eq('pemegang_izin', item.pemegangIzin)
      .eq('kabupaten_id', kabupatenId)
      .maybeSingle()
    
    if (psError) {
      console.error(`❌ Error fetching PS ${item.pemegangIzin}:`, psError.message)
      continue
    }
    
    if (!psData) {
      console.error(`❌ Data PS tidak ditemukan: ${item.pemegangIzin}`)
      continue
    }
    
    console.log(`\n📝 Memproses ${item.pemegangIzin} (ID: ${psData.id})`)
    
    // 2. Hapus entry lembaga_pengelola yang ada
    console.log(`   Menghapus entry lembaga_pengelola...`)
    const { error: deleteError } = await supabase
      .from('lembaga_pengelola')
      .delete()
      .eq('perhutanan_sosial_id', psData.id)
    
    if (deleteError) {
      console.error(`❌ Gagal menghapus lembaga_pengelola:`, deleteError.message)
      // Lanjut saja, mungkin sudah tidak ada
    } else {
      console.log(`   ✅ Entry lembaga_pengelola dihapus`)
    }
    
    // 3. Update perhutanan_sosial
    console.log(`   Mengupdate data perhutanan_sosial...`)
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
      .eq('id', psData.id)
    
    if (updateError) {
      console.error(`❌ Gagal update perhutanan_sosial:`, updateError.message)
      continue
    } else {
      console.log(`   ✅ Data perhutanan_sosial diupdate`)
      console.log(`      Jumlah KK: ${psData.jumlah_kk} → ${item.jumlahKK}`)
      console.log(`      Luas Ha: ${item.luasHa}`)
      console.log(`      RKPS: ${psData.rkps_status} → ${updateData.rkps_status}`)
      console.log(`      Peta: ${psData.peta_status} → ${updateData.peta_status}`)
    }
    
    // 4. Buat entry lembaga_pengelola baru (jika diperlukan)
    // Untuk skema HD, nama lembaga: 'LPHD ' + pemegang_izin
    // Untuk skema lain, cukup pemegang_izin saja
    let namaLembaga = item.pemegangIzin
    if (item.skema === 'HD') {
      namaLembaga = `LPHD ${item.pemegangIzin}`
    }
    
    const lpData = {
      perhutanan_sosial_id: psData.id,
      nama: namaLembaga,
      ketua: null,
      jumlah_anggota: item.jumlahKK,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log(`   Membuat entry lembaga_pengelola baru...`)
    const { error: insertError } = await supabase
      .from('lembaga_pengelola')
      .insert([lpData])
    
    if (insertError) {
      console.error(`❌ Gagal insert lembaga_pengelola:`, insertError.message)
    } else {
      console.log(`   ✅ Entry lembaga_pengelola dibuat`)
      console.log(`      Nama: ${lpData.nama}`)
      console.log(`      Jumlah anggota: ${lpData.jumlah_anggota}`)
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
  
  // Verifikasi data yang diperbaiki
  console.log('\n🔍 Verifikasi data yang diperbaiki...')
  for (const item of failedData) {
    const normalizedKabupaten = normalizeKabupatenName(item.kabupaten)
    const kabupatenId = kabupatenMap.get(normalizedKabupaten.toUpperCase())
    
    const { data: psData } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, jumlah_kk, rkps_status, peta_status')
      .eq('pemegang_izin', item.pemegangIzin)
      .eq('kabupaten_id', kabupatenId)
      .maybeSingle()
    
    if (psData) {
      console.log(`   ${item.pemegangIzin}:`)
      console.log(`      Jumlah KK: ${psData.jumlah_kk}`)
      console.log(`      RKPS: ${psData.rkps_status}`)
      console.log(`      Peta: ${psData.peta_status}`)
      
      const { data: lpData } = await supabase
        .from('lembaga_pengelola')
        .select('nama, jumlah_anggota')
        .eq('perhutanan_sosial_id', psData.id)
        .maybeSingle()
      
      if (lpData) {
        console.log(`      Lembaga: ${lpData.nama}`)
        console.log(`      Jumlah anggota: ${lpData.jumlah_anggota}`)
      }
    }
  }
  
  console.log('\n✅ Perbaikan selesai!')
}

fixData().catch(error => {
  console.error('❌ Error dalam proses perbaikan:', error)
  process.exit(1)
})