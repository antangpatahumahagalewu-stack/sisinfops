#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('Testing Supabase query...')
  
  try {
    // Test 1: Simple query
    console.log('\n1. Testing simple query...')
    const { data: simpleData, error: simpleError } = await supabase
      .from('carbon_projects')
      .select('*')
      .limit(2)
    
    if (simpleError) {
      console.error('Simple query error:', simpleError.message)
      console.error('Details:', simpleError)
    } else {
      console.log('Simple query success:', simpleData?.length || 0, 'records')
    }
    
    // Test 2: Nested query as in the page
    console.log('\n2. Testing nested query...')
    const { data: nestedData, error: nestedError } = await supabase
      .from('carbon_projects')
      .select(`
        *,
        perhutanan_sosial (
          kabupaten (
            id,
            nama,
            luas_total_ha
          )
        )
      `)
      .limit(2)
    
    if (nestedError) {
      console.error('Nested query error:', nestedError.message)
      console.error('Code:', nestedError.code)
      console.error('Details:', nestedError.details)
      console.error('Hint:', nestedError.hint)
    } else {
      console.log('Nested query success:', nestedData?.length || 0, 'records')
      console.log('Sample nested data:', JSON.stringify(nestedData?.[0], null, 2))
    }
    
    // Test 3: Alternative nested query
    console.log('\n3. Testing alternative nested query...')
    const { data: altData, error: altError } = await supabase
      .from('carbon_projects')
      .select(`
        *,
        perhutanan_sosial!left (
          kabupaten!inner (
            id,
            nama,
            luas_total_ha
          )
        )
      `)
      .limit(2)
    
    if (altError) {
      console.error('Alt query error:', altError.message)
    } else {
      console.log('Alt query success:', altData?.length || 0, 'records')
    }
    
    // Test 4: Check relationship between tables
    console.log('\n4. Checking table relationships...')
    const { data: relData, error: relError } = await supabase
      .from('carbon_projects')
      .select('ps_id')
      .not('ps_id', 'is', null)
      .limit(5)
    
    if (relError) {
      console.error('Relationship error:', relError.message)
    } else {
      console.log('Carbon projects with ps_id:', relData?.length || 0)
      console.log('Sample ps_ids:', relData?.map(d => d.ps_id))
    }
    
  } catch (err) {
    console.error('Unexpected error:', err.message)
  }
}

test()