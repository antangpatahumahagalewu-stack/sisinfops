#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMasbob() {
  console.log('🔍 Checking user masbob@yamal.com...')
  console.log('=========================================\n')

  try {
    // 1. Find user by email
    console.log('1. Searching for user masbob@yamal.com...')
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
      perPage: 100
    })
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message)
      return
    }
    
    const masbob = userData.users.find(u => u.email === 'masbob@yamal.com')
    if (!masbob) {
      console.error('❌ User masbob@yamal.com not found in auth.users')
      
      // List all users to help debug
      console.log('\nAvailable users:')
      userData.users.slice(0, 10).forEach(user => {
        console.log(`   - ${user.email} (${user.id})`)
      })
      return
    }
    
    console.log(`✅ User found: ${masbob.email} (${masbob.id})`)
    console.log(`   Created: ${masbob.created_at}`)
    console.log(`   Last sign in: ${masbob.last_sign_in_at}`)
    
    // 2. Check profile
    console.log('\n2. Checking profile data...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, created_at, updated_at')
      .eq('id', masbob.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message)
      
      // Check if profile exists at all
      const { data: anyProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .limit(1)
      
      console.log(`\nℹ️  Sample profile check: ${anyProfile ? 'Profiles table exists' : 'Cannot access profiles'}`)
      return
    }
    
    console.log(`✅ Profile found:`)
    console.log(`   Role: ${profileData.role}`)
    console.log(`   Full name: ${profileData.full_name}`)
    console.log(`   Updated: ${profileData.updated_at}`)
    
    // 3. Check permissions for this role
    console.log('\n3. Checking permissions for role:', profileData.role)
    
    const { data: rolePermData, error: rolePermError } = await supabase
      .from('role_permissions')
      .select('role_name, display_name, permissions')
      .eq('role_name', profileData.role)
      .single()
    
    if (rolePermError) {
      console.error('❌ Error fetching role permissions:', rolePermError.message)
    } else {
      console.log(`✅ Role permissions:`)
      console.log(`   Display name: ${rolePermData.display_name}`)
      console.log(`   Permissions: ${JSON.stringify(rolePermData.permissions, null, 2)}`)
    }
    
    // 4. Test FINANCIAL_VIEW permission logic
    console.log('\n4. Testing FINANCIAL_VIEW permission...')
    const financialViewRoles = ['admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                               'finance_project_implementation', 'finance_project_social', 'investor',
                               'monev', 'monev_officer', 'program_planner', 'carbon_specialist']
    
    const hasFinancialView = financialViewRoles.includes(profileData.role)
    console.log(`   Role '${profileData.role}' in FINANCIAL_VIEW roles: ${hasFinancialView}`)
    
    if (!hasFinancialView) {
      console.log(`   ❌ Role '${profileData.role}' is NOT allowed to view finance pages!`)
      console.log(`   Allowed roles: ${financialViewRoles.join(', ')}`)
    } else {
      console.log(`   ✅ Role '${profileData.role}' CAN view finance pages`)
    }
    
    // 5. Check other finance permissions
    console.log('\n5. Checking other finance permissions...')
    const financePermissions = {
      'FINANCIAL_VIEW': ['admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                         'finance_project_implementation', 'finance_project_social', 'investor',
                         'monev', 'monev_officer', 'program_planner', 'carbon_specialist'],
      'FINANCIAL_BUDGET_MANAGE': ['admin', 'finance_manager', 'finance_operational'],
      'FINANCIAL_TRANSACTION_CREATE': ['admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                                       'finance_project_implementation', 'finance_project_social'],
      'FINANCIAL_REPORT_VIEW': ['admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                                'finance_project_implementation', 'finance_project_social', 'investor',
                                'monev', 'monev_officer', 'program_planner', 'carbon_specialist']
    }
    
    Object.entries(financePermissions).forEach(([perm, roles]) => {
      const hasPerm = roles.includes(profileData.role)
      console.log(`   ${perm}: ${hasPerm ? '✅' : '❌'} (${hasPerm ? 'Allowed' : 'Not allowed'})`)
    })
    
    // 6. Test database access for finance_manager
    console.log('\n6. Testing database access...')
    if (profileData.role === 'finance_manager') {
      console.log('   Testing financial_transactions access...')
      const { data: txData, error: txError } = await supabase
        .from('financial_transactions')
        .select('id')
        .limit(1)
      
      if (txError) {
        console.log(`   ❌ Cannot access financial_transactions: ${txError.message}`)
      } else {
        console.log(`   ✅ Can access financial_transactions (found ${txData?.length || 0} records)`)
      }
    }
    
    console.log('\n=========================================')
    console.log('📋 DIAGNOSIS SUMMARY:')
    console.log('=========================================')
    console.log(`User: masbob@yamal.com`)
    console.log(`Role: ${profileData.role}`)
    console.log(`Has FINANCIAL_VIEW: ${hasFinancialView ? '✅ YES' : '❌ NO'}`)
    
    if (!hasFinancialView) {
      console.log('\n🔥 PROBLEM IDENTIFIED:')
      console.log(`   User role '${profileData.role}' is not in FINANCIAL_VIEW permission list!`)
      console.log(`   This is why they get "unauthorized" error.`)
      console.log('\n💡 SOLUTION:')
      console.log(`   Update user role to one of: ${financialViewRoles.filter(r => r.includes('finance')).join(', ')}`)
      console.log(`   OR add '${profileData.role}' to FINANCIAL_VIEW permission in lib/auth/rbac.ts`)
    } else {
      console.log('\n⚠️  POTENTIAL ISSUES:')
      console.log(`   1. Session cache - user needs to logout/login`)
      console.log(`   2. RLS policies not applied`)
      console.log(`   3. Frontend permission check mismatch`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkMasbob().catch(console.error)