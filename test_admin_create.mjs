// Test script to check admin createUser functionality (ES modules)
import { createAdminClient } from './lib/supabase/admin.js';

async function testCreateUser() {
  try {
    console.log('🔧 Testing admin client creation...');
    const adminClient = await createAdminClient();
    console.log('✅ Admin client created successfully');

    // Try to create a test user
    console.log('🔧 Attempting to create test user...');
    const testEmail = `test-admin-${Date.now()}@example.com`;
    const testData = {
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: { full_name: 'Test Admin User' }
    };

    console.log('Test data:', testData);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser(testData);
    
    if (authError) {
      console.error('❌ Error creating test user:', {
        message: authError.message,
        name: authError.name,
        status: authError.status,
        details: authError
      });
      return false;
    }

    console.log('✅ Test user created successfully:', authData.user);
    
    // Clean up: delete the test user
    console.log('🧹 Cleaning up test user...');
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id);
    if (deleteError) {
      console.error('⚠️ Failed to delete test user:', deleteError.message);
    } else {
      console.log('✅ Test user deleted successfully');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run test
testCreateUser().then(success => {
  console.log(success ? '🎉 Test passed!' : '❌ Test failed');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});