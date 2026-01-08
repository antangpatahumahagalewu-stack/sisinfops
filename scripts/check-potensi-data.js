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

async function checkData() {
  console.log('Checking potensi data...\n');

  // Count total records
  const { count, error: countError } = await supabase
    .from('potensi')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting potensi:', countError);
    return;
  }

  console.log(`Total potensi records: ${count}`);

  // Get sample records
  const { data: sampleData, error: sampleError } = await supabase
    .from('potensi')
    .select(`
      id,
      nama_area,
      desa,
      kecamatan,
      luas_potensi_ha,
      jenis_hutan,
      kabupaten:kabupaten_id (nama)
    `)
    .limit(10);

  if (sampleError) {
    console.error('Error fetching sample data:', sampleError);
    return;
  }

  console.log('\nSample data (first 10 records):');
  console.log('================================');
  sampleData.forEach((item, index) => {
    console.log(`${index + 1}. ${item.nama_area}`);
    console.log(`   Kabupaten: ${item.kabupaten?.nama || 'N/A'}`);
    console.log(`   Desa: ${item.desa || 'N/A'}`);
    console.log(`   Kecamatan: ${item.kecamatan || 'N/A'}`);
    console.log(`   Luas Potensi: ${item.luas_potensi_ha || 0} ha`);
    console.log(`   Jenis Hutan: ${item.jenis_hutan || 'N/A'}`);
    console.log('');
  });

  // Check by kabupaten
  console.log('\nData by Kabupaten:');
  console.log('==================');
  
  const { data: kabupatenData, error: kabError } = await supabase
    .from('kabupaten')
    .select(`
      nama,
      potensi:potensi(count)
    `);

  if (kabError) {
    console.error('Error fetching kabupaten data:', kabError);
  } else {
    kabupatenData.forEach(kab => {
      console.log(`${kab.nama}: ${kab.potensi?.[0]?.count || 0} records`);
    });
  }

  // Check data types and schema
  console.log('\n\nChecking table schema...');
  const { data: schemaData, error: schemaError } = await supabase
    .from('potensi')
    .select('*')
    .limit(1);

  if (schemaError) {
    console.error('Error fetching schema:', schemaError);
  } else if (schemaData && schemaData.length > 0) {
    const firstRecord = schemaData[0];
    console.log('Available columns in first record:');
    Object.keys(firstRecord).forEach(key => {
      console.log(`  - ${key}: ${typeof firstRecord[key]}`);
    });
  }
}

checkData().catch(console.error);
