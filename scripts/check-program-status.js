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

async function checkProgramStatus() {
  console.log('🔍 Checking program status in database...');
  console.log('=========================================\n');

  try {
    // 1. First, find the specific program PRG-KPS-KAP-02
    console.log('1. Searching for program PRG-KPS-KAP-02...');
    const { data: specificProgram, error: specificError } = await supabase
      .from('programs')
      .select(`
        *,
        carbon_projects(kode_project, nama_project),
        perhutanan_sosial(pemegang_izin, desa, kecamatan, kabupaten)
      `)
      .eq('kode_program', 'PRG-KPS-KAP-02')
      .single();

    if (specificError) {
      console.error('   ❌ Error fetching specific program:', specificError.message);
    } else if (!specificProgram) {
      console.log('   ⚠️  Program PRG-KPS-KAP-02 not found in database');
    } else {
      console.log('   ✅ Found program PRG-KPS-KAP-02:');
      console.log(`      ID: ${specificProgram.id}`);
      console.log(`      Name: ${specificProgram.nama_program}`);
      console.log(`      Status: ${specificProgram.status}`);
      console.log(`      Type: ${specificProgram.jenis_program}`);
      console.log(`      Created: ${specificProgram.created_at}`);
      console.log(`      Submitted at: ${specificProgram.submitted_at || 'N/A'}`);
      console.log(`      Submitted by: ${specificProgram.submitted_by || 'N/A'}`);
      console.log(`      Reviewed at: ${specificProgram.reviewed_at || 'N/A'}`);
      console.log(`      Reviewed by: ${specificProgram.reviewed_by || 'N/A'}`);
      console.log(`      Review notes: ${specificProgram.review_notes || 'N/A'}`);
      console.log(`      Carbon Project: ${specificProgram.carbon_projects?.nama_project || 'N/A'}`);
      console.log(`      Perhutanan Sosial: ${specificProgram.perhutanan_sosial?.pemegang_izin || 'N/A'}`);
      console.log(`      Total Budget: ${specificProgram.total_budget || 'N/A'}`);
      console.log(`      Budget Status: ${specificProgram.budget_status || 'N/A'}`);
    }

    // 2. Check all programs and their status distribution
    console.log('\n2. Checking all programs status distribution...');
    const { data: allPrograms, error: allError } = await supabase
      .from('programs')
      .select('id, kode_program, nama_program, status, jenis_program, submitted_at, reviewed_at')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('   ❌ Error fetching all programs:', allError.message);
    } else {
      console.log(`   ✅ Found ${allPrograms?.length || 0} total programs`);
      
      // Count by status
      const statusCount = {};
      allPrograms?.forEach(program => {
        statusCount[program.status] = (statusCount[program.status] || 0) + 1;
      });

      console.log('\n   Status distribution:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`      ${status}: ${count} program(s)`);
      });

      // Show programs with status related to review
      console.log('\n   Programs needing review (status contains "review" or "submitted"):');
      const reviewStatuses = ['submitted', 'review', 'revision'];
      const programsNeedingReview = allPrograms?.filter(program => 
        reviewStatuses.some(keyword => 
          program.status?.toLowerCase().includes(keyword)
        )
      );

      if (programsNeedingReview?.length > 0) {
        programsNeedingReview.forEach(program => {
          console.log(`      - ${program.kode_program}: ${program.nama_program} (${program.status})`);
          console.log(`        Submitted: ${program.submitted_at || 'N/A'}`);
        });
      } else {
        console.log('      No programs found with review-related status');
      }

      // Check what statuses ProgramApprovalManager is looking for
      console.log('\n   Programs with status that should appear in ProgramApprovalManager:');
      const approvalManagerStatuses = ['submitted_for_review', 'under_review', 'needs_revision'];
      const programsForApprovalManager = allPrograms?.filter(program => 
        approvalManagerStatuses.includes(program.status)
      );

      if (programsForApprovalManager?.length > 0) {
        programsForApprovalManager.forEach(program => {
          console.log(`      - ${program.kode_program}: ${program.nama_program} (${program.status})`);
        });
      } else {
        console.log(`      No programs found with status: ${approvalManagerStatuses.join(', ')}`);
      }
    }

    // 3. Check the programs_needing_review view (if exists)
    console.log('\n3. Checking programs_needing_review view...');
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('programs_needing_review')
        .select('*')
        .limit(10);

      if (viewError) {
        console.log(`   ⚠️  View 'programs_needing_review' may not exist: ${viewError.message}`);
      } else {
        console.log(`   ✅ View exists, found ${viewData?.length || 0} records`);
        if (viewData && viewData.length > 0) {
          console.log('   Sample from view:');
          viewData.slice(0, 3).forEach((item, i) => {
            console.log(`      ${i + 1}. ${item.kode_program}: ${item.nama_program} (${item.status})`);
          });
        }
      }
    } catch (viewErr) {
      console.log('   ⚠️  Could not access programs_needing_review view');
    }

    // 4. Check if there's a mismatch between UI display and database status
    console.log('\n4. Analyzing status mismatch possibilities...');
    console.log('   Looking for programs with "submitted" in status but not exactly "submitted_for_review"...');
    
    const submittedVariations = allPrograms?.filter(program => {
      const status = program.status?.toLowerCase();
      return status && (
        status.includes('submitted') || 
        status.includes('submit') ||
        status.includes('review')
      ) && !['submitted_for_review', 'under_review', 'needs_revision'].includes(program.status);
    });

    if (submittedVariations?.length > 0) {
      console.log('   Found potential status mismatches:');
      submittedVariations.forEach(program => {
        console.log(`      - ${program.kode_program}: "${program.status}"`);
        console.log(`        (Should be one of: submitted_for_review, under_review, needs_revision)`);
      });
    } else {
      console.log('   No obvious status mismatches found');
    }

    // 5. Check permissions and RBAC
    console.log('\n5. Checking user roles and permissions (basic)...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .limit(5);

    if (profilesError) {
      console.error('   ❌ Error fetching profiles:', profilesError.message);
    } else {
      console.log(`   ✅ Found ${profiles?.length || 0} user profiles`);
      console.log('   Sample roles:');
      profiles?.slice(0, 3).forEach(profile => {
        console.log(`      - ${profile.full_name || 'N/A'}: ${profile.role || 'N/A'}`);
      });
    }

    console.log('\n=========================================');
    console.log('📊 DIAGNOSIS SUMMARY:');

    if (specificProgram) {
      console.log(`\n✅ Program PRG-KPS-KAP-02 exists with status: "${specificProgram.status}"`);
      
      if (['submitted_for_review', 'under_review', 'needs_revision'].includes(specificProgram.status)) {
        console.log('   This status SHOULD appear in ProgramApprovalManager.');
        console.log('   Possible issues:');
        console.log('   1. Permission/RBAC issues');
        console.log('   2. Missing joined data (carbon_projects, perhutanan_sosial)');
        console.log('   3. Query error in ProgramApprovalManager');
      } else {
        console.log(`   This status does NOT match expected review statuses.`);
        console.log('   Expected statuses for review: submitted_for_review, under_review, needs_revision');
        console.log('   Recommendation: Update program status to "submitted_for_review"');
      }
    } else {
      console.log('\n❌ Program PRG-KPS-KAP-02 NOT FOUND in database');
      console.log('   Check if program code is correct or if program was deleted.');
    }

    // Show total programs by status
    console.log('\n📈 Status Distribution:');
    const statusSummary = {};
    allPrograms?.forEach(program => {
      statusSummary[program.status] = (statusSummary[program.status] || 0) + 1;
    });
    
    Object.entries(statusSummary).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} program(s)`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkProgramStatus().then(() => {
  console.log('\nDone.');
  process.exit(0);
});