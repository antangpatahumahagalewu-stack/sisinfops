#!/usr/bin/env node

// Direct test of hasPermission logic from lib/auth/rbac.ts
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Copy the exact permission logic from lib/auth/rbac.ts
const Permissions = {
  FINANCIAL_VIEW: ['admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                   'finance_project_implementation', 'finance_project_social', 'investor',
                   'monev', 'monev_officer', 'program_planner', 'carbon_specialist']
}

async function testHasPermission() {
  console.log('🔍 Testing hasPermission logic for masbob@yamal.com...')
  console.log('=========================================\n')

  try {
    // 1. Find user masbob@yamal.com
    console.log('1. Finding user...')
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
    
    console.log(`✅ User found: ${masbob.email} (${masbob.id})`)
    
    // 2. Get user role from profiles
    console.log('\n2. Getting user role...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', masbob.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message)
      return
    }
    
    console.log(`✅ User role: ${profileData.role}`)
    
    // 3. Test FINANCIAL_VIEW permission directly
    console.log('\n3. Testing FINANCIAL_VIEW permission logic...')
    const userRole = profileData.role
    const allowedRoles = Permissions.FINANCIAL_VIEW
    
    console.log(`   User role: '${userRole}'`)
    console.log(`   Allowed roles: ${allowedRoles.join(', ')}`)
    console.log(`   Role is in allowed list: ${allowedRoles.includes(userRole)}`)
    
    if (allowedRoles.includes(userRole)) {
      console.log('✅ User SHOULD have FINANCIAL_VIEW permission')
    } else {
      console.log('❌ User does NOT have FINANCIAL_VIEW permission')
      console.log('\n🔥 PROBLEM: User role is not in FINANCIAL_VIEW permission list!')
      console.log('   This explains the "unauthorized" error.')
    }
    
    // 4. Check if there's a mismatch between rbac.ts and actual permissions
    console.log('\n4. Checking for permission mismatches...')
    
    // Check all finance-related permissions
    const allFinancePermissions = {
      'FINANCIAL_VIEW': Permissions.FINANCIAL_VIEW,
      // Add other finance permissions from rbac.ts if needed
    }
    
    Object.entries(allFinancePermissions).forEach(([perm, roles]) => {
      const hasPerm = roles.includes(userRole)
      console.log(`   ${perm}: ${hasPerm ? '✅' : '❌'} (${hasPerm ? 'User has permission' : 'User lacks permission'})`)
    })
    
    // 5. Test hasPermission function from database perspective
    console.log('\n5. Simulating hasPermission function logic...')
    
    // Simulate checkUserRole from rbac.ts
    const checkUserRole = (requiredRoles, userId) => {
      return requiredRoles.includes(userRole)
    }
    
    // Simulate hasPermission from rbac.ts
    const hasPermission = (permission, userId) => {
      const requiredRoles = Permissions[permission]
      if (!requiredRoles) return false
      return checkUserRole(requiredRoles, userId)
    }
    
    const financialViewResult = hasPermission('FINANCIAL_VIEW', masbob.id)
    console.log(`   Simulated hasPermission("FINANCIAL_VIEW"): ${financialViewResult}`)
    
    console.log('\n=========================================')
    console.log('🔬 ROOT CAUSE ANALYSIS:')
    console.log('=========================================')
    
    if (allowedRoles.includes(userRole)) {
      console.log('✅ Permission logic is CORRECT - user has FINANCIAL_VIEW')
      console.log('\n⚠️  POTENTIAL ISSUES:')
      console.log('   1. Session cache - user needs to logout/login')
      console.log('   2. hasPermission() function error in server-side code')
      console.log('   3. Different permission list in production vs development')
      console.log('   4. Error in the hasPermission implementation itself')
      
      console.log('\n💡 NEXT STEPS:')
      console.log('   1. Clear browser cache and cookies')
      console.log('   2. Logout and login again')
      console.log('   3. Check server logs for errors')
      console.log('   4. Verify lib/auth/rbac.ts is deployed correctly')
    } else {
      console.log('❌ Permission logic is BROKEN - user lacks FINANCIAL_VIEW')
      console.log('\n💡 FIX: Add finance_manager to FINANCIAL_VIEW permission list')
      console.log('   Update lib/auth/rbac.ts or fix the permission configuration')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testHasPermission().catch(console.error)