const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('sheetjs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
} else {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importExcel(filePath) {
  console.log(`Reading Excel file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
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
    
    if (sheetName.includes('DATA POTENSI') || sheetName.includes('POTENSI')) {
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      let currentKabupaten = '';
      let headers = [];
      
      // Find header row
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          const firstCell = String(row[0] || '').toUpperCase();
          if (firstCell.includes('SKEMA') || firstCell.includes('PEMEGANG')) {
            headers = row.map(cell => String(cell || '').trim());
            console.log('Found headers at row', i, ':', headers);
            
            // Process data rows
            for (let j = i + 1; j < rawData.length; j++) {
              const dataRow = rawData[j];
              if (!Array.isArray(dataRow) || dataRow.length < 5) continue;
              
              // Check for kabupaten name
              const firstCellValue = String(dataRow[0] || '');
              if (firstCellValue && firstCellValue.toUpperCase() === firstCellValue && 
                  !firstCellValue.match(/^\d+$/) && firstCellValue.length > 3) {
                currentKabupaten = normalizeKabupatenName(firstCellValue);
                console.log('Switching to kabupaten:', currentKabupaten);
                continue;
              }

              // Skip total rows
              const firstCellStr = String(dataRow[0] || '');
              if (firstCellStr.includes('TOTAL') || firstCellStr.includes('JUMLAH')) {
                continue;
              }

              // Check if row has data
              const hasData = dataRow.slice(0, 5).some(cell => {
                const val = String(cell || '');
                return val.trim().length > 0;
              });

              if (hasData) {
                try {
                  const rowData = {};
                  for (let k = 0; k < Math.min(headers.length, dataRow.length); k++) {
                    rowData[headers[k]] = dataRow[k];
                  }
                  
                  const parsed = parseRow(rowData, currentKabupaten);
                  if (parsed) {
                    const result = await insertData(parsed, kabupatenMap);
                    if (result) totalImported++;
                    else totalFailed++;
                  }
                } catch (error) {
                  console.error('Error processing row:', error);
                  totalFailed++;
                }
              }
            }
            break;
          }
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

function parseRow(rowData, kabupaten) {
  // Extract values
  const skemaCell = String(rowData['SKEMA PS'] || rowData['SKEMA'] || rowData['skema'] || '').toUpperCase().trim();
  let skema = 'LPHD';
  if (skemaCell.includes('HKM')) skema = 'HKM';
  else if (skemaCell.includes('LPHD')) skema = 'LPHD';
  else if (skemaCell.includes('HA')) skema = 'HA';
  else if (skemaCell.includes('HTR')) skema = 'HTR';
  else if (skemaCell.includes('IUPHHK')) skema = 'IUPHHK';
  else if (skemaCell.includes('IUPHK')) skema = 'IUPHKm';
  else if (skemaCell.includes('POTENSI')) skema = 'POTENSI';

  const pemegangIzin = String(rowData['PEMEGANG IZIN'] || rowData['pemegang_izin'] || rowData[1] || rowData[2] || '').trim();
  const desa = String(rowData['DESA/KELURAHAN'] || rowData['desa'] || rowData[3] || rowData[4] || '').trim();
  const kecamatan = String(rowData['KECAMATAN'] || rowData['kecamatan'] || rowData[4] || rowData[5] || '').trim();
  
  const luasStr = rowData['LUAS POTENSI (HA)'] || rowData['LUAS IZIN DALAM SK (HA)'] || rowData['luas_ha'] || rowData[10] || rowData[11] || 0;
  const luas = parseFloat(String(luasStr).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  
  const jenisHutanStr = String(rowData['Jenis Hutan'] || rowData['jenis_hutan'] || rowData[11] || rowData[12] || '').trim();
  let jenisHutan = 'Mineral/Gambut';
  if (jenisHutanStr.includes('Gambut')) jenisHutan = 'Gambut';
  else if (jenisHutanStr.includes('Mineral')) jenisHutan = 'Mineral';
  
  const statusStr = String(rowData['STATUS'] || rowData['status_kawasan'] || rowData[12] || rowData[13] || '').trim();
  let statusKawasan = '------';
  if (statusStr.includes('HL')) statusKawasan = 'HL';
  else if (statusStr.includes('HPT')) statusKawasan = 'HPT';
  else if (statusStr.includes('HPK')) statusKawasan = 'HPK';
  else if (statusStr.includes('HP')) statusKawasan = 'HP';
  else if (statusStr.includes('HA')) statusKawasan = 'HA';
  
  const keterangan = String(rowData['KETERANGAN'] || rowData['keterangan'] || '').trim();
  
  // Validate required fields
  if ((!pemegangIzin || pemegangIzin.length < 2) && skema !== 'POTENSI') {
    console.log('Skipping row - missing pemegang izin:', rowData);
    return null;
  }
  
  return {
    kabupaten_nama: kabupaten,
    skema,
    pemegang_izin: pemegangIzin || 'Potensi Area',
    desa,
    kecamatan,
    luas_ha: luas,
    jenis_hutan: jenisHutan,
    status_kawasan: statusKawasan,
    rkps_status: 'belum',
    peta_status: 'belum',
    keterangan,
    fasilitator: 'AMAL'
  };
}

async function insertData(data, kabupatenMap) {
  const kabupatenId = kabupatenMap.get(data.kabupaten_nama.toUpperCase());
  if (!kabupatenId) {
    console.error(`Kabupaten not found: ${data.kabupaten_nama}`);
    return false;
  }

  // Check for duplicates by pemegang_izin and kabupaten
  const { data: existing } = await supabase
    .from('perhutanan_sosial')
    .select('id')
    .eq('pemegang_izin', data.pemegang_izin)
    .eq('kabupaten_id', kabupatenId)
    .maybeSingle();

  const record = {
    kabupaten_id: kabupatenId,
    skema: data.skema,
    pemegang_izin: data.pemegang_izin,
    desa: data.desa,
    kecamatan: data.kecamatan,
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
      // Update existing
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
      // Insert new
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
const rootPath = path.join(__dirname, '..', '..', '..', '..'); // Go up 4 levels from scripts to root
const filePath = path.join(rootPath, 'DIV PERENCANAAN', 'DOKUMEN PERENCANAAN', 'DATA UPDATE', 'JANUARI 06012026', 'DATA POTENSI.xlsx');
console.log('Constructed file path:', filePath);
console.log('File exists:', fs.existsSync(filePath));
importExcel(filePath).catch(console.error);
