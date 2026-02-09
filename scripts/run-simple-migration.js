#!/usr/bin/env node

/**
 * Simple migration runner using direct PostgreSQL connection via Supabase connection string
 */

const { Client } = require('pg')
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase configuration in .env.local')
  console.error('   Perlu NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract database connection info from URL and key
// Supabase URL: https://saelrsljpneclsbfdxfy.supabase.co
// We need to construct the connection string
const getConnectionString = () => {
  // Service key is a JWT, we need the actual password
  // For Supabase, we can use the service role key as password
  const url = new URL(supabaseUrl)
  const host = url.hostname
  // Supabase uses port 5432 for PostgreSQL
  const port = 5432
  // Database name is usually 'postgres'
  const database = 'postgres'
  // Username is 'postgres' for service role
  const user = 'postgres'
  // Password is the service role key
  const password = supabaseServiceKey
  
  return `postgresql://${user}:${password}@db.${host}:${port}/${database}`
}

async function runMigration(migrationPath) {
  console.log('🚀 Running Simple Migration via PostgreSQL Direct')
  console.log('==================================================\n')

  // Read migration SQL file
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ File migration tidak ditemukan: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(`📄 Migration file: ${path.basename(migrationPath)}`)
  console.log(`📏 Size: ${migrationSQL.length} characters\n`)
  
  const client = new Client({
    connectionString: getConnectionString(),
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Connected to Supabase database')
    
    // Execute the migration
    console.log('🔄 Executing migration...')
    const result = await client.query(migrationSQL)
    
    console.log('✅ Migration executed successfully!')
    console.log('Result:', result)
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Disconnected from database')
  }
}

// Get migration file from command line arguments
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage: node scripts/run-simple-migration.js <migration_file>')
  console.log('')
  console.log('Example:')
  console.log('  node scripts/run-simple-migration.js supabase/migrations/202602050651_add_nama_pendamping_simple.sql')
  process.exit(0)
}

const migrationFile = args[0]
runMigration(migrationFile).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})