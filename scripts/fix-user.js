const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseAnonKey, supabaseServiceKey;

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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser() {
  const email = 'boby@yayasan.com';
  const password = 'admin123';
  const fullName = 'Boby Harinto Mihing';
  const role = 'admin';

  console.log('Fixing user:', email);
  
  // Coba cari user di auth.users dengan API admin
  // Gunakan service role key dengan header apikey
  const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const headers = {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
  };

  console.log('Searching for user in auth.users...');
  const listResponse = await fetch(`${authAdminUrl}?email=${encodeURIComponent(email)}`, {
    headers,
  });

  let userId = null;
  if (listResponse.ok) {
    const users = await listResponse.json();
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log(`✓ User found in auth.users: ${email} (ID: ${userId})`);
    }
  } else {
    const errorText = await listResponse.text();
    console.error('Failed to search users:', errorText);
  }

  // Jika user tidak ditemukan, buat user baru
  if (!userId) {
    console.log('Creating new user in auth.users...');
    const createBody = {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    };
    
    const createResponse = await fetch(authAdminUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(createBody),
    });
    
    if (createResponse.ok) {
      const user = await createResponse.json();
      userId = user.id;
      console.log(`✓ User created in auth.users: ${email} (ID: ${userId})`);
    } else {
      const errorText = await createResponse.text();
      console.error('Failed to create user:', errorText);
      console.log('Trying alternative approach...');
      
      // Coba dengan supabase.auth.admin.createUser() jika tersedia
      // Tapi mungkin versi supabase-js tidak mendukung, kita coba dengan signUp biasa
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      
      if (signUpError) {
        console.error('Sign up error:', signUpError.message);
        // Mungkin user sudah ada tapi dengan cara lain
        // Coba sign in untuk mendapatkan user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          console.error('Sign in error:', signInError.message);
          console.log('Please create user manually in Supabase Dashboard');
          process.exit(1);
        } else {
          userId = signInData.user.id;
          console.log(`✓ User authenticated: ${email} (ID: ${userId})`);
        }
      } else {
        userId = signUpData.user.id;
        console.log(`✓ User signed up: ${email} (ID: ${userId})`);
      }
    }
  }

  // Pastikan profile ada di tabel profiles
  console.log('\nChecking profile in profiles table...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
  }
  
  if (!profile) {
    console.log('Creating profile...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        role,
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error creating profile:', insertError.message);
      
      // Coba update jika mungkin sudah ada
      console.log('Trying to update profile instead...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role, full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating profile:', updateError.message);
      } else {
        console.log('✓ Profile updated successfully');
      }
    } else {
      console.log('✓ Profile created successfully');
    }
  } else {
    console.log('Profile already exists:', profile);
    
    // Update role jika bukan admin
    if (profile.role !== role) {
      console.log(`Updating role from '${profile.role}' to '${role}'...`);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating role:', updateError.message);
      } else {
        console.log('✓ Role updated to admin');
      }
    } else {
      console.log('✓ Role is already admin');
    }
  }

  // Verifikasi akhir
  console.log('\n=== Final Verification ===');
  console.log(`Email: ${email}`);
  console.log(`User ID: ${userId}`);
  
  const { data: finalProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .single()
    .catch(() => ({ data: null }));
  
  if (finalProfile) {
    console.log(`Profile Role: ${finalProfile.role}`);
    console.log(`Profile Name: ${finalProfile.full_name}`);
    
    if (finalProfile.role === 'admin') {
      console.log('✓ SUCCESS: User is ready with admin role');
    } else {
      console.log('✗ WARNING: User role is not admin');
    }
  } else {
    console.log('✗ ERROR: Could not verify profile');
  }

  console.log('\n=== Login Test ===');
  console.log(`You can now login with:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
}

fixUser().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
