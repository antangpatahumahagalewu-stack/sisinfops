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

async function resolveConstraint() {
  const perhutanan_sosial_id = '908aaef6-78d8-4449-8b76-70c7c01c18d1';
  
  console.log('Memeriksa constraint issue...');
  
  // 1. Cari semua lembaga_pengelola dengan perhutanan_sosial_id yang sama
  console.log('\n1. Mencari duplikat lembaga_pengelola:');
  const { data: allLpForPs, error: allLpError } = await supabase
    .from('lembaga_pengelola')
    .select('id, nama, perhutanan_sosial_id, created_at')
    .eq('perhutanan_sosial_id', perhutanan_sosial_id);

  if (allLpError) {
    console.error(`Error: ${allLpError.message}`);
  } else {
    console.log(`Found ${allLpForPs.length} records for perhutanan_sosial_id ${perhutanan_sosial_id}:`);
    allLpForPs.forEach((lp, i) => {
      console.log(`   ${i+1}. ${lp.id} - ${lp.nama} (created: ${lp.created_at})`);
    });
    
    // Jika ada lebih dari 1, hapus yang lebih baru
    if (allLpForPs.length > 1) {
      console.log('\n   Found duplicates! Sorting by created_at...');
      const sorted = [...allLpForPs].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      
      // Keep the oldest, delete others
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      console.log(`   Keeping oldest: ${toKeep.id} (${toKeep.created_at})`);
      
      for (const lp of toDelete) {
        console.log(`   Deleting duplicate: ${lp.id} (${lp.created_at})`);
        const { error: deleteError } = await supabase
          .from('lembaga_pengelola')
          .delete()
          .eq('id', lp.id);
          
        if (deleteError) {
          console.error(`     Error deleting: ${deleteError.message}`);
        } else {
          console.log(`     Deleted successfully`);
        }
      }
    }
  }
  
  // 2. Cek constraint di database
  console.log('\n2. Memeriksa data perhutanan_sosial:');
  const { data: psData, error: psError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, skema')
    .eq('id', perhutanan_sosial_id);

  if (psError) {
    console.error(`Error: ${psError.message}`);
  } else {
    psData.forEach(ps => {
      console.log(`   ${ps.id} - ${ps.pemegang_izin} (${ps.skema})`);
    });
  }
  
  // 3. Coba update dengan pendekatan berbeda: langsung SQL jika perlu
  console.log('\n3. Mencoba update perhutanan_sosial dengan nama baru:');
  const newName = 'LPHD PANDINU PANTIS EBES';
  
  // Pertama, cek apakah ada duplikat nama di perhutanan_sosial
  const { data: duplicateNames, error: dupNameError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin')
    .eq('pemegang_izin', newName);

  if (dupNameError) {
    console.error(`   Error checking name duplicates: ${dupNameError.message}`);
  } else {
    console.log(`   Found ${duplicateNames.length} records with name "${newName}":`);
    duplicateNames.forEach(d => {
      console.log(`     ${d.id} - ${d.pemegang_izin}`);
    });
    
    // Jika ada duplikat selain record kita, itu masalah
    const otherDuplicates = duplicateNames.filter(d => d.id !== perhutanan_sosial_id);
    if (otherDuplicates.length > 0) {
      console.log(`   WARNING: Found ${otherDuplicates.length} other records with the same name!`);
      console.log(`   This might cause unique constraint issues.`);
      
      // Tampilkan opsi: update duplikat lain atau ubah nama kita sedikit
      console.log(`   Options:`);
      console.log(`     1. Update other duplicate(s) to different name`);
      console.log(`     2. Add suffix to our new name (e.g., "LPHD PANDINU PANTIS EBES (updated)")`);
    }
  }
  
  // 4. Update jika tidak ada masalah
  if (duplicateNames && duplicateNames.length === 0) {
    console.log(`\n4. No name duplicates found. Attempting update...`);
    
    const { error: updateError } = await supabase
      .from('perhutanan_sosial')
      .update({ pemegang_izin: newName })
      .eq('id', perhutanan_sosial_id);

    if (updateError) {
      console.error(`   Update error: ${updateError.message}`);
      console.log(`   This suggests a different constraint issue.`);
      
      // Cek constraint lphd_perhutanan_sosial_id_key - ini di tabel lembaga_pengelola
      console.log(`\n5. Checking lembaga_pengelola constraint...`);
      const { data: allLp, error: allLpError2 } = await supabase
        .from('lembaga_pengelola')
        .select('perhutanan_sosial_id, count')
        .select('perhutanan_sosial_id, count()')
        .group('perhutanan_sosial_id')
        .limit(10);

      if (allLpError2) {
        console.error(`   Error checking constraint: ${allLpError2.message}`);
      } else {
        console.log(`   Constraint check result (first 10):`, allLp);
      }
    } else {
      console.log(`   Successfully updated perhutanan_sosial to "${newName}"`);
    }
  }
  
  // 5. Verifikasi akhir
  console.log('\n6. Final verification:');
  const { data: finalCheck, error: finalError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin')
    .eq('id', perhutanan_sosial_id);
    
  if (finalError) {
    console.error(`   Error: ${finalError.message}`);
  } else {
    console.log(`   Current perhutanan_sosial data:`);
    finalCheck.forEach(ps => {
      console.log(`     ${ps.id} - ${ps.pemegang_izin}`);
      if (ps.pemegang_izin.includes('PANINTU')) {
        console.log(`     ⚠️  Masih mengandung PANINTU!`);
      } else if (ps.pemegang_izin.includes('PANDINU')) {
        console.log(`     ✓ Sudah diperbaiki ke PANDINU`);
      }
    });
  }
}

resolveConstraint().catch(console.error);
