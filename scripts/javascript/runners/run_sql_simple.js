const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');

// Load environment variables dari .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQLFile(filePath) {
  try {
    console.log(`📄 Reading SQL file: ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log(`🚀 Executing SQL...`);
    console.log('='.repeat(80));
    
    // Split SQL by statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\n📝 Statement ${i+1}/${statements.length}:`);
      console.log(stmt.substring(0, 200) + (stmt.length > 200 ? '...' : ''));
      
      try {
        // Gunakan supabase.rpc untuk execute SQL langsung
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt });
        
        if (error) {
          console.error(`❌ Error executing statement ${i+1}:`, error.message);
          
          // Coba alternatif: mungkin fungsi exec_sql tidak ada
          // Coba jalankan dengan cara lain
          console.log('⚠️  Trying alternative execution method...');
          
          // Untuk beberapa operasi DDL, mungkin perlu menggunakan supabase.auth.admin
          // Tapi untuk sekarang kita skip atau coba pendekatan berbeda
          if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
            console.log('ℹ️  exec_sql function not available. Some statements may require direct database access.');
            console.log('ℹ️  You may need to run this SQL in Supabase SQL Editor manually.');
          }
        } else {
          console.log(`✅ Statement ${i+1} executed successfully`);
          if (data) {
            console.log('📊 Result:', JSON.stringify(data, null, 2));
          }
        }
      } catch (err) {
        console.error(`❌ Unexpected error in statement ${i+1}:`, err.message);
      }
      
      // Tunggu sebentar antara statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 SQL execution completed');
    
  } catch (error) {
    console.error('❌ Failed to run SQL file:', error.message);
    process.exit(1);
  }
}

async function checkDatabase() {
  console.log('🔍 Checking database connection and existing data...\n');
  
  try {
    // Cek apakah tabel perhutanan_sosial ada
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('count', { count: 'exact', head: true });
    
    if (psError) {
      console.log('ℹ️  perhutanan_sosial table may not exist or RLS blocking access');
    } else {
      console.log(`✅ perhutanan_sosial table exists (${psData.count} rows)`);
    }
    
    // Cek profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .limit(5);
    
    if (profilesError) {
      console.log('ℹ️  Error accessing profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profilesData.length} profiles`);
      profilesData.forEach(p => {
        console.log(`   - ${p.full_name || 'No name'}: ${p.role || 'No role'}`);
      });
    }
    
    // Cek role_permissions
    const { data: rolesData, error: rolesError } = await supabase
      .from('role_permissions')
      .select('*');
    
    if (rolesError) {
      console.log('ℹ️  role_permissions table may not exist:', rolesError.message);
    } else {
      console.log(`✅ Found ${rolesData.length} roles in role_permissions`);
    }
    
  } catch (error) {
    console.error('Error checking database:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node run_sql_simple.js <sql_file>');
    console.log('Example: node run_sql_simple.js implement_user_roles.sql');
    console.log('\nOr run check: node run_sql_simple.js check');
    process.exit(1);
  }
  
  if (args[0] === 'check') {
    await checkDatabase();
  } else {
    await runSQLFile(args[0]);
  }
}

main().catch(console.error);