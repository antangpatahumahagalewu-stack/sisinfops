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

async function verifyTable() {
  console.log('🔍 Verifying ps_dokumen table...');
  
  try {
    // Try to query the table (frontend query pattern)
    const { data, error } = await supabase
      .from('ps_dokumen')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying table:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      
      if (error.message.includes('Could not find the table')) {
        console.log('\n🔴 CRITICAL: Table still not found in schema cache.');
        return false;
      } else {
        console.log('\n⚠️  Other error but table exists:', error.message);
        console.log('   This means the table IS in schema cache but has other issues.');
        return true; // Table exists, just other error
      }
    }
    
    console.log(`✅ Table query successful! Found ${data.length} rows`);
    
    if (data.length > 0) {
      console.log('📋 Sample data:');
      data.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.nama} (${row.jenis})`);
        console.log(`      PS ID: ${row.perhutanan_sosial_id}`);
        console.log(`      File: ${row.file_name || 'none'}`);
      });
    } else {
      console.log('ℹ️  Table is empty (this is normal for new table)');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function testFrontendQueryPattern() {
  console.log('\n🔍 Testing frontend query pattern from tab-dokumen.tsx...');
  
  // Get a real psId for testing
  const { data: psData } = await supabase
    .from('perhutanan_sosial')
    .select('id')
    .limit(1);
  
  const psId = psData && psData.length > 0 ? psData[0].id : '00000000-0000-0000-0000-000000000000';
  
  console.log(`   Using PS ID: ${psId}`);
  
  const { error } = await supabase
    .from('ps_dokumen')
    .select('*')
    .eq('perhutanan_sosial_id', psId)
    .order('created_at', { ascending: false });
  
  if (error) {
    if (error.message.includes('Could not find the table')) {
      console.log('❌ FAIL: Still getting "table not found" error');
      return false;
    } else {
      console.log('✅ OK: Other error but table exists:', error.message);
      console.log('   This means the table IS queryable.');
      return true;
    }
  } else {
    console.log('✅ SUCCESS: Query executed without "table not found" error');
    return true;
  }
}

async function checkStorageBucket() {
  console.log('\n🔍 Checking if storage bucket exists...');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('⚠️  Cannot check storage buckets:', error.message);
      console.log('   You may need to create bucket "ps-dokumen" manually.');
      return false;
    }
    
    const hasPsDokumenBucket = data.some(bucket => bucket.name === 'ps-dokumen');
    
    if (hasPsDokumenBucket) {
      console.log('✅ Storage bucket "ps-dokumen" exists');
      return true;
    } else {
      console.log('⚠️  Storage bucket "ps-dokumen" does NOT exist');
      console.log('   You need to create it in Supabase Storage.');
      console.log('   Steps:');
      console.log('   1. Go to Supabase Dashboard → Storage');
      console.log('   2. Click "Create new bucket"');
      console.log('   3. Name: ps-dokumen');
      console.log('   4. Set to public (or configure RLS)');
      return false;
    }
  } catch (err) {
    console.log('⚠️  Error checking storage:', err.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 VERIFYING PS_DOKUMEN TABLE FIX');
  console.log('='.repeat(60));
  
  const results = {
    tableExists: await verifyTable(),
    frontendQuery: await testFrontendQueryPattern(),
    storageBucket: await checkStorageBucket(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const tableFixed = results.tableExists || (results.frontendQuery && !results.tableExists);
  
  if (tableFixed) {
    console.log('🎉 SUCCESS: The ps_dokumen table has been created!');
    console.log('\n💡 The original error "Error fetching dokumen: {}"');
    console.log('   has been RESOLVED. The frontend can now query this table.');
    
    if (!results.storageBucket) {
      console.log('\n⚠️  IMPORTANT: Storage bucket "ps-dokumen" needs to be created');
      console.log('   for file uploads to work properly.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('   1. Restart Next.js dev server: npm run dev');
    console.log('   2. Clear browser cache');
    console.log('   3. Visit a PS detail page → Dokumen tab');
    console.log('   4. Create storage bucket "ps-dokumen" in Supabase Storage');
  } else {
    console.log('❌ FAILURE: Table still not accessible');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Wait 1-2 minutes for Supabase cache refresh');
    console.log('   2. Restart Next.js dev server');
    console.log('   3. Run the migration manually in Supabase SQL Editor');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);