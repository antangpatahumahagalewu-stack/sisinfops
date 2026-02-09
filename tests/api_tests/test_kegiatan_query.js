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

async function testKegiatanQuery() {
  console.log('🔍 Testing ps_kegiatan table query...');
  
  try {
    // Get a sample PS ID first
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .limit(1);
    
    if (psError) {
      console.error('❌ Error fetching PS data:', psError.message);
      return false;
    }
    
    if (!psData || psData.length === 0) {
      console.error('❌ No PS data found');
      return false;
    }
    
    const psId = psData[0].id;
    console.log(`📋 Using PS ID: ${psId}`);
    
    // Test the exact query from tab-kegiatan.tsx
    const { data, error } = await supabase
      .from('ps_kegiatan')
      .select('*')
      .eq('perhutanan_sosial_id', psId)
      .order('tanggal_mulai', { ascending: false, nullsFirst: false });
    
    if (error) {
      console.error('❌ Error fetching kegiatan:', error.message);
      return false;
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} kegiatan records`);
    
    if (data && data.length > 0) {
      console.log('\n📊 Sample kegiatan data:');
      data.slice(0, 3).forEach((keg, index) => {
        console.log(`  ${index + 1}. ${keg.nama_kegiatan} (${keg.status})`);
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
  console.log('🔧 PS_KEGIATAN TABLE VERIFICATION');
  console.log('='.repeat(60));
  
  const success = await testKegiatanQuery();
  
  if (success) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('\n💡 Frontend fix confirmed:');
    console.log('   • ps_kegiatan table exists and is queryable');
    console.log('   • No more "Error fetching kegiatan: {}"');
    console.log('   • Table follows correct schema for tab-kegiatan.tsx');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart Next.js dev server: npm run dev');
    console.log('   2. Clear browser cache');
    console.log('   3. Test PS detail page → Kegiatan tab');
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('❌ VERIFICATION FAILED');
    console.log('='.repeat(60));
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if table has correct columns');
    console.log('   2. Verify foreign key relationship to perhutanan_sosial');
    console.log('   3. Check RLS policies');
  }
}

main().catch(console.error);