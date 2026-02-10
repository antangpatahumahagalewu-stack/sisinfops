#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  console.log('🔍 Checking Kabupaten Luas Column Status')
  console.log('=========================================\n')
  
  try {
    // 1. Check if column exists
    console.log('1. Checking column structure...')
    const { data: sampleData, error: sampleError } = await supabase
      .from('kabupaten')
      .select('*')
      .limit(3)
    
    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError.message)
      return
    }
    
    if (sampleData && sampleData.length > 0) {
      const firstRow = sampleData[0]
      const hasLuasColumn = 'luas_total_ha' in firstRow
      
      console.log(`✅ Column 'luas_total_ha' exists: ${hasLuasColumn}`)
      
      if (hasLuasColumn) {
        console.log(`   Sample value: ${firstRow.luas_total_ha} ha`)
        
        // Check if value is 0 or null
        const { data: nullCount, error: nullError } = await supabase
          .from('kabupaten')
          .select('id')
          .eq('luas_total_ha', 0)
          .or('luas_total_ha.is.null')
        
        if (!nullError) {
          console.log(`   Kabupaten with 0/null luas: ${nullCount?.length || 0}`)
        }
      }
      
      // Show column names
      console.log('\n   Available columns:', Object.keys(firstRow).join(', '))
    }
    
    // 2. Check perhutanan_sosial data
    console.log('\n2. Checking perhutanan_sosial data...')
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('kabupaten_id, luas_ha')
      .limit(5)
    
    if (psError) {
      console.error('❌ Error fetching perhutanan sosial:', psError.message)
    } else {
      console.log(`   Found ${psData?.length || 0} PS records (sample)`)
      if (psData && psData.length > 0) {
        const totalLuasPS = psData.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
        console.log(`   Total luas sample: ${totalLuasPS} ha`)
      }
    }
    
    // 3. Check actual calculation
    console.log('\n3. Manual calculation for each kabupaten...')
    const { data: allKabupaten, error: kabError } = await supabase
      .from('kabupaten')
      .select('id, nama, luas_total_ha')
      .order('nama')
    
    if (kabError) {
      console.error('❌ Error fetching kabupaten:', kabError.message)
      return
    }
    
    // Get all PS data for calculation
    const { data: allPS, error: allPSError } = await supabase
      .from('perhutanan_sosial')
      .select('kabupaten_id, luas_ha')
    
    if (allPSError) {
      console.error('❌ Error fetching all PS:', allPSError.message)
      return
    }
    
    console.log(`   Found ${allKabupaten?.length || 0} kabupaten`)
    console.log(`   Found ${allPS?.length || 0} perhutanan_sosial records`)
    
    // Calculate for each kabupaten
    let totalCalculatedLuas = 0
    for (const kab of allKabupaten || []) {
      const psInKab = allPS?.filter(ps => ps.kabupaten_id === kab.id) || []
      const calculatedLuas = psInKab.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
      
      // Special logic for Pulang Pisau
      let finalLuas = calculatedLuas
      if (kab.nama === 'Kabupaten Pulang Pisau') {
        const palangkaRayaKab = allKabupaten.find(k => k.nama === 'Kotamadya Palangka Raya')
        if (palangkaRayaKab) {
          const psPalangkaRaya = allPS?.filter(ps => ps.kabupaten_id === palangkaRayaKab.id) || []
          const palangkaRayaLuas = psPalangkaRaya.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
          finalLuas += palangkaRayaLuas
        }
      }
      
      totalCalculatedLuas += finalLuas
      
      if (kab.luas_total_ha !== finalLuas) {
        console.log(`   ⚠️  ${kab.nama}: DB=${kab.luas_total_ha || 0} ha, Calc=${finalLuas} ha`)
      }
    }
    
    console.log(`\n   Total calculated luas: ${totalCalculatedLuas} ha`)
    
    // 4. Check carbon projects
    console.log('\n4. Checking carbon projects...')
    const { data: carbonProjects, error: cpError } = await supabase
      .from('carbon_projects')
      .select('id, ps_id')
      .limit(5)
    
    if (cpError) {
      console.error('❌ Error fetching carbon projects:', cpError.message)
    } else {
      console.log(`   Found ${carbonProjects?.length || 0} carbon projects`)
      const psIdsWithCP = carbonProjects?.map(cp => cp.ps_id).filter(Boolean) || []
      console.log(`   Connected to ${psIdsWithCP.length} perhutanan_sosial`)
    }
    
    // 5. Summary
    console.log('\n📊 Summary:')
    console.log('   - Column luas_total_ha exists:', hasLuasColumn)
    console.log('   - Data needs update:', totalCalculatedLuas > 0)
    console.log('   - Recommended action: Run SQL to update values')
    
    if (totalCalculatedLuas > 0) {
      console.log('\n📋 SQL to update:')
      console.log(`
UPDATE kabupaten k SET luas_total_ha = (
  SELECT COALESCE(SUM(ps.luas_ha), 0)
  FROM perhutanan_sosial ps
  WHERE ps.kabupaten_id = k.id
);

-- For Pulang Pisau add Palangka Raya
UPDATE kabupaten k SET luas_total_ha = luas_total_ha + (
  SELECT COALESCE(SUM(ps.luas_ha), 0)
  FROM perhutanan_sosial ps
  JOIN kabupaten k2 ON ps.kabupaten_id = k2.id
  WHERE k2.nama = 'Kotamadya Palangka Raya'
) WHERE k.nama = 'Kabupaten Pulang Pisau';
      `)
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

check()