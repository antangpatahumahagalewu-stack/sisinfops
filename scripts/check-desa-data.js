const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function checkDesaData() {
  console.log('Checking perhutanan_sosial table for empty desa...');

  // Get total count
  const { count, error: countError } = await supabase
    .from('perhutanan_sosial')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error getting total count:', countError);
    return;
  }

  console.log(`Total records: ${count}`);

  // Get records with empty desa
  const { data: emptyDesaData, error: emptyError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, desa, kecamatan, kabupaten_id')
    .or('desa.is.null,desa.eq.');

  if (emptyError) {
    console.error('Error fetching empty desa records:', emptyError);
    return;
  }

  console.log(`\nRecords with empty desa: ${emptyDesaData.length}`);
  
  if (emptyDesaData.length > 0) {
    console.log('\nFirst 10 records with empty desa:');
    emptyDesaData.slice(0, 10).forEach((record, index) => {
      console.log(`${index + 1}. ${record.pemegang_izin} - Desa: "${record.desa}" - Kecamatan: "${record.kecamatan}"`);
    });

    // Also check if kecamatan is empty
    const emptyKecamatan = emptyDesaData.filter(r => !r.kecamatan || r.kecamatan.trim() === '');
    console.log(`\nRecords with empty kecamatan: ${emptyKecamatan.length}`);
  }

  // Get some sample records with desa filled
  const { data: filledDesaData, error: filledError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, desa, kecamatan')
    .not('desa', 'is', null)
    .not('desa', 'eq', '')
    .limit(5);

  if (filledError) {
    console.error('Error fetching filled desa records:', filledError);
    return;
  }

  console.log(`\nSample records with desa filled (${filledDesaData.length} total):`);
  filledDesaData.forEach((record, index) => {
    console.log(`${index + 1}. ${record.pemegang_izin} - Desa: "${record.desa}" - Kecamatan: "${record.kecamatan}"`);
  });

  // Check kabupaten mapping
  const { data: kabupatenData, error: kabError } = await supabase
    .from('kabupaten')
    .select('id, nama');

  if (kabError) {
    console.error('Error fetching kabupaten:', kabError);
    return;
  }

  console.log(`\nKabupaten mapping:`);
  kabupatenData.forEach(k => {
    console.log(`  ${k.id}: ${k.nama}`);
  });
}

checkDesaData().catch(console.error);