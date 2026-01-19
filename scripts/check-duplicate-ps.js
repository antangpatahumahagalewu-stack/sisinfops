#!/usr/bin/env node

/**
 * Script untuk memeriksa data PS dengan ID 2174a544-396c-4628-8837-aef91151bec5
 * dan mengidentifikasi masalah duplicate key constraint di lembaga_pengelola.
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

const PS_ID = '2174a544-396c-4628-8837-aef91151bec5'

async function checkData() {
  console.log('🔍 Memeriksa data untuk PS ID:', PS_ID)
  console.log('==========================================\n')
  
  // 1. Cari data perhutanan_sosial
  console.log('1. Data perhutanan_sosial:')
  const { data: psData, error: psError } = await supabase
    .from('perhutanan_sosial')
    .select('*')
    .eq('id', PS_ID)
    .maybeSingle()
  
  if (psError) {
    console.error('❌ Error mengambil data perhutanan_sosial:', psError.message)
  } else if (!psData) {
    console.error('❌ Data perhutanan_sosial tidak ditemukan')
  } else {
    console.log('✅ Data ditemukan:')
    console.log(`   ID: ${psData.id}`)
    console.log(`   Nama PS: ${psData.pemegang_izin}`)
    console.log(`   Skema: ${psData.skema}`)
    console.log(`   Desa: ${psData.desa}`)
    console.log(`   Kecamatan: ${psData.kecamatan}`)
    console.log(`   Luas: ${psData.luas_ha} ha`)
    console.log(`   Jumlah KK: ${psData.jumlah_kk}`)
    console.log(`   Created: ${psData.created_at}`)
    console.log(`   Updated: ${psData.updated_at}`)
  }
  
  // 2. Cari data lembaga_pengelola
  console.log('\n2. Data lembaga_pengelola:')
  const { data: lpData, error: lpError } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)
  
  if (lpError) {
    console.error('❌ Error mengambil data lembaga_pengelola:', lpError.message)
  } else if (!lpData || lpData.length === 0) {
    console.log('⚠️  Tidak ada data lembaga_pengelola untuk PS ini')
  } else {
    console.log(`✅ Ditemukan ${lpData.length} record lembaga_pengelola:`)
    lpData.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`)
      console.log(`     ID: ${record.id}`)
      console.log(`     Nama: ${record.nama}`)
      console.log(`     Ketua: ${record.ketua}`)
      console.log(`     Jumlah anggota: ${record.jumlah_anggota}`)
      console.log(`     Kepala desa: ${record.kepala_desa}`)
      console.log(`     Created: ${record.created_at}`)
      console.log(`     Updated: ${record.updated_at}`)
    })
  }
  
  // 3. Cari constraint duplikat
  console.log('\n3. Memeriksa constraint duplikat:')
  
  // Cari semua lembaga_pengelola dengan perhutanan_sosial_id yang sama (harusnya hanya 1)
  if (lpData && lpData.length > 0) {
    const { data: allLpData, error: allLpError } = await supabase
      .from('lembaga_pengelola')
      .select('perhutanan_sosial_id, id, nama')
      .order('perhutanan_sosial_id', { ascending: true })
    
    if (!allLpError) {
      // Hitung frekuensi perhutanan_sosial_id
      const freqMap = new Map()
      allLpData.forEach(record => {
        const key = record.perhutanan_sosial_id
        freqMap.set(key, (freqMap.get(key) || 0) + 1)
      })
      
      const duplicates = Array.from(freqMap.entries())
        .filter(([key, count]) => count > 1)
        .map(([key, count]) => ({ perhutanan_sosial_id: key, count }))
      
      if (duplicates.length > 0) {
        console.log('⚠️  Ditemukan duplikat perhutanan_sosial_id:')
        duplicates.forEach(dup => {
          console.log(`   - ID: ${dup.perhutanan_sosial_id}, Jumlah: ${dup.count}`)
        })
      } else {
        console.log('✅ Tidak ditemukan duplikat perhutanan_sosial_id')
      }
    }
  }
  
  // 4. Cek constraint di database
  console.log('\n4. Informasi constraint:')
  console.log('   Constraint name: "lphd_perhutanan_sosial_id_key"')
  console.log('   Table: lembaga_pengelola (sebelumnya lphd)')
  console.log('   Column: perhutanan_sosial_id')
  console.log('   Type: UNIQUE NOT NULL')
  
  // 5. Cek data terkait lainnya
  console.log('\n5. Data terkait lainnya:')
  
  // Cek potensi
  const { data: potensiData } = await supabase
    .from('potensi')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)
    .limit(5)
  
  console.log(`   Jumlah data potensi: ${potensiData?.length || 0}`)
  
  // Cek kepala_keluarga
  const { data: kkData } = await supabase
    .from('kepala_keluarga')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)
    .limit(5)
  
  console.log(`   Jumlah data kepala keluarga: ${kkData?.length || 0}`)
}

checkData().catch(error => {
  console.error('❌ Error dalam pemeriksaan data:', error)
  process.exit(1)
})
