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

async function testLogin() {
  const email = 'boby@yayasan.com';
  const password = 'admin123';

  console.log('Testing login with:');
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log('');

  try {
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('✗ Login failed:', error.message);
      console.error('  Details:', error);
      return false;
    }

    console.log('✓ Login successful!');
    console.log(`  User ID: ${data.user.id}`);
    console.log(`  Email: ${data.user.email}`);
    console.log(`  Session expires at: ${data.session.expires_at}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('  Error fetching profile:', profileError.message);
    } else {
      console.log(`  Role: ${profile.role}`);
      console.log(`  Full Name: ${profile.full_name}`);
    }

    // Sign out to clean up
    await supabase.auth.signOut();
    console.log('  Signed out.');

    return true;
  } catch (error) {
    console.error('✗ Unexpected error during login:', error);
    return false;
  }
}

testLogin().then(success => {
  if (success) {
    console.log('\n✅ Login test PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Login test FAILED');
    process.exit(1);
  }
});
