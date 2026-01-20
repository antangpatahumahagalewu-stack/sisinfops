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
  console.log('Make sure SUPABASE_SERVICE_ROLE_KEY is set');
  process.exit(1);
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initKabupaten() {
  console.log('Initializing kabupaten data...');
  
  // First, check if kabupaten table exists and has data
  const { data: existingKabupaten, error: checkError } = await supabase
    .from('kabupaten')
    .select('id, nama')
    .limit(10);
    
  if (checkError && checkError.code === '42P01') {
    console.error('Kabupaten table does not exist. Please run the migration first.');
    console.log('\nRun this SQL in Supabase SQL editor:');
    console.log(`
      CREATE TABLE kabupaten (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        nama VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      INSERT INTO kabupaten (nama) VALUES
        ('KABUPATEN KATINGAN'),
        ('KABUPATEN KAPUAS'),
        ('KABUPATEN PULANG PISAU'),
        ('KABUPATEN GUNUNG MAS')
      ON CONFLICT (nama) DO NOTHING;
    `);
    process.exit(1);
  }
  
  // Always upsert all kabupaten from the list
  const kabupatenList = [
    'Kabupaten Katingan',
    'Kabupaten Kapuas', 
    'Kabupaten Pulang Pisau',
    'Kabupaten Gunung Mas',
    'Kotamadya Palangka Raya'
  ];
  
  console.log('Upserting kabupaten data...');
  
  for (const nama of kabupatenList) {
    const { error } = await supabase
      .from('kabupaten')
      .upsert({ nama }, { onConflict: 'nama' });
      
    if (error) {
      console.error(`Error upserting kabupaten ${nama}:`, error.message);
    } else {
      console.log(`  Upserted: ${nama}`);
    }
  }
  
  // Verify the data
  const { data: kabupatenData, error } = await supabase
    .from('kabupaten')
    .select('id, nama');
    
  if (error) {
    console.error('Error fetching kabupaten:', error);
    process.exit(1);
  }
  
  console.log(`\nSuccessfully initialized ${kabupatenData.length} kabupaten`);
  return kabupatenData;
}

async function checkPotensiTable() {
  console.log('\nChecking potensi table...');
  
  const { error } = await supabase
    .from('potensi')
    .select('id')
    .limit(1);
    
  if (error && error.code === '42P01') {
    console.log('Potensi table does not exist.');
    console.log('\nPlease run this migration SQL in Supabase SQL editor:');
    console.log(`
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
    `);
    return false;
  } else if (error) {
    console.error('Error checking potensi table:', error);
    return false;
  }
  
  console.log('Potensi table exists ✓');
  return true;
}

async function main() {
  try {
    console.log('=== Database Initialization Script ===');
    console.log('Using service role key to bypass RLS\n');
    
    const kabupatenData = await initKabupaten();
    
    if (kabupatenData.length === 0) {
      console.log('No kabupaten data found. Please check the database.');
      process.exit(1);
    }
    
    const potensiTableExists = await checkPotensiTable();
    
    console.log('\n=== Summary ===');
    console.log(`Kabupaten initialized: ${kabupatenData.length}`);
    console.log(`Potensi table exists: ${potensiTableExists ? 'Yes' : 'No (need to run migration)'}`);
    
    if (!potensiTableExists) {
      console.log('\nNext steps:');
      console.log('1. Run the potensi table migration SQL above in Supabase SQL editor');
      console.log('2. Then run: node scripts/import-potensi-v2.js');
    } else {
      console.log('\nDatabase is ready for import.');
      console.log('Run: node scripts/import-potensi-v2.js');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
