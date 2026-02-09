const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkPriceList() {
  console.log('🔍 Checking price_list table...');
  
  try {
    // Read env file
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
    
    // Check table existence
    const { data, error } = await supabase
      .from('price_list')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying price_list:', error.message);
      
      // Try to get table structure via information schema
      console.log('\nℹ️  Trying to get table structure from information_schema...');
      const { data: columns, error: colsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'price_list')
        .eq('table_schema', 'public');
      
      if (colsError) {
        console.error('❌ Error getting column info:', colsError.message);
      } else if (columns && columns.length > 0) {
        console.log('📋 Table structure (from information_schema):');
        columns.forEach(col => {
          console.log(`   • ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
        });
      } else {
        console.log('ℹ️  Table might not exist or no columns found');
      }
      
      return;
    }
    
    console.log(`✅ price_list table exists with ${data ? data.length : 0} rows`);
    
    if (data && data.length > 0) {
      console.log('📋 First row columns:');
      const firstRow = data[0];
      Object.keys(firstRow).forEach(col => {
        const value = firstRow[col];
        console.log(`   • ${col}: ${typeof value} = ${value}`);
      });
      
      // Count total rows
      const { count } = await supabase
        .from('price_list')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Total rows in price_list: ${count}`);
      
      // Show sample data
      console.log('\n📋 Sample data (first 3 rows):');
      data.slice(0, 3).forEach((row, idx) => {
        console.log(`\nRow ${idx + 1}:`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Item Code: ${row.item_code || row.code || 'N/A'}`);
        console.log(`   Item Name: ${row.item_name || row.name || 'N/A'}`);
        console.log(`   Unit Price: ${row.unit_price || row.price || 'N/A'}`);
        console.log(`   Unit: ${row.unit || 'N/A'}`);
        console.log(`   Category: ${row.category || 'N/A'}`);
      });
    } else {
      console.log('ℹ️  Table exists but has no data');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err.stack);
  }
}

checkPriceList();