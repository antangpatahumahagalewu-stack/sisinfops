#!/usr/bin/env node

/**
 * Script to check the current state of audit_log.record_id column type
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey, supabaseAnonKey

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
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim()
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

// Use service role key if available, otherwise use anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey
if (!supabaseKey) {
  console.error('❌ ERROR: Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAuditLog() {
  console.log('🔍 Checking audit_log table structure...')
  console.log('==========================================\n')

  try {
    // 1. Check if audit_log table exists
    console.log('1. Checking if audit_log table exists...')
    const { data: tableExists, error: tableError } = await supabase
      .from('audit_log')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    if (tableError) {
      console.log('   ❌ audit_log table may not exist or error:', tableError.message)
      // Try to get column info using information_schema via RPC or raw query
    } else {
      console.log('   ✅ audit_log table exists')
    }

    // 2. Try to get column information by querying the table structure
    console.log('\n2. Checking record_id column type...')
    
    // Try a simple query to see what type of data is in record_id
    const { data: sampleData, error: sampleError } = await supabase
      .from('audit_log')
      .select('record_id')
      .limit(5)

    if (sampleError) {
      console.log('   ❌ Error querying audit_log:', sampleError.message)
      console.log('   Code:', sampleError.code, 'Details:', sampleError.details)
    } else if (sampleData && sampleData.length > 0) {
      console.log('   Sample record_id values:')
      sampleData.forEach((row, i) => {
        console.log(`     ${i + 1}. "${row.record_id}" (type: ${typeof row.record_id})`)
      })
    } else {
      console.log('   No data in audit_log table')
    }

    // 3. Try to insert a test record to see if we get the type error
    console.log('\n3. Testing insert into audit_log...')
    
    // First, let's check what the audit_trigger_function looks like
    console.log('   Checking audit_trigger_function...')
    
    // We'll use a SQL function via RPC if available, or try a direct query
    // Since we can't run arbitrary SQL easily, let's try a different approach
    
    // 4. Check if we can describe the table via information_schema
    console.log('\n4. Querying information_schema.columns for audit_log...')
    
    // Use the supabase REST API to query information_schema
    // Note: This requires the service role key for access to information_schema
    if (supabaseServiceKey) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'audit_log')
        .order('ordinal_position')

      if (columnsError) {
        console.log('   ❌ Error querying information_schema:', columnsError.message)
      } else if (columns && columns.length > 0) {
        console.log('   audit_log columns:')
        columns.forEach(col => {
          console.log(`     ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
          if (col.column_name === 'record_id') {
            console.log(`     ⭐ record_id is currently ${col.data_type.toUpperCase()}`)
          }
        })
      } else {
        console.log('   No columns found or table does not exist')
      }
    } else {
      console.log('   ⚠️  Service role key not available, cannot query information_schema')
    }

    // 5. Try to get the function definition
    console.log('\n5. Checking audit_trigger_function definition...')
    
    // We can try to query pg_proc via RPC if we have a function for that
    // For now, let's just note what we can
    
    console.log('\n6. Testing the actual error scenario...')
    console.log('   Simulating an update to perhutanan_sosial to trigger audit...')
    
    // Get a sample PS ID
    const { data: samplePs, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    if (psError || !samplePs) {
      console.log('   ⚠️  Cannot get sample PS:', psError?.message || 'No PS found')
    } else {
      console.log(`   Found PS ID: ${samplePs.id}`)
      
      // Try a simple update that should trigger audit
      const { data: updateResult, error: updateError } = await supabase
        .from('perhutanan_sosial')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', samplePs.id)
        .select()
      
      if (updateError) {
        console.log(`   ❌ Update failed with error: ${updateError.message}`)
        console.log(`   Code: ${updateError.code}, Hint: ${updateError.hint}`)
        
        if (updateError.code === '42804') {
          console.log('\n   💡 DIAGNOSIS: Type mismatch error!')
          console.log('   The audit trigger is trying to insert TEXT into a UUID column.')
          console.log('   Solution: Run the migration 20260132_audit_final_fix.sql')
        }
      } else {
        console.log(`   ✅ Update succeeded: ${updateResult.length} row(s) updated`)
        console.log('   This suggests the audit trigger is working or not firing.')
        
        // Check if an audit log was created
        const { data: newAuditLog } = await supabase
          .from('audit_log')
          .select('*')
          .eq('table_name', 'perhutanan_sosial')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (newAuditLog && newAuditLog.length > 0) {
          console.log(`   New audit log created with record_id: "${newAuditLog[0].record_id}"`)
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkAuditLog().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})