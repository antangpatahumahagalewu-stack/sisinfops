const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTU4NDUsImV4cCI6MjA4MzIzMTg0NX0.6FU748Mff9v4tWLRLvXnD4xRCdcpSh14icYvtr2-OLs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllData() {
  console.log('🔍 Checking all data in Supabase...\n');
  
  try {
    // 1. Check perhutanan_sosial data
    console.log('1. Checking perhutanan_sosial table:');
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (psError) {
      console.error('   ❌ Error:', psError.message);
    } else {
      console.log(`   ✅ Found ${psData.length} rows (showing first ${Math.min(psData.length, 5)}):`);
      psData.forEach((row, i) => {
        console.log(`   ${i+1}. ${row.pemegang_izin} - ${row.skema} - ${row.desa}, ${row.kecamatan}`);
      });
    }
    
    // 2. Check profiles with correct columns
    console.log('\n2. Checking profiles table:');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .limit(5);
    
    if (profilesError) {
      console.error('   ❌ Error:', profilesError.message);
      
      // Try to get column information
      console.log('   Trying to get column info...');
      const { data: colInfo, error: colError } = await supabase.rpc('get_column_info', { table_name: 'profiles' }).catch(() => ({ error: 'RPC not available' }));
      if (!colError && colInfo) {
        console.log('   Columns:', colInfo);
      }
    } else {
      console.log(`   ✅ Found ${profilesData.length} profiles:`);
      profilesData.forEach((profile, i) => {
        console.log(`   ${i+1}. ${profile.full_name || 'No name'} - Role: ${profile.role || 'No role'}`);
      });
    }
    
    // 3. Check role_permissions
    console.log('\n3. Checking role_permissions table:');
    const { data: rolesData, error: rolesError } = await supabase
      .from('role_permissions')
      .select('*');
    
    if (rolesError) {
      console.error('   ❌ Error:', rolesError.message);
      console.log('   Table might not exist or have no data');
    } else {
      console.log(`   ✅ Found ${rolesData.length} roles:`);
      rolesData.forEach(role => {
        console.log(`   - ${role.role_name}: ${role.display_name || 'No display name'}`);
      });
    }
    
    // 4. Check existing roles from profiles
    console.log('\n4. Checking existing roles from profiles:');
    const { data: distinctRoles, error: rolesDistinctError } = await supabase
      .from('profiles')
      .select('role')
      .not('role', 'is', null);
    
    if (rolesDistinctError) {
      console.error('   ❌ Error:', rolesDistinctError.message);
    } else {
      const roles = [...new Set(distinctRoles.map(r => r.role))];
      console.log(`   ✅ Found ${roles.length} distinct roles in profiles: ${roles.join(', ')}`);
    }
    
    // 5. List all tables
    console.log('\n5. Listing all tables:');
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.error('   ❌ Error:', tablesError.message);
    } else {
      console.log(`   ✅ Found ${tablesData.length} public tables:`);
      tablesData.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAllData().catch(console.error);