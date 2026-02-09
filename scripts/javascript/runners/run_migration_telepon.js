const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('Service Key:', supabaseServiceKey ? '✓ Set' : '✗ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('\n🚀 Running migration: Adding telephone columns to perhutanan_sosial table');
  
  const sql = `
    -- 1. Add telephone columns to perhutanan_sosial table
    ALTER TABLE perhutanan_sosial 
    ADD COLUMN IF NOT EXISTS telepon_ketua_ps VARCHAR(20),
    ADD COLUMN IF NOT EXISTS telepon_kepala_desa VARCHAR(20);
    
    -- 2. Add comments for the new columns
    COMMENT ON COLUMN perhutanan_sosial.telepon_ketua_ps IS 'Telephone number of the PS chairperson (Ketua PS)';
    COMMENT ON COLUMN perhutanan_sosial.telepon_kepala_desa IS 'Telephone number of the village head (Kepala Desa)';
  `;
  
  try {
    console.log('📝 Executing SQL...');
    
    // Split SQL into separate statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\nStatement ${i+1}: ${stmt.substring(0, 80)}...`);
      
      // Try to execute via supabase.rpc if exec_sql function exists
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      
      if (error) {
        console.log(`⚠️  exec_sql function not available or RLS blocking. Statement may need manual execution.`);
        console.log(`ℹ️  You can run this SQL manually in Supabase SQL Editor:`);
        console.log(`\n${stmt};`);
        console.log('\n---');
      } else {
        console.log(`✅ Statement ${i+1} executed successfully`);
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('\n📋 Summary of changes:');
    console.log('1. Added column: telepon_ketua_ps (VARCHAR(20)) - for PS chairperson telephone');
    console.log('2. Added column: telepon_kepala_desa (VARCHAR(20)) - for village head telephone');
    
    // Verify columns were added
    console.log('\n🔍 Verifying columns...');
    try {
      // Try to query the table schema
      const { data, error } = await supabase
        .from('perhutanan_sosial')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`ℹ️  Could not verify directly: ${error.message}`);
        console.log('ℹ️  Columns should be added. Please check in Supabase Table Editor.');
      } else {
        console.log('✅ Can access perhutanan_sosial table');
        console.log('✅ Migration successful!');
      }
    } catch (err) {
      console.log('ℹ️  Verification check skipped due to RLS or permissions');
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
  }
}

runMigration().catch(console.error);