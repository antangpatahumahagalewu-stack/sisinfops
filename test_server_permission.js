#!/usr/bin/env node

// Test server-side permission check by simulating what happens in the finance pages
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Simulate the exact hasPermission logic from lib/auth/rbac.ts
async function simulateServerSideCheck() {
  console.log('🔍 Simulating Server-Side Permission Check...')
  console.log('=========================================\n')

  try {
    // 1. Get user masbob@yamal.com
    console.log('1. Getting user masbob@yamal.com...')
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
      perPage: 100
    })
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message)
      return
    }
    
    const masbob = userData.users.find(u => u.email === 'masbob@yamal.com')
    if (!masbob) {
      console.error('❌ User masbob@yamal.com not found')
      return
    }
    
    console.log(`✅ User found: ${masbob.email}`)
    
    // 2. Simulate what happens in finance page.tsx files
    console.log('\n2. Simulating finance page.tsx logic...')
    
    // Step A: Create server client (simulating createClient() from lib/supabase/server)
    console.log('   A. Creating server client...')
    
    // Step B: Get session (simulating supabase.auth.getSession())
    console.log('   B. Getting session...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError.message)
      return
    }
    
    if (!sessionData.session) {
      console.error('❌ No session found - user would be redirected to login')
      return
    }
    
    console.log(`   ✅ Session exists for user: ${sessionData.session.user.email}`)
    
    // Step C: Get user role from profiles (simulating hasPermission function)
    console.log('   C. Getting user role from profiles table...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', masbob.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message)
      
      // Try with service role key to see if it's an RLS issue
      console.log('\n   ⚠️  Trying with service role key (bypassing RLS)...')
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data: serviceProfile, error: serviceError } = await serviceSupabase
        .from('profiles')
        .select('role')
        .eq('id', masbob.id)
        .single()
      
      if (serviceError) {
        console.error('❌ Even service role cannot fetch profile:', serviceError.message)
      } else {
        console.log(`   ✅ Service role can fetch profile - RLS might be blocking!`)
        console.log(`      Profile role via service role: ${serviceProfile.role}`)
      }
      return
    }
    
    console.log(`   ✅ Profile role: ${profileData.role}`)
    
    // Step D: Check FINANCIAL_VIEW permission (simulating hasPermission)
    console.log('   D. Checking FINANCIAL_VIEW permission...')
    
    // Exact permission list from lib/auth/rbac.ts
    const FINANCIAL_VIEW_ROLES = [
      'admin', 'finance_manager', 'finance_operational', 'finance_project_carbon',
      'finance_project_implementation', 'finance_project_social', 'investor',
      'monev', 'monev_officer', 'program_planner', 'carbon_specialist'
    ]
    
    const hasFinancialView = FINANCIAL_VIEW_ROLES.includes(profileData.role)
    console.log(`   ✅ hasPermission("FINANCIAL_VIEW"): ${hasFinancialView}`)
    
    if (!hasFinancialView) {
      console.log('\n   ❌ User would be redirected with ?error=unauthorized')
      console.log(`   Reason: Role '${profileData.role}' not in FINANCIAL_VIEW_ROLES`)
    } else {
      console.log('\n   ✅ User would be allowed to access finance pages')
    }
    
    // 3. Check if there's an RLS policy issue
    console.log('\n3. Checking RLS policies for profiles table...')
    
    // Try to update profile with different clients
    console.log('   Testing RLS with different authentication methods:')
    
    // Test 1: With service role (should work)
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: serviceTest, error: serviceTestError } = await serviceSupabase
      .from('profiles')
      .select('role')
      .eq('id', masbob.id)
      .single()
    
    console.log(`   Service role access: ${serviceTestError ? '❌' : '✅'} ${serviceTestError?.message || 'Success'}`)
    
    // Test 2: With anon key (might fail due to RLS)
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTU4NDUsImV4cCI6MjA4MzIzMTg0NX0.6FU748Mff9v4tWLRLvXnD4xRCdcpSh14icYvtr2-OLs'
    const anonSupabase = createClient(supabaseUrl, anonKey)
    const { data: anonTest, error: anonTestError } = await anonSupabase
      .from('profiles')
      .select('role')
      .eq('id', masbob.id)
      .single()
    
    console.log(`   Anon key access: ${anonTestError ? '❌' : '✅'} ${anonTestError?.message || 'Success'}`)
    
    // 4. Comprehensive diagnosis
    console.log('\n=========================================')
    console.log('🔬 COMPREHENSIVE DIAGNOSIS:')
    console.log('=========================================')
    console.log(`User: masbob@yamal.com`)
    console.log(`Database Role: ${profileData.role}`)
    console.log(`Has FINANCIAL_VIEW: ${hasFinancialView ? '✅ YES' : '❌ NO'}`)
    console.log(`RLS Access (service): ${serviceTestError ? '❌ Blocked' : '✅ Allowed'}`)
    console.log(`RLS Access (anon): ${anonTestError ? '❌ Blocked' : '✅ Allowed'}`)
    
    if (!hasFinancialView) {
      console.log('\n🔥 ROOT CAUSE:')
      console.log(`   User role '${profileData.role}' is not in FINANCIAL_VIEW permission list`)
      console.log('\n💡 IMMEDIATE FIX:')
      console.log(`   Update user role to one of: ${FINANCIAL_VIEW_ROLES.filter(r => r.includes('finance')).join(', ')}`)
    } else if (anonTestError && anonTestError.message.includes('policy')) {
      console.log('\n🔥 ROOT CAUSE:')
      console.log('   RLS policies are blocking anonymous access to profiles table')
      console.log('\n💡 IMMEDIATE FIX:')
      console.log('   Check RLS policies on profiles table in Supabase')
      console.log('   Ensure finance roles have SELECT permission on profiles table')
    } else {
      console.log('\n⚠️  MYSTERY ISSUE:')
      console.log('   All checks pass but user still gets unauthorized')
      console.log('\n💡 INVESTIGATION NEEDED:')
      console.log('   1. Check server logs for errors')
      console.log('   2. Clear Next.js build cache: rm -rf .next')
      console.log('   3. Restart development server')
      console.log('   4. Check browser console for errors')
      console.log('   5. Verify lib/auth/rbac.ts is the correct version')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

simulateServerSideCheck().catch(console.error)