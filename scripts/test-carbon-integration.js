#!/usr/bin/env node

/**
 * Test Script for Carbon Integration Fix
 * Validates the implementation of carbon inconsistencies fix
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCarbonIntegration() {
  console.log('🧪 Testing Carbon Integration Fix')
  console.log('===================================\n')

  let allTestsPassed = true

  // Test 1: Check if master_aksi_mitigasi table exists
  console.log('1. Testing master_aksi_mitigasi table...')
  try {
    const { data, error } = await supabase
      .from('master_aksi_mitigasi')
      .select('count')
      .limit(1)

    if (error) {
      console.error('   ❌ Error:', error.message)
      allTestsPassed = false
    } else {
      console.log('   ✅ Table exists')
      
      // Check if data is populated
      const { data: countData } = await supabase
        .from('master_aksi_mitigasi')
        .select('*', { count: 'exact', head: true })

      console.log(`   ✅ Contains ${countData?.length || 0} standard actions`)
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message)
    allTestsPassed = false
  }

  // Test 2: Check if carbon_workflow_status table exists
  console.log('\n2. Testing carbon_workflow_status table...')
  try {
    const { data, error } = await supabase
      .from('carbon_workflow_status')
      .select('count')
      .limit(1)

    if (error) {
      console.error('   ❌ Error:', error.message)
      allTestsPassed = false
    } else {
      console.log('   ✅ Table exists')
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message)
    allTestsPassed = false
  }

  // Test 3: Check if enhanced carbon_projects columns exist
  console.log('\n3. Testing enhanced carbon_projects table...')
  try {
    // Get a sample carbon project to check structure
    const { data: sampleProject, error } = await supabase
      .from('carbon_projects')
      .select('id, kode_project, workflow_status')
      .limit(1)

    if (error) {
      console.error('   ❌ Error:', error.message)
      allTestsPassed = false
    } else if (sampleProject && sampleProject.length > 0) {
      console.log('   ✅ Enhanced columns exist')
      console.log(`   ✅ Sample project: ${sampleProject[0].kode_project} (status: ${sampleProject[0].workflow_status || 'not set'})`)
    } else {
      console.log('   ℹ️  No carbon projects found')
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message)
    allTestsPassed = false
  }

  // Test 4: Check integrated views
  console.log('\n4. Testing integrated views...')
  const views = [
    'v_carbon_project_integrated',
    'v_carbon_workflow_dashboard',
    'v_carbon_financial_integration'
  ]

  for (const view of views) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('count')
        .limit(1)

      if (error) {
        console.error(`   ❌ View ${view}:`, error.message)
        allTestsPassed = false
      } else {
        console.log(`   ✅ View ${view} exists`)
      }
    } catch (err) {
      console.error(`   ❌ View ${view} exception:`, err.message)
      allTestsPassed = false
    }
  }

  // Test 5: Check if there are carbon projects to test workflow
  console.log('\n5. Testing workflow initialization...')
  try {
    const { data: projects, error } = await supabase
      .from('carbon_projects')
      .select('id, kode_project, nama_project, workflow_status')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('   ❌ Error:', error.message)
      allTestsPassed = false
    } else if (projects && projects.length > 0) {
      console.log(`   ✅ Found ${projects.length} carbon projects`)
      
      // Check workflow status for each project
      for (const project of projects) {
        const { data: workflowStatus, error: wsError } = await supabase
          .from('carbon_workflow_status')
          .select('*')
          .eq('carbon_project_id', project.id)

        if (wsError) {
          console.error(`   ❌ Workflow status for ${project.kode_project}:`, wsError.message)
          allTestsPassed = false
        } else {
          const moduleCount = workflowStatus?.length || 0
          console.log(`   ✅ ${project.kode_project}: ${moduleCount} module statuses tracked`)
        }
      }
    } else {
      console.log('   ℹ️  No carbon projects found for workflow testing')
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message)
    allTestsPassed = false
  }

  // Test 6: Check financial integration
  console.log('\n6. Testing financial integration...')
  try {
    const { data: financialAccounts, error } = await supabase
      .from('financial_accounts')
      .select('id, account_code, account_name')
      .limit(3)

    if (error) {
      console.error('   ❌ Error:', error.message)
      allTestsPassed = false
    } else if (financialAccounts && financialAccounts.length > 0) {
      console.log(`   ✅ Found ${financialAccounts.length} financial accounts`)
      
      // Check if any carbon project is linked to financial account
      const { data: linkedProjects, error: lpError } = await supabase
        .from('carbon_projects')
        .select('id, kode_project, financial_account_id')
        .not('financial_account_id', 'is', null)
        .limit(3)

      if (lpError) {
        console.error('   ❌ Error checking linked projects:', lpError.message)
      } else if (linkedProjects && linkedProjects.length > 0) {
        console.log(`   ✅ ${linkedProjects.length} projects linked to financial accounts`)
      } else {
        console.log('   ℹ️  No projects linked to financial accounts yet')
      }
    } else {
      console.log('   ℹ️  No financial accounts found')
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message)
    allTestsPassed = false
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED')
    console.log('\n🎉 Carbon Integration Fix is properly implemented!')
    console.log('\nNext steps:')
    console.log('1. Navigate to /dashboard/carbon-integrated')
    console.log('2. Test the CarbonWorkflowTracker component')
    console.log('3. Verify financial integration')
    console.log('4. Test API endpoints at /api/carbon-workflow/status')
  } else {
    console.log('❌ SOME TESTS FAILED')
    console.log('\nPlease check the implementation:')
    console.log('1. Verify migration script ran successfully')
    console.log('2. Check database tables and views')
    console.log('3. Verify environment variables')
  }
  console.log('='.repeat(50))

  return allTestsPassed
}

// Run tests
testCarbonIntegration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })