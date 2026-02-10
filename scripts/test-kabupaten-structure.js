#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('🔍 Testing kabupaten table structure...')
  
  try {
    // Check if luas_total_ha column exists
    const { data, error } = await supabase
      .from('kabupaten')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error fetching kabupaten:', error)
      return
    }
    
    console.log('✅ Kabupaten table accessible')
    if (data && data.length > 0) {
      const firstRow = data[0]
      console.log('📊 Sample row:')
      Object.keys(firstRow).forEach(key => {
        console.log(`  ${key}: ${firstRow[key]} (${typeof firstRow[key]})`)
      })
      
      // Check for luas_total_ha
      if ('luas_total_ha' in firstRow) {
        console.log('✅ luas_total_ha column exists')
      } else {
        console.log('❌ luas_total_ha column does NOT exist')
      }
    }
    
    // Try to query v_carbon_projects_kabupaten_luas view
    console.log('\n🔍 Testing v_carbon_projects_kabupaten_luas view...')
    const { data: viewData, error: viewError } = await supabase
      .from('v_carbon_projects_kabupaten_luas')
      .select('*')
      .limit(5)
    
    if (viewError) {
      console.error('❌ View not accessible:', viewError.message)
    } else {
      console.log(`✅ View accessible, ${viewData?.length || 0} rows`)
      if (viewData && viewData.length > 0) {
        console.log('📊 First row from view:')
        console.log(viewData[0])
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

test()