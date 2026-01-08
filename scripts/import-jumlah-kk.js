const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

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

/**
 * Ensure perhutanan_sosial table exists
 */
async function ensureTable() {
  console.log('Checking if perhutanan_sosial table exists...');
  
  // Check if table exists by trying to query it
  const { error } = await supabase
    .from('perhutanan_sosial')
    .select('id')
    .limit(1);
    
  if (error && error.code === '42P01') {
    console.log('Table perhutanan_sosial does not exist, creating...');
    
    // Create table using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS perhutanan_sosial (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        kabupaten_id UUID REFERENCES kabupaten(id) ON DELETE CASCADE,
        skema VARCHAR(50) NOT NULL,
        pemegang_izin VARCHAR(255) NOT NULL,
        desa VARCHAR(100),
        kecamatan VARCHAR(100),
        nomor_sk VARCHAR(255),
        tanggal_sk DATE,
        masa_berlaku VARCHAR(50),
        tanggal_berakhir_izin DATE,
        nomor_pks VARCHAR(255),
        luas_ha DECIMAL(10, 2),
        jenis_hutan VARCHAR(50),
        status_kawasan VARCHAR(50),
        rkps_status VARCHAR(10) CHECK (rkps_status IN ('ada', 'belum')),
        peta_status VARCHAR(10) CHECK (peta_status IN ('ada', 'belum')),
        keterangan TEXT,
        fasilitator VARCHAR(100),
        jumlah_kk INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    console.log('\n=== Please run this SQL in your Supabase SQL editor: ===');
    console.log(createTableSQL);
    console.log('=========================================================\n');
    
    console.log('Please run the migration SQL above first, then run this script again.');
    process.exit(1);
  } else if (error) {
    console.error('Error checking table:', error);
    process.exit(1);
  }
  
  console.log('Table perhutanan_sosial exists ✓');
}

/**
 * Parse Excel file and extract jumlah_kk data
 */
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
    
    // Find header row (look for "PEMEGANG IZIN", "JUMLAH KK", "NOMOR SK", etc.)
    let headerRowIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      // Check for header indicators
      const rowStr = row.map(cell => String(cell || '').toUpperCase()).join(' ');
      if (rowStr.includes('PEMEGANG') || rowStr.includes('JUMLAH') || rowStr.includes('KK') || 
          rowStr.includes('NOMOR SK') || rowStr.includes('SKEMA') || rowStr.includes('NO SK')) {
        headerRowIndex = i;
        headers = row.map(cell => String(cell || '').trim());
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.log(`  No header row found in sheet ${sheetName}, trying alternative search...`);
      // Try looking for any row with "PEMEGANG" or "JUMLAH" in any position
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          const rowStr = row.map(cell => String(cell || '').toUpperCase()).join(' ');
          if (rowStr.includes('PEMEGANG') || rowStr.includes('JUMLAH')) {
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
    console.log(`  Headers:`, headers.slice(0, 5).join(', '), '...');
    
    // Process data rows starting from after header
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row) || row.length < 2) continue;
      
      // Skip empty rows or total rows
      const rowStr = row.map(cell => String(cell || '')).join(' ').toUpperCase();
      if (rowStr.includes('TOTAL') || rowStr.includes('JUMLAH') || rowStr.trim() === '') {
        continue;
      }
      
      // Skip rows that are mostly empty
      const nonEmptyCells = row.filter(cell => {
        const val = String(cell || '');
        return val.trim().length > 0;
      }).length;
      
      if (nonEmptyCells < 2) continue;
      
      // Create object from row data
      const rowData = {};
      for (let j = 0; j < Math.min(headers.length, row.length); j++) {
        if (headers[j] && headers[j].trim().length > 0) {
          rowData[headers[j]] = row[j];
        }
      }
      
      // Parse the data
      const parsed = parseRowData(rowData);
      if (parsed) {
        allData.push(parsed);
      }
    }
  }
  
  console.log(`\nTotal parsed records: ${allData.length}`);
  return allData;
}

/**
 * Parse CSV file and extract jumlah_kk data
 */
function parseCsvData(filePath) {
  console.log(`Reading CSV file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    console.error('CSV file is empty');
    return [];
  }
  
  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  console.log(`  Found ${headers.length} columns`);
  console.log(`  Headers:`, headers.slice(0, 5).join(', '), '...');
  
  const allData = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (handle quoted values)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Last value
    
    // Create object from row data
    const rowData = {};
    for (let j = 0; j < Math.min(headers.length, values.length); j++) {
      if (headers[j]) {
        rowData[headers[j]] = values[j].replace(/^"|"$/g, '');
      }
    }
    
    // Parse the data
    const parsed = parseRowData(rowData);
    if (parsed) {
      allData.push(parsed);
    }
  }
  
  console.log(`\nTotal parsed records: ${allData.length}`);
  return allData;
}

/**
 * Parse row data and extract pemegang_izin, nomor_sk, and jumlah_kk
 */
function parseRowData(rowData) {
  // Try to find pemegang_izin with various possible column names
  const pemegangIzin = String(
    rowData['PEMEGANG IZIN'] || 
    rowData['PEMEGANG'] || 
    rowData['NAMA'] ||
    rowData['NAMA LEMBAGA'] ||
    rowData['Pemegang Izin'] ||
    rowData['Pemegang'] ||
    ''
  ).trim();
  
  // Try to find nomor_sk
  const nomorSk = String(
    rowData['NOMOR SK'] || 
    rowData['NOMOR SK KEMENTRIAN LINGKUNGAN HIDUP'] ||
    rowData['NO SK'] ||
    rowData['SK'] ||
    rowData['Nomor SK'] ||
    rowData['No SK'] ||
    ''
  ).trim();
  
  // Try to find jumlah_kk with various possible column names
  const jumlahKkStr = String(
    rowData['JUMLAH KK'] || 
    rowData['JUMLAH KARTU KELUARGA'] ||
    rowData['KK'] ||
    rowData['JML KK'] ||
    rowData['JML KARTU KELUARGA'] ||
    rowData['Jumlah KK'] ||
    rowData['Jumlah Kartu Keluarga'] ||
    0
  );
  
  const jumlahKk = parseInt(String(jumlahKkStr).replace(/[^\d]/g, '')) || null;
  
  // Skip if no identifier found
  if (!pemegangIzin && !nomorSk) {
    return null;
  }
  
  // Skip if jumlah_kk is not valid
  if (jumlahKk === null || jumlahKk === 0) {
    return null;
  }
  
  return {
    pemegang_izin: pemegangIzin || null,
    nomor_sk: nomorSk || null,
    jumlah_kk: jumlahKk
  };
}

/**
 * Export data to CSV file
 */
function exportToCsv(data, outputPath) {
  console.log(`\nExporting ${data.length} records to CSV: ${outputPath}`);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  
  // Create CSV content
  const headers = ['pemegang_izin', 'nomor_sk', 'jumlah_kk'];
  const csvLines = [headers.join(',')];
  
  for (const record of data) {
    // Escape commas and quotes in values
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const row = [
      escapeCsv(record.pemegang_izin),
      escapeCsv(record.nomor_sk),
      escapeCsv(record.jumlah_kk)
    ];
    csvLines.push(row.join(','));
  }
  
  // Write to file
  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
  console.log(`✓ CSV exported successfully: ${outputPath}`);
  
  return outputPath;
}

/**
 * Import data from CSV file
 */
function importFromCsv(csvPath) {
  console.log(`\nImporting from CSV: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    return [];
  }
  
  return parseCsvData(csvPath);
}

/**
 * Update jumlah_kk in database
 */
async function updateJumlahKk(data) {
  console.log(`\nUpdating ${data.length} records with jumlah_kk...`);
  
  let updated = 0;
  let notFound = 0;
  let failed = 0;
  
  for (const item of data) {
    try {
      // Try to find PS record by pemegang_izin and nomor_sk
      let query = supabase
        .from('perhutanan_sosial')
        .select('id, pemegang_izin, nomor_sk');
      
      // Build query based on available data (prioritize nomor_sk)
      if (item.nomor_sk && item.nomor_sk.trim() !== '') {
        query = query.eq('nomor_sk', item.nomor_sk);
      } else if (item.pemegang_izin && item.pemegang_izin.trim() !== '') {
        query = query.eq('pemegang_izin', item.pemegang_izin);
      } else {
        console.log(`  Skipping: no identifier found`);
        notFound++;
        continue;
      }
      
      const { data: psRecords, error: searchError } = await query;
      
      if (searchError) {
        console.error(`  Search error:`, searchError.message);
        failed++;
        continue;
      }
      
      if (!psRecords || psRecords.length === 0) {
        console.log(`  Not found: ${item.pemegang_izin || item.nomor_sk}`);
        notFound++;
        continue;
      }
      
      // Update all matching records
      for (const psRecord of psRecords) {
        if (item.jumlah_kk === null || item.jumlah_kk === undefined) {
          console.log(`  Skipping ${psRecord.pemegang_izin}: jumlah_kk is null/undefined`);
          continue;
        }
        
        const { error: updateError } = await supabase
          .from('perhutanan_sosial')
          .update({ jumlah_kk: item.jumlah_kk })
          .eq('id', psRecord.id);
        
        if (updateError) {
          console.error(`  Update error for ${psRecord.pemegang_izin}:`, updateError.message);
          failed++;
        } else {
          updated++;
          console.log(`  ✓ Updated: ${psRecord.pemegang_izin} (${psRecord.nomor_sk || 'no SK'}) -> ${item.jumlah_kk} KK`);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  Error processing ${item.pemegang_izin || item.nomor_sk}:`, error.message);
      failed++;
    }
  }
  
  return { updated, notFound, failed };
}

/**
 * Main function
 */
async function main() {
  try {
    // Step 1: Ensure table exists
    await ensureTable();
    
    // Step 2: Find and parse Excel/CSV files in data directory
    const dataDir = path.join(__dirname, '..', 'data');
    
    if (!fs.existsSync(dataDir)) {
      console.error(`Data directory not found: ${dataDir}`);
      console.log('Please create the data directory and place your Excel/CSV files there.');
      process.exit(1);
    }
    
    // Look for Excel and CSV files
    const files = fs.readdirSync(dataDir).filter(file => 
      file.match(/\.(xlsx|xls|csv)$/i) && !file.startsWith('.')
    );
    
    if (files.length === 0) {
      console.error(`No Excel/CSV files found in ${dataDir}`);
      console.log('Please place your Excel or CSV files in the data directory.');
      process.exit(1);
    }
    
    console.log(`\nFound ${files.length} file(s) in data directory:`);
    files.forEach(file => console.log(`  - ${file}`));
    
    // Step 3: Parse all files
    let allData = [];
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      console.log(`\n=== Processing file: ${file} ===`);
      
      let data = [];
      if (file.match(/\.(xlsx|xls)$/i)) {
        data = parseExcelData(filePath);
      } else if (file.match(/\.csv$/i)) {
        data = parseCsvData(filePath);
      }
      
      allData = allData.concat(data);
    }
    
    if (allData.length === 0) {
      console.log('\nNo data found to import');
      process.exit(0);
    }
    
    // Step 4: Export to CSV
    const outputDir = path.join(dataDir, 'output');
    const csvOutputPath = path.join(outputDir, 'jumlah-kk.csv');
    exportToCsv(allData, csvOutputPath);
    
    // Step 5: Import from CSV to database
    console.log('\n=== Importing to database ===');
    const csvData = importFromCsv(csvOutputPath);
    
    if (csvData.length === 0) {
      console.log('No data to import from CSV');
      process.exit(0);
    }
    
    // Step 6: Update jumlah_kk in database
    const result = await updateJumlahKk(csvData);
    
    // Step 7: Summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total records parsed: ${allData.length}`);
    console.log(`Records in CSV: ${csvData.length}`);
    console.log(`Successfully updated: ${result.updated}`);
    console.log(`Not found: ${result.notFound}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Total processed: ${result.updated + result.notFound + result.failed}`);
    
    if (result.failed > 0) {
      console.log('\nSome records failed to update. Check the errors above.');
      process.exit(1);
    } else {
      console.log('\n✓ Import completed successfully!');
      console.log(`CSV backup saved at: ${csvOutputPath}`);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
