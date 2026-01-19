const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

/**
 * Normalize kabupaten name to match database format
 * In CSV: 'KAPUAS', 'GUNUNG MAS', etc.
 * In DB: 'KABUPATEN KAPUAS', 'KABUPATEN GUNUNG MAS'
 */
function normalizeKabupatenName(name) {
  if (!name) return null;
  const upper = name.trim().toUpperCase();
  // If already starts with 'KABUPATEN ', return as is
  if (upper.startsWith('KABUPATEN ')) {
    return upper;
  }
  return `KABUPATEN ${upper}`;
}

/**
 * Parse date from various formats in CSV
 * Supported: "30/8/2024", "3 Des 2018", "2024-08-30", "2024-08-30 12:00:00", etc.
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const str = dateStr.trim();

  // If it's already a timestamp string with timezone (from CSV)
  if (str.includes('+00') || str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try dd-mm-yyyy
  const dmyDashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDashMatch) {
    const day = parseInt(dmyDashMatch[1], 10);
    const month = parseInt(dmyDashMatch[2], 10) - 1;
    const year = parseInt(dmyDashMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try Indonesian month names: "3 Des 2018", "3 Agust 2023"
  const indonesianMonths = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5,
    'jul': 6, 'agu': 7, 'agt': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11,
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
    'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };
  const parts = str.toLowerCase().split(/[\s,\/]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1].substring(0, 3); // first three letters
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && indonesianMonths[monthName] !== undefined && !isNaN(year)) {
      const month = indonesianMonths[monthName];
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // Fallback to Date constructor
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();

  console.warn(`Could not parse date: ${str}`);
  return null;
}

/**
 * Parse decimal number, handle both Indonesian and international formats:
 * - Indonesian: "1.500,75" -> 1500.75 (dot thousand, comma decimal)
 * - International: "1,500.75" -> 1500.75 (comma thousand, dot decimal)
 * - Simple decimal: "608.00" -> 608.00 (dot decimal, no thousand)
 * - Simple with comma: "9,416" -> 9.416 (comma decimal, no thousand)
 */
function parseDecimal(numStr) {
  if (!numStr) return null;
  let str = String(numStr).trim();
  if (str === '') return null;
  
  // Remove any whitespace within number (e.g., "1 500" -> "1500")
  str = str.replace(/\s/g, '');
  
  // Count dots and commas to guess format
  const dotCount = (str.match(/\./g) || []).length;
  const commaCount = (str.match(/,/g) || []).length;
  
  // If only dots and no commas, check if it's likely decimal or thousand separator
  if (dotCount > 0 && commaCount === 0) {
    // If there's exactly one dot and digits after dot <= 2, treat as decimal
    const lastDotIndex = str.lastIndexOf('.');
    const afterDot = str.substring(lastDotIndex + 1);
    if (dotCount === 1 && afterDot.length <= 2 && !isNaN(afterDot)) {
      // Likely decimal with dot as decimal separator, e.g., "608.00"
      // No change needed
    } else {
      // Likely thousand separators, remove dots
      str = str.replace(/\./g, '');
    }
  }
  // If only commas and no dots, check if it's likely decimal or thousand separator
  else if (commaCount > 0 && dotCount === 0) {
    // If there's exactly one comma and digits after comma <= 2, treat as decimal
    const lastCommaIndex = str.lastIndexOf(',');
    const afterComma = str.substring(lastCommaIndex + 1);
    if (commaCount === 1 && afterComma.length <= 2 && !isNaN(afterComma)) {
      // Likely decimal with comma as decimal separator, e.g., "9,416"
      str = str.replace(',', '.');
    } else {
      // Likely thousand separators, remove commas
      str = str.replace(/,/g, '');
    }
  }
  // If both dots and commas present, determine which is decimal separator
  else if (dotCount > 0 && commaCount > 0) {
    // Typically the last one is decimal separator
    const lastDotIndex = str.lastIndexOf('.');
    const lastCommaIndex = str.lastIndexOf(',');
    if (lastDotIndex > lastCommaIndex) {
      // Dot is last -> dot is decimal, comma is thousand separator
      str = str.replace(/,/g, ''); // Remove thousand separators
      // Keep dot as decimal
    } else {
      // Comma is last -> comma is decimal, dot is thousand separator
      str = str.replace(/\./g, ''); // Remove thousand separators
      str = str.replace(',', '.'); // Replace comma decimal with dot
    }
  }
  
  const val = parseFloat(str);
  return isNaN(val) ? null : val;
}

/**
 * Parse integer
 */
function parseIntSafe(intStr) {
  if (!intStr) return null;
  const val = parseInt(intStr, 10);
  return isNaN(val) ? null : val;
}

/**
 * Parse a CSV line with quoted fields (handles commas inside quotes)
 */
function parseCSVLine(line) {
  const result = [];
  let inQuotes = false;
  let currentField = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next char
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  result.push(currentField);
  return result;
}

/**
 * Map status values to match database constraints
 */
function mapStatus(value) {
  if (!value) return 'belum';
  const val = value.trim().toLowerCase();
  if (val === 'ada' || val === 'tidak ada') {
    return val === 'ada' ? 'ada' : 'belum';
  }
  // Default to 'belum' for any other value
  return 'belum';
}

async function importCSV(csvPath) {
  console.log(`Reading CSV file: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  // Read the entire file
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split('\n');
  if (lines.length < 2) {
    console.error('CSV file has no data rows');
    process.exit(1);
  }

  // Parse header with quoted field handling
  const headers = parseCSVLine(lines[0].trim());
  console.log(`CSV headers: ${headers.length} columns`);
  console.log('Headers:', headers);

  // Get kabupaten mapping from database
  const { data: kabupatenData, error: kabError } = await supabase
    .from('kabupaten')
    .select('id, nama');
  
  if (kabError) {
    console.error('Error fetching kabupaten:', kabError);
    process.exit(1);
  }

  const kabupatenMap = new Map();
  kabupatenData.forEach(k => {
    kabupatenMap.set(k.nama.toUpperCase(), k.id);
  });
  console.log(`Loaded ${kabupatenMap.size} kabupaten from database`);

  let totalRows = 0;
  let imported = 0;
  let updated = 0;
  let failed = 0;

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    totalRows++;
    const row = parseCSVLine(line);
    
    // Debug first few rows
    if (i <= 3) {
      console.log(`Row ${i} parsed:`, row);
    }
    
    if (row.length !== headers.length) {
      console.warn(`Row ${i} has ${row.length} columns, expected ${headers.length}. Skipping.`);
      console.warn('Row content:', row);
      failed++;
      continue;
    }

    // Create object from row
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = row[idx];
    });

    try {
      // Normalize kabupaten
      const kabupatenName = normalizeKabupatenName(rowObj.kabupaten_id);
      const kabupatenId = kabupatenMap.get(kabupatenName);
      if (!kabupatenId) {
        console.error(`Kabupaten not found: ${rowObj.kabupaten_id} (normalized: ${kabupatenName})`);
        failed++;
        continue;
      }

      // Validate UUID format for id
      if (!rowObj.id || !rowObj.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.error(`Invalid UUID format for row ${i}: ${rowObj.id}`);
        failed++;
        continue;
      }

      // Prepare record for perhutanan_sosial
      const record = {
        id: rowObj.id, // Use the UUID from CSV
        kabupaten_id: kabupatenId,
        skema: rowObj.skema || null,
        pemegang_izin: rowObj.pemegang_izin || null,
        desa: rowObj.desa || null,
        kecamatan: rowObj.kecamatan || null,
        nomor_sk: rowObj.nomor_sk || null,
        tanggal_sk: parseDate(rowObj.tanggal_sk),
        masa_berlaku: rowObj.masa_berlaku || null,
        tanggal_berakhir_izin: parseDate(rowObj.tanggal_berakhir_izin),
        nomor_pks: rowObj.nomor_pks || null,
        luas_ha: parseDecimal(rowObj.luas_ha),
        jenis_hutan: rowObj.jenis_hutan || null,
        status_kawasan: rowObj.status_kawasan || null,
        rkps_status: mapStatus(rowObj.rkps_status),
        peta_status: mapStatus(rowObj.peta_status),
        keterangan: rowObj.keterangan || null,
        fasilitator: rowObj.fasilitator || null,
        jumlah_kk: parseIntSafe(rowObj.jumlah_kk),
        created_at: parseDate(rowObj.created_at) || new Date().toISOString(),
        updated_at: parseDate(rowObj.updated_at) || new Date().toISOString()
      };

      // Debug record for first few rows
      if (i <= 3) {
        console.log(`Record ${i}:`, record);
      }

      // Check if record exists (by id)
      const { data: existing, error: fetchError } = await supabase
        .from('perhutanan_sosial')
        .select('id')
        .eq('id', record.id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking existing record ${record.id}:`, fetchError.message);
        failed++;
        continue;
      }

      let result;
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('perhutanan_sosial')
          .update(record)
          .eq('id', record.id);

        if (error) {
          console.error(`Update error for ${record.id}:`, error.message);
          failed++;
        } else {
          updated++;
          console.log(`Updated: ${record.pemegang_izin} (${record.id})`);
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('perhutanan_sosial')
          .insert(record);

        if (error) {
          console.error(`Insert error for ${record.id}:`, error.message);
          failed++;
        } else {
          imported++;
          console.log(`Inserted: ${record.pemegang_izin} (${record.id})`);
        }
      }
    } catch (error) {
      console.error(`Error processing row ${i}:`, error);
      failed++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total rows in CSV: ${totalRows}`);
  console.log(`Successfully inserted: ${imported}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log('======================');
}

// Main execution
const csvPath = path.join(__dirname, '..', 'data', 'perhutanan_sosial_row.csv');
console.log('CSV file path:', csvPath);
console.log('File exists:', fs.existsSync(csvPath));

importCSV(csvPath).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
