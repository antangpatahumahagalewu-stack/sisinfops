#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

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
  console.error('.env.local not found')
  process.exit(1)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listPs() {
  console.log('Listing some perhutanan_sosial records...')
  const { data, error } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, skema, jumlah_kk')
    .limit(10)

  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log(`Found ${data.length} records:`)
    data.forEach(ps => {
      console.log(`  ${ps.id} - ${ps.pemegang_izin} (${ps.skema}) - ${ps.jumlah_kk} KK`)
    })
  }
}

listPs().catch(console.error)
