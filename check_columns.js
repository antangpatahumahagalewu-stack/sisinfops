const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkColumns() {
  console.log('🔍 Checking price_list table columns...');
  
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
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Get all columns from information_schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'price_list')
      .eq('table_schema', 'public')
      .order('ordinal_position', { ascending: true });
    
    if (error) {
      console.error('❌ Error getting columns:', error.message);
      return;
    }
    
    console.log('📋 Current price_list table structure:');
    console.log('=========================================');
    columns.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    console.log('\n🔍 Checking for specific columns:');
    console.log('=========================================');
    
    const checkColumns = [
      'item_category', 'validity_start', 'validity_until', 'version', 
      'approval_status', 'created_by', 'approved_by', 'updated_at',
      'category', 'valid_from', 'valid_until'
    ];
    
    checkColumns.forEach(col => {
      const exists = columns.some(c => c.column_name === col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });
    
    console.log('\n📊 Summary:');
    console.log('=========================================');
    
    const oldColumnsExist = columns.some(c => ['category', 'valid_from', 'valid_until'].includes(c.column_name));
    const newColumnsExist = columns.some(c => ['item_category', 'validity_start', 'validity_until'].includes(c.column_name));
    
    if (oldColumnsExist && !newColumnsExist) {
      console.log('📌 Status: Database uses OLD column names (category, valid_from, valid_until)');
      console.log('   → API/Frontend are compatible');
      console.log('   → Migration has NOT been applied or used different names');
    } else if (!oldColumnsExist && newColumnsExist) {
      console.log('📌 Status: Database uses NEW column names (item_category, validity_start, validity_until)');
      console.log('   → API/Frontend need updating');
      console.log('   → Migration has been applied');
    } else if (oldColumnsExist && newColumnsExist) {
      console.log('📌 Status: Database has BOTH old and new columns');
      console.log('   → Data duplication possible');
      console.log('   → Need to choose which to use');
    } else {
      console.log('📌 Status: Neither old nor new columns exist (unexpected)');
    }
    
    // Get sample data to see values
    console.log('\n🔍 Sample data (first row):');
    const { data: sample } = await supabase
      .from('price_list')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      const row = sample[0];
      console.log('=========================================');
      Object.keys(row).forEach(key => {
        console.log(`   ${key}: ${row[key]}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

checkColumns();
