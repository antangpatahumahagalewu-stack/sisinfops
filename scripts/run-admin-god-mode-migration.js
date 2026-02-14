#!/usr/bin/env node

/**
 * Script untuk menjalankan migration admin god mode policies
 * Menggunakan service role key untuk bypass semua restrictions
 */

const fs = require('fs')
const path = require('path')

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && !line.startsWith('#')) {
      supabaseServiceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
    }
  }
}

// Fallback to direct SQL execution if no service key
if (!supabaseUrl) {
  console.error('❌ ERROR: Missing Supabase URL in .env.local')
  console.error('   Perlu NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

console.log('🚀 ADMIN GOD MODE MIGRATION SCRIPT')
console.log('====================================\n')

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '202602141000_admin_god_mode_policies.sql')

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`)
  process.exit(1)
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
console.log(`📄 Migration file: ${path.basename(migrationPath)}`)
console.log(`📏 Size: ${migrationSQL.length} characters\n`)

// Show important parts of the migration
console.log('📝 IMPORTANT CHANGES:')
console.log('1. Creates god_mode_audit table for tracking all admin actions')
console.log('2. Adds admin bypass policies to ALL tables in the database')
console.log('3. Creates utility functions for admin (is_admin_user, get_database_stats, admin_query_readonly)')
console.log('4. Adds triggers to log admin actions on critical tables')
console.log('5. Makes audit logs immutable (read-only even for admin)')
console.log('')

async function executeViaSupabaseSQL() {
  console.log('🔄 Executing via Supabase SQL API...')
  
  // Extract project reference from URL
  const getProjectRef = (url) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.split('.')[0]
    } catch (e) {
      console.error('❌ Invalid Supabase URL:', url)
      return null
    }
  }

  const projectRef = getProjectRef(supabaseUrl)
  if (!projectRef) {
    return false
  }

  const sqlApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/sql`

  try {
    const response = await fetch(sqlApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
      },
      body: JSON.stringify({
        query: migrationSQL,
        explain: false
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error (${response.status}):`, errorText)
      return false
    }
    
    const result = await response.json()
    console.log('✅ SQL executed successfully via Management API')
    return true
  } catch (error) {
    console.error('❌ Network error:', error.message)
    return false
  }
}

async function showAlternativeMethods() {
  console.log('\n🔧 ALTERNATIVE EXECUTION METHODS:')
  console.log('====================================')
  console.log('\nMethod 1: Supabase Dashboard (Recommended)')
  console.log('1. Go to: https://supabase.com/dashboard')
  console.log('2. Select your project')
  console.log('3. Go to Database → SQL Editor')
  console.log('4. Copy the content of:')
  console.log(`   ${migrationPath}`)
  console.log('5. Paste and click "Run"')
  
  console.log('\nMethod 2: Supabase CLI')
  console.log('1. Install Supabase CLI: npm install -g supabase')
  console.log('2. Run: supabase db reset (if you want fresh start)')
  console.log(`3. Run: supabase db push ${migrationPath}`)
  
  console.log('\nMethod 3: Direct PSQL Connection')
  console.log('1. Get connection string from Supabase Dashboard')
  console.log('2. Run: psql "postgresql://..."')
  console.log(`3. Execute: \\i ${migrationPath}`)
  
  console.log('\n⚠️  IMPORTANT NOTES:')
  console.log('• This migration gives COMPLETE access to admin users')
  console.log('• All admin actions will be logged to god_mode_audit table')
  console.log('• Audit logs are read-only (even admin cannot modify them)')
  console.log('• Only users with role="admin" in profiles table will get these privileges')
}

async function main() {
  console.log('🔐 SECURITY WARNING:')
  console.log('This migration will grant ABSOLUTE access to admin users.')
  console.log('Admin can SELECT, INSERT, UPDATE, DELETE ALL data in ALL tables.')
  console.log('All actions will be logged, but cannot be prevented or restricted.\n')
  
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('🚨 Are you ABSOLUTELY sure you want to proceed? (yes/NO): ', async (answer) => {
      rl.close()
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled')
        showAlternativeMethods()
        process.exit(0)
      }
      
      console.log('\n🔄 Starting migration...')
      
      let success = false
      if (supabaseServiceKey) {
        console.log('🛡️  Using Supabase Service Role Key...')
        success = await executeViaSupabaseSQL()
      } else {
        console.log('⚠️  No SUPABASE_SERVICE_ROLE_KEY found in .env.local')
        console.log('   Using alternative methods...')
      }
      
      if (!success) {
        console.log('\n❌ Automated execution failed or not available')
        showAlternativeMethods()
      } else {
        console.log('\n🎉 ADMIN GOD MODE MIGRATION COMPLETE!')
        console.log('=========================================')
        console.log('\n✅ WHAT WAS ENABLED:')
        console.log('1. Admin bypass policies for ALL tables')
        console.log('2. Admin action auditing system (god_mode_audit table)')
        console.log('3. Safe read-only query execution for admin')
        console.log('4. Database statistics function')
        console.log('5. Immutable audit logs (read-only)')
        
        console.log('\n🔍 VERIFICATION STEPS:')
        console.log('1. Restart your Next.js dev server')
        console.log('2. Login as admin user')
        console.log('3. Test accessing all data tables')
        console.log('4. Check god_mode_audit table for logs')
        console.log('5. Test utility functions via SQL Editor')
        
        console.log('\n📊 ADMIN UTILITIES AVAILABLE:')
        console.log('• SELECT * FROM get_database_stats() - Get DB statistics')
        console.log('• SELECT admin_query_readonly(\'SELECT * FROM profiles\') - Safe query exec')
        console.log('• SELECT * FROM god_mode_audit ORDER BY created_at DESC - View admin logs')
      }
      
      resolve(success)
    })
  })
}

main().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})