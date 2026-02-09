const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

console.log('Using Supabase URL:', supabaseUrl);
console.log('Service key present:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Starting migration...\n');
  
  try {
    // Baca file migrasi
    const migrationPath = path.join(__dirname, 'supabase/migrations/202601291247_create_tables_simple.sql');
    console.log('Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      console.error('Migration file not found');
      return;
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    console.log('Migration file size:', sqlContent.length, 'bytes');
    
    // Split SQL statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log('Found', statements.length, 'SQL statements');
    
    // Jalankan setiap statement menggunakan rpc exec_sql jika ada
    // Atau coba dengan supabase.auth.admin jika perlu
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\n--- Statement ${i+1}/${statements.length} ---`);
      console.log(stmt.substring(0, 150) + (stmt.length > 150 ? '...' : ''));
      
      try {
        // Coba jalankan menggunakan supabase.rpc jika fungsi exec_sql ada
        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
        
        if (error) {
          if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
            console.log('exec_sql function not available, trying direct connection...');
            // Fallback: coba dengan supabase.auth.admin atau query langsung
            console.log('This statement requires direct database access.');
            console.log('You may need to run this in Supabase SQL Editor manually.');
          } else {
            console.error('Error:', error.message);
          }
        } else {
          console.log('✅ Statement executed');
        }
      } catch (err) {
        console.error('Execution error:', err.message);
      }
    }
    
    console.log('\nMigration process completed.');
    
    // Verifikasi tabel dibuat
    console.log('\n--- Verifying tables ---');
    await verifyTables();
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function verifyTables() {
  const tables = ['kabupaten', 'perhutanan_sosial', 'potensi', 'profiles', 'role_permissions'];
  
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
}

// Jalankan migrasi
runMigration().catch(console.error);