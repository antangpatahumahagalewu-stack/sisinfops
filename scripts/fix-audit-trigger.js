#!/usr/bin/env node

/**
 * Script to diagnose and provide fix for audit trigger record_id type mismatch error
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

async function diagnoseAndFix() {
  console.log('🔧 Diagnosing audit trigger record_id type mismatch error')
  console.log('==========================================================\n')

  // Use a PS ID from the error logs
  const TEST_PS_ID = 'a3790f2d-d08f-4557-8b58-c0fd15a404b7'
  
  console.log(`1. Testing update on PS ID: ${TEST_PS_ID}`)
  console.log('   (This will trigger the audit trigger and show the error)\n')

  try {
    // Try to update the PS record - this should trigger the audit trigger
    const { data, error } = await supabase
      .from('perhutanan_sosial')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', TEST_PS_ID)
      .select()

    if (error) {
      console.log(`❌ Update failed with error:`)
      console.log(`   Code: ${error.code}`)
      console.log(`   Message: ${error.message}`)
      console.log(`   Hint: ${error.hint || 'No hint provided'}`)
      
      if (error.code === '42804') {
        console.log('\n💡 DIAGNOSIS CONFIRMED:')
        console.log('   The audit_log.record_id column is still UUID type,')
        console.log('   but the audit_trigger_function is trying to insert TEXT.')
        console.log('   This is causing the type mismatch error.')
        
        console.log('\n🔧 SOLUTION:')
        console.log('   You need to run the migration that changes the column type.')
        console.log('   The migration file is: supabase/migrations/20260132_audit_final_fix.sql')
        
        console.log('\n📋 INSTRUCTIONS:')
        console.log('   1. Go to your Supabase dashboard at: https://supabase.com/dashboard')
        console.log('   2. Select your project')
        console.log('   3. Go to SQL Editor')
        console.log('   4. Copy and paste the SQL below')
        console.log('   5. Run the SQL')
        console.log('   6. After running, test the edit form again')
        
        console.log('\n📝 SQL TO RUN:')
        console.log('===============================================')
        
        // Read and print the migration SQL
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260132_audit_final_fix.sql')
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
          console.log(migrationSQL)
        } else {
          console.log('-- Migration file not found at:', migrationPath)
          console.log('-- Please run this SQL manually:')
          console.log(`
-- 1. Change audit_log.record_id from UUID to TEXT
ALTER TABLE audit_log ALTER COLUMN record_id TYPE TEXT;

-- 2. Drop and recreate the audit_trigger_function
DROP FUNCTION IF EXISTS audit_trigger_function CASCADE;

-- 3. Create the new audit_trigger_function with TEXT handling
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id TEXT;
    v_user_id UUID;
BEGIN
    -- Determine the record id (handle null cases)
    IF TG_OP = 'DELETE' THEN
        v_record_id := COALESCE(OLD.id::TEXT, 'unknown');
    ELSE
        v_record_id := COALESCE(NEW.id::TEXT, 'unknown');
    END IF;

    -- Get the current user id
    v_user_id := auth.uid();

    -- Insert the audit log
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), v_user_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', to_jsonb(NEW), v_user_id);
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the audit trigger for perhutanan_sosial
DROP TRIGGER IF EXISTS audit_perhutanan_sosial ON perhutanan_sosial;
CREATE TRIGGER audit_perhutanan_sosial
    AFTER INSERT OR UPDATE OR DELETE ON perhutanan_sosial
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
          `)
        }
        
        console.log('===============================================')
        
        // Also suggest alternative if they can't run SQL
        console.log('\n🔄 ALTERNATIVE APPROACH (if you cannot run SQL):')
        console.log('   If you cannot run the migration, you can temporarily disable the audit trigger:')
        console.log('   Run this SQL instead:')
        console.log(`
-- Temporarily disable the audit trigger
DROP TRIGGER IF EXISTS audit_perhutanan_sosial ON perhutanan_sosial;

-- Then run the migration when possible
-- This will allow the edit form to work, but no audit logs will be created
        `)
        
      } else if (error.code === '23502') {
        console.log('\n💡 DIAGNOSIS: Null constraint violation')
        console.log('   The audit_log.record_id column has a NOT NULL constraint')
        console.log('   and the trigger is trying to insert NULL.')
        console.log('   This is also fixed by the migration above.')
      } else {
        console.log('\n⚠️  Unexpected error code. The issue might be different.')
      }
      
    } else {
      console.log('✅ Update succeeded! The audit trigger might be working correctly.')
      console.log('   Or the trigger might be disabled.')
      console.log('\n   If you are still seeing errors in the browser, check:')
      console.log('   1. The audit_log table structure')
      console.log('   2. The audit_trigger_function definition')
    }
    
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

diagnoseAndFix().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})