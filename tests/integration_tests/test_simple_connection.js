const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Read from .env.local
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  let supabaseServiceKey = '';
  
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  }
  
  console.log(`📡 URL: ${supabaseUrl}`);
  console.log(`🔑 Anon key length: ${supabaseAnonKey.length}`);
  console.log(`🔧 Service key length: ${supabaseServiceKey.length}`);
  console.log(`🔑 Anon key starts with: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log(`🔧 Service key starts with: ${supabaseServiceKey.substring(0, 20)}...`);
  
  // Test with anon key
  console.log('\n1. Testing with ANON key...');
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await supabaseAnon
      .from('kabupaten')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
      console.log(`   Hint: ${error.hint}`);
    } else {
      console.log(`✅ Success! Count: ${data?.count || 0}`);
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
  
  // Test with service key
  console.log('\n2. Testing with SERVICE ROLE key...');
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error } = await supabaseService
      .from('kabupaten')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
      console.log(`   Hint: ${error.hint}`);
    } else {
      console.log(`✅ Success! Count: ${data?.count || 0}`);
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
  
  // Test direct SQL via service role (bypass RLS)
  console.log('\n3. Testing direct query via service role...');
  try {
    const { data, error } = await supabaseService.rpc('get_kabupaten_count');
    
    if (error) {
      console.log(`❌ RPC Error: ${error.message}`);
      
      // Try a simple SELECT via REST API simulation
      console.log('\n4. Testing raw fetch to REST API...');
      const response = await fetch(`${supabaseUrl}/rest/v1/kabupaten?select=id&limit=1`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Status text: ${response.statusText}`);
      
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}`);
    } else {
      console.log(`✅ RPC Success: ${data}`);
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
}

testConnection().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});