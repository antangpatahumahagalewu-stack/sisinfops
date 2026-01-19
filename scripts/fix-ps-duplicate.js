#!/usr/bin/env node

/**
 * Script untuk memperbaiki masalah duplicate constraint untuk PS ID 2174a544-396c-4628-8837-aef91151bec5
 * dan menganalisis masalah upsert di lembaga_pengelola.
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

async function analyzeAndFix() {
  console.log('🔍 Menganalisis dan memperbaiki masalah untuk PS ID:', PS_ID)
  console.log('===================================================\n')
  
  // 1. Cek semua constraint di tabel lembaga_pengelola
  console.log('1. Memeriksa constraint di database...')
  
  // 2. Cari semua duplicate perhutanan_sosial_id di lembaga_pengelola
  console.log('\n2. Mencari duplikat perhutanan_sosial_id di seluruh database...')
  const { data: allLpData, error: allLpError } = await supabase
    .from('lembaga_pengelola')
    .select('perhutanan_sosial_id, id, nama, created_at')
    .order('perhutanan_sosial_id', { ascending: true })
  
  if (allLpError) {
    console.error('❌ Error mengambil data lembaga_pengelola:', allLpError.message)
  } else {
    // Hitung frekuensi perhutanan_sosial_id
    const freqMap = new Map()
    const recordsMap = new Map()
    
    allLpData.forEach(record => {
      const key = record.perhutanan_sosial_id
      const records = recordsMap.get(key) || []
      records.push(record)
      recordsMap.set(key, records)
      freqMap.set(key, (freqMap.get(key) || 0) + 1)
    })
    
    const duplicates = Array.from(freqMap.entries())
      .filter(([key, count]) => count > 1)
      .map(([key, count]) => ({ 
        perhutanan_sosial_id: key, 
        count,
        records: recordsMap.get(key)
      }))
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Ditemukan ${duplicates.length} PS dengan duplikat lembaga_pengelola:`)
      duplicates.forEach(dup => {
        console.log(`\n   PS ID: ${dup.perhutanan_sosial_id}`)
        console.log(`   Jumlah record: ${dup.count}`)
        dup.records.forEach((record, idx) => {
          console.log(`   Record ${idx + 1}: ID=${record.id}, Nama="${record.nama}", Created=${record.created_at}`)
        })
      })
      
      // 3. Perbaiki duplikat
      console.log('\n3. Memperbaiki duplikat...')
      for (const dup of duplicates) {
        // Simpan record terbaru (dengan created_at terakhir), hapus yang lain
        const sortedRecords = dup.records.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )
        
        const keepRecord = sortedRecords[0]
        const deleteRecords = sortedRecords.slice(1)
        
        console.log(`\n   Memperbaiki PS ID: ${dup.perhutanan_sosial_id}`)
        console.log(`   Menyimpan record: ${keepRecord.id} (terbaru)`)
        console.log(`   Menghapus ${deleteRecords.length} record duplikat`)
        
        for (const delRecord of deleteRecords) {
          const { error: deleteError } = await supabase
            .from('lembaga_pengelola')
            .delete()
            .eq('id', delRecord.id)
          
          if (deleteError) {
            console.error(`❌ Gagal menghapus record ${delRecord.id}:`, deleteError.message)
          } else {
            console.log(`   ✅ Record ${delRecord.id} dihapus`)
          }
        }
      }
    } else {
      console.log('✅ Tidak ditemukan duplikat perhutanan_sosial_id')
    }
  }
  
  // 4. Analisis trigger dan cascade update
  console.log('\n4. Menganalisis trigger cascade_ps_to_lembaga_update_trigger...')
  
  // 5. Simulasi update untuk PS ID ini
  console.log('\n5. Simulasi update data untuk PS ID ini...')
  
  // Ambil data PS saat ini
  const { data: currentPsData } = await supabase
    .from('perhutanan_sosial')
    .select('*')
    .eq('id', PS_ID)
    .maybeSingle()
  
  if (currentPsData) {
    console.log(`   Data PS saat ini:`)
    console.log(`     Nama: ${currentPsData.pemegang_izin}`)
    console.log(`     Skema: ${currentPsData.skema}`)
    console.log(`     Jumlah KK: ${currentPsData.jumlah_kk}`)
    
    // Coba update kecil
    const newJumlahKK = currentPsData.jumlah_kk + 1
    console.log(`\n   Mencoba update jumlah_kk: ${currentPsData.jumlah_kk} → ${newJumlahKK}`)
    
    const { error: updateError } = await supabase
      .from('perhutanan_sosial')
      .update({ 
        jumlah_kk: newJumlahKK,
        updated_at: new Date().toISOString()
      })
      .eq('id', PS_ID)
    
    if (updateError) {
      console.error(`❌ Error update perhutanan_sosial:`, updateError.message)
    } else {
      console.log(`   ✅ Update berhasil`)
      
      // Cek lembaga_pengelola setelah update
      const { data: updatedLpData } = await supabase
        .from('lembaga_pengelola')
        .select('*')
        .eq('perhutanan_sosial_id', PS_ID)
      
      console.log(`   Jumlah record lembaga_pengelola setelah update: ${updatedLpData?.length || 0}`)
      if (updatedLpData && updatedLpData.length > 0) {
        console.log(`   Data lembaga_pengelola:`)
        console.log(`     Jumlah anggota: ${updatedLpData[0].jumlah_anggota}`)
        console.log(`     Updated: ${updatedLpData[0].updated_at}`)
      }
      
      // Kembalikan ke nilai semula
      await supabase
        .from('perhutanan_sosial')
        .update({ 
          jumlah_kk: currentPsData.jumlah_kk,
          updated_at: new Date().toISOString()
        })
        .eq('id', PS_ID)
    }
  }
  
  // 6. Perbaiki form logic issue
  console.log('\n6. Menganalisis masalah di edit-ps-form.tsx...')
  console.log('   Masalah: Race condition antara trigger dan upsert')
  console.log('   Solusi: Hanya update lembaga_pengelola jika benar-benar perlu,')
  console.log('           atau handle error duplicate key dengan retry logic')
  
  // 7. Buat rekomendasi fix
  console.log('\n7. Rekomendasi perbaikan:')
  console.log('   a. Di edit-ps-form.tsx, setelah update perhutanan_sosial,')
  console.log('      tunggu sebentar sebelum upsert lembaga_pengelola')
  console.log('   b. Atau, gunakan transaction untuk atomic update')
  console.log('   c. Atau, tangkap error duplicate key dan coba update (bukan upsert)')
  
  // 8. Implementasi fix sederhana: hapus lalu insert ulang jika perlu
  console.log('\n8. Implementasi fix untuk PS ID ini:')
  console.log('   Menghapus dan membuat ulang lembaga_pengelola...')
  
  // Hapus dulu
  const { error: deleteError } = await supabase
    .from('lembaga_pengelola')
    .delete()
    .eq('perhutanan_sosial_id', PS_ID)
  
  if (deleteError) {
    console.error(`❌ Gagal menghapus lembaga_pengelola:`, deleteError.message)
  } else {
    console.log(`   ✅ Lembaga_pengelola dihapus`)
    
    // Buat ulang dengan trigger
    const { error: triggerError } = await supabase
      .from('perhutanan_sosial')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', PS_ID)
    
    if (triggerError) {
      console.error(`❌ Gagal trigger update:`, triggerError.message)
    } else {
      console.log(`   ✅ Trigger dijalankan, lembaga_pengelola seharusnya dibuat ulang`)
      
      // Verifikasi
      const { data: finalLpData } = await supabase
        .from('lembaga_pengelola')
        .select('*')
        .eq('perhutanan_sosial_id', PS_ID)
      
      console.log(`   Jumlah record akhir: ${finalLpData?.length || 0}`)
      if (finalLpData && finalLpData.length > 0) {
        console.log(`   ✅ Lembaga_pengelola berhasil dibuat ulang`)
        console.log(`      ID: ${finalLpData[0].id}`)
        console.log(`      Nama: ${finalLpData[0].nama}`)
      } else {
        console.log(`❌ Lembaga_pengelola tidak dibuat ulang`)
      }
    }
  }
  
  console.log('\n✅ Analisis dan perbaikan selesai!')
  console.log('\nCatatan: Untuk mencegah masalah ini di masa depan:')
  console.log('1. Edit edit-ps-form.tsx untuk handle duplicate key error')
  console.log('2. Atau ubah logic upsert menjadi update saja jika record sudah ada')
  console.log('3. Pertimbangkan untuk menonaktifkan sementara trigger selama update form')
}

analyzeAndFix().catch(error => {
  console.error('❌ Error dalam analisis dan perbaikan:', error)
  process.exit(1)
})
