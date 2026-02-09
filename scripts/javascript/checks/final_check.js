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

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 FINAL CHECK: LEMBAGA_PENGELOLA TABLE STATUS');
  console.log('='.repeat(60));
  
  console.log('\n1️⃣ Checking if table exists and is queryable...');
  const { data, error } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .limit(10);
  
  if (error) {
    console.log('❌ ERROR:', error.message);
    
    if (error.message.includes('Could not find the table')) {
      console.log('\n🔴 CRITICAL: Table still not found in schema cache.');
      console.log('   The migration may not have propagated.');
      console.log('\n💡 Solutions:');
      console.log('   1. Wait 1-2 minutes for Supabase cache refresh');
      console.log('   2. Run: SELECT pg_notify(\'pgrst\', \'reload schema\'); in Supabase SQL Editor');
      console.log('   3. Restart Next.js dev server');
    } else {
      console.log('\n⚠️  Other error but table exists:', error.message);
      console.log('   This means the table IS in schema cache.');
    }
  } else {
    console.log(`✅ SUCCESS: Table exists and is queryable!`);
    console.log(`   Found ${data.length} rows in lembaga_pengelola table.`);
    
    if (data.length > 0) {
      console.log('\n📋 Data sample:');
      data.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.nama} (PS ID: ${row.perhutanan_sosial_id})`);
        console.log(`      Ketua: ${row.ketua}, Anggota: ${row.jumlah_anggota}`);
      });
    } else {
      console.log('\nℹ️  Table is empty. This is normal - data will be added via frontend.');
    }
  }
  
  console.log('\n2️⃣ Testing the exact error scenario from frontend...');
  console.log('   (Querying with non-existent psId should give PGRST116, not "table not found")');
  
  const fakePsId = '00000000-0000-0000-0000-000000000000';
  const { error: singleError } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', fakePsId)
    .single();
  
  if (singleError) {
    if (singleError.code === 'PGRST116') {
      console.log('✅ CORRECT: Got PGRST116 (no rows) instead of "table not found"');
      console.log('   This means the table EXISTS and is queryable!');
      console.log('   The frontend error "Could not find the table" is FIXED!');
    } else if (singleError.message.includes('Could not find the table')) {
      console.log('❌ WRONG: Still getting "table not found" error');
      console.log('   The table is not in schema cache yet.');
    } else {
      console.log('✅ OK: Other error but table exists:', singleError.message);
    }
  } else {
    console.log('✅ Table exists and returned data (unlikely for fake ID)');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL VERDICT');
  console.log('='.repeat(60));
  
  if (!error) {
    console.log('🎉 SUCCESS: The lembaga_pengelola table has been created!');
    console.log('\n💡 The original error "Could not find the table \'public.lembaga_pengelola\'"');
    console.log('   has been RESOLVED. The frontend can now query this table.');
    console.log('\n⚠️  Important: The Next.js dev server may need to be restarted');
    console.log('   to pick up the new schema cache. Current server PID:', process.pid);
    console.log('\n📋 To restart:');
    console.log('   1. Press Ctrl+C in the terminal running "npm run dev"');
    console.log('   2. Run: npm run dev');
    console.log('   3. Clear browser cache and test a PS detail page');
  } else if (error && !error.message.includes('Could not find the table')) {
    console.log('⚠️  PARTIAL SUCCESS: Table exists but has other issues');
    console.log('   The "table not found" error is fixed, but there are other issues.');
  } else {
    console.log('❌ FAILURE: Table still not accessible');
    console.log('   Wait a few minutes for Supabase cache refresh, then restart server.');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);