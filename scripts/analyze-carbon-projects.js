#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyze() {
  console.log('🔍 Analyzing Carbon Projects for Kabupaten Mapping')
  console.log('===================================================\n')
  
  try {
    // Get all carbon projects
    const { data: carbonProjects, error } = await supabase
      .from('carbon_projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error:', error.message)
      return
    }
    
    console.log(`Found ${carbonProjects?.length || 0} carbon projects\n`)
    
    // Analyze each project
    const kabupatenMapping = {}
    
    carbonProjects?.forEach((project, index) => {
      console.log(`${index + 1}. ${project.nama_project || 'Unnamed Project'}`)
      console.log(`   Kode: ${project.kode_project}`)
      console.log(`   PS ID: ${project.ps_id || '(null)'}`)
      
      // Analyze name for kabupaten
      const name = project.nama_project || ''
      const desc = project.project_description || ''
      
      let detectedKabupaten = null
      
      // Check for kabupaten names in project name or description
      const kabupatenKeywords = [
        'Gunung Mas',
        'Pulang Pisau', 
        'Kapuas',
        'Katingan',
        'Kotawaringin',
        'Palangka Raya'
      ]
      
      for (const keyword of kabupatenKeywords) {
        if (name.includes(keyword) || desc.includes(keyword)) {
          detectedKabupaten = keyword
          break
        }
      }
      
      if (detectedKabupaten) {
        console.log(`   Detected kabupaten: ${detectedKabupaten}`)
        
        // Format the kabupaten name properly
        let formattedKabupaten = detectedKabupaten
        if (detectedKabupaten === 'Gunung Mas') {
          formattedKabupaten = 'Kabupaten Gunung Mas'
        } else if (detectedKabupaten === 'Pulang Pisau') {
          formattedKabupaten = 'Kabupaten Pulang Pisau'
        } else if (detectedKabupaten === 'Kapuas') {
          formattedKabupaten = 'Kabupaten Kapuas'
        } else if (detectedKabupaten === 'Katingan') {
          formattedKabupaten = 'Kabupaten Katingan'
        } else if (detectedKabupaten === 'Kotawaringin') {
          formattedKabupaten = 'Kabupaten Kotawaringin Timur'
        } else if (detectedKabupaten === 'Palangka Raya') {
          formattedKabupaten = 'Kotamadya Palangka Raya'
        }
        
        kabupatenMapping[project.id] = formattedKabupaten
      } else {
        console.log(`   ❌ No kabupaten detected`)
      }
      
      console.log('')
    })
    
    // Show summary
    console.log('📊 Summary:')
    console.log(`   Total projects: ${carbonProjects?.length || 0}`)
    console.log(`   Projects with detected kabupaten: ${Object.keys(kabupatenMapping).length}`)
    
    if (Object.keys(kabupatenMapping).length > 0) {
      console.log('\n📋 Kabupaten mapping:')
      Object.entries(kabupatenMapping).forEach(([projectId, kabupaten]) => {
        const project = carbonProjects?.find(p => p.id === projectId)
        console.log(`   ${project?.nama_project}: ${kabupaten}`)
      })
    }
    
    // Get kabupaten luas data
    console.log('\n📊 Checking kabupaten luas data...')
    const { data: kabupatenData, error: kabError } = await supabase
      .from('kabupaten')
      .select('nama, luas_total_ha')
      .order('nama')
    
    if (kabError) {
      console.error('Error:', kabError.message)
    } else {
      console.log('Available kabupaten with luas:')
      kabupatenData?.forEach(kab => {
        console.log(`   ${kab.nama}: ${kab.luas_total_ha || 0} ha`)
      })
    }
    
  } catch (err) {
    console.error('Unexpected error:', err.message)
  }
}

analyze()