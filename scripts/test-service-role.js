#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase Service Role Key...')
console.log('URL:', supabaseUrl)
console.log('Key length:', supabaseServiceKey?.length || 'missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function test() {
  try {
    // Try to insert a test record (requires service role)
    const { data, error } = await supabase
      .from('kabupaten')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Error with service role:', error.message)
      console.error('   Code:', error.code)
      console.error('   Details:', error.details)
      console.error('   Hint:', error.hint)
      
      // Try with anon key for comparison
      console.log('\n--- Testing with anon key ---')
      const supabaseAnon = createClient(
        supabaseUrl, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: anonData, error: anonError } = await supabaseAnon
        .from('kabupaten')
        .select('count')
        .limit(1)
      
      if (anonError) {
        console.error('❌ Anon key also failed:', anonError.message)
      } else {
        console.log('✅ Anon key works')
      }
      
    } else {
      console.log('✅ Service role key works!')
      console.log('Data:', data)
    }
  } catch (err) {
    console.error('❌ Exception:', err.message)
  }
}

test()