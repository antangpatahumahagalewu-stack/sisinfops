const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing the fix for verra-registration page...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedQuery() {
  console.log('Testing fixed query with !verra_project_registrations_carbon_project_id_fkey...');
  
  try {
    const { data, error } = await supabase
      .from('carbon_projects')
      .select(`
        *,
        verra_project_registrations!verra_project_registrations_carbon_project_id_fkey (
          status,
          verra_project_id,
          registration_date
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`Details: ${JSON.stringify(error, null, 2)}`);
      return false;
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} carbon projects`);
      if (data && data.length > 0) {
        console.log(`First project: ${data[0].kode_project} - ${data[0].nama_project}`);
        console.log(`Verra registrations count: ${data[0].verra_project_registrations?.length || 0}`);
        if (data[0].verra_project_registrations && data[0].verra_project_registrations.length > 0) {
          console.log(`First verra registration: ${JSON.stringify(data[0].verra_project_registrations[0], null, 2)}`);
        }
      }
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    console.error(err.stack);
    return false;
  }
}

async function testAlternativeRelationship() {
  console.log('\nTesting alternative relationship with !verra_project_registrations_project_id_fkey...');
  
  try {
    const { data, error } = await supabase
      .from('carbon_projects')
      .select(`
        *,
        verra_project_registrations!verra_project_registrations_project_id_fkey (
          status,
          verra_project_id,
          registration_date
        )
      `)
      .limit(1);
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} carbon projects`);
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function testCarbonCreditsPageQuery() {
  console.log('\nTesting carbon-credits page query...');
  
  try {
    const { data, error } = await supabase
      .from('carbon_credits')
      .select(`
        *,
        verra_project_registrations (
          verra_project_id,
          carbon_project_id
        )
      `)
      .limit(1);
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`Details: ${JSON.stringify(error, null, 2)}`);
      
      // Try with explicit relationship
      console.log('\nTrying carbon-credits with explicit relationship...');
      const { data: data2, error: error2 } = await supabase
        .from('carbon_credits')
        .select(`
          *,
          verra_project_registrations!verra_project_registrations_carbon_project_id_fkey (
            verra_project_id,
            carbon_project_id
          )
        `)
        .limit(1);
      
      if (error2) {
        console.error(`❌ Still error: ${error2.message}`);
        return false;
      } else {
        console.log(`✅ Fixed! Found ${data2?.length || 0} carbon credits`);
        return true;
      }
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} carbon credits`);
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function testVVBManagementPageQuery() {
  console.log('\nTesting VVB management page query...');
  
  try {
    const { data, error } = await supabase
      .from('vvb_engagements')
      .select(`
        *,
        verra_project_registrations!inner (
          carbon_project_id
        ),
        vvb_organizations!inner (
          organization_name
        )
      `)
      .limit(1);
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`Details: ${JSON.stringify(error, null, 2)}`);
      return false;
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} VVB engagements`);
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting comprehensive fix test...\n');
  
  const results = {
    verraRegistration: await testFixedQuery(),
    alternativeRelation: await testAlternativeRelationship(),
    carbonCredits: await testCarbonCreditsPageQuery(),
    vvbManagement: await testVVBManagementPageQuery()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Verra Registration Page: ${results.verraRegistration ? '✅ FIXED' : '❌ STILL BROKEN'}`);
  console.log(`Alternative Relationship: ${results.alternativeRelation ? '✅ WORKS' : '❌ FAILS'}`);
  console.log(`Carbon Credits Page: ${results.carbonCredits ? '✅ WORKS' : '❌ NEEDS FIX'}`);
  console.log(`VVB Management Page: ${results.vvbManagement ? '✅ WORKS' : '❌ NEEDS FIX'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('NEXT STEPS:');
  console.log('='.repeat(60));
  
  if (!results.carbonCredits) {
    console.log('1. Fix carbon-credits page query to use explicit relationship');
  }
  
  console.log('2. Test the actual page at http://localhost:3000/id/dashboard/verra-registration');
  console.log('3. Check browser console for any remaining errors');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});