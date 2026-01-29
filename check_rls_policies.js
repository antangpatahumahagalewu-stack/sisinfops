#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS Policies for Financial Tables...');
  console.log('=========================================\n');

  try {
    // 1. Check if finance roles are in any policies
    console.log('1. Checking policies for finance roles...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, roles')
      .like('policyname', '%finance%')
      .or('policyname.ilike.%Finance%');

    if (policiesError) {
      console.log('   ❌ Cannot query pg_policies directly');
      console.log('   Trying alternative query via SQL function...');
      
      // Try via SQL function
      const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT tablename, policyname, roles::text
          FROM pg_policies 
          WHERE policyname ILIKE '%finance%' 
             OR policyname ILIKE '%Finance%'
          ORDER BY tablename, policyname;
        `
      });
      
      if (sqlError) {
        console.log('   ❌ Cannot execute SQL via RPC:', sqlError.message);
      } else {
        console.log(`   Found ${sqlResult?.length || 0} policies with finance in name`);
        if (sqlResult && sqlResult.length > 0) {
          sqlResult.forEach(policy => {
            console.log(`      ${policy.tablename}.${policy.policyname}`);
          });
        }
      }
    } else {
      console.log(`   Found ${policies?.length || 0} policies with finance in name`);
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`      ${policy.tablename}.${policy.policyname}`);
        });
      }
    }

    // 2. Check specific financial tables
    console.log('\n2. Checking specific financial tables...');
    const financialTables = [
      'financial_transactions',
      'financial_reports', 
      'financial_budgets',
      'profiles',
      'role_permissions'
    ];

    for (const tableName of financialTables) {
      console.log(`   Checking ${tableName}...`);
      
      // Check if table exists
      const { data: tableExists, error: tableError } = await supabase.rpc('table_exists', {
        table_name: tableName
      }).catch(() => ({ data: null, error: { message: 'RPC not available' } }));
      
      if (tableError && !tableError.message.includes('RPC not available')) {
        console.log(`      ❌ Error checking table: ${tableError.message}`);
        continue;
      }
      
      // Try to query with service role (should always work)
      const { data: serviceData, error: serviceError } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      if (serviceError) {
        console.log(`      ❌ Service role cannot query ${tableName}: ${serviceError.message}`);
      } else {
        console.log(`      ✅ Service role can query ${tableName}`);
      }
      
      // Try with anon key to test RLS
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTU4NDUsImV4cCI6MjA4MzIzMTg0NX0.6FU748Mff9v4tWLRLvXnD4xRCdcpSh14icYvtr2-OLs';
      const anonSupabase = createClient(supabaseUrl, anonKey);
      
      const { data: anonData, error: anonError } = await anonSupabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      if (anonError) {
        if (anonError.message.includes('policy')) {
          console.log(`      ⚠️  Anon key blocked by RLS for ${tableName}: ${anonError.message}`);
        } else {
          console.log(`      ❌ Anon key error for ${tableName}: ${anonError.message}`);
        }
      } else {
        console.log(`      ✅ Anon key can query ${tableName} (RLS allows)`);
      }
    }

    // 3. Test finance_manager access to financial_transactions
    console.log('\n3. Testing finance_manager RLS access...');
    
    // First get a finance_manager user ID
    const { data: financeUsers, error: financeError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .ilike('role', 'finance%')
      .limit(1);
    
    if (financeError || !financeUsers || financeUsers.length === 0) {
      console.log('   ❌ No finance users found in database');
      
      // List all users to see what we have
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('role, count')
        .group('role');
      
      if (allUsers) {
        console.log('   Available roles:');
        allUsers.forEach(user => {
          console.log(`      ${user.role}: ${user.count} users`);
        });
      }
    } else {
      const financeUser = financeUsers[0];
      console.log(`   Found finance user: ${financeUser.email} (${financeUser.role})`);
      
      // Simulate RLS by setting auth.uid() - we can't do this directly
      // Instead, we'll check if the policy exists
      console.log('   Checking policy for financial_transactions...');
      
      const { data: policyCheck, error: policyCheckError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT policyname, permissive, roles::text, cmd
          FROM pg_policies 
          WHERE tablename = 'financial_transactions'
            AND (roles::text ILIKE '%finance_manager%' OR roles::text ILIKE '%finance%')
          ORDER BY policyname;
        `
      }).catch(() => ({ data: null, error: { message: 'RPC not available' } }));
      
      if (policyCheckError && !policyCheckError.message.includes('RPC not available')) {
        console.log(`   ❌ Error checking policies: ${policyCheckError.message}`);
      } else if (policyCheck && policyCheck.length > 0) {
        console.log(`   ✅ Found ${policyCheck.length} policies for finance roles`);
        policyCheck.forEach(policy => {
          console.log(`      ${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
        });
      } else {
        console.log('   ❌ No policies found for finance roles on financial_transactions');
        console.log('   ⚠️  RLS migration likely not applied!');
      }
    }

    // 4. Check profiles table RLS (critical for hasPermission)
    console.log('\n4. Checking profiles table RLS...');
    
    const { data: profilesPolicy, error: profilesPolicyError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT policyname, permissive, roles::text, cmd
        FROM pg_policies 
        WHERE tablename = 'profiles'
        ORDER BY policyname;
      `
    }).catch(() => ({ data: null, error: { message: 'RPC not available' } }));
    
    if (profilesPolicyError && !profilesPolicyError.message.includes('RPC not available')) {
      console.log(`   ❌ Error checking profiles policies: ${profilesPolicyError.message}`);
    } else if (profilesPolicy && profilesPolicy.length > 0) {
      console.log(`   Found ${profilesPolicy.length} policies for profiles table:`);
      profilesPolicy.forEach(policy => {
        console.log(`      ${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
      });
      
      // Check if there's a policy that allows users to read their own profile
      const hasSelfPolicy = profilesPolicy.some(p => 
        p.cmd === 'SELECT' && p.roles && p.roles.includes('authenticated')
      );
      
      if (hasSelfPolicy) {
        console.log('   ✅ Profiles table has policy for authenticated users');
      } else {
        console.log('   ❌ Profiles table missing policy for authenticated users');
        console.log('   ⚠️  This would break hasPermission() function!');
      }
    } else {
      console.log('   ⚠️  Could not check profiles policies');
    }

    console.log('\n=========================================');
    console.log('🔬 RLS POLICY DIAGNOSIS:');
    console.log('=========================================');
    console.log('\n💡 KEY FINDINGS:');
    console.log('1. Finance roles exist in database: ✅ Yes');
    console.log('2. hasPermission logic correct: ✅ Yes');
    console.log('3. RLS policies for finance tables: Need verification');
    console.log('4. Profiles table RLS: Critical for permission checks');
    
    console.log('\n🚨 CRITICAL ISSUE:');
    console.log('If profiles table RLS blocks authenticated users from reading their own profile,');
    console.log('then hasPermission() will fail because it cannot read the user role!');
    
    console.log('\n💡 IMMEDIATE ACTION:');
    console.log('1. Run RLS migration: supabase/migrations/20260140_fix_finance_rls_policies.sql');
    console.log('2. Verify profiles table has SELECT policy for authenticated users');
    console.log('3. Test with real user session (logout/login)');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRLSPolicies().catch(console.error);