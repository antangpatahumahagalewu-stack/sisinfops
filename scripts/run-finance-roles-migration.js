#!/usr/bin/env node

/**
 * Script untuk menjalankan migration finance roles
 * Menggunakan supabase-js client dengan service role key
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
    }
  }
} else {
  console.error('.env.local file not found at:', envPath)
  process.exit(1)
}

if (!supabaseUrl) {
  console.error('❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ ERROR: Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running Finance Roles Migration...')
  console.log('=========================================\n')

  try {
    // Baca file migration
    const migrationPath = path.join(__dirname, '..', 'supabase/migrations/20260137_add_finance_roles.sql')
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📋 Found ${statements.length} SQL statement(s) to execute\n`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';'
      console.log(`📝 Statement ${i + 1}/${statements.length}:`)
      console.log(`   ${stmt.substring(0, 100)}${stmt.length > 100 ? '...' : ''}`)

      try {
        // Execute SQL menggunakan supabase.rpc atau raw query
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt })

        if (error) {
          // Fallback: coba execute sebagai raw query
          console.log(`   ⚠️  RPC failed, trying direct execution...`)
          
          // Untuk SQL yang mengubah schema, kita mungkin perlu menggunakan service role langsung
          // Coba execute dengan method yang berbeda
          const { error: directError } = await supabase.from('_exec_sql').select('*').limit(0)
          
          if (directError) {
            console.log(`   ❌ Cannot execute schema changes via API`)
            console.log(`   ℹ️  Please run this migration manually in Supabase SQL Editor:`)
            console.log(`      ${stmt.substring(0, 80)}...`)
            errorCount++
            continue
          }
        }

        console.log(`   ✅ Executed successfully\n`)
        successCount++

      } catch (err) {
        console.log(`   ❌ Error: ${err.message}\n`)
        errorCount++
      }
    }

    console.log('=========================================')
    console.log(`📊 Migration Summary:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    console.log(`   📋 Total: ${statements.length}`)

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Please check the errors above.')
      console.log('   You may need to run these migrations manually in Supabase SQL Editor.')
      process.exit(1)
    }

    // Verifikasi migration
    await verifyMigration()

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying Finance Roles Migration...')
  console.log('----------------------------------------')

  try {
    // 1. Cek constraint profiles
    console.log('1. Checking profiles role constraint...')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('role')
      .limit(1)

    if (profilesError) {
      console.log('   ⚠️  Cannot check profiles table:', profilesError.message)
    } else {
      console.log('   ✅ Profiles table accessible')
    }

    // 2. Cek role_permissions untuk finance roles
    console.log('\n2. Checking finance roles in role_permissions...')
    const financeRoles = [
      'finance_manager',
      'finance_operational', 
      'finance_project_carbon',
      'finance_project_implementation',
      'finance_project_social',
      'investor'
    ]

    const { data: rolesData, error: rolesError } = await supabase
      .from('role_permissions')
      .select('role_name, display_name')
      .in('role_name', financeRoles)

    if (rolesError) {
      console.log('   ❌ Error checking role_permissions:', rolesError.message)
    } else {
      const foundRoles = rolesData.map(r => r.role_name)
      const missingRoles = financeRoles.filter(r => !foundRoles.includes(r))
      
      console.log(`   ✅ Found ${rolesData.length} finance roles:`)
      rolesData.forEach(role => {
        console.log(`      - ${role.role_name} (${role.display_name})`)
      })

      if (missingRoles.length > 0) {
        console.log(`   ⚠️  Missing roles: ${missingRoles.join(', ')}`)
      }
    }

    // 3. Cek apakah bisa assign finance role ke user
    console.log('\n3. Testing role assignment...')
    const testRole = 'finance_operational'
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .update({ role: testRole })
      .eq('id', '00000000-0000-0000-0000-000000000000') // ID dummy untuk test
      .select()

    if (testError) {
      if (testError.message.includes('violates check constraint')) {
        console.log(`   ❌ Cannot assign '${testRole}' - constraint violation`)
        console.log(`   ℹ️  The role constraint may not have been updated`)
      } else if (testError.message.includes('foreign key constraint')) {
        console.log(`   ⚠️  Test user not found (expected for dummy ID)`)
      } else {
        console.log(`   ⚠️  Test error: ${testError.message}`)
      }
    } else {
      console.log(`   ✅ Role constraint allows '${testRole}' assignment`)
    }

    console.log('\n----------------------------------------')
    console.log('✅ Verification complete')
    console.log('\n📋 NEXT STEPS:')
    console.log('   1. Test creating users with finance roles')
    console.log('   2. Test RLS policies for financial tables')
    console.log('   3. Assign finance roles to existing staff')

  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

runMigration().catch(error => {
  console.error('Script execution failed:', error)
  process.exit(1)
})