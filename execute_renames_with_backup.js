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
    
    console.log('🔒 Creating backup of current data...');
    
    // First, backup current data
    const { data: currentData, error: fetchError } = await supabase
      .from('price_list')
      .select('*')
      .in('id', updates.map(u => u.id));
    
    if (fetchError) {
      console.error('❌ Failed to fetch current data for backup:', fetchError.message);
      return;
    }
    
    const backupFile = path.join(__dirname, `price_list_backup_${Date.now()}.json`);
    fs.writeFileSync(
      backupFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        total_items: currentData.length,
        items: currentData
      }, null, 2)
    );
    
    console.log(`✅ Backup saved to ${backupFile}`);
    console.log(`🔄 Executing ${updates.length} updates...`);
    
    let successCount = 0;
    let errorCount = 0;
    const failedUpdates = [];
    
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
          failedUpdates.push({
            ...update,
            error: error.message
          });
        } else {
          console.log(`✅ Updated ${update.item_code}: "${update.original_name}" → "${update.new_name}"`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error(`❌ Error updating ${update.item_code}: ${err.message}`);
        errorCount++;
        failedUpdates.push({
          ...update,
          error: err.message
        });
      }
    }
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Failed: ${errorCount}`);
    console.log(`   • Total: ${updates.length}`);
    
    // Save update report
    const reportFile = path.join(__dirname, 'rename_execution_report.json');
    fs.writeFileSync(
      reportFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        total_updates: updates.length,
        successful: successCount,
        failed: errorCount,
        backup_file: backupFile,
        failed_updates: failedUpdates
      }, null, 2)
    );
    
    console.log(`📋 Execution report saved to ${reportFile}`);
    
    if (failedUpdates.length > 0) {
      console.log('\n❌ Failed updates:');
      failedUpdates.forEach(failed => {
        console.log(`   • ${failed.item_code}: ${failed.error}`);
      });
    }
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const { data: verifiedData, error: verifyError } = await supabase
      .from('price_list')
      .select('id, item_code, item_name')
      .in('id', updates.map(u => u.id));
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    } else {
      const verifiedMap = new Map(verifiedData.map(item => [item.id, item.item_name]));
      let correctCount = 0;
      let incorrectCount = 0;
      
      for (const update of updates) {
        const actualName = verifiedMap.get(update.id);
        if (actualName === update.new_name) {
          correctCount++;
        } else {
          incorrectCount++;
          if (actualName === update.original_name) {
            console.log(`   ❌ ${update.item_code}: Not updated (still "${actualName}")`);
          } else {
            console.log(`   ❌ ${update.item_code}: Wrong name ("${actualName}" instead of "${update.new_name}")`);
          }
        }
      }
      
      console.log(`\n✅ Verification:`);
      console.log(`   • Correctly updated: ${correctCount}`);
      console.log(`   • Incorrect: ${incorrectCount}`);
    }
    
  } catch (err) {
    console.error('❌ Execution error:', err.message);
    console.error(err.stack);
  }
}

// Execute immediately
console.log('🚀 Starting rename execution...');
console.log('⏰ Started at:', new Date().toISOString());
console.log('====================================');
executeRenames().then(() => {
  console.log('====================================');
  console.log('🏁 Execution completed at:', new Date().toISOString());
  console.log('\n📋 Next steps:');
  console.log('   1. Check the application at http://localhost:3001/id/dashboard/finance/price-list');
  console.log('   2. Verify all items have meaningful names');
  console.log('   3. Review backup and report files if needed');
});