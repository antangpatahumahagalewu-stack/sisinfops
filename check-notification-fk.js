const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotificationFK() {
  console.log('=== Checking notifications table foreign key issue ===\n');
  
  // 1. Get a sample notification to understand structure
  console.log('1. Checking notifications table structure...');
  const { data: notifs, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .limit(2);
  
  if (notifError) {
    console.error('❌ Error getting notifications:', notifError.message);
  } else {
    console.log(`✅ Notifications table accessible. Found ${notifs?.length || 0} records.`);
    if (notifs && notifs.length > 0) {
      console.log('Sample notification:', JSON.stringify(notifs[0], null, 2));
    }
  }
  
  // 2. Check if the user_id exists in auth.users
  console.log('\n2. Testing user_id from program...');
  
  // Get the user ID that failed from previous test
  const problemUserId = 'be19cb53-810f-4db4-9b4d-2b721bb8f23a';
  console.log(`   Problem user ID: ${problemUserId}`);
  
  // Try to check if this exists in auth.users via supabase.auth.admin
  // We can use service role to query auth.users indirectly
  console.log('   Checking if user exists in auth.users...');
  
  // Since we can't directly query auth.users via Supabase JS client,
  // we can try to get user info via admin API
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(problemUserId);
  
  if (authError) {
    console.error('   ❌ Error checking auth user:', authError.message);
    console.log('   💡 This suggests the user ID might not exist in auth.users');
  } else if (authUser && authUser.user) {
    console.log(`   ✅ User found in auth.users: ${authUser.user.email}`);
  } else {
    console.log('   ❌ User not found in auth.users');
  }
  
  // 3. Check if notifications.user_id references auth.users or public.profiles
  console.log('\n3. Checking foreign key reference...');
  console.log('   ℹ️ Foreign key constraint: notifications_user_id_fkey');
  console.log('   Likely references: auth.users.id or public.profiles.id');
  
  // Check if there's a profiles entry for this user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', problemUserId)
    .single();
  
  if (profileError) {
    console.error('   ❌ Error checking profiles:', profileError.message);
    console.log('   💡 User might not have a profile record');
  } else if (profile) {
    console.log(`   ✅ Profile found: ${profile.full_name || 'No name'} (${profile.role || 'No role'})`);
  }
  
  // 4. Try to insert a notification with a known valid user ID
  console.log('\n4. Testing notification with valid user...');
  
  // Get a valid user from profiles
  const { data: validUsers, error: validUsersError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .limit(2);
  
  if (validUsersError || !validUsers || validUsers.length === 0) {
    console.error('   ❌ Cannot find any valid users');
    return;
  }
  
  const validUser = validUsers[0];
  console.log(`   Testing with user: ${validUser.full_name} (${validUser.id})`);
  
  const testNotification = {
    user_id: validUser.id,
    type: 'test',
    title: 'Test Notification',
    message: 'This is a test notification',
    data: { test: true },
    created_at: new Date().toISOString()
  };
  
  const { error: testError } = await supabase
    .from('notifications')
    .insert(testNotification);
  
  if (testError) {
    console.error('   ❌ Test notification failed:', testError.message);
    console.error('   Code:', testError.code, 'Details:', testError.details);
    
    if (testError.code === '23503') {
      console.log('   💡 Foreign key violation - notifications.user_id must reference a valid ID');
      console.log('   💡 Need to check what table it references');
    }
  } else {
    console.log('   ✅ Test notification inserted successfully');
    
    // Clean up
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', validUser.id)
      .eq('type', 'test');
  }
  
  console.log('\n=== Analysis Complete ===');
  console.log('\nPossible solutions:');
  console.log('1. Ensure user IDs in programs.created_by exist in auth.users');
  console.log('2. Check if notifications.user_id references auth.users.id or public.profiles.id');
  console.log('3. Update foreign key constraint if needed');
  console.log('4. API already handles notification errors gracefully');
  console.log('\nImmediate fix: API will catch notification errors and continue');
}

checkNotificationFK().catch(console.error);