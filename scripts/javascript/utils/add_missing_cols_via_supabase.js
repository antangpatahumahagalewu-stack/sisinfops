const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function addMissingColumns() {
  console.log('🚀 Adding missing columns to price_list table via Supabase JS');
  
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    let supabaseUrl = '';
    let serviceRoleKey = '';
    
    envContent.split('\n').forEach(line => {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
      }
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        serviceRoleKey = line.split('=')[1].trim().replace(/['"]/g, '');
      }
    });
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase configuration');
      return;
    }
    
    console.log('✅ Supabase URL:', supabaseUrl.substring(0, 30) + '...');
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    console.log('🔍 Checking current columns...');
    
    // Get sample data to see current structure
    const { data: sample } = await supabase
      .from('price_list')
      .select('*')
      .limit(1);
    
    if (!sample || sample.length === 0) {
      console.log('ℹ️  No data in price_list table');
    } else {
      console.log('📋 Current columns (from sample data):');
      Object.keys(sample[0]).forEach(col => {
        console.log(`   • ${col}: ${typeof sample[0][col]}`);
      });
    }
    
    // Try to add missing columns using SQL execution via Supabase
    console.log('\n🔄 Attempting to add missing columns...');
    
    // We'll try to add columns one by one with error handling
    const columnsToAdd = [
      { name: 'updated_at', sql: 'ALTER TABLE price_list ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
      { name: 'version', sql: 'ALTER TABLE price_list ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1' },
      { name: 'approval_status', sql: 'ALTER TABLE price_list ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT \'APPROVED\'' },
      { name: 'created_by', sql: 'ALTER TABLE price_list ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id)' },
      { name: 'approved_by', sql: 'ALTER TABLE price_list ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id)' }
    ];
    
    // Note: We CANNOT execute DDL via Supabase JS client directly
    // We need to use the REST API with RPC or use direct SQL
    // Let's try a different approach - check if we can use rpc
    console.log('⚠️  Cannot execute DDL via Supabase JS client directly.');
    console.log('   Need to use Supabase Dashboard SQL Editor or direct connection.');
    
    // Alternative: Use Supabase Management API or just report what's missing
    console.log('\n📋 Summary of what needs to be added:');
    columnsToAdd.forEach(col => {
      console.log(`   • ${col.name}`);
    });
    
    console.log('\n🔧 Next steps:');
    console.log('   1. Open Supabase Dashboard (https://supabase.com/dashboard)');
    console.log('   2. Go to your project: saelrsljpneclsbfdxfy');
    console.log('   3. Open SQL Editor');
    console.log('   4. Run the SQL in add_missing_columns.sql file');
    console.log('   5. OR ask for database credentials to run script directly');
    
    // Check if we can at least verify current structure via information_schema
    try {
      console.log('\n🔍 Trying to get column info via rpc...');
      // This won't work for DDL but we can try to query
      const { data, error } = await supabase
        .from('price_list')
        .select('*')
        .limit(0); // Just get column info
        
      if (error) {
        console.log('❌ Error:', error.message);
      } else {
        console.log('✅ Can query price_list table');
      }
    } catch (err) {
      console.log('ℹ️  Cannot execute SQL via JS client');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err.stack);
  }
}

addMissingColumns();
