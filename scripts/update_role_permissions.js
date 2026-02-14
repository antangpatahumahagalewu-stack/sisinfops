#!/usr/bin/env node

/**
 * Script untuk mengupdate tabel role_permissions di Supabase
 * Mengupdate 11 role (kecuali admin) dengan data terbaru
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
  console.error('   Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract project reference from URL
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
  console.log('🔄 Executing SQL via Supabase Management API...')
  
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

async function verifyUpdate() {
  console.log('\n🔍 Verifying role permissions update...')
  
  const verifySQL = `
    SELECT 
      role_name,
      display_name,
      description,
      updated_at
    FROM role_permissions 
    WHERE role_name != 'admin'
    ORDER BY role_name;
  `
  
  try {
    // For verification, we'll use REST API directly
    const restUrl = `${supabaseUrl}/rest/v1/role_permissions?select=role_name,display_name,description,updated_at&role_name=neq.admin&order=role_name`
    
    const response = await fetch(restUrl, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    })
    
    if (!response.ok) {
      console.error(`❌ Verification API Error (${response.status}):`, await response.text())
      return false
    }
    
    const roles = await response.json()
    console.log(`📊 Found ${roles.length} non-admin roles:`)
    
    roles.forEach(role => {
      console.log(`   • ${role.role_name} - ${role.display_name}`)
      if (role.description) {
        console.log(`     ${role.description.substring(0, 60)}...`)
      }
      console.log(`     Updated: ${role.updated_at}`)
    })
    
    return roles.length === 11 // Should have 11 roles
  } catch (error) {
    console.error('❌ Verification error:', error.message)
    return false
  }
}

async function runUpdate() {
  console.log('🚀 Updating Role Permissions Table')
  console.log('=====================================\n')

  // Read SQL file
  const sqlFilePath = path.join(__dirname, 'update_role_permissions.sql')
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ SQL file not found: ${sqlFilePath}`)
    process.exit(1)
  }

  let migrationSQL = fs.readFileSync(sqlFilePath, 'utf8')
  console.log(`📄 SQL file: ${path.basename(sqlFilePath)}`)
  console.log(`📏 Size: ${migrationSQL.length} characters\n`)
  
  // Remove BEGIN and COMMIT for API compatibility
  migrationSQL = migrationSQL.replace(/^BEGIN;/gm, '')
  migrationSQL = migrationSQL.replace(/^COMMIT;/gm, '')
  
  // Show preview
  const previewLines = migrationSQL.split('\n').slice(0, 15).join('\n')
  console.log('📝 Preview (15 first lines):')
  console.log(previewLines)
  if (migrationSQL.split('\n').length > 15) {
    console.log('...')
  }
  console.log('')

  // List roles that will be updated
  console.log('📋 Roles to be updated (11 roles, excluding admin):')
  const roles = [
    'monev - Monitoring & Evaluasi',
    'viewer - Viewer',
    'program_planner - Program Planner',
    'program_implementer - Program Implementer',
    'carbon_specialist - Carbon Specialist',
    'finance_manager - Finance Manager',
    'finance_operational - Finance Operational',
    'finance_project_carbon - Finance Project Carbon',
    'finance_project_implementation - Finance Project Implementation',
    'finance_project_social - Finance Project Social',
    'investor - Investor'
  ]
  
  roles.forEach(role => console.log(`   • ${role}`))
  console.log('\n⚠️  Admin role will NOT be updated (left as is)\n')

  // Confirmation
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('🚨 Are you sure you want to update role permissions? (y/N): ', async (answer) => {
      rl.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Update cancelled')
        process.exit(0)
      }
      
      console.log('\n🔄 Running update...')
      
      try {
        // Execute the SQL
        const success = await executeSQL(migrationSQL)
        
        if (success) {
          console.log('\n✅ SQL executed successfully!')
          
          // Verify the update
          const verified = await verifyUpdate()
          
          if (verified) {
            console.log('\n🎉 ROLE PERMISSIONS UPDATE COMPLETE!')
            console.log('   All 11 roles have been updated successfully')
            console.log('   Admin role was not touched (left as is)')
            console.log('\n📋 Next steps:')
            console.log('   1. Frontend RBAC should now use updated permissions')
            console.log('   2. Verify role access in dashboard')
            console.log('   3. Test different user roles')
          } else {
            console.log('\n⚠️  Update executed but verification failed')
            console.log('   Please check the roles manually in Supabase Dashboard')
          }
        } else {
          console.log('\n❌ UPDATE FAILED')
          console.log('   Try manual method:')
          console.log('   1. Open: https://supabase.com/dashboard')
          console.log('   2. Select project → SQL Editor')
          console.log('   3. Copy content from scripts/update_role_permissions.sql')
          console.log('   4. Paste and click "Run"')
        }
        
        resolve(success)
      } catch (error) {
        console.error('❌ Update error:', error)
        resolve(false)
      }
    })
  })
}

// Run the update
runUpdate().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})