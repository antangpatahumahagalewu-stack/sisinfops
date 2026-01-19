#!/usr/bin/env node

/**
 * Script untuk menguji perbaikan update PS ID 2174a544-396c-4628-8837-aef91151bec5
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

async function testUpdate() {
  console.log('🧪 Menguji update untuk PS ID:', PS_ID)
  console.log('====================================\n')

  // 1. Ambil data awal
  console.log('1. Mengambil data awal...')
  const { data: initialPsData, error: initialPsError } = await supabase
    .from('perhutanan_sosial')
    .select('*')
    .eq('id', PS_ID)
    .maybeSingle()

  if (initialPsError || !initialPsData) {
    console.error('❌ Gagal mengambil data awal perhutanan_sosial:', initialPsError?.message)
    process.exit(1)
  }

  console.log('   Data awal perhutanan_sosial:')
  console.log(`     Nama: ${initialPsData.pemegang_izin}`)
  console.log(`     Skema: ${initialPsData.skema}`)
  console.log(`     Jumlah KK: ${initialPsData.jumlah_kk}`)
  console.log(`     Updated: ${initialPsData.updated_at}`)

  const { data: initialLpData } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)

  console.log(`   Jumlah lembaga_pengelola awal: ${initialLpData?.length || 0}`)
  if (initialLpData && initialLpData.length > 0) {
    console.log(`     ID: ${initialLpData[0].id}`)
    console.log(`     Nama: ${initialLpData[0].nama}`)
    console.log(`     Jumlah anggota: ${initialLpData[0].jumlah_anggota}`)
  }

  // 2. Simulasikan update seperti di edit-ps-form.tsx
  console.log('\n2. Simulasi update...')
  
  // Data update (ubah sedikit)
  const updateData = {
    pemegang_izin: initialPsData.pemegang_izin,
    desa: initialPsData.desa,
    kecamatan: initialPsData.kecamatan,
    skema: initialPsData.skema,
    luas_ha: initialPsData.luas_ha,
    tanggal_sk: initialPsData.tanggal_sk,
    jumlah_kk: initialPsData.jumlah_kk + 1, // Ubah sedikit
  }

  console.log('   Mengupdate perhutanan_sosial...')
  const { data: updatedPs, error: updatePsError } = await supabase
    .from('perhutanan_sosial')
    .update(updateData)
    .eq('id', PS_ID)
    .select()

  if (updatePsError) {
    console.error('❌ Gagal update perhutanan_sosial:', updatePsError.message)
    console.error('   Detail error:', JSON.stringify(updatePsError, null, 2))
    process.exit(1)
  }

  console.log('   ✅ perhutanan_sosial berhasil diupdate')
  console.log(`     Jumlah KK baru: ${updatedPs[0].jumlah_kk}`)

  // 3. Tunggu sebentar untuk trigger (jika ada)
  console.log('   Menunggu 1 detik untuk trigger...')
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 4. Cek lembaga_pengelola setelah update
  console.log('\n3. Mengecek lembaga_pengelola setelah update...')
  const { data: afterLpData, error: afterLpError } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)

  if (afterLpError) {
    console.error('❌ Gagal mengambil data lembaga_pengelola setelah update:', afterLpError.message)
  } else {
    console.log(`   Jumlah lembaga_pengelola setelah update: ${afterLpData?.length || 0}`)
    
    if (afterLpData && afterLpData.length > 0) {
      console.log(`     ID: ${afterLpData[0].id}`)
      console.log(`     Nama: ${afterLpData[0].nama}`)
      console.log(`     Jumlah anggota: ${afterLpData[0].jumlah_anggota}`)
      console.log(`     Updated: ${afterLpData[0].updated_at}`)
      
      // Periksa apakah jumlah_anggota sudah sync dengan jumlah_kk
      if (afterLpData[0].jumlah_anggota === updatedPs[0].jumlah_kk) {
        console.log('   ✅ Jumlah anggota sudah sync dengan jumlah KK')
      } else {
        console.log(`   ⚠️  Jumlah anggota (${afterLpData[0].jumlah_anggota}) tidak sync dengan jumlah KK (${updatedPs[0].jumlah_kk})`)
      }
    }
    
    // Periksa duplikat
    if (afterLpData && afterLpData.length > 1) {
      console.error(`❌ Masih ada duplikat: ${afterLpData.length} record`)
      afterLpData.forEach((record, idx) => {
        console.log(`     Record ${idx}: ID=${record.id}, Created=${record.created_at}`)
      })
    } else {
      console.log('   ✅ Tidak ada duplikat')
    }
  }

  // 5. Kembalikan data ke semula
  console.log('\n4. Mengembalikan data ke semula...')
  const { error: revertError } = await supabase
    .from('perhutanan_sosial')
    .update({
      jumlah_kk: initialPsData.jumlah_kk,
      updated_at: new Date().toISOString()
    })
    .eq('id', PS_ID)

  if (revertError) {
    console.error('❌ Gagal mengembalikan data:', revertError.message)
  } else {
    console.log('   ✅ Data dikembalikan ke jumlah KK semula')
  }

  // 6. Verifikasi final
  console.log('\n5. Verifikasi final...')
  const { data: finalLpData } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)

  console.log(`   Jumlah lembaga_pengelola final: ${finalLpData?.length || 0}`)
  if (finalLpData && finalLpData.length === 1) {
    console.log('   ✅ Sistem berfungsi dengan baik: hanya 1 record lembaga_pengelola')
  } else if (finalLpData && finalLpData.length === 0) {
    console.log('   ⚠️  Tidak ada record lembaga_pengelola - mungkin trigger tidak membuatnya')
  } else {
    console.error(`❌ Masalah: ${finalLpData?.length} record lembaga_pengelola`)
  }

  console.log('\n✅ Test selesai!')
  console.log('\nKesimpulan:')
  if (updatePsError) {
    console.log('❌ Masalah duplicate constraint masih ada')
    console.log('   Perlu periksa kembali logika di edit-ps-form.tsx')
  } else {
    console.log('✅ Update berhasil tanpa error duplicate constraint')
  }
}

testUpdate().catch(error => {
  console.error('❌ Error dalam test:', error)
  process.exit(1)
})
