const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection and verra_project_registrations join...\n');

const supabaseAnon = createClient(supabaseUrl, supabaseKey);
const supabaseService = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function testTable(tableName, client, clientName) {
  try {
    console.log(`Testing ${tableName} with ${clientName} client...`);
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .limit(2);
    
    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      console.error(`  Details: ${JSON.stringify(error)}`);
      return false;
    } else {
      console.log(`  ✅ Success! Found ${data?.length || 0} rows`);
      if (data && data.length > 0) {
        console.log(`  First row keys: ${Object.keys(data[0]).join(', ')}`);
        if (tableName === 'carbon_projects') {
          console.log(`  Sample: ${data[0].id} - ${data[0].kode_project} - ${data[0].nama_project}`);
        }
        if (tableName === 'verra_project_registrations') {
          console.log(`  Sample: ${data[0].id} - ${data[0].verra_project_id} - ${data[0].status}`);
          console.log(`  Has project_id: ${data[0].project_id ? 'Yes' : 'No'}`);
          console.log(`  Has carbon_project_id: ${data[0].carbon_project_id ? 'Yes' : 'No'}`);
        }
      }
      return true;
    }
  } catch (err) {
    console.error(`  ❌ Exception: ${err.message}`);
    return false;
  }
}

async function testExactPageQuery() {
  console.log('\n=== Testing exact page query ===');
  console.log('Query: .from("carbon_projects").select(`*, verra_project_registrations (status, verra_project_id, registration_date)`)');
  
  try {
    const { data, error } = await supabaseAnon
      .from('carbon_projects')
      .select(`
        *,
        verra_project_registrations (
          status,
          verra_project_id,
          registration_date
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`❌ Query error: ${error.message}`);
      console.error(`Error details: ${JSON.stringify(error, null, 2)}`);
      console.error(`Error code: ${error.code}`);
      console.error(`Error hint: ${error.hint}`);
      
      // Try alternative column names
      console.log('\nTrying alternative column names...');
      
      // Try with project_id instead of carbon_project_id
      const { data: data2, error: error2 } = await supabaseAnon
        .from('carbon_projects')
        .select(`
          *,
          verra_project_registrations (
            status,
            verra_project_id,
            registration_date,
            project_id,
            carbon_project_id
          )
        `)
        .limit(1);
      
      if (error2) {
        console.error(`❌ Alternative also failed: ${error2.message}`);
      } else {
        console.log(`✅ Alternative succeeded! Data count: ${data2?.length || 0}`);
        if (data2 && data2.length > 0) {
          console.log(`First project verra registrations: ${JSON.stringify(data2[0].verra_project_registrations, null, 2)}`);
        }
      }
      
    } else {
      console.log(`✅ Query succeeded! Data count: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log(`First project: ${data[0].kode_project}`);
        console.log(`Verra registrations count: ${data[0].verra_project_registrations?.length || 0}`);
        if (data[0].verra_project_registrations && data[0].verra_project_registrations.length > 0) {
          console.log(`First verra registration: ${JSON.stringify(data[0].verra_project_registrations[0], null, 2)}`);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    console.error(err.stack);
  }
}

async function testSimplifiedQueries() {
  console.log('\n=== Testing simplified queries ===');
  
  // Test 1: Just carbon_projects with no join
  console.log('\nTest 1: Carbon projects only');
  const { data: cpData, error: cpError } = await supabaseAnon
    .from('carbon_projects')
    .select('id, kode_project, nama_project')
    .limit(2);
  
  if (cpError) {
    console.error(`  ❌ Error: ${cpError.message}`);
  } else {
    console.log(`  ✅ Success: ${cpData?.length || 0} rows`);
  }
  
  // Test 2: Just verra_project_registrations with no join
  console.log('\nTest 2: Verra registrations only');
  const { data: vprData, error: vprError } = await supabaseAnon
    .from('verra_project_registrations')
    .select('id, verra_project_id, status, project_id, carbon_project_id')
    .limit(2);
  
  if (vprError) {
    console.error(`  ❌ Error: ${vprError.message}`);
  } else {
    console.log(`  ✅ Success: ${vprData?.length || 0} rows`);
    if (vprData && vprData.length > 0) {
      vprData.forEach(row => {
        console.log(`    - ${row.id}: ${row.verra_project_id} (${row.status}) project_id=${row.project_id}, carbon_project_id=${row.carbon_project_id}`);
      });
    }
  }
  
  // Test 3: Try join with explicit foreign key
  console.log('\nTest 3: Manual join simulation');
  if (cpData && cpData.length > 0 && vprData && vprData.length > 0) {
    const projectId = cpData[0].id;
    console.log(`  Looking for verra registrations with project_id = ${projectId}`);
    
    const { data: matchingVpr, error: matchError } = await supabaseAnon
      .from('verra_project_registrations')
      .select('*')
      .or(`project_id.eq.${projectId},carbon_project_id.eq.${projectId}`);
    
    if (matchError) {
      console.error(`  ❌ Error: ${matchError.message}`);
    } else {
      console.log(`  ✅ Found ${matchingVpr?.length || 0} matching verra registrations`);
    }
  }
}

async function testRLSPermissions() {
  console.log('\n=== Testing RLS Permissions ===');
  
  // Test with service role key (bypasses RLS)
  if (supabaseService) {
    console.log('\nTest with service role (bypasses RLS):');
    const { data, error } = await supabaseService
      .from('carbon_projects')
      .select(`
        *,
        verra_project_registrations (
          status,
          verra_project_id,
          registration_date
        )
      `)
      .limit(1);
    
    if (error) {
      console.error(`  ❌ Service role error: ${error.message}`);
    } else {
      console.log(`  ✅ Service role succeeded! Data count: ${data?.length || 0}`);
      if (error) {
        console.error(`  But error exists: ${JSON.stringify(error)}`);
      }
    }
  } else {
    console.log('  ℹ️ No service role key available');
  }
}

async function main() {
  console.log('Starting diagnostics...\n');
  
  // Test basic table access
  await testTable('carbon_projects', supabaseAnon, 'anon');
  await testTable('verra_project_registrations', supabaseAnon, 'anon');
  
  // Test the exact page query
  await testExactPageQuery();
  
  // Test simplified queries
  await testSimplifiedQueries();
  
  // Test RLS permissions
  await testRLSPermissions();
  
  console.log('\n=== Summary ===');
  console.log('The error "Error fetching carbon projects: {}" suggests the error object is empty.');
  console.log('This could be due to:');
  console.log('1. RLS policy blocking the join');
  console.log('2. Invalid relationship name in Supabase schema cache');
  console.log('3. Column name mismatch (project_id vs carbon_project_id)');
  console.log('4. Empty error object from Supabase client');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});