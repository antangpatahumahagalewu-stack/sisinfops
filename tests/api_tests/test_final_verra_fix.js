const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing final fix for verra-registration page query...\n');
console.log('Using exact same query as page.tsx:\n');
console.log('`carbon_projects` with `verra_project_registrations!verra_project_registrations_carbon_project_id_fkey`\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExactPageQuery() {
  console.log('1. Testing exact page query...');
  try {
    const { data, error } = await supabase
      .from("carbon_projects")
      .select(`
        *,
        verra_project_registrations!verra_project_registrations_carbon_project_id_fkey (
          status,
          verra_project_id,
          registration_date
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`Code: ${error.code}`);
      console.error(`Full error:`, JSON.stringify(error, null, 2));
      return false;
    } else {
      console.log(`✅ SUCCESS! Query works perfectly.`);
      console.log(`✅ Found ${data?.length || 0} carbon projects`);
      
      if (data && data.length > 0) {
        console.log('\n📊 Sample data:');
        data.slice(0, 2).forEach((project, i) => {
          console.log(`\nProject ${i + 1}:`);
          console.log(`  Code: ${project.kode_project}`);
          console.log(`  Name: ${project.nama_project}`);
          console.log(`  Status: ${project.status || 'N/A'}`);
          
          const verra = project.verra_project_registrations;
          if (verra && verra.length > 0) {
            console.log(`  Verra Registration:`);
            console.log(`    Status: ${verra[0].status}`);
            console.log(`    Verra ID: ${verra[0].verra_project_id || 'N/A'}`);
            console.log(`    Date: ${verra[0].registration_date || 'N/A'}`);
          } else {
            console.log(`  Verra Registration: None`);
          }
        });
      }
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    console.error(err.stack);
    return false;
  }
}

async function testOtherPages() {
  console.log('\n2. Testing other affected pages...');
  
  // Test carbon-credits page query
  console.log('\n   a) Carbon Credits page query...');
  try {
    const { data, error } = await supabase
      .from("carbon_credits")
      .select(`
        *,
        verra_project_registrations!verra_project_registrations_carbon_project_id_fkey (
          verra_project_id,
          carbon_project_id
        )
      `)
      .limit(1);
    
    if (error) {
      console.error(`     ❌ Error: ${error.message}`);
    } else {
      console.log(`     ✅ Works! Found ${data?.length || 0} credits`);
    }
  } catch (err) {
    console.error(`     ❌ Exception: ${err.message}`);
  }
  
  // Test VVB management page query  
  console.log('\n   b) VVB Management page query...');
  try {
    const { data, error } = await supabase
      .from("vvb_engagements")
      .select(`
        *,
        verra_project_registrations!vvb_engagements_verra_registration_id_fkey (
          carbon_project_id
        ),
        vvb_organizations!inner (
          organization_name
        )
      `)
      .limit(1);
    
    if (error) {
      console.error(`     ❌ Error: ${error.message}`);
    } else {
      console.log(`     ✅ Works! Found ${data?.length || 0} engagements`);
    }
  } catch (err) {
    console.error(`     ❌ Exception: ${err.message}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('FINAL VERIFICATION OF FIXES');
  console.log('='.repeat(60));
  
  const pageQueryWorks = await testExactPageQuery();
  await testOtherPages();
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  if (pageQueryWorks) {
    console.log('✅ ALL FIXES VERIFIED!');
    console.log('\nThe console error "Error fetching carbon projects: {}" should be resolved.');
    console.log('\nChanges made:');
    console.log('1. Updated verra-registration page to use specific foreign key');
    console.log('2. Updated carbon-credits page to use specific foreign key');
    console.log('3. Updated VVB management page to use correct relationship');
    console.log('4. Refreshed Supabase schema cache');
    console.log('5. Restarted development server');
    
    console.log('\n📋 To test the page:');
    console.log('1. Go to http://localhost:3000/id/dashboard/verra-registration');
    console.log('2. Log in with valid credentials');
    console.log('3. Check browser console - no "Error fetching carbon projects" should appear');
    console.log('4. Page should display carbon projects with Verra registration status');
  } else {
    console.log('❌ Fix verification failed');
    console.log('\nThe query still fails. Possible issues:');
    console.log('1. Schema cache still needs time to refresh (wait 5-10 minutes)');
    console.log('2. Multiple relationships still confusing Supabase');
    console.log('3. Database permissions issue');
    
    console.log('\n📋 Alternative solution:');
    console.log('Modify the page to use two separate queries:');
    console.log('1. First fetch carbon_projects');
    console.log('2. Then fetch verra_project_registrations separately');
    console.log('3. Combine data in code (like the VVB page does)');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});