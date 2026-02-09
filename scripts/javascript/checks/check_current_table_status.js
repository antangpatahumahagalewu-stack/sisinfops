const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCriticalTables() {
  console.log('🔍 Checking critical missing tables...');
  
  const criticalTables = [
    // Activity and monitoring
    'activity_log',
    'chat_logs',
    'online_users_view',
    'user_activity_dashboard',
    
    // Carbon and verification
    'verra_project_registrations',
    'carbon_credits',
    'carbon_projects',
    
    // Financial
    'financial_accounts',
    'budgets',
    'financial_transactions',
    'price_list',
    'financial_reports',
    
    // Programs
    'programs',
    
    // PS-related
    'lembaga_pengelola',
    'ps_dokumen',
    'perhutanan_sosial',
    'profiles'
  ];
  
  const results = [];
  
  for (const table of criticalTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('Could not find the table')) {
          results.push({ table, exists: false, error: 'Table not found' });
        } else {
          results.push({ table, exists: true, error: error.message });
        }
      } else {
        results.push({ table, exists: true, error: null });
      }
    } catch (err) {
      results.push({ table, exists: false, error: err.message });
    }
  }
  
  const missingTables = results.filter(r => !r.exists);
  const existingTables = results.filter(r => r.exists);
  
  console.log(`\n✅ EXISTING CRITICAL TABLES (${existingTables.length}):`);
  existingTables.forEach(r => {
    console.log(`  • ${r.table}`);
  });
  
  console.log(`\n❌ MISSING CRITICAL TABLES (${missingTables.length}):`);
  missingTables.forEach(r => {
    console.log(`  • ${r.table}`);
  });
  
  return { missing: missingTables, existing: existingTables };
}

async function checkActivityLogPageRequirements() {
  console.log('\n🔍 Checking activity log page requirements...');
  
  const requiredTables = ['activity_log', 'online_users_view', 'user_activity_dashboard'];
  
  for (const table of requiredTables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`  ❌ ${table}: ${error.message.includes('Could not find') ? 'Table not found' : 'Other error'}`);
    } else {
      console.log(`  ✅ ${table}: Exists and queryable`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('📊 CURRENT TABLE STATUS CHECK');
  console.log('='.repeat(60));
  
  const { missing, existing } = await checkCriticalTables();
  await checkActivityLogPageRequirements();
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (missing.length === 0) {
    console.log('\n🎉 All critical tables exist! Frontend should work.');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart Next.js dev server: npm run dev');
    console.log('   2. Clear browser cache');
    console.log('   3. Test all pages');
  } else {
    console.log(`\n⚠️  ${missing.length} critical tables missing.`);
    
    const activityTables = missing.filter(t => 
      ['activity_log', 'chat_logs', 'online_users_view', 'user_activity_dashboard'].includes(t.table)
    );
    
    if (activityTables.length > 0) {
      console.log('\n🔧 Create missing activity/monitoring tables:');
      activityTables.forEach(t => console.log(`   • ${t.table}`));
    }
    
    console.log('\n📋 Priority actions:');
    console.log('   1. Create activity_log table for activity log page');
    console.log('   2. Create chat_logs table for chat functionality');
    console.log('   3. Create remaining critical tables');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);