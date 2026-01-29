#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrvhekjdhdhtkmswjgwk.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixFinanceAccess() {
  console.log('🔧 Fixing Finance Access Issues...')
  console.log('=========================================\n')

  try {
    // 1. Check current user 'axel@yayasan.com' role
    console.log('1. Checking user axel@yayasan.com...')
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      'd9900143-8763-437e-b975-6de0ef036adf'
    )
    
    if (userError) {
      console.error('❌ Error fetching user:', userError.message)
      return
    }
    
    console.log(`   User found: ${userData.user.email}`)
    
    // 2. Check current role in profiles table
    console.log('\n2. Checking current role in profiles table...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', userData.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message)
      // Try to create profile if doesn't exist
      console.log('   Attempting to create profile...')
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          role: 'finance_manager',
          full_name: userData.user.email.split('@')[0]
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating profile:', createError.message)
        return
      }
      console.log('✅ Profile created with finance_manager role')
    } else {
      console.log(`   Current role: ${profileData.role}`)
      console.log(`   Full name: ${profileData.full_name}`)
      
      // 3. Update role to finance_manager if not already
      if (profileData.role !== 'finance_manager') {
        console.log('\n3. Updating role to finance_manager...')
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'finance_manager' })
          .eq('id', userData.user.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('❌ Error updating role:', updateError.message)
          
          // Check if constraint is the issue
          if (updateError.message.includes('check constraint')) {
            console.log('   ⚠️  Constraint violation detected!')
            console.log('   Running migration to fix constraint...')
            await runMigration()
            
            // Try update again after migration
            console.log('   Retrying role update...')
            const { data: retryUpdate, error: retryError } = await supabase
              .from('profiles')
              .update({ role: 'finance_manager' })
              .eq('id', userData.user.id)
              .select()
              .single()
            
            if (retryError) {
              console.error('❌ Still cannot update role:', retryError.message)
            } else {
              console.log('✅ Role updated to finance_manager')
            }
          }
        } else {
          console.log('✅ Role updated to finance_manager')
        }
      } else {
        console.log('✅ User already has finance_manager role')
      }
    }
    
    // 4. Verify the update
    console.log('\n4. Verifying role update...')
    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', userData.user.id)
      .single()
    
    if (finalError) {
      console.error('❌ Error verifying profile:', finalError.message)
    } else {
      console.log(`   Verified role: ${finalProfile.role}`)
      if (finalProfile.role === 'finance_manager') {
        console.log('✅ SUCCESS: User now has finance_manager role')
      } else {
        console.log('❌ FAILED: User role is not finance_manager')
      }
    }
    
    // 5. Test permission check
    console.log('\n5. Testing permission check...')
    const financialViewRoles = ['admin', 'finance_manager', 'finance_operational', 'finance_project_carbon', 
                               'finance_project_implementation', 'finance_project_social', 'investor',
                               'monev', 'monev_officer', 'program_planner', 'carbon_specialist']
    
    const hasPermission = finalProfile && financialViewRoles.includes(finalProfile.role)
    console.log(`   User has FINANCIAL_VIEW permission: ${hasPermission}`)
    
    if (!hasPermission && finalProfile) {
      console.log(`   ⚠️  User role '${finalProfile.role}' is not in FINANCIAL_VIEW roles list`)
    }
    
    console.log('\n=========================================')
    console.log('📋 ACTION SUMMARY:')
    console.log('=========================================')
    console.log('User: axel@yayasan.com')
    console.log(`Final role: ${finalProfile ? finalProfile.role : 'unknown'}`)
    console.log(`Can access finance dashboard: ${hasPermission ? '✅ YES' : '❌ NO'}`)
    console.log('\nNEXT STEPS:')
    console.log('1. Log out and log back in as axel@yayasan.com')
    console.log('2. Try accessing http://localhost:3000/id/dashboard/finance')
    console.log('3. If still unauthorized, check RLS policies and migrations')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

async function runMigration() {
  console.log('\n   Running constraint fix migration...')
  
  // SQL to update the constraint
  const sql = `
    DO $$
    BEGIN
      -- Drop existing constraint if it exists
      ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
      
      -- Add new constraint with ALL roles
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN (
          'admin', 'monev', 'viewer', 'program_planner', 'program_implementer', 
          'carbon_specialist', 'monev_officer',
          'finance_manager', 'finance_operational', 'finance_project_carbon',
          'finance_project_implementation', 'finance_project_social', 'investor'
        ));
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
    END $$;
  `
  
  try {
    // Try to execute SQL via RPC if available
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (rpcError) {
      console.log('   ⚠️  Could not run migration via RPC:', rpcError.message)
      console.log('   ℹ️  Please run this SQL manually in Supabase SQL Editor:')
      console.log(sql)
    } else {
      console.log('   ✅ Migration executed via RPC')
    }
  } catch (error) {
    console.log('   ⚠️  Error running migration:', error.message)
    console.log('   ℹ️  Please run the migration manually from migration files:')
    console.log('   node scripts/run-finance-roles-migration.js')
  }
}

fixFinanceAccess().catch(console.error)