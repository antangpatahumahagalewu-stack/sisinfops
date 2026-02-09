const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Load env dari .env.local
const envPath = path.join(__dirname, '.env.local');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Parse sederhana
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

console.log('Starting import of perhutanan_sosial data...');
console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importData() {
  try {
    // 1. Read CSV file
    const csvPath = path.join(__dirname, 'data/perhutanan_sosial_row.csv');
    console.log('Reading CSV file:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      return;
    }
    
    const records = [];
    
    // Read CSV with proper parsing
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // Transform CSV data to match database schema
          const transformedRow = {
            id: row.id,
            skema: row.skema,
            pemegang_izin: row.pemegang_izin,
            desa: row.desa,
            kecamatan: row.kecamatan,
            nomor_sk: row.nomor_sk,
            tanggal_sk: parseDate(row.tanggal_sk),
            masa_berlaku: row.masa_berlaku,
            tanggal_berakhir_izin: parseDate(row.tanggal_berakhir_izin),
            nomor_pks: row.nomor_pks,
            luas_ha: parseFloat(row.luas_ha?.replace(/,/g, '') || '0'),
            jenis_hutan: row.jenis_hutan,
            status_kawasan: row.status_kawasan,
            rkps_status: mapStatus(row.rkps_status),
            peta_status: mapStatus(row.peta_status),
            keterangan: row.keterangan,
            fasilitator: row.fasilitator,
            jumlah_kk: parseInt(row.jumlah_kk || '0'),
            created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
            updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
          };
          
          records.push(transformedRow);
        })
        .on('end', () => {
          console.log(`Read ${records.length} records from CSV`);
          resolve();
        })
        .on('error', reject);
    });
    
    // 2. First, get kabupaten mapping (nama -> id)
    console.log('\nFetching kabupaten mapping...');
    const { data: kabupatenData, error: kabError } = await supabase
      .from('kabupaten')
      .select('id, nama');
    
    if (kabError) {
      console.error('Error fetching kabupaten:', kabError.message);
      console.log('Please make sure the database tables are created first.');
      console.log('Run setup_database_complete.sql in Supabase SQL Editor.');
      return;
    }
    
    // Create mapping for kabupaten names (normalized)
    const kabupatenMap = {};
    kabupatenData.forEach(k => {
      // Normalize kabupaten name for matching
      const normalized = normalizeKabupatenName(k.nama);
      kabupatenMap[normalized] = k.id;
    });
    
    console.log('Kabupaten mapping:', kabupatenMap);
    
    // 3. Add kabupaten_id to records
    console.log('\nProcessing records...');
    let processed = 0;
    let skipped = 0;
    
    for (const record of records) {
      // Get kabupaten name from CSV (in lowercase)
      const kabNameFromCSV = normalizeKabupatenName(record.id ? record.id.split(',')[0]?.trim() : '');
      
      // Try to find matching kabupaten
      let kabupatenId = null;
      
      // First try direct match
      for (const [normalizedName, id] of Object.entries(kabupatenMap)) {
        if (kabNameFromCSV.includes(normalizedName) || normalizedName.includes(kabNameFromCSV)) {
          kabupatenId = id;
          break;
        }
      }
      
      if (kabupatenId) {
        record.kabupaten_id = kabupatenId;
        processed++;
      } else {
        console.log(`Skipping record: Could not find kabupaten for "${kabNameFromCSV}"`);
        skipped++;
      }
    }
    
    console.log(`Processed: ${processed}, Skipped: ${skipped}`);
    
    // 4. Insert records in batches
    if (processed > 0) {
      console.log('\nInserting records into database...');
      
      const batchSize = 10;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).filter(r => r.kabupaten_id);
        
        if (batch.length > 0) {
          console.log(`Inserting batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)...`);
          
          const { error } = await supabase
            .from('perhutanan_sosial')
            .upsert(batch, { onConflict: 'id' });
          
          if (error) {
            console.error('Error inserting batch:', error.message);
          } else {
            console.log(`✓ Batch ${Math.floor(i/batchSize) + 1} inserted successfully`);
          }
        }
      }
    }
    
    // 5. Verify import
    console.log('\nVerifying import...');
    const { data: countData, error: countError } = await supabase
      .from('perhutanan_sosial')
      .select('count', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting records:', countError.message);
    } else {
      console.log(`✅ Total records in perhutanan_sosial: ${countData.count}`);
    }
    
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`CSV records: ${records.length}`);
    console.log(`Processed: ${processed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Database total: ${countData?.count || 0}`);
    
    if (skipped > 0) {
      console.log('\nNote: Some records were skipped because kabupaten mapping failed.');
      console.log('Make sure kabupaten names in CSV match those in database.');
      console.log('Database kabupaten:', kabupatenData.map(k => k.nama));
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Helper functions
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') {
    return null;
  }
  
  try {
    // Try various date formats
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day).toISOString().split('T')[0];
    }
    
    // Try parsing as is
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

function mapStatus(status) {
  if (!status) return 'belum';
  const s = status.toLowerCase().trim();
  if (s === 'ada' || s === 'tidak ada') {
    return s === 'ada' ? 'ada' : 'belum';
  }
  return 'belum';
}

function normalizeKabupatenName(name) {
  if (!name) return '';
  // Remove prefixes and convert to lowercase
  return name.toLowerCase()
    .replace(/kabupaten\s+/g, '')
    .replace(/kotamadya\s+/g, '')
    .replace(/kota\s+/g, '')
    .trim();
}

// Run import
importData().catch(console.error);