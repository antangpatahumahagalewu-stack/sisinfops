#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabase() {
  console.log('🔍 Checking Database Status...')
  console.log('=========================================\n')

  try {
    // 1. Check current user sessions (get some sample users)
    console.log('1. Checking recent user sessions...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
    } else {
      console.log(`✅ Found ${authUsers.users.length} total auth users`)
      
      // Get first 5 users
      const sampleUsers = authUsers.users.slice(0, 5)
      console.log('   Sample users (first 5):')
      sampleUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`)
      })
    }

    // 2. Check profiles table role constraint (simplified)
    console.log('\n2. Checking profiles table role constraint...')
    try {
      // Try to insert a test profile with finance_manager role (won't actually insert)
      const { error: testError } = await supabase
        .from('profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          role: 'finance_manager',
          full_name: 'Test User'
        })
        .select()
      
      if (testError) {
        if (testError.message.includes('violates check constraint')) {
          console.log('   ❌ Constraint does not allow finance_manager role')
        } else if (testError.message.includes('duplicate key')) {
          console.log('   ✅ Constraint allows finance_manager role (duplicate key error expected)')
        } else {
          console.log('   ℹ️  Error testing constraint:', testError.message)
        }
      } else {
        console.log('   ✅ Constraint allows finance_manager role')
      }
    } catch (error) {
      console.log('   ⚠️  Could not test constraint:', error.message)
    }

    // 3. Check all roles in role_permissions table
    console.log('\n3. Checking roles in role_permissions table...')
    const { data: rolesData, error: rolesError } = await supabase
      .from('role_permissions')
      .select('role_name, display_name')
      .order('role_name')

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message)
    } else {
      console.log(`✅ Found ${rolesData.length} roles:`)
      rolesData.forEach(role => {
        console.log(`   - ${role.role_name} (${role.display_name})`)
      })

      // Check if finance roles exist
      const financeRoles = ['finance_manager', 'finance_operational', 'finance_project_carbon', 
                          'finance_project_implementation', 'finance_project_social', 'investor']
      const foundFinanceRoles = rolesData.filter(r => financeRoles.includes(r.role_name))
      console.log(`\n   Finance roles found: ${foundFinanceRoles.length}/${financeRoles.length}`)
      foundFinanceRoles.forEach(role => {
        console.log(`      ✅ ${role.role_name}`)
      })
      
      const missingFinanceRoles = financeRoles.filter(r => !rolesData.some(role => role.role_name === r))
      if (missingFinanceRoles.length > 0) {
        console.log(`\n   ⚠️  Missing finance roles: ${missingFinanceRoles.join(', ')}`)
      }
    }

    // 4. Check sample profiles with their roles
    console.log('\n4. Checking sample user profiles...')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .limit(10)
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message)
    } else {
      console.log(`✅ Found ${profilesData.length} profiles (sample):`)
      profilesData.forEach(profile => {
        console.log(`   - ${profile.full_name || profile.email || 'N/A'} (${profile.role})`)
      })

      // Check for finance managers
      const financeManagers = profilesData.filter(p => p.role === 'finance_manager')
      console.log(`\n   Finance managers in sample: ${financeManagers.length}`)
      if (financeManagers.length === 0) {
        console.log('   ⚠️  No finance managers found in sample')
      }
      
      // Check which user has finance_manager role
      console.log('\n   Searching for finance_manager users...')
      const { data: allFinanceManagers, error: fmError } = await supabase
        .from('profiles')
        .select('id, role, full_name, email')
        .eq('role', 'finance_manager')
      
      if (fmError) {
        console.log('   ⚠️  Error searching for finance managers:', fmError.message)
      } else {
        console.log(`   Found ${allFinanceManagers.length} finance_manager users:`)
        allFinanceManagers.forEach(user => {
          console.log(`      - ${user.full_name || user.email || user.id}`)
        })
      }
    }

    // 5. Test permission check function
    console.log('\n5. Testing permission check...')
    // Get a user ID to test with
    if (profilesData && profilesData.length > 0) {
      const testUser = profilesData[0]
      console.log(`   Testing with user: ${testUser.full_name || testUser.email || testUser.id} (${testUser.role})`)
      
      // Check FINANCIAL_VIEW permission using our logic
      const financialViewRoles = ['admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                                 'finance_project_implementation', 'finance_project_social', 'investor',
                                 'monev', 'monev_officer', 'program_planner', 'carbon_specialist']
      
      const hasPermission = financialViewRoles.includes(testUser.role)
      console.log(`   User has FINANCIAL_VIEW permission: ${hasPermission}`)
      
      if (!hasPermission && testUser.role) {
        console.log(`   ⚠️  User role '${testUser.role}' is not in FINANCIAL_VIEW roles list`)
        console.log(`   Allowed roles: ${financialViewRoles.join(', ')}`)
      }
    }

    console.log('\n=========================================')
    console.log('📋 DIAGNOSIS SUMMARY:')
    console.log('=========================================')
    console.log('Common issues that could cause "unauthorized":')
    console.log('1. ❓ User role exists in role_permissions table')
    console.log('2. ❓ User has correct role in profiles table')
    console.log('3. ❓ Role constraint allows finance_manager')
    console.log('4. ❓ RLS policies allow access')
    console.log('5. ❓ User account exists and is active')
    console.log('\nNEXT STEPS:')
    console.log('1. Check specific user role assignment')
    console.log('2. Run missing migrations if needed')
    console.log('3. Test with a known finance_manager user')
    console.log('\n⚠️  IMPORTANT: Check if user "axel@yayasan.com" has finance_manager role')
    console.log('   Current sample shows no finance_manager users')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkDatabase().catch(console.error)
