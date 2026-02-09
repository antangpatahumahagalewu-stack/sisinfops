const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing database setup...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSetup() {
  try {
    console.log('\n1. Checking connection to kabupaten table...');
    const { data: kabData, error: kabError } = await supabase
      .from('kabupaten')
      .select('*')
      .limit(5);
    
    if (kabError) {
      console.log('❌ kabupaten table not found or error:', kabError.message);
      console.log('\nPlease run setup_database_complete.sql in Supabase SQL Editor first!');
      console.log('Go to: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql');
      console.log('Then paste the content of setup_database_complete.sql and run it.');
      return;
    }
    
    console.log(`✅ Found ${kabData.length} kabupaten records:`, kabData.map(k => k.nama));
    
    console.log('\n2. Checking perhutanan_sosial table...');
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('count', { count: 'exact', head: true });
    
    if (psError) {
      console.log('❌ perhutanan_sosial table not found:', psError.message);
    } else {
      console.log(`✅ perhutanan_sosial table has ${psData.count} records`);
    }
    
    console.log('\n3. Checking profiles table...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('role, count(*)', { count: 'exact', head: false })
      .groupBy('role');
    
    if (profilesError) {
      console.log('❌ profiles table error:', profilesError.message);
    } else {
      console.log('✅ Profiles role distribution:');
      profilesData.forEach(p => {
        console.log(`   - ${p.role}: ${p.count}`);
      });
    }
    
    console.log('\n4. Checking auth users...');
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Auth users error:', usersError.message);
    } else {
      console.log(`✅ Found ${usersData.users.length} auth users`);
      usersData.users.slice(0, 5).forEach(u => {
        console.log(`   - ${u.email} (${u.id})`);
      });
    }
    
    console.log('\n=== SETUP STATUS ===');
    console.log('✅ Database connection successful');
    console.log('✅ kabupaten table exists');
    console.log(psError ? '❌ perhutanan_sosial table missing' : '✅ perhutanan_sosial table exists');
    console.log(profilesError ? '❌ profiles table error' : '✅ profiles table exists');
    
    if (kabError || psError || profilesError) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql');
      console.log('2. Copy content of setup_database_complete.sql');
      console.log('3. Paste and run the SQL script');
      console.log('4. Run this test again');
    } else {
      console.log('\n🎉 Database is ready!');
      console.log('You can now run the import script:');
      console.log('   node import_perhutanan_sosial_data.js');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSetup();