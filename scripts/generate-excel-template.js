#!/usr/bin/env node

/**
 * Script untuk generate template Excel untuk import data aplikasi
 * Menghasilkan file Excel dengan beberapa sheet:
 * - Perhutanan Sosial
 * - Kepala Keluarga
 * - Anggota Keluarga
 * - Panduan
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Output directory
const templatesDir = path.join(__dirname, '..', 'templates');
const outputFile = path.join(templatesDir, 'template-import-data.xlsx');

// Ensure templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Create a new workbook
const workbook = XLSX.utils.book_new();

/**
 * Helper function to add data validation to a column
 */
function addDataValidation(worksheet, colIndex, options) {
  if (!worksheet['!dataValidations']) {
    worksheet['!dataValidations'] = [];
  }
  
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const colLetter = XLSX.utils.encode_col(colIndex);
  
  // Apply validation to all data rows (skip header)
  for (let row = 1; row <= range.e.r; row++) {
    const cellAddress = `${colLetter}${row + 1}`;
    worksheet['!dataValidations'].push({
      sqref: cellAddress,
      type: 'list',
      formula1: `"${options.join(',')}"`,
      showErrorMessage: true,
      errorTitle: 'Nilai Tidak Valid',
      error: `Pilih salah satu: ${options.join(', ')}`
    });
  }
}

/**
 * Helper function to create a worksheet with headers and formatting
 */
function createSheet(name, headers, exampleData = [], dataValidations = {}) {
  // Create data array with headers
  const data = [headers];
  
  // Add example data if provided
  if (exampleData.length > 0) {
    data.push(...exampleData);
  }
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths (auto-width approximation)
  const colWidths = headers.map((header, idx) => {
    const maxLength = Math.max(
      header.length,
      ...exampleData.map(row => String(row[idx] || '').length)
    );
    return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
  });
  worksheet['!cols'] = colWidths;
  
  // Freeze first row
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  
  // Style header row (bold)
  const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
    worksheet[cellAddress].s.font = { bold: true };
    worksheet[cellAddress].s.fill = { fgColor: { rgb: 'E0E0E0' } };
    worksheet[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
  }
  
  // Add data validations
  Object.keys(dataValidations).forEach(headerName => {
    const colIndex = headers.indexOf(headerName);
    if (colIndex !== -1 && dataValidations[headerName]) {
      addDataValidation(worksheet, colIndex, dataValidations[headerName]);
    }
  });
  
  return worksheet;
}

// ============================================
// 1. Sheet "Perhutanan Sosial"
// ============================================
const psHeaders = [
  'No',
  'Skema PS',
  'Nama PS / Pemegang Izin',
  'Desa/Kelurahan',
  'Kecamatan',
  'Kabupaten',
  'Jumlah KK',
  'Luas (Ha)',
  'Jenis Hutan',
  'RKPS',
  'Peta',
  'Nomor SK',
  'Tanggal SK',
  'Masa Berlaku',
  'Tanggal Berakhir Izin',
  'Nomor PKS',
  'Status Kawasan',
  'Keterangan',
  'Fasilitator'
];

const psExampleData = [
  [
    1,
    'HD',
    'LPHD HAROWU',
    'HAROWU',
    'MIRI MANASA',
    'KABUPATEN GUNUNG MAS',
    57,
    1750,
    'Mineral',
    'belum',
    'belum',
    '',
    '',
    '',
    '',
    '',
    '------',
    '',
    ''
  ]
];

// Data validations for Perhutanan Sosial sheet
const psValidations = {
  'Skema PS': ['HD', 'HTR', 'HKM', 'HA', 'IUPHHK', 'IUPHKm'],
  'Kabupaten': ['KABUPATEN KAPUAS', 'KABUPATEN GUNUNG MAS', 'KABUPATEN KATINGAN', 'KABUPATEN PULANG PISAU', 'Kotamadya Palangka Raya'],
  'Jenis Hutan': ['Mineral', 'Gambut', 'Mineral/Gambut'],
  'RKPS': ['ada', 'belum'],
  'Peta': ['ada', 'belum']
};

const psWorksheet = createSheet('Perhutanan Sosial', psHeaders, psExampleData, psValidations);
XLSX.utils.book_append_sheet(workbook, psWorksheet, 'Perhutanan Sosial');

// ============================================
// 2. Sheet "Kepala Keluarga"
// ============================================
const kkHeaders = [
  'No',
  'Nama Perhutanan Sosial',
  'Nomor KK',
  'Nama Kepala Keluarga',
  'NIK',
  'Tempat Lahir',
  'Tanggal Lahir',
  'Jenis Kelamin',
  'Alamat',
  'RT',
  'RW',
  'Telepon',
  'Email',
  'Status Rumah',
  'Luas Rumah (m²)',
  'Jumlah Kamar',
  'Sumber Air',
  'Sumber Listrik',
  'Pekerjaan Utama',
  'Pekerjaan Sampingan',
  'Pendapatan per Bulan',
  'Pengeluaran per Bulan',
  'Kepemilikan Lahan (Ha)',
  'Aset Produktif',
  'Pendidikan Terakhir',
  'Keterampilan Khusus',
  'Keanggotaan Kelompok',
  'Status Partisipasi',
  'Tanggal Gabung',
  'Tanggal Keluar',
  'Alasan Keluar'
];

const kkExampleData = [
  [
    1,
    'LPHD HAROWU',
    '6201010101010001',
    'JOHN DOE',
    '6201010101010001',
    'Palangka Raya',
    '1980-01-15',
    'LAKI-LAKI',
    'Jl. Contoh No. 123',
    '001',
    '002',
    '081234567890',
    'john.doe@example.com',
    'MILIK SENDIRI',
    60,
    3,
    'SUMUR',
    'PLN',
    'Petani',
    'Tukang Kayu',
    2500000,
    2000000,
    2.5,
    'Sawah, Kebun Karet',
    'SMA',
    'Pertanian Organik',
    'Kelompok Tani Harapan',
    'AKTIF',
    '2024-01-01',
    '',
    ''
  ]
];

// Data validations for Kepala Keluarga sheet
const kkValidations = {
  'Jenis Kelamin': ['LAKI-LAKI', 'PEREMPUAN'],
  'Status Rumah': ['MILIK SENDIRI', 'SEWA', 'KELUARGA', 'LAINNYA'],
  'Sumber Air': ['PDAM', 'SUMUR', 'SUNGAI', 'HUJAN', 'LAINNYA'],
  'Sumber Listrik': ['PLN', 'SOLAR', 'GENSET', 'TIDAK ADA', 'LAINNYA'],
  'Pendidikan Terakhir': ['TIDAK SEKOLAH', 'SD', 'SMP', 'SMA', 'DIPLOMA', 'SARJANA', 'LAINNYA'],
  'Status Partisipasi': ['AKTIF', 'PASIF', 'KELUAR', 'BELUM_AKTIF']
};

const kkWorksheet = createSheet('Kepala Keluarga', kkHeaders, kkExampleData, kkValidations);
XLSX.utils.book_append_sheet(workbook, kkWorksheet, 'Kepala Keluarga');

// ============================================
// 3. Sheet "Anggota Keluarga"
// ============================================
const anggotaHeaders = [
  'No',
  'Nomor KK',
  'Nama Anggota',
  'NIK',
  'Hubungan',
  'Tempat Lahir',
  'Tanggal Lahir',
  'Jenis Kelamin',
  'Status Perkawinan',
  'Pendidikan Terakhir',
  'Pekerjaan',
  'Penghasilan Bulanan',
  'Status Disabilitas',
  'Jenis Disabilitas',
  'Keterampilan Khusus',
  'Ikut Program',
  'Jenis Program'
];

const anggotaExampleData = [
  [
    1,
    '6201010101010001',
    'JANE DOE',
    '6201010101010002',
    'ISTRI',
    'Palangka Raya',
    '1985-05-20',
    'PEREMPUAN',
    'KAWIN',
    'SMA',
    'Ibu Rumah Tangga',
    0,
    'Tidak',
    '',
    'Kerajinan Tangan',
    'Ya',
    'Pemberdayaan Perempuan'
  ],
  [
    2,
    '6201010101010001',
    'BOB DOE',
    '6201010101010003',
    'ANAK',
    'Palangka Raya',
    '2010-08-10',
    'LAKI-LAKI',
    'BELUM KAWIN',
    'SMP',
    'Pelajar',
    0,
    'Tidak',
    '',
    '',
    'Tidak',
    ''
  ]
];

// Data validations for Anggota Keluarga sheet
const anggotaValidations = {
  'Hubungan': ['SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'CUCU', 'ORANGTUA', 'LAINNYA'],
  'Jenis Kelamin': ['LAKI-LAKI', 'PEREMPUAN'],
  'Status Perkawinan': ['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI'],
  'Pendidikan Terakhir': ['TIDAK SEKOLAH', 'SD', 'SMP', 'SMA', 'DIPLOMA', 'SARJANA', 'LAINNYA'],
  'Status Disabilitas': ['Ya', 'Tidak'],
  'Ikut Program': ['Ya', 'Tidak']
};

const anggotaWorksheet = createSheet('Anggota Keluarga', anggotaHeaders, anggotaExampleData, anggotaValidations);
XLSX.utils.book_append_sheet(workbook, anggotaWorksheet, 'Anggota Keluarga');

// ============================================
// 4. Sheet "Panduan"
// ============================================
const panduanData = [
  ['PANDUAN PENGGUNAAN TEMPLATE IMPORT DATA'],
  [''],
  ['Template ini digunakan untuk mengimpor data ke dalam sistem aplikasi Perhutanan Sosial.'],
  [''],
  ['SHEET: PERHUTANAN SOSIAL'],
  [''],
  ['Kolom Wajib:', 'Deskripsi', 'Format/Contoh'],
  ['No', 'Nomor urut', '1, 2, 3, ...'],
  ['Skema PS', 'Skema Perhutanan Sosial', 'HD, HTR, HKM, HA, IUPHHK, IUPHKm'],
  ['Nama PS / Pemegang Izin', 'Nama lengkap pemegang izin', 'LPHD HAROWU'],
  ['Desa/Kelurahan', 'Nama desa atau kelurahan', 'HAROWU'],
  ['Kecamatan', 'Nama kecamatan', 'MIRI MANASA'],
  ['Kabupaten', 'Nama kabupaten', 'KABUPATEN GUNUNG MAS, KABUPATEN KAPUAS, KABUPATEN KATINGAN, KABUPATEN PULANG PISAU, Kotamadya Palangka Raya'],
  ['Jumlah KK', 'Jumlah Kepala Keluarga', 'Angka (57)'],
  ['Luas (Ha)', 'Luas area dalam hektar', 'Angka desimal (1750 atau 1750.5)'],
  ['Jenis Hutan', 'Jenis hutan', 'Mineral, Gambut, Mineral/Gambut'],
  ['RKPS', 'Status RKPS', 'ada atau belum'],
  ['Peta', 'Status peta', 'ada atau belum'],
  ['Nomor SK', 'Nomor Surat Keputusan', 'Teks (opsional)'],
  ['Tanggal SK', 'Tanggal Surat Keputusan', 'YYYY-MM-DD atau DD/MM/YYYY'],
  ['Masa Berlaku', 'Masa berlaku izin', 'Teks (opsional)'],
  ['Tanggal Berakhir Izin', 'Tanggal berakhir izin', 'YYYY-MM-DD atau DD/MM/YYYY'],
  ['Nomor PKS', 'Nomor Perjanjian Kerjasama', 'Teks (opsional)'],
  ['Status Kawasan', 'Status kawasan', 'Teks (opsional)'],
  ['Keterangan', 'Keterangan tambahan', 'Teks (opsional)'],
  ['Fasilitator', 'Nama fasilitator', 'Teks (opsional)'],
  [''],
  [''],
  ['SHEET: KEPALA KELUARGA'],
  [''],
  ['Kolom Wajib:', 'Deskripsi', 'Format/Contoh'],
  ['No', 'Nomor urut', '1, 2, 3, ...'],
  ['Nama Perhutanan Sosial', 'Nama PS untuk referensi', 'LPHD HAROWU'],
  ['Nomor KK', 'Nomor Kartu Keluarga', '16 digit (6201010101010001)'],
  ['Nama Kepala Keluarga', 'Nama lengkap kepala keluarga', 'JOHN DOE'],
  ['NIK', 'Nomor Induk Kependudukan', '16 digit (6201010101010001)'],
  ['Tempat Lahir', 'Tempat lahir', 'Palangka Raya'],
  ['Tanggal Lahir', 'Tanggal lahir', 'YYYY-MM-DD (1980-01-15)'],
  ['Jenis Kelamin', 'Jenis kelamin', 'LAKI-LAKI atau PEREMPUAN'],
  ['Alamat', 'Alamat lengkap', 'Jl. Contoh No. 123'],
  ['RT', 'Rukun Tetangga', '001'],
  ['RW', 'Rukun Warga', '002'],
  ['Telepon', 'Nomor telepon', '081234567890'],
  ['Email', 'Alamat email', 'john.doe@example.com (opsional)'],
  ['Status Rumah', 'Status kepemilikan rumah', 'MILIK SENDIRI, SEWA, KELUARGA, atau LAINNYA'],
  ['Luas Rumah (m²)', 'Luas rumah dalam meter persegi', 'Angka (60)'],
  ['Jumlah Kamar', 'Jumlah kamar', 'Angka (3)'],
  ['Sumber Air', 'Sumber air', 'PDAM, SUMUR, SUNGAI, HUJAN, atau LAINNYA'],
  ['Sumber Listrik', 'Sumber listrik', 'PLN, SOLAR, GENSET, TIDAK ADA, atau LAINNYA'],
  ['Pekerjaan Utama', 'Pekerjaan utama', 'Petani'],
  ['Pekerjaan Sampingan', 'Pekerjaan sampingan', 'Tukang Kayu (opsional)'],
  ['Pendapatan per Bulan', 'Pendapatan bulanan', 'Angka (2500000)'],
  ['Pengeluaran per Bulan', 'Pengeluaran bulanan', 'Angka (2000000)'],
  ['Kepemilikan Lahan (Ha)', 'Luas lahan yang dimiliki', 'Angka desimal (2.5)'],
  ['Aset Produktif', 'Aset produktif yang dimiliki', 'Sawah, Kebun Karet (opsional)'],
  ['Pendidikan Terakhir', 'Tingkat pendidikan', 'TIDAK SEKOLAH, SD, SMP, SMA, DIPLOMA, SARJANA, atau LAINNYA'],
  ['Keterampilan Khusus', 'Keterampilan khusus', 'Pertanian Organik (opsional)'],
  ['Keanggotaan Kelompok', 'Kelompok yang diikuti', 'Kelompok Tani Harapan (opsional)'],
  ['Status Partisipasi', 'Status partisipasi', 'AKTIF, PASIF, KELUAR, atau BELUM_AKTIF'],
  ['Tanggal Gabung', 'Tanggal bergabung program', 'YYYY-MM-DD (2024-01-01)'],
  ['Tanggal Keluar', 'Tanggal keluar program', 'YYYY-MM-DD (opsional)'],
  ['Alasan Keluar', 'Alasan keluar program', 'Teks (opsional)'],
  [''],
  [''],
  ['SHEET: ANGGOTA KELUARGA'],
  [''],
  ['Kolom Wajib:', 'Deskripsi', 'Format/Contoh'],
  ['No', 'Nomor urut', '1, 2, 3, ...'],
  ['Nomor KK', 'Nomor KK kepala keluarga (referensi)', '16 digit (6201010101010001)'],
  ['Nama Anggota', 'Nama lengkap anggota keluarga', 'JANE DOE'],
  ['NIK', 'Nomor Induk Kependudukan', '16 digit (6201010101010002)'],
  ['Hubungan', 'Hubungan dengan kepala keluarga', 'SUAMI, ISTRI, ANAK, MENANTU, CUCU, ORANGTUA, atau LAINNYA'],
  ['Tempat Lahir', 'Tempat lahir', 'Palangka Raya'],
  ['Tanggal Lahir', 'Tanggal lahir', 'YYYY-MM-DD (1985-05-20)'],
  ['Jenis Kelamin', 'Jenis kelamin', 'LAKI-LAKI atau PEREMPUAN'],
  ['Status Perkawinan', 'Status perkawinan', 'BELUM KAWIN, KAWIN, CERAI HIDUP, atau CERAI MATI'],
  ['Pendidikan Terakhir', 'Tingkat pendidikan', 'TIDAK SEKOLAH, SD, SMP, SMA, DIPLOMA, SARJANA, atau LAINNYA'],
  ['Pekerjaan', 'Pekerjaan', 'Ibu Rumah Tangga (opsional)'],
  ['Penghasilan Bulanan', 'Penghasilan bulanan', 'Angka (0 jika tidak bekerja)'],
  ['Status Disabilitas', 'Apakah memiliki disabilitas', 'Ya atau Tidak'],
  ['Jenis Disabilitas', 'Jenis disabilitas jika ada', 'Teks (opsional)'],
  ['Keterampilan Khusus', 'Keterampilan khusus', 'Kerajinan Tangan (opsional)'],
  ['Ikut Program', 'Apakah ikut program', 'Ya atau Tidak'],
  ['Jenis Program', 'Jenis program yang diikuti', 'Pemberdayaan Perempuan (opsional)'],
  [''],
  [''],
  ['CATATAN PENTING:'],
  ['1. Pastikan format tanggal menggunakan YYYY-MM-DD atau DD/MM/YYYY'],
  ['2. Untuk kolom dengan pilihan terbatas, gunakan nilai yang tepat sesuai panduan'],
  ['3. Kolom yang bertanda (opsional) boleh dikosongkan'],
  ['4. Pastikan Nomor KK dan NIK unik dan tidak duplikat'],
  ['5. Untuk sheet Anggota Keluarga, Nomor KK harus sesuai dengan Nomor KK di sheet Kepala Keluarga'],
  ['6. Simpan file dengan format .xlsx sebelum melakukan import'],
  [''],
  ['Untuk bantuan lebih lanjut, hubungi administrator sistem.']
];

const panduanWorksheet = XLSX.utils.aoa_to_sheet(panduanData);

// Set column widths for panduan sheet
panduanWorksheet['!cols'] = [
  { wch: 30 },
  { wch: 50 },
  { wch: 50 }
];

// Style title row
const titleCell = panduanWorksheet['A1'];
if (titleCell) {
  if (!titleCell.s) titleCell.s = {};
  titleCell.s.font = { bold: true, sz: 16 };
  titleCell.s.alignment = { horizontal: 'center' };
}

// Merge title cell
panduanWorksheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
];

// Style section headers
const sectionHeaders = ['SHEET: PERHUTANAN SOSIAL', 'SHEET: KEPALA KELUARGA', 'SHEET: ANGGOTA KELUARGA', 'CATATAN PENTING:'];
sectionHeaders.forEach(header => {
  for (let row = 0; row < panduanData.length; row++) {
    if (panduanData[row] && panduanData[row][0] === header) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (panduanWorksheet[cellAddress]) {
        if (!panduanWorksheet[cellAddress].s) panduanWorksheet[cellAddress].s = {};
        panduanWorksheet[cellAddress].s.font = { bold: true, sz: 12 };
        panduanWorksheet[cellAddress].s.fill = { fgColor: { rgb: 'D0E0F0' } };
      }
    }
  }
});

// Style header row for tables
for (let row = 0; row < panduanData.length; row++) {
  if (panduanData[row] && panduanData[row][0] === 'Kolom Wajib:') {
    for (let col = 0; col < 3; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (panduanWorksheet[cellAddress]) {
        if (!panduanWorksheet[cellAddress].s) panduanWorksheet[cellAddress].s = {};
        panduanWorksheet[cellAddress].s.font = { bold: true };
        panduanWorksheet[cellAddress].s.fill = { fgColor: { rgb: 'E0E0E0' } };
      }
    }
  }
}

XLSX.utils.book_append_sheet(workbook, panduanWorksheet, 'Panduan');

// ============================================
// Write workbook to file
// ============================================
XLSX.writeFile(workbook, outputFile);

console.log('✅ Template Excel berhasil dibuat!');
console.log(`📁 Lokasi file: ${outputFile}`);
console.log(`📊 Total sheet: ${workbook.SheetNames.length}`);
console.log(`   - ${workbook.SheetNames.join('\n   - ')}`);
