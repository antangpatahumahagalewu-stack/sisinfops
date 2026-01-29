#!/usr/bin/env node

/**
 * Script untuk menjalankan migration SQL ke Supabase menggunakan Management API
 * Menggunakan service role key untuk mengakses SQL API
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase configuration in .env.local')
  console.error('   Perlu NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract project reference from URL (rrvhekjdhdhtkmswjgwk from https://rrvhekjdhdhtkmswjgwk.supabase.co)
const getProjectRef = (url) => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.split('.')[0]
  } catch (e) {
    console.error('❌ Invalid Supabase URL:', url)
    process.exit(1)
  }
}

const projectRef = getProjectRef(supabaseUrl)
console.log(`✅ Project Reference: ${projectRef}`)

// Supabase Management API endpoint for SQL execution
const sqlApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/sql`

async function executeSQL(sql) {
  console.log('🔄 Executing SQL via Management API...')
  
  try {
    const response = await fetch(sqlApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
      },
      body: JSON.stringify({
        query: sql,
        explain: false
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error (${response.status}):`, errorText)
      return false
    }
    
    const result = await response.json()
    console.log('✅ SQL executed successfully')
    return true
  } catch (error) {
    console.error('❌ Network error:', error.message)
    return false
  }
}

async function runMigration(migrationPath) {
  console.log('🚀 Running SQL Migration via Supabase Management API')
  console.log('=====================================================\n')

  // Read migration SQL file
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ File migration tidak ditemukan: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(`📄 Migration file: ${path.basename(migrationPath)}`)
  console.log(`📏 Size: ${migrationSQL.length} characters\n`)
  
  // Untuk keamanan, tampilkan preview
  const previewLines = migrationSQL.split('\n').slice(0, 10).join('\n')
  console.log('📝 Preview (10 first lines):')
  console.log(previewLines)
  if (migrationSQL.split('\n').length > 10) {
    console.log('...')
  }
  console.log('')

  // Konfirmasi (opsional, bisa di-skip untuk automation)
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('🚨 Apakah Anda yakin ingin menjalankan migration ini? (y/N): ', async (answer) => {
      rl.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Migration dibatalkan')
        process.exit(0)
      }
      
      console.log('\n🔄 Menjalankan migration...')
      
      try {
        // Execute the entire SQL file as one query
        const success = await executeSQL(migrationSQL)
        
        if (success) {
          console.log('\n🎉 MIGRATION BERHASIL!')
          console.log('   Views security definer telah diperbaiki.')
          
          // Verification
          console.log('\n🔍 Verifikasi...')
          console.log('   Untuk memastikan migration berhasil:')
          console.log('   1. Buka Supabase Dashboard: https://supabase.com/dashboard')
          console.log('   2. Pilih project Anda')
          console.log('   3. Pergi ke Database → SQL Editor')
          console.log('   4. Jalankan query:')
          console.log('      SELECT schemaname, viewname, security_invoker FROM pg_views')
          console.log('      WHERE schemaname = \'public\' AND viewname LIKE \'%view%\';')
          console.log('   5. Pastikan kolom security_invoker bernilai TRUE')
          
          console.log('\n📋 Atau jalankan verifikasi script:')
          console.log('   node scripts/verify-financial-tables.js')
        } else {
          console.log('\n❌ MIGRATION GAGAL')
          console.log('   Coba jalankan manual:')
          console.log('   1. Buka: https://supabase.com/dashboard')
          console.log('   2. Pilih project → SQL Editor')
          console.log('   3. Copy seluruh konten dari file migration')
          console.log('   4. Paste dan klik "Run"')
        }
        
        resolve(success)
      } catch (error) {
        console.error('❌ Migration error:', error)
        resolve(false)
      }
    })
  })
}

// Get migration file from command line arguments
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage: node scripts/run-sql-migration.js <migration_file>')
  console.log('')
  console.log('Available migration files:')
  console.log('  1. supabase/migrations/20260131_create_sak_financial_tables.sql')
  console.log('  2. supabase/migrations/20260136_fix_security_definer_views.sql')
  console.log('')
  console.log('Example:')
  console.log('  node scripts/run-sql-migration.js supabase/migrations/20260136_fix_security_definer_views.sql')
  console.log('')
  console.log('Note: Requires SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(0)
}

const migrationFile = args[0]
runMigration(migrationFile).then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})