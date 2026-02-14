const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseAnonKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
} else {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPermissions() {
  console.log('🔐 Testing RBAC Permissions...');
  console.log('=========================================\n');

  try {
    // First, get all users and their roles
    console.log('1. Getting all users and roles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('role');

    if (profilesError) {
      console.error('   ❌ Error fetching profiles:', profilesError.message);
      return;
    }

    console.log(`   ✅ Found ${profiles?.length || 0} user profiles\n`);

    // Define permissions to test
    const permissionsToTest = [
      'READ',
      'EDIT',
      'DELETE',
      'FINANCIAL_BUDGET_MANAGE',
      'FINANCIAL_TRANSACTION_APPROVE',
      'PROGRAM_MANAGEMENT',
      'PS_DATA_ACCESS'
    ];

    // Test permissions for each user
    for (const profile of profiles || []) {
      console.log(`User: ${profile.full_name || 'N/A'} (${profile.role})`);
      console.log('Permissions:');
      
      for (const permission of permissionsToTest) {
        // Simple role-based permission check (simplified version of RBAC logic)
        const hasPermission = await checkPermission(profile.role, permission);
        console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}`);
      }
      console.log('');
    }

    // 2. Check specific program PRG-KPS-KAP-02 for review status
    console.log('2. Checking program PRG-KPS-KAP-02 in programs_needing_review view...');
    const { data: programsNeedingReview, error: reviewError } = await supabase
      .from('programs_needing_review')
      .select('*')
      .eq('kode_program', 'PRG-KPS-KAP-02');

    if (reviewError) {
      console.log(`   ⚠️  Error accessing view: ${reviewError.message}`);
    } else if (programsNeedingReview?.length === 0) {
      console.log('   ❌ Program PRG-KPS-KAP-02 not found in programs_needing_review view');
    } else {
      console.log(`   ✅ Found ${programsNeedingReview?.length} record(s)`);
      programsNeedingReview?.forEach((program, i) => {
        console.log(`      ${i + 1}. ${program.kode_program}: ${program.nama_program} (${program.status})`);
        console.log(`          Submitted: ${program.submitted_at}`);
        console.log(`          Budget: ${program.total_budget || 'N/A'}`);
      });
    }

    // 3. Check if view has proper columns for ProgramApprovalManager
    console.log('\n3. Checking programs_needing_review view structure...');
    if (programsNeedingReview && programsNeedingReview.length > 0) {
      const sample = programsNeedingReview[0];
      const requiredColumns = [
        'carbon_project_kode',
        'carbon_project_name', 
        'ps_pemegang_izin',
        'ps_desa',
        'ps_kecamatan',
        'ps_kabupaten',
        'submitter_name',
        'submitter_role'
      ];
      
      console.log('   Required columns in view:');
      for (const col of requiredColumns) {
        const hasColumn = col in sample;
        console.log(`      ${hasColumn ? '✅' : '❌'} ${col}`);
      }
    }

    // 4. Test direct program query
    console.log('\n4. Testing direct program query...');
    const { data: directProgram, error: directError } = await supabase
      .from('programs')
      .select('*')
      .eq('kode_program', 'PRG-KPS-KAP-02')
      .single();

    if (directError) {
      console.error(`   ❌ Error querying programs table: ${directError.message}`);
    } else {
      console.log(`   ✅ Found program: ${directProgram.nama_program} (${directProgram.status})`);
      console.log(`      Submitted by: ${directProgram.submitted_by}`);
      console.log(`      Submitted at: ${directProgram.submitted_at}`);
      console.log(`      Carbon Project ID: ${directProgram.carbon_project_id}`);
      console.log(`      Perhutanan Sosial ID: ${directProgram.perhutanan_sosial_id}`);
      
      // Check if related data exists
      if (directProgram.carbon_project_id) {
        const { data: carbonProject } = await supabase
          .from('carbon_projects')
          .select('kode_project, nama_project')
          .eq('id', directProgram.carbon_project_id)
          .single();
        console.log(`      Carbon Project: ${carbonProject?.nama_project || 'N/A'}`);
      }
      
      if (directProgram.perhutanan_sosial_id) {
        const { data: psData } = await supabase
          .from('perhutanan_sosial')
          .select('pemegang_izin, desa, kecamatan, kabupaten')
          .eq('id', directProgram.perhutanan_sosial_id)
          .single();
        console.log(`      Perhutanan Sosial: ${psData?.pemegang_izin || 'N/A'}`);
      }
    }

    console.log('\n=========================================');
    console.log('📊 RECOMMENDATIONS:');

    // Check if there are any users with financial permissions
    const financialRoles = ['admin', 'finance_manager', 'finance_operational'];
    const usersWithFinancialAccess = profiles?.filter(p => financialRoles.includes(p.role));
    
    if (usersWithFinancialAccess?.length === 0) {
      console.log('\n❌ No users have financial budget management permissions!');
      console.log('   Users need one of these roles: admin, finance_manager, finance_operational');
      console.log('   Current roles found:');
      profiles?.forEach(p => {
        console.log(`      - ${p.full_name || 'N/A'}: ${p.role}`);
      });
    } else {
      console.log(`\n✅ Found ${usersWithFinancialAccess?.length} user(s) with financial access:`);
      usersWithFinancialAccess?.forEach(u => {
        console.log(`      - ${u.full_name || 'N/A'}: ${u.role}`);
      });
    }

    // Check if program has all required data
    if (directProgram) {
      const missingData = [];
      if (!directProgram.carbon_project_id) missingData.push('carbon_project_id');
      if (!directProgram.perhutanan_sosial_id) missingData.push('perhutanan_sosial_id');
      if (!directProgram.total_budget) missingData.push('total_budget');
      
      if (missingData.length > 0) {
        console.log(`\n⚠️  Program missing data: ${missingData.join(', ')}`);
        console.log('   This might affect display in ProgramApprovalManager.');
      } else {
        console.log(`\n✅ Program has all required data.`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Simplified permission check based on RBAC logic
async function checkPermission(role, permission) {
  // This is a simplified version - in real code, use hasPermission function
  const rolePermissions = {
    'admin': ['READ', 'EDIT', 'DELETE', 'FINANCIAL_BUDGET_MANAGE', 'FINANCIAL_TRANSACTION_APPROVE', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS'],
    'finance_manager': ['READ', 'EDIT', 'FINANCIAL_BUDGET_MANAGE', 'FINANCIAL_TRANSACTION_APPROVE', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS'],
    'finance_operational': ['READ', 'EDIT', 'FINANCIAL_BUDGET_MANAGE', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS'],
    'program_planner': ['READ', 'EDIT', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS'],
    'monev': ['READ', 'EDIT', 'PS_DATA_ACCESS'],
    'viewer': ['READ', 'PS_DATA_ACCESS'],
    'carbon_specialist': ['READ', 'EDIT', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS'],
    'program_implementer': ['READ', 'EDIT', 'PS_DATA_ACCESS'],
    'investor': ['READ'],
    'finance_project_carbon': ['READ', 'EDIT', 'FINANCIAL_BUDGET_MANAGE', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS'],
    'finance_project_implementation': ['READ', 'EDIT', 'FINANCIAL_BUDGET_MANAGE', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS'],
    'finance_project_social': ['READ', 'EDIT', 'FINANCIAL_BUDGET_MANAGE', 'PROGRAM_MANAGEMENT', 'PS_DATA_ACCESS']
  };

  return rolePermissions[role]?.includes(permission) || false;
}

testPermissions().then(() => {
  console.log('\nDone.');
  process.exit(0);
});