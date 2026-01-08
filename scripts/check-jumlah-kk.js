const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
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
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  console.log('Checking data in perhutanan_sosial table...\n');
  
  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('perhutanan_sosial')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting total count:', countError);
      return;
    }
    
    console.log(`Total records in perhutanan_sosial: ${totalCount || 0}`);
    
    // Get count with jumlah_kk filled
    const { count: withJumlahKk, error: withError } = await supabase
      .from('perhutanan_sosial')
      .select('*', { count: 'exact', head: true })
      .not('jumlah_kk', 'is', null);
    
    if (withError) {
      console.error('Error getting count with jumlah_kk:', withError);
      return;
    }
    
    const withJumlahKkCount = withJumlahKk || 0;
    const withoutJumlahKkCount = (totalCount || 0) - withJumlahKkCount;
    
    console.log(`Records with jumlah_kk filled: ${withJumlahKkCount}`);
    console.log(`Records without jumlah_kk: ${withoutJumlahKkCount}`);
    
    // Get sample data
    console.log('\n=== Sample Data (first 10 records) ===');
    const { data: sampleData, error: sampleError } = await supabase
      .from('perhutanan_sosial')
      .select('pemegang_izin, nomor_sk, jumlah_kk')
      .limit(10);
    
    if (sampleError) {
      console.error('Error getting sample data:', sampleError);
      return;
    }
    
    if (sampleData && sampleData.length > 0) {
      console.table(sampleData);
    } else {
      console.log('No data found in table');
    }
    
    // Get statistics
    console.log('\n=== Statistics ===');
    const { data: statsData, error: statsError } = await supabase
      .from('perhutanan_sosial')
      .select('jumlah_kk')
      .not('jumlah_kk', 'is', null);
    
    if (!statsError && statsData && statsData.length > 0) {
      const jumlahKkValues = statsData.map(d => d.jumlah_kk).filter(v => v !== null);
      const sum = jumlahKkValues.reduce((a, b) => a + b, 0);
      const avg = sum / jumlahKkValues.length;
      const min = Math.min(...jumlahKkValues);
      const max = Math.max(...jumlahKkValues);
      
      console.log(`Total jumlah_kk values: ${jumlahKkValues.length}`);
      console.log(`Sum of jumlah_kk: ${sum}`);
      console.log(`Average jumlah_kk: ${avg.toFixed(2)}`);
      console.log(`Min jumlah_kk: ${min}`);
      console.log(`Max jumlah_kk: ${max}`);
    }
    
    // Summary
    console.log('\n=== Summary ===');
    if (totalCount === 0) {
      console.log('❌ No data in database. You need to import data first.');
    } else if (withJumlahKkCount === 0) {
      console.log('⚠️  Data exists but jumlah_kk is empty. Run import-jumlah-kk.js to fill it.');
    } else if (withJumlahKkCount === totalCount) {
      console.log('✅ All records have jumlah_kk filled.');
    } else {
      console.log(`⚠️  Only ${withJumlahKkCount} out of ${totalCount} records have jumlah_kk filled.`);
      console.log('   Run import-jumlah-kk.js to fill the remaining records.');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the check
checkData();
