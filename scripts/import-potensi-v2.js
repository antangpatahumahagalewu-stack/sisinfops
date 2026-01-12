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
  console.log('Make sure SUPABASE_SERVICE_ROLE_KEY is set');
  process.exit(1);
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensurePotensiTable() {
  console.log('Ensuring potensi table exists...');
  
  // Check if table exists by trying to query it
  const { error } = await supabase
    .from('potensi')
    .select('id')
    .limit(1);
    
  if (error && error.code === '42P01') {
    console.log('Potensi table does not exist, creating...');
    
    // Create table using SQL (simplified - in production you'd use migrations)
    // For now, we'll just log the SQL to run manually
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS potensi (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        kabupaten_id UUID REFERENCES kabupaten(id) ON DELETE CASCADE,
        skema VARCHAR(50) NOT NULL DEFAULT 'POTENSI',
        nama_area VARCHAR(255) NOT NULL,
        desa VARCHAR(100),
        kecamatan VARCHAR(100),
        luas_potensi_ha DECIMAL(12, 2),
        jenis_hutan VARCHAR(50),
        status_kawasan VARCHAR(50),
        pemegang_izin VARCHAR(255),
        nomor_sk VARCHAR(255),
        tanggal_sk DATE,
        masa_berlaku VARCHAR(50),
        tanggal_berakhir_izin DATE,
        luas_izin_sk_ha DECIMAL(12, 2),
        status_pengembangan VARCHAR(50) DEFAULT 'Proses Pembentukan',
        keterangan TEXT,
        fasilitator VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_potensi_kabupaten_id ON potensi(kabupaten_id);
      CREATE INDEX IF NOT EXISTS idx_potensi_skema ON potensi(skema);
      CREATE INDEX IF NOT EXISTS idx_potensi_status_pengembangan ON potensi(status_pengembangan);
    `;
    
    console.log('\n=== Please run this SQL in your Supabase SQL editor: ===');
    console.log(createTableSQL);
    console.log('=========================================================\n');
    
    // For now, we'll exit and ask the user to run the migration
    console.log('Please run the migration SQL above first, then run this script again.');
    process.exit(1);
  } else if (error) {
    console.error('Error checking potensi table:', error);
    process.exit(1);
  }
  
  console.log('Potensi table exists ✓');
}

async function ensureKabupatenData() {
  console.log('Ensuring kabupaten data exists...');
  
  // Insert the 4 kabupaten if they don't exist
  const kabupatenList = [
    'KABUPATEN KATINGAN',
    'KABUPATEN KAPUAS', 
    'KABUPATEN PULANG PISAU',
    'KABUPATEN GUNUNG MAS'
  ];
  
  for (const nama of kabupatenList) {
    const { error } = await supabase
      .from('kabupaten')
      .upsert({ nama }, { onConflict: 'nama' });
      
    if (error) {
      console.error(`Error inserting kabupaten ${nama}:`, error);
    }
  }
  
  // Get kabupaten mapping
  const { data: kabupatenData, error } = await supabase
    .from('kabupaten')
    .select('id, nama');
    
  if (error) {
    console.error('Error fetching kabupaten:', error);
    process.exit(1);
  }
  
  const kabupatenMap = new Map();
  kabupatenData.forEach(k => {
    kabupatenMap.set(k.nama.toUpperCase(), k.id);
    kabupatenMap.set(k.nama.toLowerCase(), k.id);
    kabupatenMap.set(k.nama.replace('KABUPATEN ', '').toUpperCase(), k.id);
    kabupatenMap.set(k.nama.replace('KABUPATEN ', '').toLowerCase(), k.id);
  });
  
  console.log(`Loaded ${kabupatenData.length} kabupaten ✓`);
  return kabupatenMap;
}

function parseExcelData(filePath) {
  console.log(`Reading Excel file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  
  console.log('Sheets found:', sheetNames);
  
  const allData = [];
  
  for (const sheetName of sheetNames) {
    console.log(`\nProcessing sheet: ${sheetName}`);
    
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    // Determine kabupaten from sheet name
    let kabupaten = '';
    if (sheetName.includes('KATINGAN')) kabupaten = 'KABUPATEN KATINGAN';
    else if (sheetName.includes('KAPUAS')) kabupaten = 'KABUPATEN KAPUAS';
    else if (sheetName.includes('PULANG PISAU')) kabupaten = 'KABUPATEN PULANG PISAU';
    else if (sheetName.includes('GUNUNG MAS')) kabupaten = 'KABUPATEN GUNUNG MAS';
    
    // Find header row (look for "SKEMA PS" or "PEMEGANG IZIN" in various positions)
    let headerRowIndex = -1;
    let headers = [];
    
    // Different sheets have different header positions
    // KATINGAN: header at row 0
    // PULANG PISAU, GUNUNG MAS, KAPUAS: header at row 1 (row 0 has other info)
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      // Check multiple possible header indicators
      for (let j = 0; j < Math.min(5, row.length); j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell.includes('SKEMA') || cell.includes('PEMEGANG') || cell.includes('KABUPATEN') || cell.includes('DESA')) {
          headerRowIndex = i;
          headers = row.map(cell => String(cell || '').trim());
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }
    
    if (headerRowIndex === -1) {
      console.log(`  No header row found in sheet ${sheetName}, trying alternative search...`);
      // Try looking for any row with "SKEMA" in any position
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          const rowStr = row.map(cell => String(cell || '').toUpperCase()).join(' ');
          if (rowStr.includes('SKEMA')) {
            headerRowIndex = i;
            headers = row.map(cell => String(cell || '').trim());
            break;
          }
        }
      }
    }
    
    if (headerRowIndex === -1) {
      console.log(`  Could not find headers in sheet ${sheetName}, skipping...`);
      continue;
    }
    
    console.log(`  Found headers at row ${headerRowIndex + 1}`);
    
    // Process data rows starting from after header
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row) || row.length < 5) continue;
      
      // Skip empty rows or total rows
      const firstCell = String(row[0] || '');
      const secondCell = String(row[1] || '');
      
      // Check if this is a total/summary row
      const rowStr = row.map(cell => String(cell || '')).join(' ').toUpperCase();
      if (rowStr.includes('TOTAL') || rowStr.includes('JUMLAH') || rowStr.includes('SEMENTARA')) {
        continue;
      }
      
      // Skip rows that are mostly empty
      const nonEmptyCells = row.filter(cell => {
        const val = String(cell || '');
        return val.trim().length > 0;
      }).length;
      
      if (nonEmptyCells < 3) continue;
      
      // Skip rows that are just separators or labels (like "VMM", "B. KAPUAS")
      if (firstCell === 'VMM' || firstCell === 'B. KAPUAS') {
        continue;
      }
      
      // Create object from row data
      const rowData = {};
      for (let j = 0; j < Math.min(headers.length, row.length); j++) {
        // Skip empty header names
        if (headers[j] && headers[j].trim().length > 0) {
          rowData[headers[j]] = row[j];
        }
      }
      
      // Parse the data
      const parsed = parseRowData(rowData, kabupaten);
      if (parsed) {
        allData.push(parsed);
      }
    }
  }
  
  console.log(`\nTotal parsed records: ${allData.length}`);
  return allData;
}

function parseRowData(rowData, defaultKabupaten) {
  // Get values with fallbacks
  const skemaCell = String(rowData['SKEMA PS'] || rowData['SKEMA'] || '').toUpperCase().trim();
  const pemegangIzin = String(rowData['PEMEGANG IZIN'] || rowData['PEMEGANG'] || '').trim();
  const potensiBergabung = String(rowData['* POTENSI BERGABUNG/PEMBENTUKAN BARU'] || rowData['POTENSI BERGABUNG/PEMBENTUKAN BARU'] || '').trim();
  
  // Determine nama_area: prefer potensi bergabung, then pemegang izin
  let nama_area = potensiBergabung;
  if (!nama_area || nama_area === '-' || nama_area === '?') {
    nama_area = pemegangIzin;
  }
  
  if (!nama_area || nama_area.trim().length === 0) {
    return null;
  }
  
  // Location info
  const kabupaten = String(rowData['KABUPATEN'] || defaultKabupaten || '').trim();
  const desa = String(rowData['DESA/KELURAHAN'] || rowData['DESA'] || '').trim();
  const kecamatan = String(rowData['KECAMATAN'] || '').trim();
  
  // Luas values
  const luasPotensiStr = String(rowData['LUAS POTENSI (HA)'] || rowData['LUAS POTENSI'] || 0);
  const luasIzinStr = String(rowData['LUAS IZIN DALAM SK (HA)'] || rowData['LUAS IZIN'] || 0);
  
  const luas_potensi_ha = parseFloat(String(luasPotensiStr).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  const luas_izin_sk_ha = parseFloat(String(luasIzinStr).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  
  // Forest type and status
  const jenisHutanStr = String(rowData['JENIS HUTAN'] || rowData['Jenis Hutan'] || '').trim();
  const statusKawasanStr = String(rowData['STATUS'] || rowData['Status'] || '').trim();
  
  // SK details
  const nomor_sk = String(rowData['NOMOR SK KEMENTRIAN LINGKUNGAN HIDUP'] || rowData['NOMOR SK'] || '').trim();
  
  // Determine status pengembangan from keterangan
  const keterangan = String(rowData['KETERANGAN'] || '').trim();
  let status_pengembangan = 'Proses Pembentukan';
  
  if (keterangan.includes('penjajakan')) {
    status_pengembangan = 'Proses Penjajakan';
  } else if (keterangan.includes('Siap') || keterangan.includes('siap')) {
    status_pengembangan = 'Siap Dikembangkan';
  } else if (keterangan.includes('Ada') || keterangan.includes('ada')) {
    status_pengembangan = 'Dalam Verifikasi';
  }
  
  // Determine skema
  let skema = 'POTENSI';
  if (skemaCell.includes('LPHD')) skema = 'LPHD';
  else if (skemaCell.includes('HKM')) skema = 'HKM';
  else if (skemaCell.includes('HA')) skema = 'HA';
  else if (skemaCell.includes('HTR')) skema = 'HTR';
  else if (skemaCell.includes('POTENSI')) skema = 'POTENSI';
  
  return {
    kabupaten_nama: kabupaten || defaultKabupaten,
    nama_area,
    desa,
    kecamatan,
    luas_potensi_ha,
    luas_izin_sk_ha,
    jenis_hutan: jenisHutanStr || 'Tidak Diketahui',
    status_kawasan: statusKawasanStr || 'Tidak Diketahui',
    pemegang_izin: pemegangIzin || nama_area,
    nomor_sk,
    status_pengembangan,
    keterangan,
    skema,
    fasilitator: 'AMAL'
  };
}

async function importDataToDatabase(data, kabupatenMap) {
  console.log(`\nImporting ${data.length} records to database...`);
  
  let imported = 0;
  let updated = 0;
  let failed = 0;
  
  for (const item of data) {
    try {
      const kabupatenId = kabupatenMap.get(item.kabupaten_nama.toUpperCase());
      if (!kabupatenId) {
        console.error(`  Kabupaten not found: ${item.kabupaten_nama}`);
        failed++;
        continue;
      }
      
      // Check if record already exists (by nama_area and kabupaten)
      const { data: existing } = await supabase
        .from('potensi')
        .select('id')
        .eq('nama_area', item.nama_area)
        .eq('kabupaten_id', kabupatenId)
        .maybeSingle();
      
      const record = {
        kabupaten_id: kabupatenId,
        skema: item.skema,
        nama_area: item.nama_area,
        desa: item.desa,
        kecamatan: item.kecamatan,
        luas_potensi_ha: item.luas_potensi_ha,
        jenis_hutan: item.jenis_hutan,
        status_kawasan: item.status_kawasan,
        pemegang_izin: item.pemegang_izin,
        nomor_sk: item.nomor_sk,
        luas_izin_sk_ha: item.luas_izin_sk_ha,
        status_pengembangan: item.status_pengembangan,
        keterangan: item.keterangan,
        fasilitator: item.fasilitator
      };
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('potensi')
          .update(record)
          .eq('id', existing.id);
          
        if (error) {
          console.error(`  Update error for ${item.nama_area}:`, error.message);
          failed++;
        } else {
          updated++;
          console.log(`  Updated: ${item.nama_area}`);
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('potensi')
          .insert(record);
          
        if (error) {
          console.error(`  Insert error for ${item.nama_area}:`, error.message);
          failed++;
        } else {
          imported++;
          console.log(`  Inserted: ${item.nama_area}`);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  Error processing ${item.nama_area}:`, error.message);
      failed++;
    }
  }
  
  return { imported, updated, failed };
}

async function main() {
  try {
    // Step 1: Ensure potensi table exists
    await ensurePotensiTable();
    
    // Step 2: Ensure kabupaten data exists
    const kabupatenMap = await ensureKabupatenData();
    
    // Step 3: Parse Excel data
    const rootPath = path.join(__dirname, '..', '..', '..', '..');
    const filePath = path.join(
      rootPath, 
      'DIV PERENCANAAN', 
      'DOKUMEN PERENCANAAN', 
      'DATA UPDATE', 
      'JANUARI 06012026', 
      'DATA POTENSI.xlsx'
    );
    
    console.log(`\nExcel file path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    const data = parseExcelData(filePath);
    
    if (data.length === 0) {
      console.log('No data found to import');
      process.exit(0);
    }
    
    // Step 4: Import to database
    const result = await importDataToDatabase(data, kabupatenMap);
    
    // Step 5: Summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total records parsed: ${data.length}`);
    console.log(`Successfully imported: ${result.imported}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Total processed: ${result.imported + result.updated + result.failed}`);
    
    if (result.failed > 0) {
      console.log('\nSome records failed to import. Check the errors above.');
      process.exit(1);
    } else {
      console.log('\nImport completed successfully!');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
