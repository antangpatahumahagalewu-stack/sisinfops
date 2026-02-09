#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function checkPSData() {
  console.log('🔍 Checking perhutanan_sosial table data...\n');
  
  // Read from .env.local
  const fs = require('fs');
  const path = require('path');
  
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
      }
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        supabaseAnonKey = line.split('=')[1].trim();
      }
    }
  } catch (err) {
    console.error('❌ Error reading .env.local:', err.message);
    process.exit(1);
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration in .env.local');
    process.exit(1);
  }
  
  console.log(`📡 Connecting to Supabase: ${supabaseUrl.substring(0, 30)}...`);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test 1: Check kabupaten data
  console.log('\n1. Testing kabupaten table...');
  const { data: kabupatenData, error: kabupatenError } = await supabase
    .from('kabupaten')
    .select('*')
    .order('nama');
  
  if (kabupatenError) {
    console.log(`❌ Error: ${kabupatenError.message}`);
  } else {
    console.log(`✅ Found ${kabupatenData.length} kabupaten:`);
    kabupatenData.forEach(k => {
      console.log(`   • ${k.nama} (ID: ${k.id.substring(0, 8)}...)`);
    });
  }
  
  // Test 2: Check perhutanan_sosial data
  console.log('\n2. Testing perhutanan_sosial table...');
  const { data: psData, error: psError } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, kabupaten_id, skema, luas_ha, jumlah_kk, rkps_status, peta_status')
    .order('pemegang_izin');
  
  if (psError) {
    console.log(`❌ Error: ${psError.message}`);
    console.log(`   Code: ${psError.code}`);
    console.log(`   Details: ${JSON.stringify(psError.details)}`);
  } else {
    console.log(`✅ Found ${psData.length} PS records:`);
    if (psData.length > 0) {
      psData.slice(0, 5).forEach(ps => {
        console.log(`   • ${ps.pemegang_izen || 'N/A'} (${ps.skema || 'N/A'}): ${ps.luas_ha || 0} ha, ${ps.jumlah_kk || 0} KK`);
      });
      if (psData.length > 5) {
        console.log(`   ... and ${psData.length - 5} more`);
      }
    } else {
      console.log('   ⚠️  Table is EMPTY - no data found!');
    }
  }
  
  // Test 3: Check profiles and roles
  console.log('\n3. Testing profiles table (user roles)...');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .order('role');
  
  if (profileError) {
    console.log(`❌ Error: ${profileError.message}`);
  } else {
    console.log(`✅ Found ${profileData.length} user profiles:`);
    if (profileData.length > 0) {
      profileData.forEach(p => {
        console.log(`   • ${p.full_name || 'No name'} (${p.id.substring(0, 8)}...): ${p.role || 'No role'}`);
      });
    }
  }
  
  // Test 4: Check role_permissions
  console.log('\n4. Testing role_permissions table...');
  const { data: roleData, error: roleError } = await supabase
    .from('role_permissions')
    .select('role_name, display_name')
    .order('role_name');
  
  if (roleError) {
    console.log(`❌ Error: ${roleError.message}`);
  } else {
    console.log(`✅ Found ${roleData.length} role definitions:`);
    roleData.forEach(r => {
      console.log(`   • ${r.role_name} (${r.display_name})`);
    });
  }
  
  // Test 5: Check if we can insert/update (admin required)
  console.log('\n5. Testing basic write access (need auth)...');
  try {
    // Just test SELECT with count
    const { count, error: countError } = await supabase
      .from('perhutanan_sosial')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log(`❌ Count error: ${countError.message}`);
    } else {
      console.log(`✅ Total PS records: ${count || 0}`);
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
  
  console.log('\n📋 SUMMARY:');
  console.log(`   • Kabupaten: ${kabupatenData?.length || 0} records`);
  console.log(`   • Perhutanan Sosial: ${psData?.length || 0} records`);
  console.log(`   • User Profiles: ${profileData?.length || 0} records`);
  console.log(`   • Role Definitions: ${roleData?.length || 0} roles`);
  
  if (psData?.length === 0) {
    console.log('\n🚨 CRITICAL ISSUE: perhutanan_sosial table is EMPTY!');
    console.log('   This is why frontend is not showing any PS data.');
    console.log('   Solution: Need to import data into the table.');
  }
  
  if (profileData?.length === 0) {
    console.log('\n⚠️  WARNING: No user profiles found!');
    console.log('   Users may not have proper role assignments.');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (psData?.length === 0) {
    console.log('   1. Import data into perhutanan_sosial table');
    console.log('   2. Check import scripts or use Excel upload');
  } else {
    console.log('   1. Check frontend queries match table structure');
    console.log('   2. Verify RLS policies allow public read access');
  }
  console.log('   3. Verify user role assignments in profiles table');
}

checkPSData().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});