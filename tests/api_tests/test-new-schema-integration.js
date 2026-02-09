#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

async function testNewSchemaIntegration() {
  console.log('🚀 Testing New Schema Database Integration\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log('📊 Testing Tables in New Schema:\n')
  
  const tables = [
    { name: 'kabupaten', description: 'Kabupaten data' },
    { name: 'perhutanan_sosial', description: 'Perhutanan Sosial data' },
    { name: 'potensi', description: 'Potensi data' },
    { name: 'profiles', description: 'User profiles with roles' },
    { name: 'role_permissions', description: 'Role permissions' }
  ]
  
  const results = []
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1)
      
      if (error) {
        results.push({
          table: table.name,
          status: '❌',
          message: `Error: ${error.message}`,
          description: table.description
        })
      } else {
        results.push({
          table: table.name,
          status: '✅',
          message: `OK (${data?.length || 0} rows)`,
          description: table.description
        })
      }
    } catch (err) {
      results.push({
        table: table.name,
        status: '❌',
        message: `Exception: ${err.message}`,
        description: table.description
      })
    }
  }
  
  // Print results in a nice table format
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│                      TABLE STATUS                           │')
  console.log('├──────────────────┬────────────┬─────────────────────────────┤')
  
  for (const result of results) {
    const tableCell = result.table.padEnd(16)
    const statusCell = result.status.padEnd(10)
    const messageCell = result.message.padEnd(25)
    const descCell = result.description
    
    console.log(`│ ${tableCell} │ ${statusCell} │ ${messageCell} │ ${descCell}`)
  }
  
  console.log('└──────────────────┴────────────┴─────────────────────────────┘\n')
  
  // Test role_permissions data
  console.log('👥 Testing Role Permissions Data:\n')
  try {
    const { data: roles, error: rolesError } = await supabase
      .from('role_permissions')
      .select('role_name, display_name')
      .order('role_name')
    
    if (rolesError) {
      console.log(`❌ Error fetching roles: ${rolesError.message}`)
    } else {
      console.log(`✅ Found ${roles?.length || 0} roles:`)
      if (roles && roles.length > 0) {
        roles.forEach(role => {
          console.log(`   • ${role.role_name} (${role.display_name})`)
        })
      }
    }
  } catch (err) {
    console.log(`❌ Exception fetching roles: ${err.message}`)
  }
  
  console.log('\n🔍 Testing User Profiles with Roles:\n')
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (profilesError) {
      console.log(`❌ Error fetching profiles: ${profilesError.message}`)
    } else {
      console.log(`✅ Found ${profiles?.length || 0} user profiles:`)
      if (profiles && profiles.length > 0) {
        profiles.forEach(profile => {
          console.log(`   • User ID: ${profile.id.substring(0, 8)}... Role: ${profile.role || 'none'}`)
        })
      }
    }
  } catch (err) {
    console.log(`❌ Exception fetching profiles: ${err.message}`)
  }
  
  // Test basic RLS policies by trying to insert/update
  console.log('\n🔐 Testing Basic RLS Policies (Anonymous Access):\n')
  
  const rlsTests = [
    { operation: 'SELECT kabupaten', query: supabase.from('kabupaten').select('*').limit(1) },
    { operation: 'SELECT perhutanan_sosial', query: supabase.from('perhutanan_sosial').select('*').limit(1) },
    { operation: 'SELECT potensi', query: supabase.from('potensi').select('*').limit(1) }
  ]
  
  for (const test of rlsTests) {
    try {
      const { error } = await test.query
      
      if (error) {
        console.log(`❌ ${test.operation}: ${error.code || 'Error'} - ${error.message}`)
      } else {
        console.log(`✅ ${test.operation}: Public read access OK`)
      }
    } catch (err) {
      console.log(`❌ ${test.operation}: Exception - ${err.message}`)
    }
  }
  
  console.log('\n📋 SUMMARY:\n')
  const passed = results.filter(r => r.status === '✅').length
  const failed = results.filter(r => r.status === '❌').length
  const total = results.length
  
  console.log(`Tables accessible: ${passed}/${total}`)
  console.log(`Tables with errors: ${failed}/${total}`)
  
  if (failed === 0) {
    console.log('🎉 All tables accessible! New schema integration is working.')
  } else {
    console.log('⚠️  Some tables have issues. Check the errors above.')
  }
  
  console.log('\n🎯 RECOMMENDATIONS:')
  console.log('1. Test with authenticated user to verify role-based access')
  console.log('2. Verify dashboard data is displayed correctly')
  console.log('3. Test PS data CRUD operations with admin/monev roles')
  console.log('4. Verify Phase 2 navigation items are properly displayed
}

// Run the test
testNewSchemaIntegration().catch(console.error)