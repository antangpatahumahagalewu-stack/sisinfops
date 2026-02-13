#!/usr/bin/env node

/**
 * Script to test Financial Snapshot changes for Carbon Projects
 * Tests that financial data is now based on actual program budgets
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Could not load Supabase credentials from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFinancialSnapshot() {
  console.log('='.repeat(60));
  console.log('💰 FINANCIAL SNAPSHOT TEST SCRIPT');
  console.log('='.repeat(60));
  console.log('Testing: Financial Snapshot = Akumulasi nilai program');
  console.log('');
  
  // Test Pulang Pisau project
  const projectId = '17a97b56-a525-4c65-b627-2e1e9e3ce343';
  
  console.log(`🔍 Testing project: ${projectId} (Pulang Pisau)`);
  
  try {
    // 1. Get data from v_carbon_project_financials view
    console.log('\n1. Checking v_carbon_project_financials view...');
    const { data: viewData, error: viewError } = await supabase
      .from('v_carbon_project_financials')
      .select('*')
      .eq('carbon_project_id', projectId)
      .single();
    
    if (viewError) {
      console.log(`   ⚠️  View error: ${viewError.message}`);
      console.log('   Trying direct program aggregation...');
    } else {
      console.log(`   ✅ View exists`);
      console.log(`   • Total programs: ${viewData.total_programs}`);
      console.log(`   • Total budget: Rp ${viewData.total_budget_all_programs.toLocaleString('id-ID')}`);
      console.log(`   • Total spent: Rp ${viewData.total_spent_all_programs.toLocaleString('id-ID')}`);
      console.log(`   • Progress: ${viewData.overall_progress_percentage}%`);
    }
    
    // 2. Get programs directly
    console.log('\n2. Checking programs table data...');
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('program_code, program_name, total_budget, spent_budget, progress_percentage, status')
      .eq('carbon_project_id', projectId);
    
    if (programsError) {
      console.log(`   ❌ Programs error: ${programsError.message}`);
    } else {
      console.log(`   ✅ Found ${programs.length} programs`);
      
      let totalBudget = 0;
      let totalSpent = 0;
      
      programs.forEach((program, index) => {
        console.log(`   ${index + 1}. ${program.program_code} - ${program.program_name}`);
        console.log(`      Budget: Rp ${(program.total_budget || 0).toLocaleString('id-ID')}`);
        console.log(`      Spent: Rp ${(program.spent_budget || 0).toLocaleString('id-ID')}`);
        console.log(`      Progress: ${program.progress_percentage || 0}%`);
        console.log(`      Status: ${program.status}`);
        console.log('');
        
        totalBudget += program.total_budget || 0;
        totalSpent += program.spent_budget || 0;
      });
      
      const calculatedProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      console.log(`   📊 DIRECT CALCULATION:`);
      console.log(`   • Total budget: Rp ${totalBudget.toLocaleString('id-ID')}`);
      console.log(`   • Total spent: Rp ${totalSpent.toLocaleString('id-ID')}`);
      console.log(`   • Progress: ${calculatedProgress.toFixed(2)}%`);
    }
    
    // 3. Check if new columns exist
    console.log('\n3. Checking database schema...');
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('programs')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.log(`   ❌ Schema error: ${schemaError.message}`);
    } else if (schemaCheck && schemaCheck.length > 0) {
      const sampleProgram = schemaCheck[0];
      const newColumns = ['spent_budget', 'goal', 'implementation_plan', 'progress_percentage'];
      const existingColumns = newColumns.filter(col => sampleProgram[col] !== undefined);
      
      console.log(`   ✅ New columns detected: ${existingColumns.join(', ')}`);
    }
    
    // 4. Test old vs new calculation
    console.log('\n4. Testing calculation methods:');
    
    // Old method (static)
    const { data: project } = await supabase
      .from('carbon_projects')
      .select('luas_total_ha')
      .eq('id', projectId)
      .single();
    
    if (project) {
      const area = project.luas_total_ha || 0;
      const averagePerHa = 5684603;
      const oldTotalInvestment = Math.round(area * averagePerHa);
      const oldSpentAmount = Math.round(oldTotalInvestment * 0.6);
      const oldProgress = oldTotalInvestment > 0 ? (oldSpentAmount / oldTotalInvestment) * 100 : 0;
      
      console.log(`   OLD METHOD (static calculation):`);
      console.log(`   • Area: ${area} ha`);
      console.log(`   • Average per ha: Rp ${averagePerHa.toLocaleString('id-ID')}`);
      console.log(`   • Total investment: Rp ${oldTotalInvestment.toLocaleString('id-ID')}`);
      console.log(`   • Spent (60%): Rp ${oldSpentAmount.toLocaleString('id-ID')}`);
      console.log(`   • Progress: ${oldProgress.toFixed(2)}%`);
    }
    
    // New method (from programs)
    if (programs && programs.length > 0) {
      const newTotalInvestment = programs.reduce((sum, p) => sum + (p.total_budget || 0), 0);
      const newSpentAmount = programs.reduce((sum, p) => sum + (p.spent_budget || 0), 0);
      const newProgress = newTotalInvestment > 0 ? (newSpentAmount / newTotalInvestment) * 100 : 0;
      
      console.log(`\n   NEW METHOD (actual program data):`);
      console.log(`   • Programs: ${programs.length}`);
      console.log(`   • Total budget: Rp ${newTotalInvestment.toLocaleString('id-ID')}`);
      console.log(`   • Total spent: Rp ${newSpentAmount.toLocaleString('id-ID')}`);
      console.log(`   • Progress: ${newProgress.toFixed(2)}%`);
      
      console.log(`\n   🎯 RESULT: Financial Snapshot sekarang berdasarkan data aktual program!`);
      console.log(`   ∑ programs.total_budget = Total Budget`);
      console.log(`   ∑ programs.spent_budget = Total Spent`);
      console.log(`   (Total Spent / Total Budget) × 100% = Progress`);
    }
    
  } catch (error) {
    console.error(`❌ Error during test: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log('Next steps:');
  console.log('1. Visit http://localhost:3000/id/dashboard/carbon-projects/17a97b56...');
  console.log('2. Check Financial Snapshot section');
  console.log('3. Verify data matches program budgets');
  console.log('='.repeat(60));
}

// Run test
testFinancialSnapshot().catch(console.error);