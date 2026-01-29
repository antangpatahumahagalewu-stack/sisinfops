#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalVerification() {
  console.log('🔍 FINAL VERIFICATION - Finance Manager Access');
  console.log('=========================================\n');

  console.log('📋 PREREQUISITES CHECK:');
  console.log('1. SQL fix_applied: Run fix_profiles_rls.sql in Supabase SQL Editor');
  console.log('2. RLS migration: Run 20260140_fix_finance_rls_policies.sql');
  console.log('3. Server restarted: Next.js development server');
  console.log('4. Cache cleared: Browser cache and cookies');
  console.log('5. User relogin: Logout and login again\n');

  try {
    // 1. Get masbob user
    console.log('1. User verification...');
    const { data: userData } = await supabase.auth.admin.listUsers({ perPage: 100 });
    const masbob = userData.users.find(u => u.email === 'masbob@yamal.com');
    
    if (!masbob) {
      console.error('❌ User masbob@yamal.com not found');
      return;
    }
    
    console.log(`✅ User: ${masbob.email} (${masbob.id})`);

    // 2. Test profiles table access with anonymous key
    console.log('\n2. Profiles table RLS test...');
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTU4NDUsImV4cCI6MjA4MzIzMTg0NX0.6FU748Mff9v4tWLRLvXnD4xRCdcpSh14icYvtr2-OLs';
    const anonSupabase = createClient(supabaseUrl, anonKey);
    
    const { data: profile, error: profileError } = await anonSupabase
      .from('profiles')
      .select('role')
      .eq('id', masbob.id)
      .single();
    
    if (profileError) {
      console.log(`❌ Profiles table still blocked: ${profileError.message}`);
      console.log('\n🚨 ACTION REQUIRED: Run fix_profiles_rls.sql in Supabase SQL Editor');
    } else {
      console.log(`✅ Profiles table accessible - Role: ${profile.role}`);
    }

    // 3. Test financial_transactions access
    console.log('\n3. Financial tables RLS test...');
    const { data: txData, error: txError } = await anonSupabase
      .from('financial_transactions')
      .select('count')
      .limit(1);
    
    if (txError) {
      if (txError.message.includes('policy')) {
        console.log(`⚠️  Financial transactions blocked by RLS: ${txError.message}`);
        console.log('\n🚨 ACTION REQUIRED: Run 20260140_fix_finance_rls_policies.sql');
      } else {
        console.log(`❌ Financial transactions error: ${txError.message}`);
      }
    } else {
      console.log('✅ Financial transactions accessible');
    }

    // 4. Simulate hasPermission logic
    console.log('\n4. hasPermission() simulation...');
    if (profile && !profileError) {
      const FINANCIAL_VIEW_ROLES = [
        'admin', 'finance_manager', 'finance_operational', 'finance_project_carbon',
        'finance_project_implementation', 'finance_project_social', 'investor',
        'monev', 'monev_officer', 'program_planner', 'carbon_specialist'
      ];
      
      const hasAccess = FINANCIAL_VIEW_ROLES.includes(profile.role);
      console.log(`   User role: ${profile.role}`);
      console.log(`   In FINANCIAL_VIEW list: ${hasAccess ? '✅ YES' : '❌ NO'}`);
      console.log(`   hasPermission("FINANCIAL_VIEW"): ${hasAccess ? '✅ true' : '❌ false'}`);
      
      if (hasAccess) {
        console.log('\n✅ hasPermission() should return TRUE');
        console.log('   User should be able to access finance pages');
      } else {
        console.log('\n❌ hasPermission() will return FALSE');
        console.log('   User cannot access finance pages');
      }
    } else {
      console.log('❌ Cannot simulate - profiles table not accessible');
    }

    // 5. Test server connectivity
    console.log('\n5. Application server test...');
    const { exec } = require('child_process');
    exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "Failed"', 
      (error, stdout) => {
        console.log(`   Server status: ${stdout.trim()}`);
      });

    console.log('\n=========================================');
    console.log('📋 FINAL DIAGNOSIS:');
    console.log('=========================================');
    
    if (profileError) {
      console.log('🚨 ROOT CAUSE: Profiles table RLS blocks access');
      console.log('   This prevents hasPermission() from reading user role');
      console.log('\n💡 SOLUTION: Run fix_profiles_rls.sql in Supabase SQL Editor');
    } else if (profile && FINANCIAL_VIEW_ROLES.includes(profile.role)) {
      console.log('✅ ALL CHECKS PASS');
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Clear browser cache and cookies');
      console.log('   2. Logout and login again');
      console.log('   3. Access: http://localhost:3000/id/dashboard/finance');
      console.log('   4. All finance menus should now be accessible');
    } else if (profile) {
      console.log('🚨 ROOT CAUSE: User role not in FINANCIAL_VIEW');
      console.log(`   Current role: ${profile.role}`);
      console.log('\n💡 SOLUTION: Update user role to finance_manager');
    } else {
      console.log('⚠️  UNKNOWN ISSUE');
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Check server logs: tail -f /tmp/nextjs_restart.log');
      console.log('   2. Verify SQL fixes applied');
      console.log('   3. Contact support if issue persists');
    }

    console.log('\n=========================================');
    console.log('⚡ QUICK FIX SUMMARY:');
    console.log('=========================================');
    console.log('1. FIX PROFILES RLS:');
    console.log('   Run: supabase/migrations/fix_profiles_rls.sql');
    console.log('\n2. FIX FINANCE RLS:');
    console.log('   Run: supabase/migrations/20260140_fix_finance_rls_policies.sql');
    console.log('\n3. RESTART & CLEAR:');
    console.log('   rm -rf .next && npm run dev');
    console.log('   Clear browser cache, logout/login');
    console.log('\n4. TEST:');
    console.log('   http://localhost:3000/id/dashboard/finance');

  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

finalVerification().catch(console.error);