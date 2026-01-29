#!/usr/bin/env node

/**
 * Script to check current audit_log status using anon key
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseAnonKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim()
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim()
    }
  }
} else {
  console.error('.env.local file not found at:', envPath)
  process.exit(1)
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkStatus() {
  console.log('🔍 Checking audit_log status...')
  console.log('================================\n')

  try {
    // 1. Check if audit_log table has any data
    console.log('1. Checking audit_log table...')
    const { data: auditData, error: auditError } = await supabase
      .from('audit_log')
      .select('id, table_name, record_id, operation, created_at')
      .limit(5)

    if (auditError) {
      console.log(`   ❌ Error: ${auditError.message}`)
      console.log(`   Code: ${auditError.code}`)
      
      if (auditError.code === '42P01') {
        console.log('   ⚠️  Table audit_log does not exist')
      } else if (auditError.code === '42501') {
        console.log('   ⚠️  Permission denied. Table may exist but RLS blocks access.')
      }
    } else {
      console.log(`   ✅ audit_log table accessible`)
      console.log(`   Found ${auditData.length} audit logs`)
      if (auditData.length > 0) {
        console.log('   Sample audit logs:')
        auditData.forEach((log, i) => {
          console.log(`     ${i+1}. ${log.table_name} ${log.operation} record_id="${log.record_id}"`)
        })
      }
    }

    // 2. Test if we can update perhutanan_sosial
    console.log('\n2. Testing perhutanan_sosial update...')
    
    // First, try to get any PS record
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin')
      .limit(1)
      .maybeSingle()

    if (psError) {
      console.log(`   ❌ Error fetching PS: ${psError.message}`)
      console.log(`   Code: ${psError.code}`)
      
      if (psError.code === '42P01') {
        console.log('   ⚠️  Table perhutanan_sosial does not exist')
      }
    } else if (!psData) {
      console.log('   ⚠️  No perhutanan_sosial records found')
    } else {
      console.log(`   ✅ Found PS record: ${psData.pemegang_izin} (ID: ${psData.id})`)
      
      // Try a simple update
      const { data: updateData, error: updateError } = await supabase
        .from('perhutanan_sosial')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', psData.id)
        .select()

      if (updateError) {
        console.log(`   ❌ Update failed: ${updateError.message}`)
        console.log(`   Code: ${updateError.code}`)
        console.log(`   Hint: ${updateError.hint || 'No hint'}`)
        
        if (updateError.code === '42804') {
          console.log('\n   💡 DIAGNOSIS: Type mismatch error!')
          console.log('   The audit trigger has incorrect type for record_id.')
          console.log('   Need to run the migration: supabase/migrations/20260132_audit_final_fix.sql')
        } else if (updateError.code === '23502') {
          console.log('\n   💡 DIAGNOSIS: Null constraint violation')
          console.log('   The audit trigger is trying to insert NULL into record_id.')
          console.log('   Same fix: run the migration.')
        }
      } else {
        console.log(`   ✅ Update succeeded!`)
        
        // Check if audit log was created
        if (auditData) {
          const { data: newAudit, error: newAuditError } = await supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

          if (!newAuditError && newAudit && newAudit.length > 0) {
            console.log(`   New audit log created with record_id: "${newAudit[0].record_id}"`)
          }
        }
      }
    }

    // 3. Provide instructions
    console.log('\n3. RECOMMENDED ACTION:')
    console.log('   Run the migration SQL manually in Supabase SQL Editor:')
    console.log(`   File: ${path.join(__dirname, '..', 'supabase', 'migrations', '20260132_audit_final_fix.sql')}`)
    console.log('\n   Or use Supabase CLI if installed:')
    console.log('     supabase db reset   # Resets and applies all migrations')
    console.log('\n   After running migration, test again.')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkStatus().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})