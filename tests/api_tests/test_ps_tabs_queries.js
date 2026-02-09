const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSamplePsId() {
  const { data, error } = await supabase
    .from('perhutanan_sosial')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('❌ Error fetching PS data:', error.message);
    return null;
  }
  
  return data && data.length > 0 ? data[0].id : null;
}

async function testCatatanQuery(psId) {
  console.log('\n🔍 Testing ps_catatan query (from tab-catatan.tsx)...');
  
  try {
    const { data, error } = await supabase
      .from('ps_catatan')
      .select('*')
      .eq('perhutanan_sosial_id', psId)
      .order('tanggal_catatan', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} catatan records`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample catatan:');
      data.slice(0, 2).forEach((cat, index) => {
        console.log(`  ${index + 1}. ${cat.judul} (${cat.kategori})`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testPetaQuery(psId) {
  console.log('\n🔍 Testing ps_peta query (from tab-peta.tsx)...');
  
  try {
    const { data, error } = await supabase
      .from('ps_peta')
      .select('*')
      .eq('perhutanan_sosial_id', psId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} peta records`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample peta:');
      data.forEach((peta, index) => {
        console.log(`  ${index + 1}. ${peta.nama_peta} (${peta.jenis_peta || 'no type'})`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testGaleriQuery(psId) {
  console.log('\n🔍 Testing ps_galeri query (from tab-galeri.tsx)...');
  
  try {
    const { data, error } = await supabase
      .from('ps_galeri')
      .select('*')
      .eq('perhutanan_sosial_id', psId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} galeri records`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample galeri:');
      data.slice(0, 2).forEach((gal, index) => {
        console.log(`  ${index + 1}. ${gal.judul_gambar} (${gal.jenis_file || 'no type'})`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testLahanQuery(psId) {
  console.log('\n🔍 Testing ps_lahan query (from tab-lahan.tsx)...');
  
  try {
    const { data, error } = await supabase
      .from('ps_lahan')
      .select('*')
      .eq('perhutanan_sosial_id', psId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} lahan records`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample lahan:');
      data.forEach((lahan, index) => {
        console.log(`  ${index + 1}. ${lahan.nama_lahan} (${lahan.luas_ha} ha, ${lahan.jenis_lahan})`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testKegiatanQuery(psId) {
  console.log('\n🔍 Testing ps_kegiatan query (from tab-kegiatan.tsx)...');
  
  try {
    const { data, error } = await supabase
      .from('ps_kegiatan')
      .select('*')
      .eq('perhutanan_sosial_id', psId)
      .order('tanggal_mulai', { ascending: false, nullsFirst: false });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} kegiatan records`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample kegiatan:');
      data.slice(0, 2).forEach((keg, index) => {
        console.log(`  ${index + 1}. ${keg.nama_kegiatan} (${keg.status})`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testLembagaQuery(psId) {
  console.log('\n🔍 Testing lembaga_pengelola query (from tab-kelembagaan.tsx)...');
  
  try {
    const { data, error } = await supabase
      .from('lembaga_pengelola')
      .select('*')
      .eq('perhutanan_sosial_id', psId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} lembaga records`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample lembaga:');
      data.forEach((lem, index) => {
        console.log(`  ${index + 1}. ${lem.nama_lembaga} (${lem.jenis_lembaga})`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testDokumenQuery(psId) {
  console.log('\n🔍 Testing ps_dokumen query (from tab-dokumen.tsx)...');
  
  try {
    const { data, error } = await supabase
      .from('ps_dokumen')
      .select('*')
      .eq('perhutanan_sosial_id', psId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} dokumen records`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample dokumen:');
      data.slice(0, 2).forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.nama_dokumen} (${doc.jenis_dokumen})`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 COMPREHENSIVE PS TAB QUERIES TEST');
  console.log('='.repeat(60));
  
  const psId = await getSamplePsId();
  if (!psId) {
    console.error('❌ No PS found for testing');
    process.exit(1);
  }
  
  console.log(`📋 Using PS ID: ${psId}`);
  
  const testResults = [];
  
  // Run all tests
  testResults.push(await testCatatanQuery(psId));
  testResults.push(await testPetaQuery(psId));
  testResults.push(await testGaleriQuery(psId));
  testResults.push(await testLahanQuery(psId));
  testResults.push(await testKegiatanQuery(psId));
  testResults.push(await testLembagaQuery(psId));
  testResults.push(await testDokumenQuery(psId));
  
  const passed = testResults.filter(r => r).length;
  const total = testResults.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${total} queries`);
  console.log(`❌ Failed: ${total - passed}/${total} queries`);
  
  if (passed === total) {
    console.log('\n🎉 ALL PS TAB QUERIES SUCCESSFUL!');
    console.log('\n💡 Frontend console errors should now be fixed:');
    console.log('   • tab-catatan.tsx ✅');
    console.log('   • tab-peta.tsx ✅');
    console.log('   • tab-galeri.tsx ✅');
    console.log('   • tab-lahan.tsx ✅');
    console.log('   • tab-kegiatan.tsx ✅');
    console.log('   • tab-kelembagaan.tsx ✅');
    console.log('   • tab-dokumen.tsx ✅');
    console.log('\n📋 Final recommendations:');
    console.log('   1. Restart Next.js dev server: npm run dev');
    console.log('   2. Clear browser cache');
    console.log('   3. Test PS detail page → All tabs');
  } else {
    console.log('\n⚠️  Some queries failed. Need to check:');
    console.log('   1. Table schemas match TypeScript interfaces');
    console.log('   2. Foreign key relationships');
    console.log('   3. RLS policies');
  }
}

main().catch(console.error);