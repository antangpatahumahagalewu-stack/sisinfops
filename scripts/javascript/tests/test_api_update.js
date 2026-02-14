const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testAPIUpdate() {
  console.log('🔧 Testing API Update functionality...');
  
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
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Get first item from price_list
    const { data: items, error } = await supabase
      .from('price_list')
      .select('id, item_code, unit_price')
      .limit(1);
    
    if (error || !items || items.length === 0) {
      console.error('❌ No items found:', error?.message);
      return;
    }
    
    const item = items[0];
    const newPrice = item.unit_price + 1000; // Add 1000 to current price
    
    console.log(`📋 Testing update for item:`);
    console.log(`   ID: ${item.id}`);
    console.log(`   Item Code: ${item.item_code}`);
    console.log(`   Current Price: ${item.unit_price}`);
    console.log(`   New Price: ${newPrice}`);
    
    // First, let's check if table has updated_at column
    console.log('\n🔍 Checking table structure...');
    const { data: columns, error: colsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'price_list')
      .eq('table_schema', 'public');
    
    if (!colsError && columns) {
      console.log('📋 Available columns:');
      columns.forEach(col => console.log(`   • ${col.column_name} (${col.data_type})`));
    }
    
    // Try direct update via Supabase client (without API)
    console.log('\n🔄 Testing direct database update...');
    const updateData = {
      unit_price: newPrice,
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedItem, error: updateError } = await supabase
      .from('price_list')
      .update(updateData)
      .eq('id', item.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Direct update failed:', updateError.message);
      console.error('   Hint:', updateError.hint);
      console.error('   Details:', updateError.details);
      
      // Try without updated_at column
      console.log('\n🔄 Retrying without updated_at column...');
      const { data: updatedItem2, error: updateError2 } = await supabase
        .from('price_list')
        .update({ unit_price: newPrice })
        .eq('id', item.id)
        .select()
        .single();
      
      if (updateError2) {
        console.error('❌ Second attempt failed:', updateError2.message);
      } else {
        console.log('✅ Direct update successful without updated_at!');
        console.log('   Updated item:', JSON.stringify(updatedItem2, null, 2));
      }
    } else {
      console.log('✅ Direct update successful!');
      console.log('   Updated item:', JSON.stringify(updatedItem, null, 2));
    }
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const { data: verifiedItem } = await supabase
      .from('price_list')
      .select('unit_price')
      .eq('id', item.id)
      .single();
    
    if (verifiedItem && verifiedItem.unit_price === newPrice) {
      console.log(`✅ Price successfully updated from ${item.unit_price} to ${verifiedItem.unit_price}`);
    } else {
      console.log(`❌ Price not updated. Current: ${verifiedItem?.unit_price}, Expected: ${newPrice}`);
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err.stack);
  }
}

testAPIUpdate();
