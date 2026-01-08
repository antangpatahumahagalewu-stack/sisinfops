#!/usr/bin/env node

/**
 * Script untuk mengimpor data Jumlah KK dari CSV (dari user) ke tabel perhutanan_sosial di Supabase.
 * CSV format:
 * No,Pemegang Izin,Kabupaten,Skema,Jenis Hutan,Luas (Ha),RKPS,Peta,Aksi,Jumlah KK
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
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CSV data dari user (dalam pesan)
const csvData = `No,Pemegang Izin,Kabupaten,Skema,Jenis Hutan,Luas (Ha),RKPS,Peta,Aksi,Jumlah KK
1,HTR MANTA'A HAPAKAT BERSAMA,Kabupaten Kapuas,HTR,Mineral,820,Belum,Ada,,59
2,KTH BUKOI MAJU BERSAMA,Kabupaten Kapuas,HTR,Mineral,1501,Belum,Ada,,102
3,KT TUMBANG TIHIS,Kabupaten Kapuas,HTR,Mineral,815,Belum,Ada,,74
4,KOPERASI BETANG TELAWANG,Kabupaten Kapuas,HTR,Mineral,720,Belum,Ada,,30
5,LPHD TUMBANG MANYARUNG,Kabupaten Kapuas,HD,Mineral,2161,Belum,Ada,,154
6,KTH SUMBER REJEKI,Kabupaten Kapuas,HKM,Mineral,1190,Belum,Ada,,81
7,KTH LESTARI HUTAN KATANJUNG II,Kabupaten Kapuas,HTR,Mineral,756,Belum,Ada,,46
8,KTH BATANG PAMBELOM,Kabupaten Kapuas,HKM,Mineral,1571,Belum,Ada,,104
9,LPHD TUMBANG TIHIS,Kabupaten Kapuas,HD,Mineral,839,Belum,Ada,,154
10,LPHD LAWANG TAMANG,Kabupaten Kapuas,HD,Mineral,426,Belum,Ada,,132
11,KTH BERKAT TAMANG HAPAKAT,Kabupaten Kapuas,HKM,Mineral,584,Belum,Ada,,86
12,KTH HARAPAN BARU,Kabupaten Kapuas,HTR,Mineral/Gambut,2445,Belum,Ada,,167
13,LPHD ALAU,Kabupaten Kapuas,HD,Mineral/Gambut,954,Belum,Ada,,249
14,LPHD PETAK PUTI,Kabupaten Kapuas,HD,Mineral/Gambut,5719,Belum,Ada,,335
15,LPHD KATUNJUNG,Kabupaten Kapuas,HD,Mineral/Gambut,6315,Belum,Ada,,178
16,LPHD TAMPUNG PENYANG,Kabupaten Kapuas,HD,Mineral/Gambut,5000,Belum,Ada,,41
17,LPHD TAMBAK BAJAI,Kabupaten Kapuas,HD,Mineral/Gambut,9416,Belum,Ada,,246
18,LPHD PELITA MUDA,Kabupaten Kapuas,HD,Mineral/Gambut,2012,Belum,Ada,,105
19,LPHD MANTANGAI HULU,Kabupaten Kapuas,HD,Mineral/Gambut,4995,Belum,Ada,,23
20,LPHD DANAU BAGANTUNG,Kabupaten Kapuas,HD,Mineral/Gambut,4995,Belum,Ada,,23
21,LPHD BEROK TUNGGAL,Kabupaten Kapuas,HD,Mineral/Gambut,339,Belum,Ada,,59
22,LPHD SEI AHAS,Kabupaten Kapuas,HD,Mineral/Gambut,2113,Belum,Ada,,23
23,KTH RIMBA LESTARI,Kabupaten Kapuas,HKM,Mineral/Gambut,100,Belum,Ada,,35
24,KTH IJE ATEI,Kabupaten Kapuas,HKM,Mineral/Gambut,180,Belum,Ada,,92
25,GAPOKTAN TUMBANG MUROI,Kabupaten Kapuas,HKM,Mineral/Gambut,807,Belum,Ada,,98
26,KTH LESTARI,Kabupaten Gunung Mas,HKM,Gambut,1885,Belum,Ada,,380
27,KOPERASI RIAK SIMIN,Kabupaten Gunung Mas,HTR,Gambut,4525,Belum,Ada,,307
28,MHA RUNGAN,Kabupaten Gunung Mas,HA,Gambut,5416,Belum,Ada,,101
29,KTH BUKIT BATU,Kabupaten Gunung Mas,HKM,Mineral,196,Belum,Ada,,93
30,KELOMPOK MASYARAKAT MARIKOI HAPAKAT,Kabupaten Gunung Mas,HKM,Mineral,751.29,Belum,Ada,,101
31,KTH KAPAKAT KELUARGA,Kabupaten Gunung Mas,HKM,Mineral,240,Belum,Ada,,22
32,KELOMPOK MASYARAKAT JASA ASANG,Kabupaten Gunung Mas,HKM,Mineral,472.7,Belum,Ada,,55
33,KELOMPOK MASYARAKAT SOPAN LAWANG BULAN,Kabupaten Gunung Mas,HKM,Mineral,178,Belum,Ada,,30
34,GAPOKTAN ANOI SANGKUWAK,Kabupaten Gunung Mas,HKM,Mineral,223,Belum,Ada,,77
35,KT MIAR HAYAK,Kabupaten Gunung Mas,HKM,Mineral,1295,Belum,Ada,,121
36,MHA DAYAK OT DANUM LOWU TUMBANG MAHUROI,Kabupaten Gunung Mas,HA,Mineral,7444,Ada,Ada,,354
37,MHA DAYAK OT DANUM HIMBA ANTANG AMBUN LIANG BUNGAI,Kabupaten Gunung Mas,HA,Mineral,14224,Ada,Ada,,378
38,MHA DAYAK NGAJU LEWU TUMBANG MALAHOI,Kabupaten Gunung Mas,HA,Mineral,2012,Ada,Ada,,447
39,KTH TUWE BERSAMA MAJU,Kabupaten Gunung Mas,HTR,Mineral,936,Belum,Ada,,70
40,MHA DAYAK OT DANUM LOWU LAWANG KANJI,Kabupaten Gunung Mas,HA,Mineral,1046,Ada,Ada,,181
41,KT SEI ANTAI PARANG HAPAKAT,Kabupaten Gunung Mas,HTR,Mineral,1466,Belum,Ada,,140
42,MHA DAYAK OT DANUM LOWU TUMBANG POSU,Kabupaten Gunung Mas,HA,Mineral,996,Ada,Ada,,79
43,KTH TUMBANG LAPAN BERKARYA,Kabupaten Gunung Mas,HKM,Mineral,177,Belum,Ada,,67
44,MHA DAYAK NGAJU LEWU TUMBANG BAHENEI,Kabupaten Gunung Mas,HA,Mineral,5110,Ada,Ada,,167
45,LPHD HAROWU,Kabupaten Gunung Mas,HD,Mineral,1750,Belum,Belum,,57
46,MHA DAYAK OT DANUM LOWU KARETAU SARIAN,Kabupaten Gunung Mas,HA,Mineral,2181,Ada,Ada,,208
47,LPHD TUMBANG JALEMU,Kabupaten Gunung Mas,HD,Mineral,159,Belum,Ada,,13
48,MHA DAYAK OT DANUM LOWU TUMBANG MARAYA,Kabupaten Gunung Mas,HA,Mineral,894,Ada,Ada,,120
49,MHA DAYAK OT DANUM LOWU TUMBANG HATUNG,Kabupaten Gunung Mas,HA,Mineral,3092,Ada,Ada,,61
50,MHA DAYAK OT DANUM LOWU TUMBANG MARIKOI,Kabupaten Gunung Mas,HA,Mineral,3123,Ada,Ada,,372
51,MHA DAYAK OT DANUM LOWU TUMBANG ANOI,Kabupaten Gunung Mas,HA,Mineral,2872,Ada,Ada,,153
52,MHA DAYAK OT DANUM LOWU KARETAU RAMBANGUN,Kabupaten Gunung Mas,HA,Mineral,2956,Ada,Ada,,69
53,MHA DAYAK NGAJU LEWU TUMBANG KUAYAN,Kabupaten Gunung Mas,HA,Mineral,1250,Ada,Ada,,205
54,LPHD TUMBANG MARAYA,Kabupaten Gunung Mas,HD,Mineral,334,Belum,Ada,,81
55,LPHD LAWANG KANJI,Kabupaten Gunung Mas,HD,Mineral,299,Ada,Ada,,123
56,LPHD RANGAN HIRAN,Kabupaten Gunung Mas,HD,Mineral,865,Belum,Belum,,86
57,LPHD RABAMBANG,Kabupaten Gunung Mas,HD,Mineral,440,Belum,Ada,,95
58,LPHD KARETAU SARIAN,Kabupaten Gunung Mas,HD,Mineral,608,Ada,Belum,,400
59,KTH HAPAKAT MAHAGA HIMBA,Kabupaten Gunung Mas,HKM,Mineral,460,Belum,Ada,,148
60,KT BATU BULAN,Kabupaten Gunung Mas,HKM,Mineral,2925,Belum,Ada,,139
61,LPHD TAHAWA,Kabupaten Pulang Pisau,HD,Mineral/Gambut,998,Belum,Ada,,272
62,LPHD PARAHANGAN,Kabupaten Pulang Pisau,HD,Mineral/Gambut,1574,Belum,Ada,,314
63,LPHD BALUKON,Kabupaten Pulang Pisau,HD,Mineral/Gambut,1485,Belum,Ada,,104
64,LPHD PETUK LITI,Kabupaten Pulang Pisau,HD,Mineral/Gambut,2445,Belum,Ada,,181
65,LPHD BAHU PALAWA,Kabupaten Pulang Pisau,HD,Mineral/Gambut,397,Belum,Ada,,104
66,LPHD PAMARUNAN,Kabupaten Pulang Pisau,HD,Mineral/Gambut,1045,Belum,Ada,,198
67,LPHD BUKIT BAMBA,Kabupaten Pulang Pisau,HD,Mineral/Gambut,1216,Belum,Ada,,117
68,LPHD SIGI,Kabupaten Pulang Pisau,HD,Mineral/Gambut,1276,Belum,Ada,,181
69,LPHD TUWUNG,Kabupaten Pulang Pisau,HD,Mineral/Gambut,1297,Belum,Ada,,206
70,GAPOKTAN HUTAN HTR SENGON,Kabupaten Pulang Pisau,HTR,Mineral/Gambut,521,Belum,Ada,,230
71,GAPOKTAN HUTAN,Kabupaten Pulang Pisau,HTR,Mineral/Gambut,236,Belum,Ada,,177
72,LPHD GOHONG,Kabupaten Pulang Pisau,HD,Mineral/Gambut,3155,Belum,Ada,,94
73,LPHD BUNTOI,Kabupaten Pulang Pisau,HD,Mineral/Gambut,7025,Belum,Ada,,95
74,KTH KATINGAN MANUAH,Kabupaten Katingan,HKM,Mineral/Gambut,966,Belum,Ada,,82
75,LPHD LAPAK TAHETA,Kabupaten Katingan,HD,Mineral/Gambut,2662,Belum,Belum,,270
76,LPHD KARUING HAPAKAT,Kabupaten Katingan,HD,Mineral/Gambut,462,Ada,Ada,,165
77,LPHD KAHANJAK ATEI,Kabupaten Katingan,HD,Mineral/Gambut,911,Ada,Ada,,450
78,LPHD JALAN PANGEN,Kabupaten Katingan,HD,Mineral/Gambut,424,Ada,Ada,,19
79,LD HIMBA PANATAU LEWU,Kabupaten Katingan,HD,Mineral/Gambut,4051,Belum,Belum,,43
80,LPHD PANDINU PANTIS EBES,Kabupaten Katingan,HD,Mineral/Gambut,763,Ada,Ada,,33
81,LPHD TUMBANG RUNEN TATAU,Kabupaten Katingan,HD,Mineral/Gambut,399,Ada,Ada,,136
82,GAPOKTANHUT KAPAKAT ATEI,Kabupaten Katingan,HKM,Mineral/Gambut,4556,Ada,Ada,,800`

function parseCSV(csvText) {
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  const data = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    
    // Handle quoted fields (especially field dengan koma di dalam)
    const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g
    let fields = lines[i].match(regex)
    if (!fields) continue
    
    fields = fields.map(f => f.trim().replace(/^"|"$/g, ''))
    
    if (fields.length !== headers.length) {
      console.warn(`Line ${i} has ${fields.length} fields, expected ${headers.length}: ${lines[i]}`)
      // Fallback: split by comma (simple)
      fields = lines[i].split(',').map(f => f.trim().replace(/^"|"$/g, ''))
    }
    
    const obj = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j] || ''
    }
    data.push(obj)
  }
  return data
}

function normalizeKabupatenName(name) {
  // Mapping nama kabupaten di CSV ke format di database
  // Format di CSV: "Kabupaten Kapuas", "Kabupaten Gunung Mas", dll.
  // Di database: "KABUPATEN KAPUAS", "KABUPATEN GUNUNG MAS"
  const nameUpper = name.toUpperCase()
  if (nameUpper.startsWith('KABUPATEN ')) {
    return nameUpper
  }
  return `KABUPATEN ${nameUpper}`
}

function normalizeSkema(skema) {
  // HD, HKM, HTR, HA (sudah sesuai)
  return skema.trim()
}

function normalizeJenisHutan(jenis) {
  // Mineral, Mineral/Gambut, Gambut
  return jenis.trim()
}

function normalizeStatus(status) {
  // "Ada" -> 'ada', "Belum" -> 'belum'
  const s = status.trim().toLowerCase()
  return s === 'ada' ? 'ada' : 'belum'
}

async function importData() {
  console.log('🔍 Memulai import data Jumlah KK dari CSV...')
  console.log('='.repeat(60))

  // Parse CSV
  const parsedData = parseCSV(csvData)
  console.log(`📊 Total baris CSV: ${parsedData.length}`)

  // Ambil mapping kabupaten dari database
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

  console.log(`📌 Mapping kabupaten: ${kabupatenData.length} kabupaten ditemukan`)

  let imported = 0
  let updated = 0
  let failed = 0

  // Proses setiap baris
  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i]
    const no = row['No']
    const pemegangIzin = row['Pemegang Izin']
    const kabupaten = row['Kabupaten']
    const skema = row['Skema']
    const jenisHutan = row['Jenis Hutan']
    const luasHa = parseFloat(row['Luas (Ha)'].replace(',', '.')) || 0
    const rkps = row['RKPS']
    const peta = row['Peta']
    const jumlahKK = parseInt(row['Jumlah KK']) || 0

    if (!pemegangIzin || !kabupaten) {
      console.warn(`⚠️  Baris ${no} dilewati: Pemegang Izin atau Kabupaten kosong`)
      continue
    }

    const normalizedKabupaten = normalizeKabupatenName(kabupaten)
    const kabupatenId = kabupatenMap.get(normalizedKabupaten.toUpperCase())

    if (!kabupatenId) {
      console.error(`❌ Kabupaten tidak ditemukan: ${kabupaten} (${normalizedKabupaten})`)
      failed++
      continue
    }

    // Cek apakah PS sudah ada (berdasarkan pemegang_izin dan kabupaten_id)
    const { data: existingPS, error: fetchError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, jumlah_kk, rkps_status, peta_status')
      .eq('pemegang_izin', pemegangIzin)
      .eq('kabupaten_id', kabupatenId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`❌ Error fetching PS ${pemegangIzin}:`, fetchError.message)
      failed++
      continue
    }

    // Siapkan data untuk insert/update
    const psData = {
      kabupaten_id: kabupatenId,
      skema: normalizeSkema(skema),
      pemegang_izin: pemegangIzin,
      // desa dan kecamatan tidak ada di CSV, kita kosongkan
      desa: '',
      kecamatan: '',
      jumlah_kk: jumlahKK,
      luas_ha: luasHa,
      jenis_hutan: normalizeJenisHutan(jenisHutan),
      // status_kawasan default
      status_kawasan: '------',
      rkps_status: normalizeStatus(rkps),
      peta_status: normalizeStatus(peta),
      // default lainnya
      keterangan: '',
      fasilitator: '',
      updated_at: new Date().toISOString()
    }

    try {
      if (existingPS) {
        // Update existing record
        // Hanya update field yang diperlukan, jangan overwrite seluruh record
        const updateData = {
          jumlah_kk: jumlahKK,
          luas_ha: luasHa,
          rkps_status: normalizeStatus(rkps),
          peta_status: normalizeStatus(peta),
          updated_at: new Date().toISOString()
        }
        
        const { error: updateError } = await supabase
          .from('perhutanan_sosial')
          .update(updateData)
          .eq('id', existingPS.id)

        if (updateError) {
          console.error(`❌ Gagal update PS ${pemegangIzin}:`, updateError.message)
          failed++
        } else {
          const changes = []
          if (existingPS.jumlah_kk !== jumlahKK) changes.push(`KK: ${existingPS.jumlah_kk}→${jumlahKK}`)
          if (existingPS.rkps_status !== updateData.rkps_status) changes.push(`RKPS: ${existingPS.rkps_status}→${updateData.rkps_status}`)
          if (existingPS.peta_status !== updateData.peta_status) changes.push(`Peta: ${existingPS.peta_status}→${updateData.peta_status}`)
          console.log(`✓ Update: ${pemegangIzin} (${changes.join(', ') || 'data sama'})`)
          updated++
        }
      } else {
        // Insert new record
        const { data: newPS, error: insertError } = await supabase
          .from('perhutanan_sosial')
          .insert([{ ...psData, created_at: new Date().toISOString() }])
          .select()

        if (insertError) {
          console.error(`❌ Gagal insert PS ${pemegangIzin}:`, insertError.message)
          failed++
        } else {
          console.log(`✓ Insert: ${pemegangIzin} (KK: ${jumlahKK}, Luas: ${luasHa} Ha)`)
          imported++
          
          // Jangan otomatis buat record lembaga_pengelola karena sudah ada trigger/migrasi yang menangani
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${pemegangIzin}:`, error.message)
      failed++
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${parsedData.length}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 HASIL IMPORT:')
  console.log(`   Imported: ${imported} baru`)
  console.log(`   Updated: ${updated} data`)
  console.log(`   Failed: ${failed} gagal`)
  console.log(`   Total processed: ${imported + updated + failed}`)

  // Verifikasi total KK di database
  console.log('\n🔍 Verifikasi data jumlah KK...')
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

  console.log('\n✅ Import selesai!')
}

// Jalankan import
importData().catch(error => {
  console.error('❌ Error dalam proses import:', error)
  process.exit(1)
})
