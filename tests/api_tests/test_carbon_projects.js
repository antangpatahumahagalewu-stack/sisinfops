const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing carbon_projects table existence...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCarbonProjects() {
  console.log('1. Testing simple select from carbon_projects...');
  try {
    const { data, error } = await supabase
      .from('carbon_projects')
      .select('id, kode_project, nama_project')
      .limit(2);
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`Code: ${error.code}`);
      console.error(`Details: ${JSON.stringify(error, null, 2)}`);
      return false;
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} carbon projects`);
      if (data && data.length > 0) {
        data.forEach(project => {
          console.log(`   • ${project.kode_project}: ${project.nama_project}`);
        });
      }
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function testVerraRegistrationRelationship() {
  console.log('\n2. Testing verra registration relationship...');
  try {
    const { data, error } = await supabase
      .from('carbon_projects')
      .select(`
        id, kode_project, nama_project,
        verra_project_registrations (
          status, verra_project_id, registration_date
        )
      `)
      .limit(2);
    
    if (error) {
      console.error(`❌ Relationship error: ${error.message}`);
      console.error(`Code: ${error.code}`);
      return false;
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} projects`);
      if (data && data.length > 0) {
        data.forEach(project => {
          console.log(`   • ${project.kode_project}: ${project.nama_project}`);
          const verra = project.verra_project_registrations;
          if (verra && verra.length > 0) {
            console.log(`     Verra: ${verra[0].status} (${verra[0].verra_project_id})`);
          } else {
            console.log(`     No verra registration`);
          }
        });
      }
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function testAlternativeRelationship() {
  console.log('\n3. Testing alternative relationship syntax...');
  
  const patterns = [
    'verra_project_registrations!inner',
    'verra_project_registrations',
    'verra_project_registrations(*)',
    'verra_project_registrations!verra_project_registrations_carbon_project_id_fkey'
  ];
  
  for (const pattern of patterns) {
    console.log(`\nTrying pattern: ${pattern}`);
    try {
      const { data, error } = await supabase
        .from('carbon_projects')
        .select(`id, kode_project, ${pattern} (status)`)
        .limit(1);
      
      if (error) {
        console.error(`  ❌ ${error.message}`);
      } else {
        console.log(`  ✅ Success! Found ${data?.length || 0} results`);
      }
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
    }
  }
}

async function testRESTAPI() {
  console.log('\n4. Testing direct REST API...');
  
  const url = `${supabaseUrl}/rest/v1/carbon_projects?select=id,kode_project&limit=1`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await fetch(url, { headers });
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ REST API works! Found ${data.length} projects`);
    } else {
      const error = await response.text();
      console.log(`❌ REST API failed: ${error.substring(0, 200)}`);
    }
  } catch (err) {
    console.error(`❌ Fetch error: ${err.message}`);
  }
}

async function main() {
  console.log('Testing Supabase carbon_projects table and relationships...');
  console.log(`URL: ${supabaseUrl?.substring(0, 40)}...`);
  
  const results = {
    tableExists: await testCarbonProjects(),
    relationshipWorks: await testVerraRegistrationRelationship()
  };
  
  await testAlternativeRelationship();
  await testRESTAPI();
  
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS');
  console.log('='.repeat(60));
  
  if (!results.tableExists) {
    console.log('❌ carbon_projects table may not exist or is not accessible');
    console.log('   Check:');
    console.log('   1. Run SQL: SELECT * FROM carbon_projects LIMIT 5;');
    console.log('   2. Check table permissions in Supabase');
    console.log('   3. Wait for schema cache refresh');
  } else if (!results.relationshipWorks) {
    console.log('✅ Table exists but relationship fails');
    console.log('   This is a Supabase schema cache issue');
    console.log('   Solutions:');
    console.log('   1. Wait 5-10 minutes for auto-refresh');
    console.log('   2. Use simpler query without !inner');
    console.log('   3. Contact Supabase support');
  } else {
    console.log('✅ Everything works!');
    console.log('   The verra-registration page should now load without errors');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});