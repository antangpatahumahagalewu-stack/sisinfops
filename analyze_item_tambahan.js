const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function analyzeItemTambahan() {
  console.log('🔍 Analyzing "Item Tambahan" in price_list table...');
  
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
    
    // Query all items with "Item Tambahan" in the name
    const { data, error } = await supabase
      .from('price_list')
      .select('*')
      .like('item_name', 'Item Tambahan%')
      .order('item_name', { ascending: true });
    
    if (error) {
      console.error('❌ Error querying price_list:', error.message);
      return;
    }
    
    console.log(`📊 Found ${data.length} items with "Item Tambahan" in name`);
    
    if (data.length === 0) {
      console.log('ℹ️ No items found with "Item Tambahan" in name');
      return;
    }
    
    // Analyze by category
    const byCategory = {};
    const priceRanges = {};
    const units = {};
    
    data.forEach(item => {
      const category = item.category || 'unknown';
      const unit = item.unit || 'unknown';
      const price = item.unit_price || 0;
      
      // Count by category
      if (!byCategory[category]) {
        byCategory[category] = { count: 0, items: [] };
      }
      byCategory[category].count++;
      byCategory[category].items.push({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        unit_price: price,
        unit: unit
      });
      
      // Price ranges
      const priceRange = Math.floor(price / 10000) * 10000;
      const rangeKey = `${priceRange}-${priceRange + 9999}`;
      if (!priceRanges[rangeKey]) {
        priceRanges[rangeKey] = 0;
      }
      priceRanges[rangeKey]++;
      
      // Units
      if (!units[unit]) {
        units[unit] = 0;
      }
      units[unit]++;
    });
    
    // Print analysis
    console.log('\n📋 Analysis by Category:');
    Object.keys(byCategory).sort().forEach(category => {
      const catData = byCategory[category];
      console.log(`\n${category}: ${catData.count} items`);
      
      // Show first 3 items in this category
      catData.items.slice(0, 3).forEach(item => {
        console.log(`   • ${item.item_code}: "${item.item_name}" - ${item.unit_price} ${item.unit}`);
      });
      
      if (catData.count > 3) {
        console.log(`   ... and ${catData.count - 3} more`);
      }
    });
    
    console.log('\n💰 Price Ranges:');
    Object.keys(priceRanges).sort((a, b) => parseInt(a) - parseInt(b)).forEach(range => {
      console.log(`   • ${range}: ${priceRanges[range]} items`);
    });
    
    console.log('\n📏 Units Used:');
    Object.keys(units).sort().forEach(unit => {
      console.log(`   • ${unit}: ${units[unit]} items`);
    });
    
    // Show item name patterns
    console.log('\n🔤 Item Name Patterns:');
    const namePatterns = {};
    data.forEach(item => {
      const name = item.item_name;
      // Extract pattern like "Item Tambahan 411", "Item Tambahan 412"
      const match = name.match(/Item Tambahan\s*(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        const range = Math.floor(num / 10) * 10;
        const rangeKey = `${range}-${range + 9}`;
        if (!namePatterns[rangeKey]) {
          namePatterns[rangeKey] = 0;
        }
        namePatterns[rangeKey]++;
      } else {
        if (!namePatterns['other']) {
          namePatterns['other'] = 0;
        }
        namePatterns['other']++;
      }
    });
    
    Object.keys(namePatterns).sort().forEach(pattern => {
      console.log(`   • ${pattern}: ${namePatterns[pattern]} items`);
    });
    
    // Find items 411-500 specifically
    console.log('\n🎯 Items 411-500:');
    const targetItems = data.filter(item => {
      const match = item.item_name.match(/Item Tambahan\s*(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num >= 411 && num <= 500;
      }
      return false;
    });
    
    console.log(`Found ${targetItems.length} items in range 411-500`);
    
    if (targetItems.length > 0) {
      console.log('\nFirst 5 items in range:');
      targetItems.slice(0, 5).forEach(item => {
        console.log(`   • ${item.item_code}: "${item.item_name}" - ${item.category} - ${item.unit_price} ${item.unit}`);
      });
      
      // Show distribution by category for target items
      const targetByCategory = {};
      targetItems.forEach(item => {
        const category = item.category || 'unknown';
        if (!targetByCategory[category]) {
          targetByCategory[category] = 0;
        }
        targetByCategory[category]++;
      });
      
      console.log('\n📊 Target items by category:');
      Object.keys(targetByCategory).sort().forEach(category => {
        console.log(`   • ${category}: ${targetByCategory[category]} items`);
      });
    }
    
    // Save analysis to file for reference
    const analysis = {
      totalItems: data.length,
      byCategory,
      priceRanges,
      units,
      namePatterns,
      targetItems411_500: targetItems.length,
      targetItemsSample: targetItems.slice(0, 10).map(item => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category,
        unit: item.unit,
        unit_price: item.unit_price
      }))
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'item_tambahan_analysis.json'),
      JSON.stringify(analysis, null, 2)
    );
    
    console.log('\n💾 Analysis saved to item_tambahan_analysis.json');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err.stack);
  }
}

analyzeItemTambahan();