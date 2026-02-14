const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Program Approval Error Diagnosis ===');
console.log('Environment:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('\n--- Step 1: Check programs table structure ---');
  
  // Check if programs table exists and has required columns
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('id, kode_program, nama_program, status, submitted_at, reviewed_by, reviewed_at')
      .in('status', ['submitted_for_review', 'under_review', 'needs_revision'])
      .limit(5);

    if (error) {
      console.error('❌ Error querying programs table:', error.message);
      console.error('   Code:', error.code, 'Details:', error.details, 'Hint:', error.hint);
    } else {
      console.log(`✅ Programs table accessible. Found ${data?.length || 0} programs needing review.`);
      if (data && data.length > 0) {
        data.forEach(p => {
          console.log(`   - ${p.kode_program}: ${p.nama_program} (${p.status})`);
        });
      } else {
        console.log('   ℹ️ No programs found with status: submitted_for_review, under_review, or needs_revision');
      }
    }
  } catch (err) {
    console.error('❌ Exception querying programs:', err.message);
  }

  console.log('\n--- Step 2: Check permissions table ---');
  
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .limit(2);

    if (error) {
      console.error('❌ Error querying permissions table:', error.message);
    } else {
      console.log(`✅ Permissions table accessible. Found ${data?.length || 0} records.`);
    }
  } catch (err) {
    console.error('❌ Exception querying permissions:', err.message);
  }

  console.log('\n--- Step 3: Check notifications table (for error in API) ---');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .limit(2);

    if (error) {
      console.error('❌ Error querying notifications table:', error.message);
      console.error('   This could cause API error when trying to insert notification.');
    } else {
      console.log(`✅ Notifications table accessible. Found ${data?.length || 0} records.`);
    }
  } catch (err) {
    console.error('❌ Exception querying notifications:', err.message);
  }

  console.log('\n--- Step 4: Test API endpoint structure ---');
  
  // Check if the API route exists
  const apiPath = '/home/genesis/sisinfops/app/api/programs/[id]/approve/route.ts';
  if (fs.existsSync(apiPath)) {
    console.log('✅ API route file exists:', apiPath);
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // Check for common issues in the API code
    if (content.includes('updatedProgram')) {
      console.log('   ✅ API includes updatedProgram variable');
    }
    if (content.includes('notifications')) {
      console.log('   ✅ API includes notifications insertion');
    }
    if (content.includes('reviewed_by')) {
      console.log('   ✅ API includes reviewed_by column update');
    }
  } else {
    console.error('❌ API route file missing:', apiPath);
  }

  console.log('\n--- Step 5: Check for missing columns in programs table ---');
  
  // List columns that should exist for approval workflow
  const requiredColumns = [
    'id', 'kode_program', 'nama_program', 'status', 'reviewed_by', 
    'reviewed_at', 'review_notes', 'created_by', 'submitted_by', 'submitted_at'
  ];

  try {
    // Get a sample program to check columns
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Cannot check columns:', error.message);
    } else if (data && data.length > 0) {
      const program = data[0];
      const missingColumns = requiredColumns.filter(col => program[col] === undefined);
      
      if (missingColumns.length > 0) {
        console.error(`❌ Missing columns in programs table: ${missingColumns.join(', ')}`);
        console.error('   These columns are required for approval workflow.');
      } else {
        console.log('✅ All required columns present in programs table.');
      }
    }
  } catch (err) {
    console.error('❌ Exception checking columns:', err.message);
  }

  console.log('\n=== Diagnosis Complete ===');
  console.log('\nPossible issues to check:');
  console.log('1. Missing database columns (reviewed_by, reviewed_at, review_notes)');
  console.log('2. Missing notifications table');
  console.log('3. Permission issues with supabase user');
  console.log('4. API route not properly handling errors');
}

diagnose().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});