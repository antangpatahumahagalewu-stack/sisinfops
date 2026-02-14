const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('=== Detailed Program Table Schema Check ===\n');
  
  // Get column information by querying information_schema
  // First, let's get the actual structure of programs table
  console.log('1. Checking programs table structure...');
  
  try {
    // Use raw SQL query to get column info
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error getting program sample:', error);
      return;
    }

    if (data && data.length > 0) {
      const sample = data[0];
      console.log(`✅ Programs table exists with ${Object.keys(sample).length} columns:`);
      
      // List all columns
      Object.keys(sample).forEach(col => {
        const value = sample[col];
        console.log(`   - ${col}: ${typeof value}${value !== null ? ` (${value})` : ' (NULL)'}`);
      });

      // Check critical columns for approval workflow
      const criticalColumns = [
        'id', 'kode_program', 'nama_program', 'status', 'reviewed_by', 
        'reviewed_at', 'review_notes', 'created_by', 'submitted_by', 'submitted_at'
      ];

      console.log('\n2. Checking critical columns for approval workflow:');
      const missing = criticalColumns.filter(col => sample[col] === undefined);
      const present = criticalColumns.filter(col => sample[col] !== undefined);
      
      console.log('   Present:', present.join(', '));
      console.log('   Missing:', missing.length > 0 ? missing.join(', ') : 'None ✅');
      
      if (missing.length > 0) {
        console.log('\n⚠️  Missing columns that may cause approval errors:');
        missing.forEach(col => {
          if (col === 'created_by') {
            console.log(`   • ${col}: Required for notifications (API tries to use existingProgram.created_by)`);
          } else if (col === 'reviewed_by' || col === 'reviewed_at') {
            console.log(`   • ${col}: Required for tracking who reviewed and when`);
          } else if (col === 'review_notes') {
            console.log(`   • ${col}: Required for storing review comments`);
          }
        });
      }
    }
  } catch (err) {
    console.error('Exception:', err);
  }

  console.log('\n3. Checking permissions table...');
  
  try {
    // Try to find permissions table under different possible names
    const tableNames = ['permissions', 'user_permissions', 'role_permissions', 'rbac_permissions'];
    
    for (const tableName of tableNames) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ Found permissions table: ${tableName}`);
        if (data && data.length > 0) {
          console.log(`   Contains ${data.length} records`);
        }
        break;
      }
    }
  } catch (err) {
    console.error('No permissions table found under common names');
  }

  console.log('\n4. Testing actual approval failure scenario...');
  
  try {
    // Get a program that needs review
    const { data: programs, error: progError } = await supabase
      .from('programs')
      .select('id, kode_program, status')
      .in('status', ['submitted_for_review', 'under_review', 'needs_revision'])
      .limit(1);

    if (progError) {
      console.error('Error getting programs:', progError);
    } else if (programs && programs.length > 0) {
      const program = programs[0];
      console.log(`   Test program: ${program.kode_program} (${program.id}, status: ${program.status})`);
      
      // Check if we can manually update the status
      const { error: updateError } = await supabase
        .from('programs')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: '00000000-0000-0000-0000-000000000000' // test UUID
        })
        .eq('id', program.id);
      
      if (updateError) {
        console.error('   ❌ Manual update failed:', updateError.message);
        console.error('   Code:', updateError.code, 'Details:', updateError.details);
      } else {
        console.log('   ✅ Manual update succeeded (checking for column issues)');
        
        // Revert the change
        await supabase
          .from('programs')
          .update({ 
            status: program.status,
            reviewed_at: null,
            reviewed_by: null
          })
          .eq('id', program.id);
      }
    }
  } catch (err) {
    console.error('Exception testing update:', err);
  }

  console.log('\n=== Recommendations ===');
  console.log('1. Check if migrations have been applied:');
  console.log('   - Look for migration files in migrations/schema/');
  console.log('   - Check if add_financial_columns_to_programs.sql has been run');
  console.log('   - May need to add created_by column separately');
  
  console.log('\n2. Check API route error handling:');
  console.log('   - API may be failing on notification insertion');
  console.log('   - Should handle missing created_by gracefully');
  
  console.log('\n3. Permissions table missing:');
  console.log('   - RBAC system requires permissions table');
  console.log('   - May need to create it or adjust hasPermission function');
}

checkSchema().catch(console.error);