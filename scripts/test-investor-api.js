#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('🔍 Testing Investor API logic')
  
  // 1. Get kabupaten data
  const { data: kabupatenData, error: kabError } = await supabase
    .from('kabupaten')
    .select('nama, luas_total_ha')
    .order('nama')
  
  if (kabError) {
    console.error('Kabupaten error:', kabError.message)
    return
  }
  
  const kabupatenLuasMap = {}
  kabupatenData.forEach(kab => {
    kabupatenLuasMap[kab.nama] = kab.luas_total_ha || 0
  })
  
  console.log('Kabupaten luas data:')
  Object.entries(kabupatenLuasMap).forEach(([nama, luas]) => {
    console.log(`  ${nama}: ${luas} ha`)
  })
  
  // 2. Get carbon projects
  const { data: projects, error: projectsError } = await supabase
    .from('carbon_projects')
    .select('id, nama_project, kode_project, status')
    .order('created_at', { ascending: false })
    .limit(4)
  
  if (projectsError) {
    console.error('Projects error:', projectsError.message)
    return
  }
  
  console.log('\nCarbon projects:')
  projects.forEach(project => {
    // Simulate mapping logic
    const kabupatenName = mapProjectToKabupaten(project.nama_project || '')
    const kabupatenLuas = kabupatenName ? kabupatenLuasMap[kabupatenName] || 0 : 0
    
    console.log(`  ${project.nama_project}`)
    console.log(`    Kabupaten: ${kabupatenName || 'N/A'}`)
    console.log(`    Luas: ${kabupatenLuas} ha`)
    console.log(`    Status: ${project.status}`)
  })
  
  // 3. Calculate total luas
  let totalLuas = 0
  projects.forEach(project => {
    const kabupatenName = mapProjectToKabupaten(project.nama_project || '')
    if (kabupatenName && kabupatenLuasMap[kabupatenName]) {
      totalLuas += kabupatenLuasMap[kabupatenName]
    }
  })
  
  console.log(`\nTotal luas calculated: ${totalLuas} ha`)
  
  // 4. Compare with carbon projects page data
  console.log('\n🔗 Comparing with carbon projects page data:')
  console.log('  Expected luas based on kabupaten:')
  console.log('  - Gunung Mas: 72,800.99 ha')
  console.log('  - Pulang Pisau: 27,876 ha')
  console.log('  - Kapuas: 56,771 ha')
  console.log('  - Katingan: 29,239 ha')
  console.log(`  Total expected: ${72800.99 + 27876 + 56771 + 29239} ha`)
}

function mapProjectToKabupaten(projectName) {
  const name = projectName || '';
  
  if (name.includes('Gunung Mas')) {
    return 'Kabupaten Gunung Mas';
  } else if (name.includes('Pulang Pisau')) {
    return 'Kabupaten Pulang Pisau';
  } else if (name.includes('Kapuas')) {
    return 'Kabupaten Kapuas';
  } else if (name.includes('Katingan')) {
    return 'Kabupaten Katingan';
  } else if (name.includes('Kotawaringin')) {
    return 'Kabupaten Kotawaringin Timur';
  }
  
  return null;
}

test()