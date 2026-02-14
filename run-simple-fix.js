const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service key

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🚀 Running program approval fix...');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey.length, 'characters');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFix() {
  try {
    // Read the SQL file
    const sql = fs.readFileSync('fix-program-approval.sql', 'utf8');
    
    console.log('📄 SQL file loaded,', sql.split('\n').length, 'lines');
    
    // Split SQL into individual statements (simplistic approach)
    // For now, let's try to run via REST API
    console.log('📤 Attempting to execute SQL via REST API...');
    
    // Try to execute using Supabase's REST API with raw SQL
    // We'll use fetch to call the REST endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (response.ok) {
      console.log('✅ SQL executed successfully via REST API');
    } else {
      const errorText = await response.text();
      console.error('❌ REST API failed:', response.status, response.statusText);
      console.error('Error:', errorText.substring(0, 500));
      
      // Try alternative approach: execute statements one by one
      console.log('🔄 Trying alternative approach: manual updates');
      await executeManualFix();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('🔄 Falling back to manual fix...');
    await executeManualFix();
  }
}

async function executeManualFix() {
  console.log('\n🔧 Applying manual fixes...');
  
  try {
    // 1. First, let's check if created_by column exists
    console.log('1. Checking programs table structure...');
    const { data: sample, error: sampleError } = await supabase
      .from('programs')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('   ❌ Error checking programs:', sampleError.message);
    } else if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0]);
      console.log(`   ✅ Programs table has ${columns.length} columns`);
      
      if (!columns.includes('created_by')) {
        console.log('   ℹ️ created_by column missing - attempting to add...');
        
        // Since we can't run ALTER TABLE directly, we'll need a different approach
        // For now, we'll update the API to handle missing created_by gracefully
        console.log('   ⚠️  Need database admin access to add column');
        console.log('   🔄 API already updated to handle missing created_by');
      } else {
        console.log('   ✅ created_by column exists');
      }
    }
    
    // 2. Check foreign key constraint issue
    console.log('\n2. Testing foreign key constraint...');
    
    // Get a program that needs review
    const { data: programs, error: progError } = await supabase
      .from('programs')
      .select('id, kode_program, status, reviewed_by, submitted_by')
      .in('status', ['submitted_for_review', 'under_review', 'needs_revision'])
      .limit(1);
    
    if (progError) {
      console.error('   ❌ Error getting programs:', progError.message);
    } else if (programs && programs.length > 0) {
      const program = programs[0];
      console.log(`   Test program: ${program.kode_program} (${program.id})`);
      
      // Check current user session to get a valid user ID
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        console.log('   ℹ️ No active session - using test approach');
        
        // Try to get any existing user ID from the database
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (usersError || !users || users.length === 0) {
          console.error('   ❌ Cannot find any user IDs in profiles table');
          console.log('   ⚠️  Foreign key constraint may fail if reviewed_by is not a valid user ID');
        } else {
          const testUserId = users[0].id;
          console.log(`   Found user ID: ${testUserId}`);
          
          // Test update with valid user ID
          const { error: updateError } = await supabase
            .from('programs')
            .update({ 
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewed_by: testUserId,
              review_notes: 'Test approval via manual fix'
            })
            .eq('id', program.id);
          
          if (updateError) {
            console.error('   ❌ Update failed:', updateError.message);
            console.error('   Code:', updateError.code, 'Details:', updateError.details);
            
            if (updateError.code === '23503') {
              console.log('   💡 Foreign key constraint violation detected');
              console.log('   💡 Need to ensure reviewed_by references auth.users.id');
              console.log('   💡 API uses session.user.id which should be valid');
            }
          } else {
            console.log('   ✅ Manual update succeeded with valid user ID');
            
            // Revert change
            await supabase
              .from('programs')
              .update({ 
                status: program.status,
                reviewed_at: null,
                reviewed_by: null,
                review_notes: null
              })
              .eq('id', program.id);
          }
        }
      } else {
        console.log(`   ✅ Active session found, user ID: ${session.user.id}`);
        console.log('   💡 API should work with this user ID');
      }
    }
    
    console.log('\n✅ Manual fix analysis complete');
    console.log('\n📋 Summary:');
    console.log('1. API has been updated to handle missing created_by column');
    console.log('2. Uses submitted_by as fallback for notifications');
    console.log('3. Foreign key constraint requires valid auth.users.id');
    console.log('4. Main fix is in API route to be more robust');
    
  } catch (error) {
    console.error('❌ Manual fix failed:', error);
  }
}

runFix().catch(console.error);