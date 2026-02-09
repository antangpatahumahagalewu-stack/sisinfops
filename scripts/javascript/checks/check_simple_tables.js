const { createClient } = require('@supabase/supabase-js');

// Load env dari .env.local
const fs = require('fs');
const path = require('path');

// Baca .env.local
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
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTU4NDUsImV4cCI6MjA4MzIzMTg0NX0.6FU748Mff9v4tWLRLvXnD4xRCdcpSh14icYvtr2-OLs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking database tables...\n');
  
  const tables = [
    'kabupaten',
    'perhutanan_sosial', 
    'potensi',
    'profiles',
    'role_permissions'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${data.count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // Cek apakah ada data di kabupaten
  console.log('\nChecking kabupaten data...');
  try {
    const { data, error } = await supabase
      .from('kabupaten')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log(`Error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`Found ${data.length} kabupaten:`);
      data.forEach(k => console.log(`  - ${k.nama} (${k.id})`));
    } else {
      console.log('No kabupaten data found');
    }
  } catch (err) {
    console.log(`Error checking kabupaten: ${err.message}`);
  }
}

checkTables().catch(console.error);