const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('sheetjs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
    }
  }
} else {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importExcel(filePath) {
  console.log(`Reading Excel file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetNames = workbook.SheetNames;
  
  console.log('Sheets:', sheetNames);

  // Get kabupaten mapping
  const { data: kabupatenData, error: kabError } = await supabase
    .from('kabupaten')
    .select('id, nama');
  
  if (kabError) {
    console.error('Error fetching kabupaten:', kabError);
    process.exit(1);
  }

  const kabupatenMap = new Map(
    kabupatenData.map(k => [k.nama.toUpperCase(), k.id])
  );
  console.log('Kabupaten mapping:', kabupatenMap);

  let totalImported = 0;
  let totalFailed = 0;

  // Process each sheet
  for (const sheetName of sheetNames) {
    console.log(`\nProcessing sheet: ${sheetName}`);
    
    if (sheetName.includes('DATA') && !sheetName.includes('POTENSI')) {
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Extract kabupaten name from sheet name
      const kabupatenMatch = sheetName.match(/DATA\s+(.+)/);
      let kabupatenName = 'UNKNOWN';
      if (kabupatenMatch && kabupatenMatch[1]) {
        kabupatenName = normalizeKabupatenName(kabupatenMatch[1]);
      }
      
      console.log(`Kabupaten from sheet name: ${kabupatenName}`);
      
      // Find header row (contains "No." or "SKEMA")
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          const firstCell = String(row[0] || '').toUpperCase();
          if (firstCell.includes('NO') || firstCell.includes('SKEMA')) {
            headerRowIndex = i;
            console.log(`Found header row at index ${i}`);
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        console.log('No header row found, skipping sheet');
        continue;
      }

      const headers = rawData[headerRowIndex].map(cell => String(cell || '').trim());
      console.log('Headers:', headers);

      // Process data rows
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!Array.isArray(row) || row.length < 10) continue;

        // Check if row is a kabupaten separator or total row
        const firstCell = String(row[0] || '');
        if (firstCell.toUpperCase().includes('TOTAL') || 
            firstCell.toUpperCase().includes('JUMLAH') ||
            firstCell.trim() === '') {
          continue;
        }

        // Check if row has data (non-empty first few cells)
        const hasData = row.slice(0, 5).some(cell => {
          const val = String(cell || '');
          return val.trim().length > 0 && !val.includes('TOTAL');
        });

        if (!hasData) continue;

        try {
          // Map row data to object based on column indices
          // Note: column indices may vary, we assume the following structure:
          // 0: No.
          // 1: SKEMA (may be empty in header but data is here)
          // 2: PEMEGANG IZIN
          // 3: Desa/Kelurahan
          // 4: KECAMATAN
          // 5: NOMOR SK KEMENTRIAN LINGKUNGAN HIDUP
          // 6: TANGGAL SK KEMENLHK
          // 7: MASA BERLAKU
          // 8: TANGGAL BERAKHIR IJIN SK
          // 9: NOMOR DOKUMEN PKS
          // 10: LUAS IZIN DALAM SK (HA)
          // 11: Jenis Hutan
          // 12: FUNGSI KAWASAN / STATUS
          // 13: RKPS ADA
          // 14: RKPS BELUM
          // 15: PETA PS ADA
          // 16: PETA PS BELUM

          const skema = String(row[1] || '').trim();
          const pemegangIzin = String(row[2] || '').trim();
          
          if (!skema || !pemegangIzin) {
            console.log(`Skipping row ${i} - missing skema or pemegang izin`);
            continue;
          }

          const desa = String(row[3] || '').trim();
          const kecamatan = String(row[4] || '').trim();
          const nomorSk = String(row[5] || '').trim();
          const tanggalSk = String(row[6] || '').trim();
          const masaBerlaku = String(row[7] || '').trim();
          const tanggalBerakhir = String(row[8] || '').trim();
          const nomorPks = String(row[9] || '').trim();
          
          const luasStr = row[10] || 0;
          const luas = parseFloat(String(luasStr).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          
          const jenisHutanStr = String(row[11] || '').trim();
          let jenisHutan = 'Mineral/Gambut';
          if (jenisHutanStr.includes('Gambut')) jenisHutan = 'Gambut';
          else if (jenisHutanStr.includes('Mineral')) jenisHutan = 'Mineral';
          
          const statusKawasanStr = String(row[12] || '').trim();
          let statusKawasan = '------';
          if (statusKawasanStr.includes('HL')) statusKawasan = 'HL';
          else if (statusKawasanStr.includes('HPT')) statusKawasan = 'HPT';
          else if (statusKawasanStr.includes('HPK')) statusKawasan = 'HPK';
          else if (statusKawasanStr.includes('HP')) statusKawasan = 'HP';
          else if (statusKawasanStr.includes('HA')) statusKawasan = 'HA';
          
          // Determine RKPS status
          const rkpsAda = String(row[13] || '');
          const rkpsBelum = String(row[14] || '');
          const rkpsStatus = (rkpsAda.includes('✓') || rkpsAda.includes('**') || rkpsAda.includes('ada')) ? 'ada' : 'belum';
          
          // Determine PETA status
          const petaAda = String(row[15] || '');
          const petaBelum = String(row[16] || '');
          const petaStatus = (petaAda.includes('✓') || petaAda.includes('**') || petaAda.includes('ada')) ? 'ada' : 'belum';

          const record = {
            kabupaten_nama: kabupatenName,
            skema: normalizeSkema(skema),
            pemegang_izin: pemegangIzin,
            desa,
            kecamatan,
            nomor_sk: nomorSk,
            tanggal_sk: parseDate(tanggalSk),
            masa_berlaku: masaBerlaku,
            tanggal_berakhir_izin: parseDate(tanggalBerakhir),
            nomor_pks: nomorPks,
            luas_ha: luas,
            jenis_hutan: jenisHutan,
            status_kawasan: statusKawasan,
            rkps_status: rkpsStatus,
            peta_status: petaStatus,
            keterangan: '',
            fasilitator: 'AMAL'
          };

          const result = await insertData(record, kabupatenMap);
          if (result) {
            totalImported++;
            console.log(`Imported: ${pemegangIzin} (${kabupatenName})`);
          } else {
            totalFailed++;
          }
        } catch (error) {
          console.error(`Error processing row ${i}:`, error);
          totalFailed++;
        }
      }
    }
  }

  console.log(`\nImport completed:`);
  console.log(`  Imported: ${totalImported}`);
  console.log(`  Failed: ${totalFailed}`);
}

function normalizeKabupatenName(name) {
  const normalized = name.trim().toUpperCase();
  if (normalized.includes('KATINGAN')) return 'KABUPATEN KATINGAN';
  if (normalized.includes('KAPUAS')) return 'KABUPATEN KAPUAS';
  if (normalized.includes('PULANG PISAU')) return 'KABUPATEN PULANG PISAU';
  if (normalized.includes('GUNUNG MAS')) return 'KABUPATEN GUNUNG MAS';
  return normalized;
}

function normalizeSkema(skema) {
  const value = skema.toUpperCase().trim();
  if (value.includes('HKM')) return 'HKM';
  if (value.includes('LPHD')) return 'LPHD';
  if (value.includes('HA')) return 'HA';
  if (value.includes('HTR')) return 'HTR';
  if (value.includes('IUPHHK')) return 'IUPHHK';
  if (value.includes('IUPHK')) return 'IUPHKm';
  if (value.includes('POTENSI')) return 'POTENSI';
  return 'LPHD';
}

function parseDate(dateValue) {
  if (!dateValue) return null;

  // If it's a Date object (from cellDates: true)
  if (dateValue instanceof Date) {
    if (!isNaN(dateValue.getTime()) && dateValue.getFullYear() >= 1900 && dateValue.getFullYear() <= 2100) {
      return dateValue;
    } else {
      console.log('Invalid Date object or out of range:', dateValue);
      return null;
    }
  }

  // If it's a string
  if (typeof dateValue === 'string') {
    const str = dateValue.trim();
    if (str.length === 0) return null;

    // Try ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const date = new Date(str);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return date;
      }
    }

    // Try Indonesian date format (DD Month YYYY)
    const indonesianMonths = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
      'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };

    const parts = str.toLowerCase().split(' ');
    if (parts.length === 3 && indonesianMonths[parts[1]]) {
      const day = parseInt(parts[0]);
      const month = indonesianMonths[parts[1]];
      const year = parseInt(parts[2]);
      if (year >= 1900 && year <= 2100) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Try other formats, but limit year range
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return date;
      }
    } catch (error) {
      // Ignore error
    }

    console.log('Invalid date string or out of range:', str);
    return null;
  }

  // If it's a number (Excel serial number) when cellDates is false
  if (typeof dateValue === 'number') {
    // Excel serial number: days since 1900-01-00 (with 1900 incorrectly considered leap year)
    // Use the xlsx library's utility to parse it
    if (XLSX.SSF && XLSX.SSF.parse_date_code) {
      const date = XLSX.SSF.parse_date_code(dateValue);
      if (date.y >= 1900 && date.y <= 2100) {
        return new Date(date.y, date.m - 1, date.d);
      }
    } else {
      // Fallback: calculate manually (note: this does not account for Excel's 1900 leap year bug)
      const date = new Date(1900, 0, dateValue - 1);
      if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
        return date;
      }
    }
  }

  console.log('Unsupported date value type:', typeof dateValue, dateValue);
  return null;
}

async function insertData(data, kabupatenMap) {
  const kabupatenId = kabupatenMap.get(data.kabupaten_nama.toUpperCase());
  if (!kabupatenId) {
    console.error(`Kabupaten not found: ${data.kabupaten_nama}`);
    return false;
  }

  // Check for duplicates by nomor_pks if available, otherwise by pemegang_izin and kabupaten
  let existing = null;
  if (data.nomor_pks && data.nomor_pks.trim() !== '') {
    const { data: existingData } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .eq('nomor_pks', data.nomor_pks)
      .maybeSingle();
    existing = existingData;
  } else {
    const { data: existingData } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .eq('pemegang_izin', data.pemegang_izin)
      .eq('kabupaten_id', kabupatenId)
      .maybeSingle();
    existing = existingData;
  }

  const record = {
    kabupaten_id: kabupatenId,
    skema: data.skema,
    pemegang_izin: data.pemegang_izin,
    desa: data.desa,
    kecamatan: data.kecamatan,
    nomor_sk: data.nomor_sk,
    tanggal_sk: data.tanggal_sk,
    masa_berlaku: data.masa_berlaku,
    tanggal_berakhir_izin: data.tanggal_berakhir_izin,
    nomor_pks: data.nomor_pks,
    luas_ha: data.luas_ha,
    jenis_hutan: data.jenis_hutan,
    status_kawasan: data.status_kawasan,
    rkps_status: data.rkps_status,
    peta_status: data.peta_status,
    keterangan: data.keterangan,
    fasilitator: data.fasilitator,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('perhutanan_sosial')
        .update(record)
        .eq('id', existing.id);
      
      if (error) {
        console.error(`Update error for ${data.pemegang_izin}:`, error.message);
        return false;
      }
      console.log(`Updated: ${data.pemegang_izin}`);
    } else {
      // Insert new record
      const { error } = await supabase
        .from('perhutanan_sosial')
        .insert(record);
      
      if (error) {
        console.error(`Insert error for ${data.pemegang_izin}:`, error.message);
        return false;
      }
      console.log(`Inserted: ${data.pemegang_izin}`);
    }
    return true;
  } catch (error) {
    console.error(`Database error for ${data.pemegang_izin}:`, error.message);
    return false;
  }
}

// Main execution
const rootPath = path.join(__dirname, '..', '..', '..', '..');
const filePath = path.join(rootPath, 'DIV PERENCANAAN', 'DOKUMEN PERENCANAAN', 'DATA UPDATE', 'JANUARI 06012026', 'DATA PS YANG TELAH PKS.xlsx');
console.log('Constructed file path:', filePath);
console.log('File exists:', fs.existsSync(filePath));

importExcel(filePath).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
