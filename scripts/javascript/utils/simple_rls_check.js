#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simpleRLSCheck() {
  console.log('🔍 Simple RLS Check - Testing Database Access');
  console.log('=========================================\n');

  try {
    // 1. First, get masbob user
    console.log('1. Getting masbob@yamal.com user...');
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
      perPage: 100
    });
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
      return;
    }
    
    const masbob = userData.users.find(u => u.email === 'masbob@yamal.com');
    if (!masbob) {
      console.error('❌ User masbob@yamal.com not found');
      return;
    }
    
    console.log(`✅ User found: ${masbob.email} (${masbob.id})`);
    
    // 2. Check if profiles table can be queried with service role
    console.log('\n2. Testing profiles table access...');
    
    // Service role should always work
    const { data: profileService, error: profileServiceError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', masbob.id)
      .single();
    
    if (profileServiceError) {
      console.log(`❌ Service role cannot query profiles: ${profileServiceError.message}`);
    } else {
      console.log(`✅ Service role can query profiles - Role: ${profileService.role}`);
    }
    
    // 3. Try with anon key (simulating what the app does)
    console.log('\n3. Testing with anonymous key (simulating app)...');
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTU4NDUsImV4cCI6MjA4MzIzMTg0NX0.6FU748Mff9v4tWLRLvXnD4xRCdcpSh14icYvtr2-OLs';
    const anonSupabase = createClient(supabaseUrl, anonKey);
    
    const { data: profileAnon, error: profileAnonError } = await anonSupabase
      .from('profiles')
      .select('role')
      .eq('id', masbob.id)
      .single();
    
    if (profileAnonError) {
      console.log(`❌ Anonymous key cannot query profiles: ${profileAnonError.message}`);
      console.log(`   Error details: ${JSON.stringify(profileAnonError, null, 2)}`);
      
      if (profileAnonError.message.includes('policy')) {
        console.log('\n🚨 CRITICAL ISSUE: Profiles table RLS is blocking access!');
        console.log('   This is why hasPermission() fails - it cannot read user role.');
      }
    } else {
      console.log(`✅ Anonymous key can query profiles - Role: ${profileAnon.role}`);
    }
    
    // 4. Test financial_transactions access
    console.log('\n4. Testing financial_transactions access...');
    
    // Service role
    const { data: txService, error: txServiceError } = await supabase
      .from('financial_transactions')
      .select('count')
      .limit(1);
    
    if (txServiceError) {
      console.log(`❌ Service role cannot query financial_transactions: ${txServiceError.message}`);
    } else {
      console.log(`✅ Service role can query financial_transactions`);
    }
    
    // Anonymous key
    const { data: txAnon, error: txAnonError } = await anonSupabase
      .from('financial_transactions')
      .select('count')
      .limit(1);
    
    if (txAnonError) {
      if (txAnonError.message.includes('policy')) {
        console.log(`⚠️  Anonymous key blocked by RLS for financial_transactions`);
        console.log(`   This is expected if RLS policies are not yet updated for finance roles`);
      } else {
        console.log(`❌ Anonymous key error for financial_transactions: ${txAnonError.message}`);
      }
    } else {
      console.log(`✅ Anonymous key can query financial_transactions (RLS allows)`);
    }
    
    // 5. Direct SQL test for RLS policies
    console.log('\n5. Direct SQL test for RLS policies...');
    
    // Try a simple SQL query to check policies
    try {
      const { data: sqlResult, error: sqlError } = await supabase.rpc('get_rls_policies', {
        table_name: 'profiles'
      });
      
      if (sqlError) {
        console.log(`   ❌ Cannot call get_rls_policies RPC: ${sqlError.message}`);
      } else {
        console.log(`   ✅ RPC available, found ${sqlResult?.length || 0} policies for profiles`);
      }
    } catch (rpcError) {
      console.log(`   ⚠️  RPC not available, trying direct query...`);
    }
    
    // 6. Simulate what hasPermission does
    console.log('\n6. Simulating hasPermission() logic...');
    
    // If anonymous key can't read profiles, hasPermission will fail
    if (profileAnonError) {
      console.log('🚨 hasPermission() WILL FAIL because:');
      console.log('   - App uses anonymous key to query profiles');
      console.log('   - RLS blocks anonymous key from reading profiles');
      console.log('   - hasPermission() cannot get user role → returns false → unauthorized');
      
      console.log('\n💡 IMMEDIATE FIX:');
      console.log('   Add RLS policy to profiles table for authenticated users:');
      console.log(`
        CREATE POLICY "Users can read own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);
      `);
    } else {
      console.log('✅ hasPermission() should work - profiles table accessible');
      console.log(`   User role from profiles: ${profileAnon.role}`);
      
      // Check if this role has FINANCIAL_VIEW
      const FINANCIAL_VIEW_ROLES = [
        'admin', 'finance_manager', 'finance_operational', 'finance_project_carbon',
        'finance_project_implementation', 'finance_project_social', 'investor',
        'monev', 'monev_officer', 'program_planner', 'carbon_specialist'
      ];
      
      const hasAccess = FINANCIAL_VIEW_ROLES.includes(profileAnon.role);
      console.log(`   Role '${profileAnon.role}' in FINANCIAL_VIEW: ${hasAccess ? '✅ YES' : '❌ NO'}`);
      
      if (!hasAccess) {
        console.log('\n🚨 hasPermission() will return false - user role not in FINANCIAL_VIEW');
      }
    }
    
    console.log('\n=========================================');
    console.log('🔬 DIAGNOSIS SUMMARY:');
    console.log('=========================================');
    
    if (profileAnonError) {
      console.log('🚨 ROOT CAUSE: Profiles table RLS blocks anonymous access');
      console.log('\n💡 SOLUTION: Run this SQL in Supabase SQL Editor:');
      console.log(`
        -- Fix profiles table RLS
        DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
        CREATE POLICY "Users can read own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);
        
        -- Also run the full finance RLS migration
        -- Copy/paste: supabase/migrations/20260140_fix_finance_rls_policies.sql
      `);
    } else if (profileAnon.role && !FINANCIAL_VIEW_ROLES.includes(profileAnon.role)) {
      console.log('🚨 ROOT CAUSE: User role not in FINANCIAL_VIEW permission list');
      console.log(`   Current role: ${profileAnon.role}`);
      console.log(`   Allowed roles: ${FINANCIAL_VIEW_ROLES.join(', ')}`);
      console.log('\n💡 SOLUTION: Update user role or permission list');
    } else {
      console.log('✅ All checks pass - mystery issue');
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Clear browser cache and cookies');
      console.log('   2. Logout and login again');
      console.log('   3. Check server logs for errors');
      console.log('   4. Restart Next.js development server');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

simpleRLSCheck().catch(console.error);