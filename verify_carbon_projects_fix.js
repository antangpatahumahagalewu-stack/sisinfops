#!/usr/bin/env node

/**
 * Script untuk memverifikasi perbaikan inkonsistensi data carbon projects
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyCarbonProjectsFix() {
  console.log('🔍 VERIFYING CARBON PROJECTS FIX...\n');

  // Setup Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch all carbon projects
    const { data: projects, error } = await supabase
      .from('carbon_projects')
      .select('id, kode_project, nama_project, project_name, kabupaten')
      .order('kode_project');

    if (error) {
      console.error('❌ Error fetching carbon projects:', error.message);
      process.exit(1);
    }

    console.log(`📊 Found ${projects.length} carbon projects:`);

    // 2. Check for inconsistencies
    let inconsistencies = 0;
    projects.forEach(project => {
      const hasInconsistency = project.nama_project !== project.project_name;
      
      if (hasInconsistency) {
        inconsistencies++;
        console.log(`   ⚠️  INCONSISTENT: ${project.kode_project}`);
        console.log(`      nama_project: "${project.nama_project}"`);
        console.log(`      project_name: "${project.project_name}"`);
        console.log();
      } else {
        console.log(`   ✅ Consistent: ${project.kode_project} - "${project.nama_project}"`);
      }
    });

    console.log('\n📋 SUMMARY:');
    console.log(`   Total projects: ${projects.length}`);
    console.log(`   Inconsistencies: ${inconsistencies}`);
    console.log(`   Consistency rate: ${((projects.length - inconsistencies) / projects.length * 100).toFixed(1)}%`);

    // 3. Check kabupaten data
    console.log('\n🔍 KABUPATEN DATA CHECK:');
    const kabupatenList = projects.map(p => p.kabupaten).filter(k => k);
    const uniqueKabupaten = [...new Set(kabupatenList)];
    
    console.log(`   Projects with kabupaten data: ${kabupatenList.length}/${projects.length}`);
    console.log(`   Unique kabupaten: ${uniqueKabupaten.length}`);
    console.log(`   List: ${uniqueKabupaten.join(', ')}`);

    // 4. Verify specific project mentioned in issue
    console.log('\n🔍 VERIFYING SPECIFIC PROJECT MENTIONED IN ISSUE:');
    const specificProject = projects.find(p => p.id === '61f9898e-224a-4841-9cd3-102f8c387943');
    if (specificProject) {
      console.log(`   Project ID: ${specificProject.id}`);
      console.log(`   Kode Project: ${specificProject.kode_project}`);
      console.log(`   nama_project: "${specificProject.nama_project}"`);
      console.log(`   project_name: "${specificProject.project_name}"`);
      console.log(`   Consistent: ${specificProject.nama_project === specificProject.project_name ? '✅ YES' : '❌ NO'}`);
      console.log(`   Kabupaten: ${specificProject.kabupaten}`);
    } else {
      console.log('   Project not found (might have different ID)');
    }

    // 5. Final verdict
    console.log('\n🎯 FINAL VERDICT:');
    if (inconsistencies === 0) {
      console.log('✅ ALL CARBON PROJECTS ARE CONSISTENT!');
      console.log('✅ Frontend should now display correct project names');
      console.log('✅ No hardcoded mapping needed');
    } else {
      console.log(`❌ Still ${inconsistencies} inconsistencies remaining`);
      console.log('⚠️  Frontend may still show wrong project names');
    }

    // 6. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (inconsistencies > 0) {
      console.log('   1. Run fix_carbon_projects_inconsistency.py again');
      console.log('   2. Check if there are other tables with project names');
      console.log('   3. Ensure all frontend pages use nama_project field');
    } else {
      console.log('   1. Test frontend at http://localhost:3000/id/dashboard/carbon-projects');
      console.log('   2. Verify detail page shows correct project name');
      console.log('   3. Remove any remaining hardcoded mappings in other files');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run verification
verifyCarbonProjectsFix().catch(console.error);