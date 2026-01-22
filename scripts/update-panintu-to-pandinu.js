#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
    }
  }
} else {
  console.error('.env.local not found');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateRecord() {
  console.log('Mencari record dengan nama PANINTU PANTIS EBES...');
  
  // Cari di tabel perhutanan_sosial
  const { data: psData, error: psError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, skema')
    .or(`pemegang_izin.ilike.%PANINTU%,pemegang_izin.ilike.%PANDINU%`);

  if (psError) {
    console.error('Error fetching perhutanan_sosial:', psError.message);
    return;
  }

  console.log(`Found ${psData.length} records:`);
  psData.forEach(ps => {
    console.log(`  ${ps.id} - ${ps.pemegang_izin} (${ps.skema})`);
  });

  // Update record yang mengandung PANINTU
  for (const ps of psData) {
    if (ps.pemegang_izin.includes('PANINTU')) {
      const newName = ps.pemegang_izin.replace('PANINTU', 'PANDINU');
      console.log(`\nUpdating record ${ps.id}:`);
      console.log(`  From: ${ps.pemegang_izin}`);
      console.log(`  To:   ${newName}`);

      const { data, error } = await supabase
        .from('perhutanan_sosial')
        .update({ pemegang_izin: newName })
        .eq('id', ps.id);

      if (error) {
        console.error(`  Error updating: ${error.message}`);
      } else {
        console.log(`  Successfully updated perhutanan_sosial`);
      }

      // Update lembaga_pengelola jika ada
      const { data: lpData, error: lpError } = await supabase
        .from('lembaga_pengelola')
        .select('id, nama')
        .eq('perhutanan_sosial_id', ps.id);

      if (lpError) {
        console.error(`  Error fetching lembaga_pengelola: ${lpError.message}`);
      } else if (lpData && lpData.length > 0) {
        const lp = lpData[0];
        const newLpName = lp.nama.replace('PANINTU', 'PANDINU');
        console.log(`  Updating lembaga_pengelola ${lp.id}:`);
        console.log(`    From: ${lp.nama}`);
        console.log(`    To:   ${newLpName}`);

        const { error: updateLpError } = await supabase
          .from('lembaga_pengelola')
          .update({ nama: newLpName })
          .eq('id', lp.id);

        if (updateLpError) {
          console.error(`    Error updating lembaga_pengelola: ${updateLpError.message}`);
        } else {
          console.log(`    Successfully updated lembaga_pengelola`);
        }
      }
    }
  }

  // Juga periksa apakah ada yang sudah PANDINU tapi masih ada masalah
  console.log('\nChecking for PANDINU records:');
  const pandinuRecords = psData.filter(ps => ps.pemegang_izin.includes('PANDINU'));
  pandinuRecords.forEach(ps => {
    console.log(`  ${ps.id} - ${ps.pemegang_izin} (${ps.skema})`);
  });
}

updateRecord().catch(console.error);
