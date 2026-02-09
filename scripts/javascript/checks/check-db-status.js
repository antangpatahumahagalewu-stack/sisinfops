#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkDBStatus() {
  console.log('🔍 Checking Database Status (Using Service Role)\n');
  
  // Read environment variables
  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    console.error('❌ Error reading .env.local:', err.message);
    process.exit(1);
  }
  
  let supabaseUrl = '';
  let serviceRoleKey = '';
  
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceRoleKey = line.split('=')[1].trim();
    }
  }
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase configuration in .env.local');
    process.exit(1);
  }
  
  console.log(`📡 Connecting with Service Role...`);
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // Check if tables exist
  const tablesToCheck = [
    'kabupaten',
    'perhutanan_sosial', 
    'potensi',
    'profiles',
    'role_permissions',
    'carbon_projects',
    'financial_transactions',
    'programs'
  ];
  
  console.log('\n📊 TABLE EXISTENCE CHECK:');
  console.log('┌────────────────────────────┬─────────┬─────────────┐');
  console.log('│ Table                      │ Exists  │ Row Count   │');
  console.log('├────────────────────────────┼─────────┼─────────────┤');
  
  for (const tableName of tablesToCheck) {
    try {
      // Try to get count from table
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') { // table doesn't exist
          console.log(`│ ${tableName.padEnd(26)} │ ❌ NO    │ Not created │`);
        } else {
          console.log(`│ ${tableName.padEnd(26)} │ ⚠️  ERROR │ ${error.code} │`);
        }
      } else {
        console.log(`│ ${tableName.padEnd(26)} │ ✅ YES   │ ${count || 0} rows    │`);
      }
    } catch (err) {
      console.log(`│ ${tableName.padEnd(26)} │ ❌ ERROR │ ${err.message.substring(0, 10)} │`);
    }
  }
  
  console.log('└────────────────────────────┴─────────┴─────────────┘');
  
  // Check RLS status for key tables
  console.log('\n🔐 RLS STATUS (Using Service Role to bypass RLS):');
  
  const keyTables = ['kabupaten', 'perhutanan_sosial', 'profiles'];
  
  for (const tableName of keyTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ${tableName}: ❌ ${error.message}`);
      } else {
        console.log(`  ${tableName}: ✅ Can read (${data?.length || 0} rows)`);
      }
    } catch (err) {
      console.log(`  ${tableName}: ❌ ${err.message}`);
    }
  }
  
  // Test with anon key (public access)
  console.log('\n👤 PUBLIC ACCESS TEST (Using Anon Key):');
  
  let anonKey = '';
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      anonKey = line.split('=')[1].trim();
    }
  }
  
  if (anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey);
    
    try {
      const { data, error } = await anonClient
        .from('kabupaten')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  Public read kabupaten: ❌ ${error.message}`);
        console.log(`    Code: ${error.code}`);
      } else {
        console.log(`  Public read kabupaten: ✅ Can read (${data?.length || 0} rows)`);
      }
    } catch (err) {
      console.log(`  Public read: ❌ ${err.message}`);
    }
  } else {
    console.log('  ⚠️  Anon key not found in .env.local');
  }
  
  // Check if migration has run by looking for specific data
  console.log('\n📈 MIGRATION STATUS CHECK:');
  
  // Check kabupaten data
  try {
    const { data: kabData, error: kabError } = await supabase
      .from('kabupaten')
      .select('*')
      .order('nama');
    
    if (kabError) {
      console.log(`  Kabupaten data: ❌ ${kabError.message}`);
    } else if (kabData && kabData.length >= 5) {
      console.log(`  Kabupaten data: ✅ ${kabData.length} rows (migration likely run)`);
      console.log(`    Sample: ${kabData.slice(0, 2).map(k => k.nama).join(', ')}...`);
    } else if (kabData && kabData.length > 0) {
      console.log(`  Kabupaten data: ⚠️  ${kabData.length} rows (partial)`);
    } else {
      console.log(`  Kabupaten data: ❌ No data (migration not run?)`);
    }
  } catch (err) {
    console.log(`  Kabupaten check: ❌ ${err.message}`);
  }
  
  // Check role_permissions
  try {
    const { data: roleData, error: roleError } = await supabase
      .from('role_permissions')
      .select('role_name')
      .order('role_name');
    
    if (roleError) {
      console.log(`  Role permissions: ❌ ${roleError.message}`);
    } else if (roleData && roleData.length >= 12) {
      console.log(`  Role permissions: ✅ ${roleData.length} roles (migration likely run)`);
    } else if (roleData && roleData.length > 0) {
      console.log(`  Role permissions: ⚠️  ${roleData.length} roles (partial)`);
    } else {
      console.log(`  Role permissions: ❌ No roles (migration not run?)`);
    }
  } catch (err) {
    console.log(`  Role check: ❌ ${err.message}`);
  }
  
  console.log('\n🎯 DIAGNOSIS:');
  
  // Determine likely issue
  try {
    const { data: kabData } = await supabase
      .from('kabupaten')
      .select('*')
      .limit(1);
    
    if (!kabData || kabData.length === 0) {
      console.log('  ❌ MIGRATION NOT RUN: Kabupaten table empty or not accessible');
      console.log('  💡 ACTION: Run the fixed migration SQL in Supabase SQL Editor');
      console.log('     File: complete_schema_migration_fixed.sql');
    } else {
      console.log('  ✅ TABLES EXIST: Migration may have run');
      console.log('  ⚠️  RLS ISSUE: Public access blocked by RLS policies');
      console.log('  💡 ACTION: Check RLS policies in fixed migration SQL');
    }
  } catch (err) {
    console.log(`  ❌ CANNOT DETERMINE: ${err.message}`);
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('  1. If migration not run: Execute complete_schema_migration_fixed.sql');
  console.log('  2. If RLS issue: Migration SQL should fix it (check Part 9)');
  console.log('  3. Test with: node scripts/javascript/checks/check-ps-data.js (after migration)');
  console.log('  4. Then proceed to Phase 3: Update API endpoints');
}

checkDBStatus().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});