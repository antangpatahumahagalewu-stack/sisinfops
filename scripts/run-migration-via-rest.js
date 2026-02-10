#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

// Extract project reference from URL
const projectRef = supabaseUrl.split('//')[1].split('.')[0]
console.log('Project Reference:', projectRef)

async function runMigration() {
  console.log('🚀 Running Migration via Supabase REST API')
  console.log('==========================================\n')
  
  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '202602100831_add_kabupaten_luas_total.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(`📄 Migration file: ${path.basename(migrationPath)}`)
  console.log(`📏 Size: ${migrationSQL.length} characters\n`)
  
  // Use Supabase REST API to execute SQL
  // Note: This uses the SQL API endpoint
  const sqlApiUrl = `https://${projectRef}.supabase.co/rest/v1/`
  
  console.log('⚠️  WARNING: Supabase REST API does not support arbitrary SQL execution.')
  console.log('   You need to use the Supabase Dashboard SQL Editor or Supabase CLI.')
  console.log('\n📋 Please run this SQL manually:')
  console.log('\n--- COPY THE SQL BELOW AND RUN IN SUPABASE DASHBOARD ---\n')
  console.log(migrationSQL)
  console.log('\n--- END OF SQL ---\n')
  
  console.log('📋 Instructions:')
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql-editor')
  console.log('2. Create new query')
  console.log('3. Paste the SQL above')
  console.log('4. Click "Run"')
  console.log('5. Wait for execution to complete')
}

runMigration().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})