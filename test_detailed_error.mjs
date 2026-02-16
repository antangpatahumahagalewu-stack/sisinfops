// Detailed test to diagnose "Database error saving new user"
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 Environment Configuration:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY present:', !!supabaseAnonKey)

async function testAdminApi() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }

  console.log('\n=== Test 1: Check Admin API Health ===')
  
  try {
    // Test GET users endpoint
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    })
    
    const data = await response.json()
    console.log('GET /admin/users status:', response.status)
    console.log('GET /admin/users response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Admin API is accessible')
    } else {
      console.error('❌ Admin API access failed')
    }
  } catch (error) {
    console.error('❌ Error accessing Admin API:', error.message)
  }

  console.log('\n=== Test 2: Test Create User with Different Parameters ===')
  
  const testUsers = [
    {
      name: 'Basic user',
      data: {
        email: `test-basic-${Date.now()}@example.com`,
        password: 'Password123!',
        email_confirm: true
      }
    },
    {
      name: 'User with metadata',
      data: {
        email: `test-meta-${Date.now()}@example.com`,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { full_name: 'Test User' }
      }
    },
    {
      name: 'User without email_confirm',
      data: {
        email: `test-noconfirm-${Date.now()}@example.com`,
        password: 'Password123!',
        user_metadata: { full_name: 'Test User' }
      }
    }
  ]

  for (const test of testUsers) {
    console.log(`\n🔧 Testing: ${test.name}`)
    console.log('Request data:', test.data)
    
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(test.data)
      })
      
      const data = await response.json()
      console.log(`Response status: ${response.status}`)
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))
      console.log(`Response data:`, JSON.stringify(data, null, 2))
      
      if (response.ok) {
        console.log(`✅ ${test.name}: SUCCESS`)
        // Clean up
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          }
        })
        console.log(`🧹 Cleaned up test user`)
      } else {
        console.error(`❌ ${test.name}: FAILED`)
      }
    } catch (error) {
      console.error(`❌ ${test.name} error:`, error.message)
    }
  }

  console.log('\n=== Test 3: Check Supabase Project Settings ===')
  
  try {
    // Check project info via REST API
    const projectResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey || supabaseServiceKey,
        'Authorization': `Bearer ${supabaseAnonKey || supabaseServiceKey}`
      }
    })
    
    console.log('REST API status:', projectResponse.status)
    console.log('REST API headers:', Object.fromEntries(projectResponse.headers.entries()))
    
    if (projectResponse.ok) {
      const projectData = await projectResponse.text()
      console.log('REST API response sample:', projectData.substring(0, 500))
    }
  } catch (error) {
    console.error('Error checking project settings:', error.message)
  }

  console.log('\n=== Test 4: Direct SQL Test Simulation ===')
  
  // Show the SQL that would be executed based on migration files
  console.log(`
Based on migration files, here's the SQL function that works:

CREATE OR REPLACE FUNCTION create_user_with_profile(
    p_email TEXT,
    p_password TEXT DEFAULT 'password123',
    p_full_name TEXT,
    p_role TEXT
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Create user in auth.users directly
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', p_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO v_user_id;
    
    -- Create profile
    INSERT INTO profiles (id, role, full_name, updated_at)
    VALUES (v_user_id, p_role, p_full_name, NOW());
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

This approach bypasses the Auth API and works directly with the database.
`)
}

// Run tests
testAdminApi().then(() => {
  console.log('\n🎉 Diagnostic tests completed')
  console.log('\n📋 RECOMMENDATIONS:')
  console.log('1. If Admin API fails, consider using the SQL function approach')
  console.log('2. Check Supabase Dashboard for auth schema issues')
  console.log('3. Verify service role key has proper permissions')
  console.log('4. Try creating user manually in Supabase Dashboard first')
}).catch(error => {
  console.error('❌ Diagnostic tests failed:', error)
})