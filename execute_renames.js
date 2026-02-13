
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function executeRenames() {
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
    
    // Load updates
    const updatesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'rename_updates.json'), 'utf8'));
    const updates = updatesData.updates;
    
    console.log('🔄 Executing 90 updates...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const update of updates) {
      try {
        const { error } = await supabase
          .from('price_list')
          .update({ 
            item_name: update.new_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (error) {
          console.error(`❌ Failed to update ${update.item_code}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Updated ${update.item_code}: "${update.original_name}" → "${update.new_name}"`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`❌ Error updating ${update.item_code}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Failed: ${errorCount}`);
    console.log(`   • Total: ${updates.length}`);
    
  } catch (err) {
    console.error('❌ Execution error:', err.message);
  }
}

// Uncomment to execute
// executeRenames();
