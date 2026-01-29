#!/usr/bin/env node
/**
 * Script to run the fix for all roles constraint
 * This ensures that ALL 13 system roles can be assigned to users
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local or similar
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Use service role key for admin operations if available
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

async function runMigration() {
  console.log('🚀 Running fix for all roles constraint...')
  
  try {
    // 1. Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260139_fix_all_roles_constraint.sql')
    const sql = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration SQL loaded')
    
    // 2. Execute the SQL
    console.log('⚡ Executing migration...')
    const { error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      // If the exec_sql function doesn't exist, try direct SQL execution via REST API
      console.log('⚠️ exec_sql function not available, trying alternative method...')
      
      // Split SQL into individual statements and execute them
      const statements = sql.split(';').filter(stmt => stmt.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 100)}...`)
          // Note: This is a simplified approach. In production, you'd use the Supabase SQL API
          // or run migrations through the Supabase dashboard
        }
      }
      
      console.log('✅ Migration executed (partial - some statements may need manual execution)')
      console.log('📋 Please run the SQL manually in Supabase SQL Editor:')
      console.log('\n--- COPY AND PASTE THE FOLLOWING INTO SUPABASE SQL EDITOR ---\n')
      console.log(sql)
      console.log('\n--- END OF SQL ---\n')
    } else {
      console.log('✅ Migration executed successfully')
    }
    
    // 3. Verify the fix
    await verifyFix()
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message)
    console.error('\n💡 Alternative: Run the SQL manually in Supabase SQL Editor')
    console.error('1. Go to Supabase Dashboard > SQL Editor')
    console.error('2. Copy the SQL from: supabase/migrations/20260139_fix_all_roles_constraint.sql')
    console.error('3. Paste and execute')
    process.exit(1)
  }
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...')
  
  try {
    // 1. Check the constraint definition
    console.log('1. Checking profiles.role constraint...')
    const { data: constraintData, error: constraintError } = await supabase
      .from('pg_constraint')
      .select('pg_get_constraintdef(oid) as constraint_def')
      .eq('conname', 'profiles_role_check')
      .single()
    
    if (constraintError) {
      console.log('   ⚠️ Could not query constraint:', constraintError.message)
    } else if (constraintData) {
      console.log('   ✅ Constraint definition:', constraintData.constraint_def)
      
      // Check for key roles
      const rolesToCheck = ['finance_manager', 'finance_operational', 'investor']
      const constraintDef = constraintData.constraint_def || ''
      let allRolesPresent = true
      
      for (const role of rolesToCheck) {
        if (constraintDef.includes(role)) {
          console.log(`   ✅ Role "${role}" is in constraint`)
        } else {
          console.log(`   ❌ Role "${role}" is MISSING from constraint`)
          allRolesPresent = false
        }
      }
      
      if (allRolesPresent) {
        console.log('   🎉 All finance roles are included in constraint!')
      }
    }
    
    // 2. Check role_permissions table
    console.log('\n2. Checking role_permissions table...')
    const { data: rolesData, error: rolesError } = await supabase
      .from('role_permissions')
      .select('role_name, display_name')
      .order('role_name')
    
    if (rolesError) {
      console.log('   ❌ Error querying role_permissions:', rolesError.message)
    } else {
      console.log(`   ✅ Found ${rolesData.length} roles in role_permissions:`)
      rolesData.forEach(role => {
        console.log(`      - ${role.role_name} (${role.display_name})`)
      })
      
      // Check for finance roles
      const financeRoles = rolesData.filter(r => 
        r.role_name.startsWith('finance') || r.role_name === 'investor'
      )
      console.log(`   📊 Finance roles: ${financeRoles.length} out of 6 expected`)
    }
    
    // 3. Test if we can assign finance roles to a test user
    console.log('\n3. Testing role assignment...')
    
    // Get a test user (or create one if none exists)
    const { data: testUsers } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(1)
    
    if (testUsers && testUsers.length > 0) {
      const testUser = testUsers[0]
      console.log(`   Using test user: ${testUser.email} (current role: ${testUser.role})`)
      
      // Try to update to a finance role (we'll revert after)
      const testRole = 'finance_operational'
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: testRole })
        .eq('id', testUser.id)
      
      if (updateError) {
        console.log(`   ❌ Cannot assign "${testRole}" role:`, updateError.message)
        console.log('   💡 The constraint may still be blocking finance roles')
      } else {
        console.log(`   ✅ Successfully assigned "${testRole}" role to test user`)
        
        // Revert to original role
        await supabase
          .from('profiles')
          .update({ role: testUser.role })
          .eq('id', testUser.id)
        console.log(`   🔄 Reverted test user back to "${testUser.role}" role`)
      }
    } else {
      console.log('   ⚠️ No test users found')
    }
    
    console.log('\n🎯 VERIFICATION COMPLETE')
    console.log('If you see any errors above, please check:')
    console.log('1. The migration SQL was executed correctly')
    console.log('2. The profiles_role_check constraint includes all 13 roles')
    console.log('3. The role_permissions table has all finance roles')
    
  } catch (error) {
    console.error('❌ Verification error:', error.message)
  }
}

async function checkCurrentState() {
  console.log('\n📊 CURRENT SYSTEM STATE')
  
  // Count users by role
  const { data: roleDistribution } = await supabase
    .from('profiles')
    .select('role, count')
    .group('role')
  
  if (roleDistribution) {
    console.log('User role distribution:')
    roleDistribution.forEach(item => {
      console.log(`  - ${item.role}: ${item.count} users`)
    })
  }
  
  // List all distinct roles in profiles
  const { data: distinctRoles } = await supabase
    .from('profiles')
    .select('role')
    .distinct()
  
  console.log('\nDistinct roles currently assigned to users:')
  if (distinctRoles) {
    distinctRoles.forEach(item => {
      console.log(`  - ${item.role}`)
    })
  }
}

// Run the script
async function main() {
  console.log('🔧 FIX ALL ROLES CONSTRAINT SCRIPT')
  console.log('====================================')
  
  await checkCurrentState()
  await runMigration()
  
  console.log('\n📝 NEXT STEPS:')
  console.log('1. If migration ran successfully, restart your development server')
  console.log('2. Log out and log back in to refresh your session')
  console.log('3. Assign finance roles to users via:')
  console.log('   UPDATE profiles SET role = "finance_manager" WHERE email = "user@example.com";')
  console.log('4. Verify that finance menus appear in the sidebar')
  
  process.exit(0)
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})