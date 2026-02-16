// Simple test to check admin createUser with minimal parameters
import { createServerClient } from '@supabase/ssr'

// Manually load environment variables for testing
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 Environment check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '***' : 'NOT SET')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `Present (length: ${supabaseServiceKey.length})` : 'NOT SET')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

async function testCreateUser() {
  try {
    // Create admin client directly (without cookies since this is a script)
    const adminClient = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() { return [] },
        setAll() {}
      }
    })

    console.log('✅ Admin client created')

    // Try to list users first to check if admin API works
    console.log('🔧 Testing listUsers...')
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', {
        message: listError.message,
        name: listError.name,
        status: listError.status
      })
    } else {
      console.log(`✅ ListUsers successful, found ${listData.users?.length || 0} users`)
    }

    // Try to create a test user
    console.log('🔧 Attempting to create test user...')
    const testEmail = `test-${Date.now()}@example.com`
    
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      user_metadata: { full_name: 'Test User' }
    })
    
    if (authError) {
      console.error('❌ Error creating test user:', {
        message: authError.message,
        name: authError.name,
        status: authError.status,
        details: JSON.stringify(authError, null, 2)
      })
      
      // Try alternative with email_confirm
      console.log('🔄 Trying with email_confirm: true...')
      const { data: authData2, error: authError2 } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: 'testpassword123',
        email_confirm: true,
        user_metadata: { full_name: 'Test User' }
      })
      
      if (authError2) {
        console.error('❌ Alternative also failed:', {
          message: authError2.message,
          name: authError2.name,
          status: authError2.status
        })
        return false
      }
      
      console.log('✅ User created with email_confirm: true')
      console.log('User created:', authData2.user)
      
      // Cleanup
      await adminClient.auth.admin.deleteUser(authData2.user.id)
      console.log('✅ Test user cleaned up')
      return true
    }

    console.log('✅ Test user created successfully:', authData.user)
    
    // Clean up
    await adminClient.auth.admin.deleteUser(authData.user.id)
    console.log('✅ Test user cleaned up')
    
    return true
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    console.error('Stack:', error.stack)
    return false
  }
}

// Run test
testCreateUser().then(success => {
  console.log(success ? '🎉 Test passed!' : '❌ Test failed')
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Test execution failed:', error)
  process.exit(1)
})