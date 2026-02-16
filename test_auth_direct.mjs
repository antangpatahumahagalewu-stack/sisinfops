// Direct test of Supabase Auth Admin API
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase Auth Admin API directly...')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

// Test using direct fetch to Supabase Auth Admin API
async function testDirectApi() {
  try {
    const testEmail = `direct-test-${Date.now()}@example.com`
    
    console.log(`Testing with email: ${testEmail}`)
    
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        email_confirm: true
      })
    })
    
    const data = await response.json()
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (!response.ok) {
      console.error('Error creating user via direct API')
      return false
    }
    
    console.log('✅ User created via direct API:', data)
    
    // Try to delete the user
    const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${data.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      }
    })
    
    if (!deleteResponse.ok) {
      console.error('⚠️ Failed to delete test user')
    } else {
      console.log('✅ Test user deleted')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error in direct API test:', error)
    return false
  }
}

// Test alternative: create user without email_confirm
async function testAlternative() {
  try {
    const testEmail = `alt-test-${Date.now()}@example.com`
    
    console.log(`Testing alternative (no email_confirm) with email: ${testEmail}`)
    
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123'
        // No email_confirm
      })
    })
    
    const data = await response.json()
    
    console.log('Alternative response status:', response.status)
    console.log('Alternative response data:', JSON.stringify(data, null, 2))
    
    return response.ok
  } catch (error) {
    console.error('❌ Error in alternative test:', error)
    return false
  }
}

// Run tests
async function runTests() {
  console.log('=== Test 1: Direct API with email_confirm ===')
  const test1 = await testDirectApi()
  
  console.log('\n=== Test 2: Alternative without email_confirm ===')
  const test2 = await testAlternative()
  
  console.log('\n=== Summary ===')
  console.log(`Test 1 (with email_confirm): ${test1 ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Test 2 (without email_confirm): ${test2 ? '✅ PASS' : '❌ FAIL'}`)
  
  return test1 || test2
}

runTests().then(success => {
  console.log(success ? '\n🎉 At least one test passed!' : '\n❌ All tests failed')
  process.exit(success ? 0 : 1)
})