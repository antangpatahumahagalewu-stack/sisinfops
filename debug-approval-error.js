#!/usr/bin/env node

/**
 * Debug script to identify exact program approval error
 * This script simulates what the browser does and shows exact error messages
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Debugging Program Approval Error');
console.log('====================================\n');

console.log('1. Checking environment variables...');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? `✅ Present (length: ${supabaseAnonKey.length})` : '❌ Missing'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? `✅ Present (length: ${supabaseServiceKey.length})` : '❌ Missing'}`);

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables');
  process.exit(1);
}

// Create two clients: one with anon key (like browser) and one with service role
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function runDebug() {
  console.log('\n2. Testing database connectivity...');
  
  try {
    const { data, error } = await supabaseService
      .from('programs')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Database connection failed:', error.message);
      return;
    }
    console.log('   ✅ Database connection successful');
  } catch (err) {
    console.error('   ❌ Database test failed:', err.message);
    return;
  }

  console.log('\n3. Finding a program for testing...');
  
  const { data: programs, error: progError } = await supabaseService
    .from('programs')
    .select('id, kode_program, nama_program, status, created_by, submitted_by, reviewed_by, reviewed_at')
    .in('status', ['submitted_for_review', 'under_review', 'needs_revision'])
    .limit(2);
  
  if (progError) {
    console.error('   ❌ Error getting programs:', progError.message);
    return;
  }
  
  if (!programs || programs.length === 0) {
    console.log('   ⚠️ No programs found needing review');
    
    // List all programs to see what's available
    const { data: allPrograms } = await supabaseService
      .from('programs')
      .select('kode_program, nama_program, status')
      .limit(5);
    
    console.log('   Sample programs in database:');
    allPrograms?.forEach(p => {
      console.log(`      - ${p.kode_program}: ${p.nama_program} (${p.status})`);
    });
    
    return;
  }
  
  const program = programs[0];
  console.log(`   ✅ Found program: ${program.kode_program} (${program.status})`);
  console.log(`      ID: ${program.id}`);
  console.log(`      created_by: ${program.created_by || 'NULL'}`);
  console.log(`      submitted_by: ${program.submitted_by || 'NULL'}`);
  
  console.log('\n4. Testing API endpoint directly...');
  
  // Test 1: Direct API call without authentication (like browser without session)
  console.log('   Test 1: API call without authentication');
  try {
    const response = await fetch(`http://localhost:3000/api/programs/${program.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'approved',
        review_notes: 'Test approval via debug script'
      })
    });
    
    const result = await response.json();
    console.log(`      Status: ${response.status}`);
    console.log(`      Response: ${JSON.stringify(result, null, 2)}`);
    
    if (response.status === 401) {
      console.log('      💡 API returns 401 - Authentication required');
      console.log('      💡 This is expected: API requires valid user session');
    }
  } catch (fetchError) {
    console.error('      ❌ Fetch error:', fetchError.message);
  }
  
  console.log('\n5. Testing user authentication flow...');
  
  // Check for existing users
  const { data: users, error: usersError } = await supabaseService
    .from('profiles')
    .select('id, full_name, role, created_at')
    .limit(3);
  
  if (usersError) {
    console.error('   ❌ Error fetching users:', usersError.message);
  } else {
    console.log('   User profiles in database:');
    users?.forEach(user => {
      console.log(`      - ${user.full_name || 'Unknown'} (${user.role}): ${user.id}`);
    });
  }
  
  console.log('\n6. Analyzing database constraints...');
  
  // Get database schema info
  const { data: programColumns, error: schemaError } = await supabaseService
    .rpc('get_table_columns', { table_name: 'programs' })
    .catch(() => ({ data: null, error: 'RPC not available' }));
  
  if (!schemaError) {
    console.log('   Programs table columns:');
    programColumns?.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }
  
  console.log('\n7. Checking foreign key relationships...');
  
  // Get a user ID to test with
  const { data: testUser } = await supabaseService
    .from('profiles')
    .select('id')
    .limit(1)
    .single();
  
  if (testUser) {
    console.log(`   Test user ID: ${testUser.id}`);
    
    // Try to update program with this user ID
    console.log('   Testing manual update with user ID...');
    const { data: updated, error: updateError } = await supabaseService
      .from('programs')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: testUser.id,
        review_notes: 'Test update via debug script'
      })
      .eq('id', program.id)
      .select()
      .single();
    
    if (updateError) {
      console.error(`      ❌ Update failed: ${updateError.message}`);
      console.error(`      Code: ${updateError.code}, Details: ${updateError.details}`);
      
      if (updateError.code === '23503') {
        console.log('      💡 Foreign key constraint violation!');
        console.log('      💡 This is likely the root cause of the error.');
        
        // Check if user exists in auth.users
        const { data: authUser, error: authError } = await supabaseService.auth.admin.getUserById(testUser.id);
        
        if (authError) {
          console.error(`      ❌ User not found in auth.users: ${authError.message}`);
          console.log('      💡 profiles.id must match auth.users.id for foreign keys to work');
        } else {
          console.log(`      ✅ User exists in auth.users: ${authUser.user.email}`);
        }
      }
    } else {
      console.log('      ✅ Manual update succeeded!');
      console.log(`      New status: ${updated.status}`);
      
      // Revert changes
      await supabaseService
        .from('programs')
        .update({
          status: program.status,
          reviewed_at: null,
          reviewed_by: null,
          review_notes: null
        })
        .eq('id', program.id);
      
      console.log('      ✅ Changes reverted');
    }
  } else {
    console.log('   ⚠️ No users found for testing');
  }
  
  console.log('\n8. Summary of findings:');
  console.log('   • API requires authentication (returns 401 without session)');
  console.log('   • Database foreign key constraints may cause issues');
  console.log('   • User IDs in profiles must match auth.users.id');
  console.log('   • Notification constraints may fail but should not block approval');
  
  console.log('\n9. Recommended actions:');
  console.log('   a. Login to the application first');
  console.log('   b. Check browser console for exact error');
  console.log('   c. Check browser Network tab for API response');
  console.log('   d. Verify user has FINANCIAL_BUDGET_MANAGE permission');
  console.log('   e. If error persists, run: node scripts/run-simple-migration.js fix-notification-fk.sql');
  
  console.log('\n📝 Note: The API has been updated to:');
  console.log('   • Catch notification errors and continue');
  console.log('   • Provide detailed error messages for constraints');
  console.log('   • Use submitted_by as fallback for created_by');
  console.log('   • Handle foreign key violations gracefully');
}

// Run debug
runDebug().catch(error => {
  console.error('Debug script failed:', error);
  process.exit(1);
});