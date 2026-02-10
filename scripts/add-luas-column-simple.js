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

async function run() {
  console.log('🚀 Adding luas_total_ha column to kabupaten table')
  console.log('=================================================\n')
  
  try {
    // Step 1: Add column if not exists
    console.log('1. Adding column luas_total_ha to kabupaten table...')
    
    // We need to run raw SQL, but supabase-js doesn't support it directly
    // Let's try to update the table structure by first checking if column exists
    const { data: checkData, error: checkError } = await supabase
      .from('kabupaten')
      .select('*')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Error checking table:', checkError.message)
      return
    }
    
    if (checkData && checkData.length > 0) {
      const firstRow = checkData[0]
      if ('luas_total_ha' in firstRow) {
        console.log('✅ Column luas_total_ha already exists')
      } else {
        console.log('❌ Column luas_total_ha does NOT exist - need to run SQL migration manually')
        console.log('\n📋 Please run this SQL in Supabase Dashboard SQL Editor:')
        console.log(`
-- 1. Add luas_total_ha column to kabupaten table
ALTER TABLE kabupaten 
ADD COLUMN IF NOT EXISTS luas_total_ha DECIMAL(12,2) DEFAULT 0;

-- 2. Calculate initial luas for each kabupaten
UPDATE kabupaten k
SET luas_total_ha = COALESCE(
  (SELECT SUM(ps.luas_ha) 
   FROM perhutanan_sosial ps 
   WHERE ps.kabupaten_id = k.id),
  0
);

-- 3. Special logic: Pulang Pisau includes Palangka Raya
UPDATE kabupaten k
SET luas_total_ha = (
  SELECT COALESCE(SUM(ps.luas_ha), 0)
  FROM perhutanan_sosial ps
  WHERE ps.kabupaten_id = k.id
) + (
  SELECT COALESCE(SUM(ps.luas_ha), 0)
  FROM perhutanan_sosial ps
  JOIN kabupaten k2 ON ps.kabupaten_id = k2.id
  WHERE k2.nama = 'Kotamadya Palangka Raya'
  AND k.nama = 'Kabupaten Pulang Pisau'
)
WHERE k.nama = 'Kabupaten Pulang Pisau';

-- 4. Create view for carbon projects dashboard
CREATE OR REPLACE VIEW v_carbon_projects_kabupaten_luas AS
SELECT 
    k.id,
    k.nama,
    k.luas_total_ha,
    EXISTS (
        SELECT 1 FROM carbon_projects cp
        JOIN perhutanan_sosial ps ON cp.ps_id = ps.id
        WHERE ps.kabupaten_id = k.id
    ) as has_carbon_project
FROM kabupaten k
ORDER BY k.nama;

-- 5. Grant permissions
GRANT SELECT ON v_carbon_projects_kabupaten_luas TO authenticated;
        `)
        return
      }
    }
    
    // Step 2: Calculate initial luas
    console.log('\n2. Calculating initial luas values...')
    
    // Get all kabupaten
    const { data: kabupatenData, error: kabError } = await supabase
      .from('kabupaten')
      .select('id, nama')
    
    if (kabError) {
      console.error('❌ Error fetching kabupaten:', kabError.message)
      return
    }
    
    // Get all perhutanan_sosial
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id, kabupaten_id, luas_ha')
    
    if (psError) {
      console.error('❌ Error fetching perhutanan sosial:', psError.message)
      return
    }
    
    // Calculate luas for each kabupaten
    for (const kab of kabupatenData) {
      let totalLuas = 0
      
      // Sum luas_ha for this kabupaten
      const psInKab = psData.filter(ps => ps.kabupaten_id === kab.id)
      totalLuas = psInKab.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
      
      // Special logic: Pulang Pisau includes Palangka Raya
      if (kab.nama === 'Kabupaten Pulang Pisau') {
        const palangkaRayaKab = kabupatenData.find(k => k.nama === 'Kotamadya Palangka Raya')
        if (palangkaRayaKab) {
          const psPalangkaRaya = psData.filter(ps => ps.kabupaten_id === palangkaRayaKab.id)
          const palangkaRayaLuas = psPalangkaRaya.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
          totalLuas += palangkaRayaLuas
        }
      }
      
      // Update the kabupaten record
      const { error: updateError } = await supabase
        .from('kabupaten')
        .update({ luas_total_ha: totalLuas })
        .eq('id', kab.id)
      
      if (updateError) {
        console.error(`❌ Error updating ${kab.nama}:`, updateError.message)
      } else {
        console.log(`   ✅ ${kab.nama}: ${totalLuas} ha`)
      }
    }
    
    console.log('\n🎉 Luas calculation completed!')
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

run()