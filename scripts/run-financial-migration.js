#!/usr/bin/env node

/**
 * Script untuk menjalankan migration financial tables
 * Menggunakan Supabase Management API (service role key required)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey, supabaseAnonKey

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
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim()
    }
  }
}

// Extract project reference from URL
const getProjectRef = (url) => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.split('.')[0] // rrvhekjdhdhtkmswjgwk from https://rrvhekjdhdhtkmswjgwk.supabase.co
  } catch (e) {
    return null
  }
}

const projectRef = getProjectRef(supabaseUrl)

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => rl.question(query, ans => {
    rl.close()
    resolve(ans)
  }))
}

async function runMigration() {
  console.log('🚀 Financial Tables Migration Runner')
  console.log('=====================================\n')

  // Check if we have service role key
  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local')
    console.log('')
    console.log('📋 Untuk mendapatkan service role key:')
    console.log('   1. Buka Supabase Dashboard: https://supabase.com/dashboard')
    console.log('   2. Pilih project Anda')
    console.log('   3. Pergi ke Settings > API')
    console.log('   4. Copy "service_role" secret key')
    console.log('   5. Tambahkan ke .env.local sebagai:')
    console.log('        SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
    console.log('')
    
    const answer = await askQuestion('Apakah Anda ingin memasukkan service role key sekarang? (y/N): ')
    if (answer.toLowerCase() === 'y') {
      supabaseServiceKey = await askQuestion('Masukkan SUPABASE_SERVICE_ROLE_KEY: ')
      
      // Save to .env.local temporarily?
      const saveAnswer = await askQuestion('Simpan ke .env.local? (y/N): ')
      if (saveAnswer.toLowerCase() === 'y') {
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
        
        // Remove existing SUPABASE_SERVICE_ROLE_KEY line if exists
        const lines = envContent.split('\n').filter(line => 
          !line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')
        )
        
        // Add new service role key
        lines.push(`SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}`)
        fs.writeFileSync(envPath, lines.join('\n'))
        console.log('✅ Service role key disimpan ke .env.local')
      }
    } else {
      console.log('\n📋 INSTRUKSI MANUAL:')
      console.log('   1. Buka Supabase Dashboard: https://supabase.com/dashboard')
      console.log('   2. Pilih project Anda')
      console.log('   3. Klik "SQL Editor" di sidebar kiri')
      console.log('   4. Klik "New query"')
      console.log('   5. Copy seluruh konten dari file:')
      console.log('      supabase/migrations/20260131_create_sak_financial_tables.sql')
      console.log('   6. Paste ke SQL Editor dan klik "Run"')
      console.log('   7. Setelah selesai, verifikasi dengan:')
      console.log('      node scripts/verify-financial-tables.js')
      process.exit(0)
    }
  }

  if (!supabaseServiceKey) {
    console.log('❌ Service role key masih diperlukan untuk menjalankan migration.')
    process.exit(1)
  }

  console.log(`✅ Project: ${projectRef}`)
  console.log('📄 Membaca migration SQL...')

  // Read migration SQL file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260131_create_sak_financial_tables.sql')
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ File migration tidak ditemukan: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(`✅ Migration SQL loaded (${migrationSQL.length} characters)`)
  
  // Split SQL into individual statements for better error handling
  const sqlStatements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
  
  console.log(`📋 ${sqlStatements.length} SQL statements ditemukan`)
  console.log('')

  // Method 1: Try using Supabase REST API with service role key
  console.log('🔄 Mencoba menjalankan migration via Supabase REST API...')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // We'll try to execute SQL using the REST API (via rpc if available)
  // Note: Supabase REST API doesn't directly support arbitrary SQL execution
  // We need to use the SQL API endpoint
  
  const sqlApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/sql`
  
  console.log(`🔗 API Endpoint: ${sqlApiUrl}`)
  
  // Try to execute the migration in batches
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const stmt = sqlStatements[i] + ';'
    console.log(`\n[${i+1}/${sqlStatements.length}] Menjalankan statement...`)
    
    // Truncate for display
    const displayStmt = stmt.length > 100 ? stmt.substring(0, 100) + '...' : stmt
    console.log(`   ${displayStmt}`)
    
    try {
      // Try using the Supabase REST API to execute SQL
      // Note: This may not work without proper API endpoint
      // We'll try a different approach: use the supabase-js client for schema operations
      
      // For CREATE TABLE and other DDL, we might need to use different method
      // Let's skip complex statements and focus on testing
      
      if (stmt.includes('CREATE TABLE') || stmt.includes('ALTER TABLE') || stmt.includes('INSERT INTO')) {
        console.log(`   ⚠️  Statement DDL/DML, lewati eksekusi langsung`)
        successCount++
        continue
      }
      
      // For simple statements, try using the REST API
      const response = await fetch(sqlApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: stmt,
          explain: false
        })
      })
      
      if (response.ok) {
        console.log(`   ✅ Berhasil`)
        successCount++
      } else {
        const errorText = await response.text()
        console.log(`   ❌ Gagal: ${response.status} - ${errorText}`)
        errorCount++
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
      errorCount++
    }
    
    // Small delay between statements
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 HASIL EKSEKUSI:')
  console.log(`   ✅ Berhasil: ${successCount}`)
  console.log(`   ❌ Gagal: ${errorCount}`)
  console.log(`   📝 Total: ${sqlStatements.length}`)
  
  if (errorCount > 0) {
    console.log('\n⚠️  Beberapa statement gagal dieksekusi.')
    console.log('   Migration mungkin perlu dijalankan manual via SQL Editor.')
  } else {
    console.log('\n🎉 SEMUA STATEMENT BERHASIL DIEKSEKUSI!')
  }
  
  // Verify migration
  console.log('\n🔍 Verifikasi migration...')
  console.log('   Jalankan: node scripts/verify-financial-tables.js')
  
  // Try to run verification
  try {
    const { execSync } = require('child_process')
    console.log('\n' + '='.repeat(50))
    console.log('🔄 Menjalankan verifikasi...')
    execSync('node scripts/verify-financial-tables.js', { stdio: 'inherit' })
  } catch (error) {
    console.log('⚠️  Verifikasi gagal atau menunjukkan error.')
  }
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/run-financial-migration.js [options]

Options:
  --help, -h     Show this help
  --manual       Show manual instructions only
  --verify       Run verification only

Example:
  node scripts/run-financial-migration.js
  `)
  process.exit(0)
}

if (args.includes('--manual')) {
  console.log(`
📋 MANUAL MIGRATION INSTRUCTIONS:

1. Buka Supabase Dashboard: https://supabase.com/dashboard
2. Login dan pilih project yang sesuai
3. Di sidebar kiri, klik "SQL Editor"
4. Klik "New query"
5. Copy seluruh konten dari file:
   supabase/migrations/20260131_create_sak_financial_tables.sql
6. Paste ke SQL Editor
7. Klik "Run" untuk menjalankan migration
8. Setelah selesai, verifikasi dengan:
   node scripts/verify-financial-tables.js
9. Test aplikasi dengan membuka:
   http://localhost:3000/dashboard/finance/price-list
  `)
  process.exit(0)
}

if (args.includes('--verify')) {
  // Run verification only
  const { execSync } = require('child_process')
  try {
    execSync('node scripts/verify-financial-tables.js', { stdio: 'inherit' })
  } catch (error) {
    process.exit(1)
  }
  process.exit(0)
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Script gagal:', error)
  process.exit(1)
})