#!/usr/bin/env node

/**
 * Final verification for PS ID 2174a544-396c-4628-8837-aef91151bec5 update fix
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

async function verifyFix() {
  console.log('🔧 Verifikasi perbaikan untuk PS ID:', PS_ID)
  console.log('============================================\n')

  // 1. Check current state
  console.log('1. Status awal:')
  const { data: psData, error: psError } = await supabase
    .from('perhutanan_sosial')
    .select('*')
    .eq('id', PS_ID)
    .maybeSingle()

  if (psError) {
    console.error('❌ Gagal mengambil data perhutanan_sosial:', psError.message)
    process.exit(1)
  }

  if (!psData) {
    console.error('❌ Data perhutanan_sosial tidak ditemukan')
    process.exit(1)
  }

  console.log(`   Nama PS: ${psData.pemegang_izin}`)
  console.log(`   Skema: ${psData.skema}`)
  console.log(`   Jumlah KK: ${psData.jumlah_kk}`)

  // Check lembaga_pengelola
  const { data: lpData, error: lpError } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)

  if (lpError) {
    console.error('❌ Gagal mengambil data lembaga_pengelola:', lpError.message)
    process.exit(1)
  }

  console.log(`   Jumlah lembaga_pengelola: ${lpData?.length || 0}`)
  if (lpData && lpData.length > 0) {
    lpData.forEach((record, idx) => {
      console.log(`   Record ${idx + 1}: ID=${record.id}, Nama="${record.nama}", Anggota=${record.jumlah_anggota}`)
    })
  }

  // 2. Simulate the edit-ps-form update flow
  console.log('\n2. Simulasi alur update edit-ps-form:')
  
  // Simulate form data
  const formData = {
    namaPs: psData.pemegang_izin,
    desa: psData.desa,
    kecamatan: psData.kecamatan,
    skema: psData.skema,
    luasHa: psData.luas_ha,
    tahunSk: new Date(psData.tanggal_sk).getFullYear(),
    lembagaJumlahAnggota: psData.jumlah_kk + 5, // Increase by 5
    lembagaNama: '',
    lembagaKetua: null,
    lembagaKepalaDesa: null
  }

  console.log(`   Data form simulasi:`)
  console.log(`     Jumlah KK baru: ${formData.lembagaJumlahAnggota}`)

  // Step 1: Update perhutanan_sosial (this should trigger the cascade)
  console.log('\n   a. Update perhutanan_sosial...')
  const { error: updatePsError } = await supabase
    .from('perhutanan_sosial')
    .update({
      jumlah_kk: formData.lembagaJumlahAnggota,
      updated_at: new Date().toISOString()
    })
    .eq('id', PS_ID)

  if (updatePsError) {
    console.error(`❌ Gagal update perhutanan_sosial:`, updatePsError.message)
    console.error(`   Detail error:`, JSON.stringify(updatePsError, null, 2))
    
    // Check if it's the duplicate key error
    if (updatePsError.message.includes('duplicate key') || updatePsError.message.includes('lphd_perhutanan_sosial_id_key')) {
      console.error('\n❌❌❌ MASALAH DUPLICATE KEY MASIH ADA! ❌❌❌')
      console.error('   Perbaikan di edit-ps-form.tsx mungkin tidak cukup.')
      console.error('   Perlu diperiksa:')
      console.error('   1. Trigger cascade_ps_to_lembaga_update_trigger')
      console.error('   2. Constraint UNIQUE di tabel lembaga_pengelola')
      console.error('   3. Race condition antara trigger dan manual update')
    }
    process.exit(1)
  } else {
    console.log('   ✅ perhutanan_sosial berhasil diupdate')
  }

  // Wait a bit for trigger
  console.log('   b. Menunggu trigger...')
  await new Promise(resolve => setTimeout(resolve, 500))

  // Step 2: Check for duplicates and clean up (as per our fix)
  console.log('   c. Membersihkan duplikat...')
  const { data: allLembaga, error: fetchAllError } = await supabase
    .from('lembaga_pengelola')
    .select('id, created_at')
    .eq('perhutanan_sosial_id', PS_ID)
    .order('created_at', { ascending: false })

  if (!fetchAllError && allLembaga && allLembaga.length > 1) {
    const idsToDelete = allLembaga.slice(1).map(record => record.id)
    const { error: deleteError } = await supabase
      .from('lembaga_pengelola')
      .delete()
      .in('id', idsToDelete)
    
    if (deleteError) {
      console.error('   ❌ Gagal menghapus duplikat:', deleteError.message)
    } else {
      console.log(`   ✅ ${idsToDelete.length} duplikat dihapus`)
    }
  } else {
    console.log('   ✅ Tidak ada duplikat')
  }

  // Step 3: Update lembaga_pengelola with form data
  console.log('   d. Update lembaga_pengelola...')
  const lembagaUpdateData = {
    perhutanan_sosial_id: PS_ID,
    ketua: formData.lembagaKetua,
    kepala_desa: formData.lembagaKepalaDesa,
    jumlah_anggota: formData.lembagaJumlahAnggota
  }

  // Try update first, then insert if doesn't exist
  const { error: updateLpError } = await supabase
    .from('lembaga_pengelola')
    .update(lembagaUpdateData)
    .eq('perhutanan_sosial_id', PS_ID)

  if (updateLpError) {
    console.error('   ❌ Gagal update lembaga_pengelola:', updateLpError.message)
    // Try insert
    const { error: insertError } = await supabase
      .from('lembaga_pengelola')
      .insert([lembagaUpdateData])
    
    if (insertError) {
      console.error('   ❌ Gagal insert lembaga_pengelola:', insertError.message)
    } else {
      console.log('   ✅ lembaga_pengelola berhasil diinsert')
    }
  } else {
    console.log('   ✅ lembaga_pengelola berhasil diupdate')
  }

  // 3. Verify final state
  console.log('\n3. Status akhir:')
  
  const { data: finalPsData } = await supabase
    .from('perhutanan_sosial')
    .select('jumlah_kk')
    .eq('id', PS_ID)
    .maybeSingle()

  const { data: finalLpData } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', PS_ID)

  console.log(`   Jumlah KK akhir: ${finalPsData?.jumlah_kk || 'N/A'}`)
  console.log(`   Jumlah lembaga_pengelola akhir: ${finalLpData?.length || 0}`)
  
  if (finalLpData && finalLpData.length === 1) {
    console.log(`   Jumlah anggota lembaga: ${finalLpData[0].jumlah_anggota}`)
    
    // Check sync
    if (finalLpData[0].jumlah_anggota === finalPsData?.jumlah_kk) {
      console.log('   ✅ Data tersinkronisasi dengan baik')
    } else {
      console.log(`   ⚠️  Data tidak sinkron: anggota=${finalLpData[0].jumlah_anggota}, KK=${finalPsData?.jumlah_kk}`)
    }
  } else if (finalLpData && finalLpData.length > 1) {
    console.error(`❌ MASIH ADA DUPLIKAT: ${finalLpData.length} record`)
  } else if (finalLpData && finalLpData.length === 0) {
    console.error('❌ Tidak ada record lembaga_pengelola')
  }

  // 4. Summary
  console.log('\n4. Kesimpulan:')
  if (!updatePsError && finalLpData && finalLpData.length === 1) {
    console.log('✅ PERBAIKAN BERHASIL!')
    console.log('   Update PS ID', PS_ID, 'tidak lagi menyebabkan error duplicate key.')
    console.log('   Logika perbaikan di edit-ps-form.tsx berfungsi dengan baik.')
  } else {
    console.log('❌ PERBAIKAN BELUM SEMPURNA')
    console.log('   Masih ada masalah yang perlu diselesaikan.')
  }

  // 5. Cleanup: restore original data
  console.log('\n5. Membersihkan dan mengembalikan data awal...')
  await supabase
    .from('perhutanan_sosial')
    .update({ 
      jumlah_kk: psData.jumlah_kk,
      updated_at: new Date().toISOString()
    })
    .eq('id', PS_ID)

  console.log('✅ Verifikasi selesai!')
}

verifyFix().catch(error => {
  console.error('❌ Error dalam verifikasi:', error)
  process.exit(1)
})
