// Script untuk menjalankan SQL function creation menggunakan REST API
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function runSqlScript() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Environment variables missing')
    return
  }

  console.log('📁 Reading SQL script...')
  
  // Baca file SQL
  const sqlFilePath = path.join(__dirname, '..', 'scripts', 'ensure_user_function.sql')
  let sqlScript
  try {
    sqlScript = fs.readFileSync(sqlFilePath, 'utf8')
    console.log(`✅ Read SQL file: ${sqlFilePath}`)
    console.log(`📏 Script length: ${sqlScript.length} characters`)
  } catch (error) {
    console.error('❌ Failed to read SQL file:', error.message)
    return
  }

  // Split script menjadi beberapa bagian (PostgreSQL REST API punya limit)
  const sqlParts = splitSqlScript(sqlScript)
  
  console.log(`🔧 Executing ${sqlParts.length} SQL parts...`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < sqlParts.length; i++) {
    const part = sqlParts[i]
    if (!part.trim()) continue

    console.log(`\n--- Part ${i + 1}/${sqlParts.length} (${part.length} chars) ---`)
    console.log(part.substring(0, 200) + '...')

    try {
      // Gunakan REST API untuk execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql: part })
      })

      if (response.ok) {
        console.log(`✅ Part ${i + 1} executed successfully`)
        successCount++
      } else {
        const errorText = await response.text()
        console.log(`❌ Part ${i + 1} failed: ${response.status} - ${errorText.substring(0, 200)}`)
        errorCount++
      }
    } catch (error) {
      console.log(`❌ Part ${i + 1} error: ${error.message}`)
      errorCount++
    }

    // Tunggu sebentar antara eksekusi
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\n🎉 Execution completed: ${successCount} successful, ${errorCount} failed`)

  if (errorCount === 0) {
    console.log('\n✅ SQL functions created successfully!')
    console.log('\n📋 NEXT:')
    console.log('1. Restart development server: killall -9 node && npm run dev')
    console.log('2. Test user creation at /dashboard/user-management')
  } else {
    console.log('\n⚠️ Some parts failed. Manual execution recommended:')
    console.log('1. Open Supabase Dashboard → SQL Editor')
    console.log('2. Copy content from scripts/ensure_user_function.sql')
    console.log('3. Run manually')
  }
}

function splitSqlScript(script) {
  // Split by semicolon, but preserve function definitions
  const parts = []
  let currentPart = ''
  let inFunction = false
  let braceCount = 0

  const lines = script.split('\n')
  
  for (const line of lines) {
    currentPart += line + '\n'
    
    // Track function boundaries
    if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('$$ LANGUAGE')) {
      inFunction = !inFunction
    }
    
    if (line.includes('BEGIN')) braceCount++
    if (line.includes('END')) braceCount--
    
    // Split at appropriate points
    if (!inFunction && braceCount === 0 && line.trim().endsWith(';')) {
      parts.push(currentPart.trim())
      currentPart = ''
    }
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim())
  }

  return parts.filter(p => p.length > 10) // Filter out empty or very small parts
}

// Alternatif: Coba execute langsung menggunakan Supabase client (jika ada permission)
async function tryDirectExecution() {
  console.log('\n🔧 Trying direct SQL execution via REST...')
  
  const simpleSql = `
    -- Create simple test function
    CREATE OR REPLACE FUNCTION public.test_user_function()
    RETURNS TEXT AS $$
    BEGIN
      RETURN 'Test function created successfully';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: simpleSql })
    })

    console.log('Direct execution test:', response.status, response.statusText)
  } catch (error) {
    console.log('Direct execution failed:', error.message)
  }
}

// Main execution
async function main() {
  console.log('🚀 Creating SQL functions for user management...')
  console.log(`Supabase URL: ${supabaseUrl.substring(0, 30)}...`)
  console.log(`Service key: ${supabaseServiceKey ? 'Present' : 'Missing'}`)
  
  await runSqlScript()
  await tryDirectExecution()
  
  console.log('\n📋 MANUAL BACKUP INSTRUCTIONS:')
  console.log('If automated script fails, please:')
  console.log('1. Go to: https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql')
  console.log('2. Copy the content of scripts/ensure_user_function.sql')
  console.log('3. Paste into SQL Editor and click "Run"')
  console.log('4. Verify functions exist by running:')
  console.log('   SELECT proname FROM pg_proc WHERE proname LIKE \'create_user%\';')
}

main().catch(console.error)