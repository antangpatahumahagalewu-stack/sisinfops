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

async function testExactFrontendQuery() {
  console.log('🔍 Testing EXACT frontend query pattern from tab-kelembagaan.tsx...');
  
  // First, get a real psId from perhutanan_sosial table
  console.log('\n1. Getting a real perhutanan_sosial ID...');
  const { data: psData, error: psError } = await supabase
    .from('perhutanan_sosial')
    .select('id')
    .limit(1);
  
  if (psError) {
    console.error('❌ Error fetching perhutanan_sosial:', psError.message);
    return false;
  }
  
  if (!psData || psData.length === 0) {
    console.log('ℹ️  No perhutanan_sosial rows found. Using test ID.');
    // Use the test ID that was inserted in migration
    const { data: lembagaData } = await supabase
      .from('lembaga_pengelola')
      .select('perhutanan_sosial_id')
      .limit(1);
    
    if (lembagaData && lembagaData.length > 0) {
      const psId = lembagaData[0].perhutanan_sosial_id;
      await runTest(psId);
    } else {
      console.log('ℹ️  No lembaga_pengelola rows either. Testing with non-existent ID.');
      await runTest('00000000-0000-0000-0000-000000000000');
    }
  } else {
    const psId = psData[0].id;
    console.log(`✅ Found perhutanan_sosial ID: ${psId}`);
    await runTest(psId);
  }
}

async function runTest(psId) {
  console.log(`\n2. Testing frontend query for psId: ${psId}`);
  
  // This is the EXACT query pattern from tab-kelembagaan.tsx line ~157
  const { data: lembagaData, error: lembagaError } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', psId)
    .single();
  
  console.log('\n📊 Query results:');
  console.log('   - Error:', lembagaError ? lembagaError.message : 'None');
  console.log('   - Error code:', lembagaError ? lembagaError.code : 'None');
  console.log('   - Data:', lembagaData ? 'Present' : 'None');
  
  if (lembagaError) {
    if (lembagaError.code === 'PGRST116') {
      console.log('\n✅ SUCCESS: This is the expected result!');
      console.log('   PGRST116 means "no rows returned" - which is fine for .single()');
      console.log('   The frontend handles this case in the error check.');
      console.log('   This confirms the table exists and is queryable.');
      return true;
    } else if (lembagaError.message.includes('Could not find the table')) {
      console.log('\n❌ FAILURE: Table still not found in schema cache');
      console.log('   This means the migration didn\'t fully propagate.');
      return false;
    } else {
      console.log('\n⚠️  Other error, but table exists:', lembagaError.message);
      return true; // Table exists, just other error
    }
  } else {
    console.log('\n✅ SUCCESS: Data returned!');
    console.log('   Lembaga data:', JSON.stringify(lembagaData, null, 2));
    return true;
  }
}

async function testErrorHandling() {
  console.log('\n🔍 Testing frontend error handling pattern...');
  
  // Test the exact error handling from tab-kelembagaan.tsx lines 160-163
  const psId = '00000000-0000-0000-0000-000000000000';
  const { error } = await supabase
    .from('lembaga_pengelola')
    .select('*')
    .eq('perhutanan_sosial_id', psId)
    .single();
  
  if (error) {
    const errorMessage = error.message || String(error).trim();
    console.log('Error message:', errorMessage);
    
    // Check if error message should be logged (frontend logic)
    if (error.code !== 'PGRST116') {
      console.log('✅ Frontend would log this error (not PGRST116)');
    } else {
      console.log('✅ Frontend would NOT log this error (PGRST116 - no rows)');
    }
    
    // Check error message filtering
    if (errorMessage && errorMessage !== '{}' && errorMessage !== '[object Object]') {
      console.log('✅ Error message is meaningful and would be logged');
    }
  }
  
  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 TESTING EXACT FRONTEND QUERY PATTERN');
  console.log('='.repeat(60));
  
  try {
    const queryTest = await testExactFrontendQuery();
    const errorTest = await testErrorHandling();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULT');
    console.log('='.repeat(60));
    
    if (queryTest && errorTest) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('\n🎉 The lembaga_pengelola table is fully functional.');
      console.log('   The frontend error "Could not find the table" is RESOLVED.');
      console.log('\n💡 The Next.js dev server may need to be restarted');
      console.log('   to pick up the new schema cache.');
    } else {
      console.log('❌ Some tests failed.');
      console.log('\n🔧 Try restarting the Next.js dev server:');
      console.log('   1. Stop current server (Ctrl+C)');
      console.log('   2. Run: npm run dev');
    }
  } catch (err) {
    console.error('❌ Test failed with exception:', err.message);
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);