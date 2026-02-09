const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

console.log('🔧 Supabase URL:', supabaseUrl.substring(0, 20) + '...');
console.log('✅ Environment variables loaded');

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable() {
  console.log('\n🔍 Verifying lembaga_pengelola table...');
  
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('lembaga_pengelola')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying table:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      return false;
    }
    
    console.log(`✅ Table query successful! Found ${data.length} rows`);
    
    if (data.length > 0) {
      console.log('📋 Sample data:');
      data.forEach((row, i) => {
        console.log(`   ${i + 1}. ID: ${row.id}`);
        console.log(`      Nama: ${row.nama}`);
        console.log(`      Ketua: ${row.ketua}`);
        console.log(`      Jumlah Anggota: ${row.jumlah_anggota}`);
        console.log(`      PS ID: ${row.perhutanan_sosial_id}`);
      });
    } else {
      console.log('ℹ️  Table is empty (this is normal for new table)');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function testFrontendQuery() {
  console.log('\n🔍 Testing frontend-style query...');
  
  try {
    // Query similar to what frontend does (with .single())
    const { data, error } = await supabase
      .from('lembaga_pengelola')
      .select('*')
      .eq('perhutanan_sosial_id', '00000000-0000-0000-0000-000000000000') // Non-existent ID
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Frontend query pattern works (no rows found for non-existent ID)');
        console.log('   Error code PGRST116 is expected for .single() with no results');
        return true;
      } else {
        console.error('❌ Unexpected error:', error.message);
        console.error('   Code:', error.code);
        return false;
      }
    }
    
    console.log('✅ Frontend query works!');
    return true;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function checkSchemaCache() {
  console.log('\n🔍 Checking if table exists in schema cache...');
  
  try {
    // Try to get table schema info
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'lembaga_pengelola')
      .single();
    
    if (error) {
      console.error('❌ Error checking schema:', error.message);
      return false;
    }
    
    if (data) {
      console.log(`✅ Table exists in database: ${data.tablename}`);
      return true;
    } else {
      console.log('❌ Table not found in pg_tables');
      return false;
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 VERIFYING LEMBAGA_PENGELOLA TABLE FIX');
  console.log('='.repeat(60));
  
  const results = {
    tableQuery: await verifyTable(),
    frontendQuery: await testFrontendQuery(),
    schemaCache: await checkSchemaCache(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n🎉 The lembaga_pengelola table is now available.');
    console.log('   The frontend error "Could not find the table" should be resolved.');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart Next.js server if needed: npm run dev');
    console.log('   2. Clear browser cache');
    console.log('   3. Visit a PS detail page to verify');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\n🔧 Issues to investigate:');
    if (!results.tableQuery) console.log('   • Direct table query failed');
    if (!results.frontendQuery) console.log('   • Frontend-style query failed');
    if (!results.schemaCache) console.log('   • Table not in schema cache');
    console.log('\n💡 Try refreshing Supabase schema cache manually:');
    console.log('   1. Go to Supabase Dashboard');
    console.log('   2. Open SQL Editor');
    console.log('   3. Run: SELECT pg_notify(\'pgrst\', \'reload schema\');');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);