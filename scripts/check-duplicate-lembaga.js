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

async function checkDuplicate() {
  const perhutanan_sosial_id = '908aaef6-78d8-4449-8b76-70c7c01c18d1';
  
  console.log(`Checking lembaga_pengelola for perhutanan_sosial_id: ${perhutanan_sosial_id}`);
  
  // Cari semua lembaga_pengelola dengan perhutanan_sosial_id tersebut
  const { data: lpData, error: lpError } = await supabase
    .from('lembaga_pengelola')
    .select('id, nama, perhutanan_sosial_id, created_at')
    .eq('perhutanan_sosial_id', perhutanan_sosial_id);

  if (lpError) {
    console.error('Error fetching lembaga_pengelola:', lpError.message);
    return;
  }

  console.log(`Found ${lpData.length} records:`);
  lpData.forEach(lp => {
    console.log(`  ${lp.id} - ${lp.nama} (created_at: ${lp.created_at})`);
  });

  // Juga cek data perhutanan_sosial
  const { data: psData, error: psError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, skema')
    .eq('id', perhutanan_sosial_id);

  if (psError) {
    console.error('Error fetching perhutanan_sosial:', psError.message);
  } else {
    console.log('\nPerhutanan_sosial data:');
    psData.forEach(ps => {
      console.log(`  ${ps.id} - ${ps.pemegang_izin} (${ps.skema})`);
    });
  }

  // Cari semua lembaga_pengelola yang namanya mengandung PANINTU atau PANDINU
  console.log('\nSearching for all lembaga_pengelola with PANINTU or PANDINU:');
  const { data: allLpData, error: allLpError } = await supabase
    .from('lembaga_pengelola')
    .select('id, nama, perhutanan_sosial_id')
    .or('nama.ilike.%PANINTU%,nama.ilike.%PANDINU%');

  if (allLpError) {
    console.error('Error searching lembaga_pengelola:', allLpError.message);
  } else {
    console.log(`Found ${allLpData.length} records:`);
    allLpData.forEach(lp => {
      console.log(`  ${lp.id} - ${lp.nama} (perhutanan_sosial_id: ${lp.perhutanan_sosial_id})`);
    });
  }
}

checkDuplicate().catch(console.error);
