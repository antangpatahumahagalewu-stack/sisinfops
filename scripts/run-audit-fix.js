#!/usr/bin/env node

/**
 * Script to run the audit fix migration using Supabase service role key
 * This requires SUPABASE_SERVICE_ROLE_KEY to be set in .env.local
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase configuration in .env.local')
  console.error('   You need:')
  console.error('     NEXT_PUBLIC_SUPABASE_URL (already set)')
  console.error('     SUPABASE_SERVICE_ROLE_KEY (NOT SET)')
  console.error('')
  console.error('   To get the service role key:')
  console.error('   1. Go to your Supabase dashboard: https://supabase.com/dashboard')
  console.error('   2. Select your project')
  console.error('   3. Go to Settings > API')
  console.error('   4. Copy the "service_role" secret key')
  console.error('   5. Add it to .env.local as:')
  console.error('        SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
  console.error('')
  console.error('   ⚠️  WARNING: The service role key bypasses Row Level Security!')
  console.error('   Keep it secure and never expose it to the client.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running audit fix migration...')
  console.log('====================================\n')

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260132_audit_final_fix.sql')
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log('📄 Migration SQL to execute:')
  console.log('----------------------------------------')
  console.log(migrationSQL.substring(0, 500) + '...')
  console.log('----------------------------------------')
  console.log(`(Full SQL: ${migrationPath})`)
  console.log('')

  // Check if we can run SQL via RPC
  console.log('1. Checking if we can execute SQL...')
  
  try {
    // Try to run the SQL via the supabase REST API (using rpc if available)
    // Note: Supabase REST API doesn't directly support arbitrary SQL execution
    // We'll need to use the SQL Editor API or pgREST functions
    
    // Alternative: Use the Supabase Management API or direct PostgreSQL connection
    // For simplicity, we'll provide instructions instead
    
    console.log('❌ Direct SQL execution not supported via REST API')
    console.log('')
    console.log('📋 MANUAL INSTRUCTIONS:')
    console.log('   1. Go to your Supabase dashboard: https://supabase.com/dashboard')
    console.log('   2. Select your project')
    console.log('   3. Go to SQL Editor')
    console.log('   4. Copy and paste the SQL from the migration file:')
    console.log(`      ${migrationPath}`)
    console.log('   5. Run the SQL')
    console.log('   6. After running, test the edit form again')
    console.log('')
    console.log('💡 TIP: You can also use the Supabase CLI:')
    console.log('      supabase db reset   # Resets database and runs all migrations')
    console.log('      Or manually apply just this migration')
    
    // Try a simpler approach: test if the fix is already applied
    console.log('')
    console.log('🔍 Checking current audit_log structure...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'audit_log')
      .eq('column_name', 'record_id')
    
    if (columnsError) {
      console.log('   ⚠️  Cannot check column info:', columnsError.message)
    } else if (columns && columns.length > 0) {
      console.log(`   ✅ audit_log.record_id is currently: ${columns[0].data_type.toUpperCase()}`)
      if (columns[0].data_type === 'text') {
        console.log('   🎉 The fix is already applied!')
      } else {
        console.log(`   🔧 Need to change from ${columns[0].data_type.toUpperCase()} to TEXT`)
      }
    } else {
      console.log('   ⚠️  audit_log table or record_id column not found')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

runMigration().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})