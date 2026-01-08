#!/usr/bin/env node

/**
 * Script untuk mengimpor data Perhutanan Sosial dari CSV (string dari user)
 * ke database Supabase, termasuk kolom jumlah_kk.
 * 
 * CSV format:
 * No,Skema PS,Nama PS,Desa/Kelurahan,Kecamatan,Kabupaten,Jumlah KK
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CSV data dari user (dalam feedback)
const csvData = `No,Skema PS,Nama PS,Desa/Kelurahan,Kecamatan,Kabupaten,Jumlah KK
1,HD,LPHD HAROWU,HAROWU,MIRI MANASA,Gunung Mas,57
2,HD,LPHD RABAMBANG,RABAMBANG,RUNGAT BARAT,Gunung Mas,95
3,HD,LPHD RANGAN HIRAN,RANGAN HIRAN,MIRI MANASA,Gunung Mas,86
4,HD,LPHD LAWANG KANJI,LAWANG KANJI,DAMANG BATU,Gunung Mas,123
5,HD,LPHD KARETAU SARIAN,KARETAU SARIAN,DAMANG BATU,Gunung Mas,400
6,HD,LPHD TUMBANG MARAYA,TUMBANG MARAYA,DAMANG BATU,Gunung Mas,81
7,HKM,GAPOKTAN ANOI SANGKUWAK,TUMBANG ANOI,DAMANG BATU,Gunung Mas,77
8,HKM,KT MIAR HAYAK,MANGKAWUK,RUNGAN BARAT,Gunung Mas,121
9,HKM,KTH LESTARI,TUMBANG MIWAN,KURUN,Gunung Mas,380
10,HKM,KT BATU BULAN,TUSANG RAYA,RUNGAN BARAT,Gunung Mas,139
11,HKM,KELOMPOK MASYARAKAT SOPAN LAWANG BULAN,TUMBANG MAHUROI,DAMANG BATU,Gunung Mas,30
12,HKM,KELOMPOK MASYARAKAT JASA ASANG,TUMBANG POSU,DAMANG BATU,Gunung Mas,55
13,HKM,KOPERASI PALANGKA MAS SEJAHTERA,TELUK NYATU,KURUN,Gunung Mas,30
14,HKM,KOPERASI BUNUT JAYA,HURUNG BUNUT,KURUN,Gunung Mas,31
15,HKM,KOPERASI MIHING MANASA,DAHIAN TAMBUK,MIHING RAYA,Gunung Mas,20
16,HKM,KOPERASI TAMPUHAK KAPAKAT ITAH,PETAK BAHANDANG,KURUN,Gunung Mas,43
17,HKM,KELOMPOK MASYARAKAT MARIKOI HAPAKAT,TUMBANG MARIKOI,DAMANG BATU,Gunung Mas,101
18,HKM,KTH TELUK NYATU,TELUK NYATU,KURUN,Gunung Mas,49
19,HTR,KOPERASI RIAK SIMIN,SEPANG SIMIN,SEPANG,Gunung Mas,307
20,HTR,KTH TUWE BERSAMA MAJU,TUMBANG TEWE,RUNGAN HULU,Gunung Mas,70
21,HTR,KT SEI ANTAI PARANG HAPAKAT,SEI ANTAI,RUNGAN HULU,Gunung Mas,140
22,HA,MHA DAYAK OT DANUM HIMBA ANTANG AMBUN LIANG BUNGAI,"HAROWU, RANGAN HIRAN, DAN TUMBANG MASUKIH",MIRI MANASA,Gunung Mas,378
23,HA,MHA DAYAK OT DANUM LOWU TUMBANG HATUNG,TUMBANG HATUNG,MIRI MANASA,Gunung Mas,61
24,HA,MHA DAYAK OT DANUM LOWU TUMBANG MAHUROI,TUMBANG MAHUROI,DAMANG BATU,Gunung Mas,354
25,HA,MHA DAYAK OT DANUM LOWU KARETAU SARIAN,KARETAU SARIAN,DAMANG BATU,Gunung Mas,208
26,HA,MHA DAYAK OT DANUM LOWU TUMBANG ANOI,TUMBANG ANOI,DAMANG BATU,Gunung Mas,153
27,HA,MHA DAYAK OT DANUM LOWU KARETAU RAMBANGUN,KARETAU RAMBANGUN,DAMANG BATU,Gunung Mas,69
28,HA,MHA DAYAK NGAJU LEWU TUMBANG KUAYAN,TUMBANG KUAYAN,RUNGAN BARAT,Gunung Mas,205
29,HA,MHA DAYAK NGAJU LEWU TUMBANG BAHENEI,TUMBANG BAHENEI,RUNGAN BARAT,Gunung Mas,167
30,HA,MHA DAYAK NGAJU LEWU TUMBANG MALAHOI,TUMBANG MALAHOI,RUNGAN,Gunung Mas,447
31,HA,MHA DAYAK OT DANUM LOWU LAWANG KANJI,LAWANG KANJI,DAMANG BATU,Gunung Mas,181
32,HA,MHA DAYAK OT DANUM LOWU TUMBANG MARAYA,TUMBANG MARAYA,DAMANG BATU,Gunung Mas,120
33,HA,MHA DAYAK OT DANUM LOWU TUMBANG POSU,TUMBANG POSU,DAMANG BATU,Gunung Mas,79
34,HA,MHA DAYAK OT DANUM LOWU TUMBANG MARIKOI,TUMBANG MARIKOI,DAMANG BATU,Gunung Mas,372
35,HA,MHA RUNGAN,"KEL.MUNGKU BARU, DESA PAREMPEI, DAN DESA BERENG MALAKA","RAKUMPIT& RUNGAN",Gunung Mas,Gunung Mas,101
36,HA,MHA DAYAK NGAJU LEWU TEHANG,KELURAHAN TEHANG,MANUHING RAYA,Gunung Mas,792
37,HKM,KTH TUMBANG LAPAN BERKARYA,TUMBANG LAPAN,RUNGAN HULU,Gunung Mas,67
38,HD,LPHD TUMBANG JALEMU,TUMBANG JALEMU,MANUHING,Gunung Mas,13
39,HKM,KTH KAPAKAT KELUARGA,KELURAHAN TUMBANG TELAKEN,MANUHING,Gunung Mas,22
40,HKM,KTH HAPAKAT MAHAGA HIMBA,BATU PUTER,RUNGAN HULU,Gunung Mas,148
41,HKM,KTH BUKIT BATU,JANGKIT,RUNGAN HULU,Gunung Mas,93
42,HD,LPHD TELAGA,TELAGA,KAMIPANG,Katingan,428
43,HD,LPHD TUMBANG HABANGOI,TUMBANG HABANGOI,PETAK MALAI,Katingan,240
44,HD,LPHD KAHANJAK ATEI,ASEM KUMBANG,KAMIPANG,Katingan,450
45,HD,LPHD JALAN PANGEN,BAUN BANGO,KAMIPANG,Katingan,19
46,HD,LPHD KARUING HAPAKAT,KARUING,KAMIPANG,Katingan,165
47,HD,LPHD PANDINU PANTIS EBES,PARUPUK,KAMIPANG,Katingan,33
48,HD,LPHD TAMPELAS,TAMPELAS,KAMIPANG,Katingan,154
49,HD,LPHD TUMBANG RUNEN TATAU,TUMBANG RUNEN,KAMIPANG,Katingan,136
50,HD,LPHD MENDAWAI,MENDAWAI,MENDAWAI,Katingan,1195
51,HKM,KT KARYA MANDIRI BERSAMA,BATU BADAK,PETAK MALAI,Katingan,88
52,HKM,KSU BARAOI BERSAMA,"TUMBANG ATEI; TUMBANG PANGKA",SANAMAN MANTIKEI,Katingan,296
53,HKM,KOPERASI SAKTI JAYA,NUSA KUTAU,PETAK MALAI,Katingan,147
54,HKM,KT BATU KACAH,TUMBANG KAWAE,SANAMAN MANTIKEI,Katingan,105
55,HKM,KOPERASI HATAMPUNG JAYA,BADINDING,KATINGAN TENGAH,Katingan,522
56,HKM,KT MANGARA MANDIRI,TUMBANG MANGARA,SANAMAN MANTIKEI,Katingan,147
57,HKM,KOPERASI PUTRA MAKIKIT JAYA,TUMBANG KALEMEI,KATINGAN TENGAH,Katingan,67
58,HKM,GAPOKTANHUT KAPAKAT ATEI,"DESA TELAGA, PARUPUK, KARUING, JAHANJANG, DAN TUMBANG RUNEN",KAMIPANG,Katingan,800
59,HKM,KOPERASI SEPAN RAYA,RANTAU ASEM,KATINGAN TENGAH,Katingan,40
60,HKM,KOPERASI KARYA PUTRA MIRAH,MIRAH KELANAMAN,KATINGAN TENGAH,Katingan,66
61,HKM,KTH MIRAH KALANAMAN,MIRAH KALANAMAN,KATINGAN TENGAH,Katingan,63
62,HTR,KTH KATUTUN ATEI,SAMBA KATUNG,KATINGAN TENGAH,Katingan,121
63,HTR,KOPERASI KARYA PUTRA MIRAH,MIRAH KELANAMAN,KATINGAN TENGAH,Katingan,45
64,HD,LPHD HIYANG BANA,HIYANG BANA,TASIK PAYAWAN,Katingan,512
65,HD,LPHD BUNTUT BALI,BUNTUT BALI,PULAU MALAN,Katingan,588
66,HKM,KTH KATINGAN MANUAH,TALIAN KERENG,KATINGAN HILIR,Katingan,82
67,HD,LPHD TUMBANG BULAN,TUMBANG BULAN,MENDAWAI,Katingan,31
68,HD,LPHD PERIGI JAYA BERSAMA,PERIGI,MENDAWAI,Katingan,64
69,HD,LPHD MANGGATANG PANATAU,TEWANG KAMPUNG,MENDAWAI,Katingan,36
70,HKM,KTH TUMBANG LAPAN BERKARYA,TUMBANG LAPAN,RUNGAN HULU,Katingan,67
71,HD,LPHD LAPAK TAHETA,JAHANJANG,KAMIPANG,Katingan,270
72,HD,LD HIMBA PANATAU LEWU,GALINGGANG,KAMIPANG,Katingan,43
73,HD,LD MELAYU HIMBA BAHALAP,KAMPUNG MELAYU,MENDAWAI,Katingan,19
74,HD,LD HIMBA HARAPAN ITAH,TELUK SEBULU,MENDAWAI,Katingan,52
75,HKM,KTH DAHIRANG JAYA,SAMBA KATUNG,KATINGAN TENGAH,Katingan,92
76,HD,LPHD HAPAKAT,DEHES,SENAMAN MANTEKEI,Katingan,29
77,HD,LDPH BUKIT NYAKA,TUMBANG TUNDU,MARIKIT,Katingan,34
78,HD,LPHD KATIMPUN,KATIMPUN,MANTANGAI,Kapuas,234
79,HD,LPHD KATUNJUNG,KATUNJUNG,MANTANGAI,Kapuas,178
80,HD,LPHD PETAK PUTI,PETAK PUTI,TIMPAH,Kapuas,335
81,HD,LPHD TAMBAK BAJAI,TAMBAK BAJAI,DADAHUP,Kapuas,246
82,HD,LPHD LAWANG TAMANG,LAWANG TAMANG,MANDAU TALAWANG,Kapuas,132
83,HD,LPHD TUMBANG MANYARUNG,TUMBANG MANYARUNG,MANDAU TALAWANG,Kapuas,154
84,HD,LPHD TUMBANG TIHIS,TUMBANG TIHIS,MANDAU TALAWANG,Kapuas,154
85,HD,LPHD KAYU BULAN,KAYU BULAN,KAPUAS TENGAH,Kapuas,482
86,HD,LPHD PELITA MUDA,TUMBANG MANGKUTUP,MANTANGAI,Kapuas,105
87,HKM,GAPOKTAN TUMBANG MUROI,TUMBANG MUROI,MANTANGAI,Kapuas,98
88,HKM,KTH BERKAT TAMANG HAPAKAT,LAWANG TAMANG,MANDAU TALAWANG,Kapuas,86
89,HKM,KTH RIMBA LESTARI,MANTANGAI TENGAH,MANTANGAI,Kapuas,35
90,HKM,KTH IJE ATEI,PULAU KELADAN,MANTANGAI,Kapuas,92
91,HKM,KTH BATANG PAMBELOM,RAHUNG BUNGAI,KAPUAS HULU,Kapuas,104
92,HKM,KTH SUMBER REJEKI,TUMBANG MANYARUNG,MANDAU TALAWANG,Kapuas,81
93,HKM,KTH LESTARI HUTAN KATANJUNG I,KATANJUNG,KAPUAS HULU,Kapuas,78
94,HKM,KOPERASI MANGKIRIK MAJU JAYA,BALAI BANJANG,PASAK TALAWANG,Kapuas,28
95,HTR,KTH BUKOI MAJU BERSAMA,TUMBANG BUKOI,MANDAU TALAWANG,Kapuas,102
96,HTR,KT TUMBANG TIHIS,TUMBANG TIHIS,MANDAU TALAWANG,Kapuas,74
97,HTR,KOPERASI BETANG TELAWANG,HURUNG TAMPANG,KAPUAS HULU,Kapuas,30
98,HTR,KTH MANTA'A HAPAKAT BERSAMA,KARETAU MANTA'A,MANDAU TALAWANG,Kapuas,59
99,HTR,KTH LESTARI HUTAN KATANJUNG II,KATANJUNG,KAPUAS HULU,Kapuas,46
100,HTR,KTH HARAPAN BARU,SEI GITA,MANTANGAI,Kapuas,167
101,HTR,KTH LAHEI MANGKUTUP USAHA MAKMUR,LAHEI MANGKUTUP,MANTANGAI,Kapuas,212
102,HD,LPHD ALAU,KOTA BARU,KAPUAS TENGAH,Kapuas,249
103,HD,SEI AHAS,SEI AHAS,MANTANGAI,Kapuas,23
104,HKM,KTH MULIA ASIH,HUMBANG RAYA,MANTANGAI,Kapuas,21
105,HD,LPHD TAMPUNG PENYANG,SEI AHAS,MANTANGAI,Kapuas,41
106,HD,LPHD DANAU BAGANTUNG,MANTANGAI HULU,MANTANGI,Kapuas,23
107,HD,LPHD MANTAREN 1,MANTAREN 1,KAHAYAN HILIR,Pulang Pisau,195
108,HD,LPHD BUNTOI,BUNTOI,KAHAYAN HILIR,Pulang Pisau,95
109,HD,LPHD KALAWA,KELURAHAN KALAWA,KAHAYAN HILIR,Pulang Pisau,260
110,HD,LPHD GOHONG,GOHONG,KAHAYAN HILIR,Pulang Pisau,94
111,HD,LPHD TAMBAK,TAMBAK,BANAMA TINGANG,Pulang Pisau,107
112,HD,LPHD BAWAN,BAWAN,BANAMA TINGANG,Pulang Pisau,257
113,HD,LPHD TANGKAHEN,TANGKAHEN,BANAMA TINGANG,Pulang Pisau,414
114,HD,LPHD TUMBANG TARUSAN,TUMBANG TARUSAN,BANAMA TINGANG,Pulang Pisau,153
115,HD,LPHD SIGI,SIGI,BANAMA TINGGANG,Pulang Pisau,181
116,HD,LPHD BAHU PALAWA,BAHU PALAWA,KAHAYAN TENGAH,Pulang Pisau,104
117,HD,LPHD BALUKON,BALUKON,KAHAYAN TENGAH,Pulang Pisau,104
118,HD,LPHD BERENG RAMBANG,BERENG RAMBANG,KAHAYAN TENGAH,Pulang Pisau,176
119,HD,LPHD BUKIT BAMBA,BUKIT BAMBA,KAHAYAN TENGAH,Pulang Pisau,117
120,HD,LPHD PARAHANGAN,PARAHANGAN,KAHAYAN TENGAH,Pulang Pisau,314
121,HD,LPHD TUWUNG,TUWUNG,KAHAYAN TENGAH,Pulang Pisau,206
122,HD,LPHD PADURAN MULYA,PADURAN RAYA,SEBANGAU KUALA,Pulang Pisau,167
123,HD,LPHD TAHAWA,TAHAWA,KAHAYAN TENGAH,Pulang Pisau,272
124,HD,LPHD PETUK LITI,PETUK LITI,KAHAYAN TENGAH,Pulang Pisau,181
125,HD,LPHD SEBANGAAU PERMAI,SEBANGAU PERMAI,SEBANGAU KUALA,Pulang Pisau,381
126,HD,LPHD PAMARUNAN,PAMARUNAN,KAHAYAN TENGAH,Pulang Pisau,198
127,HD,LPHD TANJUNG TARUNA,TANJUNG TARUNA,JABIREN RAYA,Pulang Pisau,216
128,HD,LPHD TANJUNG SANGALANG,TANJUNG SANGALANG,KAHAYAN TENGAH,Pulang Pisau,104
129,HD,LPHD HENDA,HENDA,JABIREN RAYA,Pulang Pisau,184
130,HD,LPHD PILANG,PILANG,JABIREN RAYA,Pulang Pisau,216
131,HD,LPHD PENDA BARANIA,PENDA BARANIA,KAHAYAN TENGAH,Pulang Pisau,44
132,HD,LPHD BUKIT LITI,BUKIT LITI,KAHAYAN TENGAH,Pulang Pisau,278
133,HD,LPHD SEI HAMBAWANG,SEI HAMBAWANG,SEBANGAU KUALA,Pulang Pisau,277
134,HD,LPHD MEKAR JAYA,MEKAR JAYA,SEBANGAU KUALA,Pulang Pisau,334
135,HA,HA PULAU BARASAK ( x ) MHA DESA PILANG,PILANG,JABIREN RAYA,Pulang Pisau,455
136,HKM,KT HANDAK MAJU,TUMBANG NUSA,JABIREN RAYA,Pulang Pisau,122
137,HKM,KELOMPOK HKM SIMPUR BASEWOT,SIMPUR,JABIREN RAYA,Pulang Pisau,59
138,HKM,KTH SIDO MAKMUR,TALIO HULU,PANDIH BATU,Pulang Pisau,121
139,HKM,KTH HAPAKAT MAJU,PAHAWAN,BANAMA TINGANG,Pulang Pisau,17
140,HKM,KTH HAPAKAT NUSA LESTARI 1,TUMBANG NUSA,JABIREN RAYA,Pulang Pisau,116
141,HKM,KTH BUKIT SUA,KELURAHAN BUKIT SUA,RAKUMPIT,Pulang Pisau,98
142,HKM,KTH HAPAKAT NUSA LESTARI 2,TUMBANG NUSA,JABIREN RAYA,Pulang Pisau,133
143,HKM,KTH TAHAI LESTARI,KELURAHAN TUMBANG TAHAI,BUKIT BATU,Pulang Pisau,286
144,HKM,KTH KATIMPUN HAPAKAT,KELURAHAN PETUK KATIMPUN,JEKAN RAYA,Pulang Pisau,118
145,HD,LDPH OROI LESTARI,GOHA,BANAMA TINGANG,Pulang Pisau,265
146,HD,LPHD PALANGKA BULAU LEMBAYUNG NYAHU,KASALI BARU,BANAMA TINGANG,Pulang Pisau,95
147,HD,LD HABANGKALAN PENYANG KARUHEI TATAU,PAHAWAN,BANAMA TINGANG,Pulang Pisau,295
148,HKM,KT HARITEN HALAWU BENTENG,TANGKAHEN,BANAMA TINGANG,Pulang Pisau,16
149,HD,LPHD SEI BAKAU,SEI BAKAU,SEBANGAU KUALA,Pulang Pisau,35
150,HD,LPHD SEBANGAU MULYA,SEBANGAU MULYA,SEBANGAU KUALA,Pulang Pisau,30
151,HD,LDPH TANJUNG PUSAKA HAPAKAT JAYA,TANJUNG TARUNA,JABIREN RAYA,Pulang Pisau,41
152,HD,LDPH TANJUNG TARUNA HAPAKAT MANDIRI,TANJUNG TARUNA,JABIREN RAYA,Pulang Pisau,37
153,HD,LDPH NUSA INDAH,TUMBANG NUSA,JABIREN RAYA,Pulang Pisau,24
154,HKM,KTH MANEN HINJE HAPAKAT,MANEN KALEKA,BANAMA TINGANG,Pulang Pisau,125
155,HKM,KTH KAHARAP ITAH,TAHAWA,KAHAYAN TENGAH,Pulang Pisau,16
156,HKM,KTH HINJE SIMPEI,PAMARUNAN,KAHAYAN TENGAH,Pulang Pisau,21
157,HD,LDPH BUNGA SERITIE,LAWANG URU,BANAMA TINGANG,Pulang Pisau,18`

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
  const mapping = {
    'Gunung Mas': 'KABUPATEN GUNUNG MAS',
    'Katingan': 'KABUPATEN KATINGAN',
    'Kapuas': 'KABUPATEN KAPUAS',
    'Pulang Pisau': 'KABUPATEN PULANG PISAU'
  }
  return mapping[name] || `KABUPATEN ${name.toUpperCase()}`
}

async function importData() {
  console.log('🔍 Memulai import data PS dengan jumlah KK...')
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
    const skema = row['Skema PS']
    const namaPS = row['Nama PS']
    const desa = row['Desa/Kelurahan']
    const kecamatan = row['Kecamatan']
    const kabupaten = row['Kabupaten']
    const jumlahKK = parseInt(row['Jumlah KK']) || 0

    if (!namaPS || !skema) {
      console.warn(`⚠️  Baris ${no} dilewati: Nama PS atau Skema kosong`)
      continue
    }

    const normalizedKabupaten = normalizeKabupatenName(kabupaten)
    const kabupatenId = kabupatenMap.get(normalizedKabupaten.toUpperCase())

    if (!kabupatenId) {
      console.error(`❌ Kabupaten tidak ditemukan: ${kabupaten} (${normalizedKabupaten})`)
      failed++
      continue
    }

    // Cek apakah PS sudah ada (berdasarkan nama PS dan kabupaten)
    const { data: existingPS, error: fetchError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, jumlah_kk')
      .eq('pemegang_izin', namaPS)
      .eq('kabupaten_id', kabupatenId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`❌ Error fetching PS ${namaPS}:`, fetchError.message)
      failed++
      continue
    }

    // Siapkan data untuk insert/update
    const psData = {
      kabupaten_id: kabupatenId,
      skema: skema,
      pemegang_izin: namaPS,
      desa: desa,
      kecamatan: kecamatan,
      jumlah_kk: jumlahKK,
      // Default values untuk field lain yang mungkin required
      luas_ha: 0,
      jenis_hutan: 'Mineral/Gambut',
      status_kawasan: '------',
      rkps_status: 'belum',
      peta_status: 'belum',
      updated_at: new Date().toISOString()
    }

    try {
      if (existingPS) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('perhutanan_sosial')
          .update(psData)
          .eq('id', existingPS.id)

        if (updateError) {
          console.error(`❌ Gagal update PS ${namaPS}:`, updateError.message)
          failed++
        } else {
          console.log(`✓ Update: ${namaPS} (KK: ${existingPS.jumlah_kk} → ${jumlahKK})`)
          updated++
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('perhutanan_sosial')
          .insert([{ ...psData, created_at: new Date().toISOString() }])

        if (insertError) {
          console.error(`❌ Gagal insert PS ${namaPS}:`, insertError.message)
          failed++
        } else {
          console.log(`✓ Insert: ${namaPS} (KK: ${jumlahKK})`)
          imported++
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${namaPS}:`, error.message)
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
    const avgKK = totalPS > 0 ? Math.round(totalKK / totalPS) : 0
    
    console.log(`   Total PS di database: ${totalPS}`)
    console.log(`   Total KK di database: ${totalKK}`)
    console.log(`   Rata-rata KK per PS: ${avgKK}`)
  }

  console.log('\n✅ Import selesai!')
}

// Jalankan import
importData().catch(error => {
  console.error('❌ Error dalam proses import:', error)
  process.exit(1)
})