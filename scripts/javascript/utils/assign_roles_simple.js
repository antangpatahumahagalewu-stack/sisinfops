const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const supabaseUrl = 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignRolesToUsers() {
  console.log('🚀 Assigning roles to existing users...\n');
  
  try {
    // 1. Get all users from auth
    console.log('1. Fetching users from auth...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError.message);
      return;
    }
    
    console.log(`✅ Found ${users.length} auth users`);
    
    // 2. Get existing profiles
    console.log('\n2. Fetching existing profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} existing profiles`);
    }
    
    // 3. Define role assignments based on email patterns
    const roleAssignments = {
      'axel@yayasan.com': 'admin',
      'amrin@yayasan.com': 'monev',
      'faris@yayasan.com': 'program_planner',
      'beben@yayasan.com': 'program_implementer',
      'ocay@yayasan.com': 'carbon_specialist'
    };
    
    console.log('\n3. Assigning roles based on email patterns...');
    
    let assignedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      const email = user.email;
      const assignedRole = roleAssignments[email] || 'viewer';
      
      console.log(`\n   User: ${email}`);
      console.log(`   Assigned role: ${assignedRole}`);
      
      try {
        // Check if profile exists
        const existingProfile = profiles?.find(p => p.id === user.id);
        
        if (existingProfile) {
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              role: assignedRole,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`   ❌ Update error:`, updateError.message);
            errorCount++;
          } else {
            console.log(`   ✅ Updated existing profile`);
            assignedCount++;
          }
        } else {
          // Create new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              role: assignedRole,
              full_name: user.user_metadata?.full_name || email.split('@')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error(`   ❌ Insert error:`, insertError.message);
            errorCount++;
          } else {
            console.log(`   ✅ Created new profile`);
            assignedCount++;
          }
        }
      } catch (err) {
        console.error(`   ❌ Error processing user ${email}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 SUMMARY:`);
    console.log(`   Total users processed: ${users.length}`);
    console.log(`   Successfully assigned: ${assignedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    // 4. Verify assignments
    console.log('\n4. Verifying role assignments...');
    const { data: updatedProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('email, role, full_name')
      .order('role');
    
    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    } else {
      console.log(`✅ Final profile count: ${updatedProfiles.length}`);
      
      // Group by role
      const roleGroups = {};
      updatedProfiles.forEach(profile => {
        const role = profile.role || 'no-role';
        if (!roleGroups[role]) roleGroups[role] = [];
        roleGroups[role].push(profile);
      });
      
      console.log('\n   Role distribution:');
      for (const [role, users] of Object.entries(roleGroups)) {
        console.log(`   - ${role}: ${users.length} user(s)`);
        users.slice(0, 3).forEach(user => {
          console.log(`     * ${user.email || user.full_name || 'N/A'}`);
        });
        if (users.length > 3) {
          console.log(`     ... and ${users.length - 3} more`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function checkDatabaseTables() {
  console.log('\n🔍 Checking database tables...');
  
  try {
    // Check perhutanan_sosial
    const { data: psData, error: psError } = await supabase
      .from('perhutanan_sosial')
      .select('count', { count: 'exact', head: true });
    
    if (psError) {
      console.log('ℹ️  perhutanan_sosial:', psError.message);
    } else {
      console.log(`✅ perhutanan_sosial: ${psData.count} rows`);
    }
    
    // Check role_permissions
    const { data: rolesData, error: rolesError } = await supabase
      .from('role_permissions')
      .select('*');
    
    if (rolesError) {
      console.log('ℹ️  role_permissions:', rolesError.message);
      
      // If table doesn't exist, create it with default roles
      console.log('⚠️  Creating role_permissions table with default roles...');
      await createRolePermissionsTable();
    } else {
      console.log(`✅ role_permissions: ${rolesData.length} roles defined`);
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  }
}

async function createRolePermissionsTable() {
  try {
    // Insert default roles based on TINGKATAN_USER.md
    const defaultRoles = [
      { role_name: 'admin', display_name: 'Administrator', description: 'Full access semua fitur', permissions: { all: ['create', 'read', 'update', 'delete'] } },
      { role_name: 'monev', display_name: 'Monitoring & Evaluasi', description: 'Fokus pada monitoring dan evaluasi data', permissions: { read: ['all'], edit: ['ps_data', 'potensi', 'kabupaten'], upload: ['excel'] } },
      { role_name: 'viewer', display_name: 'Viewer', description: 'Hanya membaca data (read-only)', permissions: { read: ['ps_data', 'potensi', 'kabupaten', 'statistics'] } },
      { role_name: 'program_planner', display_name: 'Program Planner', description: 'Fokus pada perencanaan program', permissions: { read: ['all'], edit: ['programs', 'dram', 'implementation', 'monitoring', 'economic_empowerment', 'stakeholder'] } },
      { role_name: 'program_implementer', display_name: 'Program Implementer', description: 'Fokus pada implementasi program', permissions: { read: ['all'], edit: ['implementation', 'economic_empowerment'] } },
      { role_name: 'carbon_specialist', display_name: 'Carbon Specialist', description: 'Fokus pada proyek karbon', permissions: { read: ['all'], edit: ['carbon_projects', 'programs', 'monitoring', 'stakeholder', 'legal', 'pdd'] } }
    ];
    
    for (const role of defaultRoles) {
      const { error } = await supabase
        .from('role_permissions')
        .upsert(role, { onConflict: 'role_name' });
      
      if (error) {
        console.error(`   ❌ Error inserting role ${role.role_name}:`, error.message);
      } else {
        console.log(`   ✅ Added role: ${role.role_name}`);
      }
    }
    
    console.log('✅ Default roles created');
    
  } catch (error) {
    console.error('❌ Error creating role permissions:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 SISTEM INFORMASI PERHUTANAN SOSIAL - ROLE ASSIGNMENT');
  console.log('========================================================\n');
  
  await checkDatabaseTables();
  await assignRolesToUsers();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 PROCESS COMPLETED');
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Restart the development server if running');
  console.log('2. Log out and log back in to refresh sessions');
  console.log('3. Verify role-based access in the application');
  console.log('4. Check the dashboard for data visibility');
}

main().catch(console.error);