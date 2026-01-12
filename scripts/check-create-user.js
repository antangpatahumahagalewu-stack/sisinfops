const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateUser() {
  const email = 'boby@yayasan.com';
  const password = 'admin123';
  const fullName = 'Boby Harinto Mihing';
  const role = 'admin';

  console.log('Checking if user exists in auth.users...');
  
  // Try to get user by email using admin API (Supabase Auth Admin API not available in supabase-js directly)
  // We'll use the supabase.auth.admin.listUsers() method if available (requires supabase-js v2)
  // Alternatively, we can try to sign in to see if user exists, but we need admin privileges.
  // Let's try to use the REST API directly.
  
  // First, let's check if we can query the profiles table for this email.
  // We need to join with auth.users, but we can't directly. Instead, we can try to create user if not exists.
  
  console.log('Attempting to create user if not exists...');
  
  // Create user using admin API via REST
  const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const headers = {
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
  };

  // Check if user exists by listing users with email
  const listResponse = await fetch(`${authUrl}?email=${encodeURIComponent(email)}`, {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
  });

  if (listResponse.ok) {
    const users = await listResponse.json();
    let userId = null;
    
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log(`User found: ${email} with ID: ${userId}`);
    } else {
      // Create user
      console.log('Creating new user...');
      const createBody = {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      };
      
      const createResponse = await fetch(authUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(createBody),
      });
      
      if (createResponse.ok) {
        const user = await createResponse.json();
        userId = user.id;
        console.log(`User created: ${email} with ID: ${userId}`);
      } else {
        const error = await createResponse.text();
        console.error('Failed to create user:', error);
        process.exit(1);
      }
    }
    
    // Now ensure profile exists
    console.log('Checking profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
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
        console.error('Error creating profile:', insertError);
        // Maybe profile already exists? Try update
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role, full_name: fullName, updated_at: new Date().toISOString() })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating profile:', updateError);
        } else {
          console.log('Profile updated successfully');
        }
      } else {
        console.log('Profile created successfully');
      }
    } else {
      console.log('Profile already exists, updating role if needed...');
      // Update role to admin if not already
      if (profile.role !== role) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating profile role:', updateError);
        } else {
          console.log('Profile role updated to admin');
        }
      } else {
        console.log('Profile role is already admin');
      }
    }
    
    console.log('Done!');
    
  } else {
    console.error('Failed to list users:', await listResponse.text());
    process.exit(1);
  }
}

checkAndCreateUser().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
