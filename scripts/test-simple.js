#!/usr/bin/env node

/**
 * Simple test to check Supabase connection
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey

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
  }
} else {
  console.error('.env.local file not found at:', envPath)
  process.exit(1)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase environment variables')
  console.error('supabaseUrl:', supabaseUrl ? '***' : 'missing')
  console.error('supabaseServiceKey:', supabaseServiceKey ? '***' : 'missing')
  process.exit(1)
}

console.log('Supabase URL:', supabaseUrl)
console.log('Service key present:', supabaseServiceKey ? 'Yes' : 'No')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  console.log('\nTesting connection to Supabase...')
  
  // Try to fetch a single row from perhutanan_sosial
  const { data, error } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin')
    .limit(1)
  
  if (error) {
    console.error('❌ Connection test failed:', error.message)
    console.error('Error details:', error)
  } else {
    console.log('✅ Connection successful!')
    console.log('Sample data:', data)
  }
}

testConnection().catch(error => {
  console.error('Unexpected error:', error)
})
