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

async function fixFinal() {
  const perhutanan_sosial_id = '908aaef6-78d8-4449-8b76-70c7c01c18d1';
  
  console.log('Memperbaiki data PANINTU -> PANDINU...');
  
  // 1. Perbaiki nama lembaga_pengelola: hilangkan duplikasi "LPHD LPHD"
  const lembaga_id = '6cda58f3-7285-4338-8138-a566596844b4';
  const correctLembagaName = 'LPHD PANDINU PANTIS EBES'; // Nama yang benar
  
  console.log(`\n1. Memperbaiki lembaga_pengelola ${lembaga_id}:`);
  console.log(`   Dari: LPHD LPHD PANDINU PANTIS EBES`);
  console.log(`   Menjadi: ${correctLembagaName}`);
  
  const { error: lpError } = await supabase
    .from('lembaga_pengelola')
    .update({ nama: correctLembagaName })
    .eq('id', lembaga_id);

  if (lpError) {
    console.error(`   Error: ${lpError.message}`);
  } else {
    console.log(`   Berhasil diperbaiki`);
  }
  
  // 2. Update perhutanan_sosial
  const correctPsName = 'LPHD PANDINU PANTIS EBES';
  console.log(`\n2. Memperbaiki perhutanan_sosial ${perhutanan_sosial_id}:`);
  console.log(`   Dari: LPHD PANINTU PANTIS EBES`);
  console.log(`   Menjadi: ${correctPsName}`);
  
  const { error: psError } = await supabase
    .from('perhutanan_sosial')
    .update({ pemegang_izin: correctPsName })
    .eq('id', perhutanan_sosial_id);

  if (psError) {
    console.error(`   Error: ${psError.message}`);
    console.log(`   Mungkin ada constraint violation, cek apakah ada duplikat...`);
    
    // Cek apakah ada record lain dengan nama yang sama
    const { data: dupData, error: dupError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin')
      .eq('pemegang_izin', correctPsName);

    if (dupError) {
      console.error(`   Error checking duplicates: ${dupError.message}`);
    } else if (dupData && dupData.length > 0) {
      console.log(`   Found ${dupData.length} duplicate(s):`);
      dupData.forEach(d => {
        console.log(`     ${d.id} - ${d.pemegang_izin}`);
      });
      
      // Jika ada duplikat selain record ini, mungkin perlu dihapus
      const otherDuplicates = dupData.filter(d => d.id !== perhutanan_sosial_id);
      if (otherDuplicates.length > 0) {
        console.log(`   Ada ${otherDuplicates.length} duplikat lain. Mungkin perlu dihapus.`);
      }
    }
  } else {
    console.log(`   Berhasil diperbaiki`);
  }
  
  // 3. Verifikasi akhir
  console.log('\n3. Verifikasi akhir:');
  
  const { data: finalPsData, error: finalPsError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, skema')
    .eq('id', perhutanan_sosial_id);
    
  if (finalPsError) {
    console.error(`   Error fetching perhutanan_sosial: ${finalPsError.message}`);
  } else {
    console.log(`   Perhutanan_sosial:`);
    finalPsData.forEach(ps => {
      console.log(`     ${ps.id} - ${ps.pemegang_izin} (${ps.skema})`);
    });
  }
  
  const { data: finalLpData, error: finalLpError } = await supabase
    .from('lembaga_pengelola')
    .select('id, nama, perhutanan_sosial_id')
    .eq('perhutanan_sosial_id', perhutanan_sosial_id);
    
  if (finalLpError) {
    console.error(`   Error fetching lembaga_pengelola: ${finalLpError.message}`);
  } else {
    console.log(`   Lembaga_pengelola:`);
    finalLpData.forEach(lp => {
      console.log(`     ${lp.id} - ${lp.nama} (${lp.perhutanan_sosial_id})`);
    });
  }
  
  console.log('\n4. Pemeriksaan duplikat nama:');
  const { data: allPanintu, error: allPanintuError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin')
    .or('pemegang_izin.ilike.%PANINTU%,pemegang_izin.ilike.%PANDINU%');
    
  if (allPanintuError) {
    console.error(`   Error searching: ${allPanintuError.message}`);
  } else {
    console.log(`   Total records with PANINTU/PANDINU: ${allPanintu.length}`);
    allPanintu.forEach(ps => {
      console.log(`     ${ps.id} - ${ps.pemegang_izin}`);
    });
  }
}

fixFinal().catch(console.error);
