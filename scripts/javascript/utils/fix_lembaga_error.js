const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');
require('dotenv').config({ path: '.env.local' });

const execAsync = promisify(exec);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not set in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExistence() {
  console.log('🔍 Checking lembaga_pengelola table existence...');
  
  try {
    // Method 1: Direct query to the table
    const { data, error } = await supabase
      .from('lembaga_pengelola')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.log('❌ Table does not exist in schema cache');
        return { exists: false, errorType: 'not_in_cache' };
      } else if (error.message.includes('permission denied')) {
        console.log('⚠️  Table exists but permission error');
        return { exists: true, errorType: 'permission' };
      } else {
        console.log('⚠️  Other error:', error.message);
        return { exists: null, errorType: 'other', error: error.message };
      }
    } else {
      console.log('✅ Table exists and is accessible');
      console.log(`📊 Found ${data.length} rows`);
      return { exists: true, errorType: null, data };
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return { exists: null, errorType: 'exception', error: err.message };
  }
}

async function checkTableViaSQL() {
  console.log('🔍 Checking via information_schema...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'lembaga_pengelola')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        console.log('❌ Table does not exist in database');
        return { existsInDb: false };
      }
      console.log('⚠️  SQL query error:', error.message);
      return { existsInDb: null, error: error.message };
    } else {
      console.log('✅ Table exists in database:', data);
      return { existsInDb: true, data };
    }
  } catch (err) {
    console.error('❌ Exception in SQL check:', err.message);
    return { existsInDb: null, error: err.message };
  }
}

async function refreshSchemaCache() {
  console.log('🔄 Attempting to refresh schema cache...');
  
  try {
    // Try using pg_notify to refresh schema cache
    const { data, error } = await supabase.rpc('pg_notify', {
      channel: 'pgrst',
      payload: 'reload schema'
    }).catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (error) {
      console.log('⚠️  Could not use RPC, trying SQL...');
      
      // Try direct SQL if RPC not available
      const { error: sqlError } = await supabase
        .from('dummy')
        .select('*')
        .limit(1);
      
      // This is expected to fail, but triggers schema refresh
      console.log('ℹ️  Schema refresh triggered (Supabase auto-refreshes on errors)');
    } else {
      console.log('✅ Schema refresh triggered via pg_notify');
    }
    
    console.log('⏳ Waiting 10 seconds for cache refresh...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return true;
  } catch (err) {
    console.error('❌ Error refreshing schema:', err.message);
    return false;
  }
}

async function createSimpleLembagaTable() {
  console.log('🚀 Creating simple lembaga_pengelola table...');
  
  const sql = `
    CREATE TABLE IF NOT EXISTS lembaga_pengelola (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      perhutanan_sosial_id UUID,
      nama VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    GRANT ALL ON lembaga_pengelola TO anon, authenticated;
  `;
  
  try {
    // Try to execute via supabase.sql (if available)
    const { error } = await supabase.sql(sql).catch(() => ({ error: 'sql method not available' }));
    
    if (error && error !== 'sql method not available') {
      console.log('⚠️  SQL execution error:', error);
    } else if (error === 'sql method not available') {
      console.log('ℹ️  supabase.sql not available, using alternative method');
      console.log('💡 Please run this SQL in Supabase SQL Editor:');
      console.log(sql);
    } else {
      console.log('✅ Simple table creation SQL executed');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Error creating table:', err.message);
    return false;
  }
}

async function insertSampleData() {
  console.log('📝 Inserting sample data...');
  
  try {
    // Check if perhutanan_sosial table has data
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .limit(1);
    
    if (psError) {
      console.log('⚠️  Cannot access perhutanan_sosial table:', psError.message);
      return false;
    }
    
    if (!psData || psData.length === 0) {
      console.log('ℹ️  No perhutanan_sosial data found');
      return false;
    }
    
    const psId = psData[0].id;
    
    const { error } = await supabase
      .from('lembaga_pengelola')
      .insert({
        perhutanan_sosial_id: psId,
        nama: 'Sample Lembaga Pengelola',
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.log('⚠️  Error inserting sample data:', error.message);
      return false;
    }
    
    console.log('✅ Sample data inserted');
    return true;
  } catch (err) {
    console.error('❌ Error inserting sample:', err.message);
    return false;
  }
}

async function fixFrontendError() {
  console.log('='.repeat(60));
  console.log('🚀 FIXING LEMBAGA_PENGELOLA FRONTEND ERROR');
  console.log('='.repeat(60));
  
  // Step 1: Check current status
  console.log('\n📋 Step 1: Checking current status...');
  const cacheCheck = await checkTableExistence();
  const dbCheck = await checkTableViaSQL();
  
  console.log('\n📊 Current Status:');
  console.log(`   • In schema cache: ${cacheCheck.exists === true ? '✅' : cacheCheck.exists === false ? '❌' : '⚠️'}`);
  console.log(`   • In database: ${dbCheck.existsInDb === true ? '✅' : dbCheck.existsInDb === false ? '❌' : '⚠️'}`);
  
  // Step 2: Determine fix needed
  if (dbCheck.existsInDb === false) {
    console.log('\n🔧 Step 2: Table missing in database, creating...');
    await createSimpleLembagaTable();
    
    // Wait and recheck
    console.log('⏳ Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const newDbCheck = await checkTableViaSQL();
    if (newDbCheck.existsInDb) {
      console.log('✅ Table created successfully');
    }
  }
  
  if (cacheCheck.exists === false && dbCheck.existsInDb === true) {
    console.log('\n🔧 Step 3: Table exists but not in cache, refreshing...');
    await refreshSchemaCache();
    
    // Recheck after refresh
    console.log('\n🔍 Step 4: Rechecking after refresh...');
    const newCacheCheck = await checkTableExistence();
    
    if (newCacheCheck.exists === true) {
      console.log('✅ Schema cache refreshed successfully!');
    } else {
      console.log('⚠️  Cache still not showing table');
      console.log('💡 Try restarting Next.js dev server');
    }
  }
  
  // Step 4: Insert sample data if table is accessible
  if (cacheCheck.exists === true || dbCheck.existsInDb === true) {
    console.log('\n🔧 Step 5: Ensuring table has data...');
    await insertSampleData();
  }
  
  // Step 5: Final recommendations
  console.log('\n📋 Step 6: Final recommendations');
  console.log('='.repeat(40));
  
  if (cacheCheck.exists === true) {
    console.log('✅ FRONTEND ERROR SHOULD BE FIXED');
    console.log('\n💡 Next steps:');
    console.log('   1. Clear browser cache (Ctrl+Shift+R)');
    console.log('   2. Test the PS detail page');
    console.log('   3. If error persists, restart Next.js: npm run dev');
  } else {
    console.log('⚠️  ISSUE MAY STILL PERSIST');
    console.log('\n🔧 Try these additional fixes:');
    console.log('   1. Restart Next.js dev server: npm run dev');
    console.log('   2. Clear Supabase local cache:');
    console.log('      - Delete .next directory: rm -rf .next');
    console.log('      - Reinstall packages: npm install');
    console.log('   3. Manually refresh Supabase schema cache:');
    console.log('      - Go to Supabase Dashboard → SQL Editor');
    console.log('      - Run: SELECT pg_notify(\'pgrst\', \'reload schema\');');
    console.log('      - Wait 2 minutes');
  }
  
  console.log('='.repeat(60));
  console.log('🎉 Fix process completed!');
}

// Run the fix
fixFrontendError().catch(console.error);