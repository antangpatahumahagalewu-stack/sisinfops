const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseAnonKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
} else {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDashboardData() {
  console.log('🔍 Checking dashboard data...');
  console.log('===============================\n');

  try {
    // 1. Check perhutanan_sosial table
    console.log('1. Checking perhutanan_sosial table:');
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id, pemegang_izin, kabupaten_id, luas_ha, rkps_status, peta_status, jumlah_kk, skema')
      .limit(10);

    if (psError) {
      console.error('   ❌ Error:', psError.message);
      console.error('   Details:', psError);
    } else {
      console.log(`   ✅ Found ${psData?.length || 0} records`);
      if (psData && psData.length > 0) {
        console.log('   Sample data:');
        psData.slice(0, 3).forEach((ps, i) => {
          console.log(`     ${i + 1}. ${ps.pemegang_izin || 'N/A'} (ID: ${ps.id})`);
          console.log(`        Kabupaten ID: ${ps.kabupaten_id}`);
          console.log(`        Luas: ${ps.luas_ha || 0} ha`);
          console.log(`        Jumlah KK: ${ps.jumlah_kk || 0}`);
          console.log(`        Skema: ${ps.skema || 'N/A'}`);
          console.log(`        RKPS: ${ps.rkps_status || 'N/A'}, Peta: ${ps.peta_status || 'N/A'}`);
        });
      } else {
        console.log('   ⚠️  Table is empty');
      }
    }

    console.log('\n2. Checking kabupaten table:');
    const { data: kabupatenData, error: kabError } = await supabase
      .from('kabupaten')
      .select('id, nama, luas_total_ha')
      .limit(10);

    if (kabError) {
      console.error('   ❌ Error:', kabError.message);
      console.error('   Details:', kabError);
    } else {
      console.log(`   ✅ Found ${kabupatenData?.length || 0} records`);
      if (kabupatenData && kabupatenData.length > 0) {
        console.log('   Sample data:');
        kabupatenData.forEach((kab, i) => {
          console.log(`     ${i + 1}. ${kab.nama} (ID: ${kab.id})`);
          console.log(`        Luas Total: ${kab.luas_total_ha || 'N/A'} ha`);
        });
      } else {
        console.log('   ⚠️  Table is empty');
      }
    }

    console.log('\n3. Checking profiles table (for user context):');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .limit(5);

    if (profilesError) {
      console.error('   ❌ Error:', profilesError.message);
    } else {
      console.log(`   ✅ Found ${profilesData?.length || 0} profiles`);
    }

    console.log('\n4. Testing the exact query from dashboard:');
    console.log('   Query 1: perhutanan_sosial (id, kabupaten_id, luas_ha, rkps_status, peta_status, jumlah_kk, skema)');
    const { data: exactPsData, error: exactPsError } = await supabase
      .from('perhutanan_sosial')
      .select('id, kabupaten_id, luas_ha, rkps_status, peta_status, jumlah_kk, skema');

    if (exactPsError) {
      console.error('   ❌ Error:', exactPsError.message);
      console.error('   Details:', exactPsError);
    } else {
      console.log(`   ✅ Query successful, found ${exactPsData?.length || 0} records`);
      
      // Calculate stats like dashboard does
      const totalPS = exactPsData?.length || 0;
      const totalLuas = exactPsData?.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0) || 0;
      const totalRKPSAda = exactPsData?.filter(ps => ps.rkps_status === 'ada').length || 0;
      const totalPetaAda = exactPsData?.filter(ps => ps.peta_status === 'ada').length || 0;
      const totalKK = exactPsData?.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0) || 0;
      
      console.log('   Calculated stats:');
      console.log(`     - Total PS: ${totalPS}`);
      console.log(`     - Total Luas: ${totalLuas} ha`);
      console.log(`     - Total RKPS Ada: ${totalRKPSAda}`);
      console.log(`     - Total Peta Ada: ${totalPetaAda}`);
      console.log(`     - Total KK: ${totalKK}`);
    }

    console.log('\n5. Testing auth session (simulate login):');
    console.log('   Note: This requires valid credentials');
    console.log('   Skipping auth test for now...');

    console.log('\n===============================');
    console.log('📊 DIAGNOSIS SUMMARY:');
    
    if (exactPsError) {
      console.log('❌ PROBLEM FOUND: Dashboard query is failing!');
      console.log('   Error:', exactPsError.message);
      console.log('\n   RECOMMENDATION:');
      console.log('   1. Check if the columns exist in the table');
      console.log('   2. Check table permissions for authenticated users');
      console.log('   3. Verify Supabase RLS policies');
    } else if (exactPsData?.length === 0) {
      console.log('⚠️  WARNING: Dashboard query returns empty data');
      console.log('   The dashboard will show 0 values or "No data"');
      console.log('\n   RECOMMENDATION:');
      console.log('   1. Import data using scripts/import-pks.js or similar');
      console.log('   2. Run scripts/init-kabupaten.js to ensure kabupaten data');
      console.log('   3. Add sample data if needed');
    } else {
      console.log('✅ Dashboard data looks good!');
      console.log(`   Found ${exactPsData?.length} perhutanan_sosial records`);
      console.log(`   Found ${kabupatenData?.length} kabupaten records`);
      console.log('\n   If dashboard still shows empty:');
      console.log('   1. Check browser console for JavaScript errors');
      console.log('   2. Check network tab for failed API requests');
      console.log('   3. Verify session is being loaded correctly');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkDashboardData().then(() => {
  console.log('\nDone.');
  process.exit(0);
});