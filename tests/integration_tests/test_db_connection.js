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

console.log('Testing database connection with service role key...');
console.log('URL:', supabaseUrl);
console.log('Service key present:', supabaseServiceKey ? 'Yes' : 'No');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('\n--- Testing Connection ---');
  
  try {
    // Test 1: Basic query to check connection
    console.log('Test 1: Basic connection test...');
    const { data: testData, error: testError } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);
    
    if (testError && testError.message.includes('does not exist')) {
      console.log('✅ Connection successful (expected error for non-existent table)');
    } else if (testError) {
      console.log('❌ Connection error:', testError.message);
    } else {
      console.log('✅ Connection successful');
    }
  } catch (err) {
    console.log('❌ Connection test failed:', err.message);
  }
  
  // Test 2: Check if tables exist (using information_schema)
  console.log('\nTest 2: Checking table existence...');
  
  const tablesToCheck = ['kabupaten', 'perhutanan_sosial', 'potensi', 'profiles', 'role_permissions'];
  
  for (const table of tablesToCheck) {
    try {
      // Try to query the table directly
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table}: Table does not exist`);
        } else if (error.message.includes('permission denied')) {
          console.log(`⚠️ ${table}: Table exists but permission denied (RLS active)`);
        } else {
          console.log(`❌ ${table}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}: Exists (${data.count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // Test 3: Check auth users (requires admin access)
  console.log('\nTest 3: Checking auth users (admin access required)...');
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log(`⚠️ Cannot list users: ${authError.message}`);
    } else {
      console.log(`✅ Found ${authData.users.length} auth users`);
      if (authData.users.length > 0) {
        console.log('Sample users:');
        authData.users.slice(0, 3).forEach(user => {
          console.log(`  - ${user.email} (${user.id})`);
        });
      }
    }
  } catch (err) {
    console.log(`❌ Auth check failed: ${err.message}`);
  }
  
  // Test 4: Try to query information_schema (direct SQL if possible)
  console.log('\nTest 4: Checking all public tables...');
  try {
    // Try to use rpc to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name" 
    });
    
    if (error) {
      if (error.message.includes('function exec_sql')) {
        console.log('ℹ️ exec_sql function not available for direct SQL queries');
      } else {
        console.log(`❌ Information schema query failed: ${error.message}`);
      }
    } else {
      console.log('Public tables:');
      data.forEach(row => console.log(`  - ${row.table_name}`));
    }
  } catch (err) {
    console.log(`❌ Information schema query error: ${err.message}`);
  }
  
  console.log('\n--- Summary ---');
  console.log('1. Jika tabel tidak ada ("does not exist"): Jalankan setup_database_complete.sql di Supabase SQL Editor');
  console.log('2. Jika "permission denied": Tabel ada tapi RLS aktif - ini normal setelah setup');
  console.log('3. Jika tidak ada auth users: Anda perlu sign up user terlebih dahulu');
  console.log('\nLangkah selanjutnya: Ikuti instruksi di INSTRUKSI_SETUP_DATABASE.md');
}

testConnection().catch(console.error);