const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing VVB relationship with different query patterns...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery(pattern, description) {
  console.log(`\nTesting: ${description}`);
  console.log(`Pattern: ${pattern}`);
  
  try {
    const query = pattern.includes('!inner') ? 
      `*, verra_project_registrations!inner (carbon_project_id), vvb_organizations!inner (organization_name)` :
      pattern === 'simple' ?
      `*, verra_project_registrations (carbon_project_id), vvb_organizations (organization_name)` :
      pattern === 'explicit' ?
      `*, verra_project_registrations!vvb_engagements_verra_registration_id_fkey (carbon_project_id), vvb_organizations!inner (organization_name)` :
      pattern === 'no_join' ?
      `*` : '';
    
    const { data, error } = await supabase
      .from('vvb_engagements')
      .select(query)
      .limit(1);
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`Details: ${JSON.stringify(error, null, 2)}`);
      return false;
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} results`);
      if (data && data.length > 0) {
        const item = data[0];
        console.log(`  Has verra_project_registrations: ${'verra_project_registrations' in item ? 'Yes' : 'No'}`);
        console.log(`  Has vvb_organizations: ${'vvb_organizations' in item ? 'Yes' : 'No'}`);
      }
      return true;
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function testDirectJoin() {
  console.log('\nTesting direct SQL join simulation...');
  
  try {
    // First get vvb_engagements
    const { data: engagements, error: engagementsError } = await supabase
      .from('vvb_engagements')
      .select('id, contract_number, verra_registration_id, vvb_id')
      .limit(2);
    
    if (engagementsError) {
      console.error(`❌ Error fetching engagements: ${engagementsError.message}`);
      return;
    }
    
    console.log(`✅ Found ${engagements?.length || 0} engagements`);
    
    if (engagements && engagements.length > 0) {
      // Get verra_registration data
      const verraIds = engagements.map(e => e.verra_registration_id).filter(id => id);
      const vvbIds = engagements.map(e => e.vvb_id).filter(id => id);
      
      if (verraIds.length > 0) {
        const { data: verraData, error: verraError } = await supabase
          .from('verra_project_registrations')
          .select('id, verra_project_id, carbon_project_id')
          .in('id', verraIds);
        
        if (verraError) {
          console.error(`❌ Error fetching verra data: ${verraError.message}`);
        } else {
          console.log(`✅ Found ${verraData?.length || 0} verra registrations`);
        }
      }
      
      if (vvbIds.length > 0) {
        const { data: vvbData, error: vvbError } = await supabase
          .from('vvb_organizations')
          .select('id, organization_name')
          .in('id', vvbIds);
        
        if (vvbError) {
          console.error(`❌ Error fetching VVB data: ${vvbError.message}`);
        } else {
          console.log(`✅ Found ${vvbData?.length || 0} VVB organizations`);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
  }
}

async function testCarbonCreditsRelationship() {
  console.log('\nTesting carbon_credits relationship for comparison...');
  
  try {
    const { data, error } = await supabase
      .from('carbon_credits')
      .select(`
        *,
        verra_project_registrations!verra_project_registrations_carbon_project_id_fkey (
          verra_project_id,
          carbon_project_id
        )
      `)
      .limit(1);
    
    if (error) {
      console.error(`❌ Carbon credits error: ${error.message}`);
    } else {
      console.log(`✅ Carbon credits join works! Found ${data?.length || 0} results`);
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
  }
}

async function testAlternativeNaming() {
  console.log('\nTesting alternative relationship naming...');
  
  const patterns = [
    'verra_project_registrations!inner',
    'verra_project_registrations',
    'verra_project_registrations(*)',
    'verra_project_registrations!vvb_engagements_verra_registration_id_fkey',
    'verra_project_registrations!verra_project_registrations_carbon_project_id_fkey'
  ];
  
  for (const pattern of patterns) {
    console.log(`\nTrying pattern: ${pattern}`);
    try {
      const { data, error } = await supabase
        .from('vvb_engagements')
        .select(`*, ${pattern} (carbon_project_id)`)
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

async function main() {
  console.log('Starting VVB relationship tests...');
  
  const results = {
    simple: await testQuery('simple', 'Simple join without !inner'),
    inner: await testQuery('!inner', 'With !inner join type'),
    explicit: await testQuery('explicit', 'Explicit foreign key name'),
    no_join: await testQuery('no_join', 'No join at all')
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  for (const [test, result] of Object.entries(results)) {
    console.log(`${test}: ${result ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  await testDirectJoin();
  await testCarbonCreditsRelationship();
  await testAlternativeNaming();
  
  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (results.simple && !results.inner) {
    console.log('✅ Use simple join (without !inner)');
    console.log('   Change query to: verra_project_registrations (carbon_project_id)');
  } else if (results.no_join) {
    console.log('✅ Database accessible, but joins fail');
    console.log('   May need to wait for Supabase schema cache refresh');
    console.log('   Or use manual joins like the carbon-credits page does');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});