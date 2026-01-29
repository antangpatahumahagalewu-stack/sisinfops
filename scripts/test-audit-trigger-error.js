#!/usr/bin/env node

/**
 * Script to test the exact error scenario from the browser
 * Uses the same Supabase client configuration as the edit-ps-form.tsx
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
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testError() {
  console.log('🧪 Testing exact error scenario from edit-ps-form.tsx')
  console.log('=====================================================\n')

  // Use the exact PS ID from the error logs
  const PS_ID = 'a3790f2d-d08f-4557-8b58-c0fd15a404b7'
  
  console.log(`PS ID: ${PS_ID}`)
  
  try {
    // First, get the current data for this PS
    console.log('\n1. Fetching current PS data...')
    const { data: psData, error: fetchError } = await supabase
      .from('perhutanan_sosial')
      .select('*')
      .eq('id', PS_ID)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ Error fetching PS data:', fetchError.message)
      return
    }

    if (!psData) {
      console.error(`❌ PS with ID ${PS_ID} not found`)
      return
    }

    console.log(`   Found: ${psData.pemegang_izin} (${psData.skema})`)
    console.log(`   Jumlah KK: ${psData.jumlah_kk}`)

    // 2. Simulate the exact update from the edit-ps-form.tsx
    console.log('\n2. Simulating update from edit-ps-form.tsx...')
    
    // This is the exact update data structure from the error log
    const updateData = {
      pemegang_izin: psData.pemegang_izin,
      desa: psData.desa,
      kecamatan: psData.kecamatan,
      skema: psData.skema,
      luas_ha: psData.luas_ha,
      tanggal_sk: psData.tanggal_sk,
      jumlah_kk: psData.jumlah_kk,
      ketua_ps: psData.ketua_ps || 'Yanto L. Adam', // From error log
      kepala_desa: psData.kepala_desa || null,
    }

    console.log('   Update data:', JSON.stringify(updateData, null, 2))

    // This should trigger the audit trigger
    const { data: updatedData, error: updateError } = await supabase
      .from('perhutanan_sosial')
      .update(updateData)
      .eq('id', PS_ID)
      .select()

    if (updateError) {
      console.log('\n❌ UPDATE FAILED WITH ERROR:')
      console.log(`   Code: ${updateError.code}`)
      console.log(`   Message: ${updateError.message}`)
      console.log(`   Hint: ${updateError.hint || 'No hint'}`)
      
      if (updateError.code === '42804') {
        console.log('\n💡 CONFIRMED: Type mismatch error!')
        console.log('   The audit_log.record_id column is UUID but the trigger is inserting TEXT.')
        console.log('\n   Solution: Run the migration in supabase/migrations/20260132_audit_final_fix.sql')
        console.log('   Or use the SQL provided in the fix-audit-trigger.js script.')
      } else if (updateError.code === '23502') {
        console.log('\n💡 Null constraint violation on audit_log.record_id')
        console.log('   The trigger is trying to insert NULL into a NOT NULL column.')
        console.log('   Same solution: run the migration.')
      }
      
      // Check if audit_log table exists and has data
      console.log('\n3. Checking audit_log table...')
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_log')
        .select('*')
        .limit(5)

      if (auditError) {
        console.log('   Error querying audit_log:', auditError.message)
      } else {
        console.log(`   Found ${auditLogs.length} audit logs`)
        if (auditLogs.length > 0) {
          console.log('   First audit log:', JSON.stringify(auditLogs[0], null, 2))
        }
      }
      
    } else {
      console.log('\n✅ Update succeeded!')
      console.log(`   Updated ${updatedData.length} record(s)`)
      
      // Check if an audit log was created
      console.log('\n3. Checking for new audit log...')
      const { data: newAuditLog } = await supabase
        .from('audit_log')
        .select('*')
        .eq('table_name', 'perhutanan_sosial')
        .order('created_at', { ascending: false })
        .limit(1)

      if (newAuditLog && newAuditLog.length > 0) {
        console.log(`   New audit log created with record_id: "${newAuditLog[0].record_id}"`)
        console.log(`   Operation: ${newAuditLog[0].operation}`)
      } else {
        console.log('   No new audit log found. The trigger might be disabled.')
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testError().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})