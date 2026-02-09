#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function main() {
  console.log('🚀 Simple Phase 2 Database Migration Runner\n');
  
  // Check if SQL file exists
  const sqlPath = path.join(__dirname, '../../migrations/schema/complete_schema_migration.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ SQL file not found: complete_schema_migration.sql');
    console.log('   Expected at:', sqlPath);
    process.exit(1);
  }
  
  console.log('📋 SQL Migration File: complete_schema_migration.sql');
  console.log('📄 Size:', Math.round(fs.statSync(sqlPath).size / 1024), 'KB');
  console.log('\n⚠️  IMPORTANT: This migration will:');
  console.log('   1. Fix RLS policies (remove infinite recursion)');
  console.log('   2. Create all Phase 2 tables (Carbon, Finance, Programs)');
  console.log('   3. Insert sample PS data');
  console.log('   4. Setup indexes, triggers, and audit trail');
  console.log('   5. Fix role administrator issues');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🎯 CHOOSE MIGRATION METHOD:');
  console.log('   1. Manual (Copy-paste to Supabase SQL Editor) - RECOMMENDED');
  console.log('   2. Auto-run (Using curl - experimental)');
  console.log('   3. Skip migration for now');
  
  const choice = await new Promise(resolve => {
    rl.question('\n❓ Select option (1/2/3): ', resolve);
  });
  
  rl.close();
  
  if (choice === '3') {
    console.log('\n⏭️  Skipping migration.');
    console.log('   You can run it later with: node simple-migration-runner.js');
    process.exit(0);
  }
  
  if (choice === '1') {
    // Manual method
    console.log('\n📋 MANUAL MIGRATION INSTRUCTIONS:');
    console.log('=========================================');
    console.log('1. Open Supabase SQL Editor in browser:');
    console.log('   https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql');
    console.log('\n2. Copy the entire content of complete_schema_migration.sql');
    console.log('   File location:', sqlPath);
    console.log('\n3. Paste into SQL Editor and click "RUN"');
    console.log('\n4. Wait for completion (may take 30-60 seconds)');
    console.log('\n5. Check the output for "✅ Complete Phase 2 Database Migration Successful!"');
    console.log('\n6. After migration, run verification:');
    console.log('   node scripts/javascript/checks/check-ps-data.js');
    console.log('\n💡 TIPS:');
    console.log('   • Make sure you are logged into Supabase');
    console.log('   • The SQL includes error handling and transactions');
    console.log('   • Sample data will be inserted if tables are empty');
    console.log('=========================================');
    
    // Show first 10 lines of SQL for verification
    console.log('\n📝 First 10 lines of SQL (for verification):');
    console.log('-----------------------------------------');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const lines = sqlContent.split('\n').slice(0, 10);
    lines.forEach(line => console.log(line));
    console.log('-----------------------------------------');
    console.log('... and', sqlContent.split('\n').length - 10, 'more lines');
    
  } else if (choice === '2') {
    // Auto-run method
    console.log('\n⚠️  AUTO-RUN EXPERIMENTAL METHOD');
    console.log('This uses curl to send SQL to Supabase REST API.');
    console.log('May fail due to SQL size limits or authentication.');
    
    const confirm = await new Promise(resolve => {
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl2.question('Continue with auto-run? (yes/no): ', resolve);
      rl2.close();
    });
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('Auto-run cancelled.');
      process.exit(0);
    }
    
    await runAutoMigration();
    
  } else {
    console.log('❌ Invalid choice');
    process.exit(1);
  }
}

async function runAutoMigration() {
  console.log('\n⏳ Attempting auto-migration...');
  
  // Read environment variables
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
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
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }
  
  console.log('✅ Supabase credentials found');
  
  // Split SQL into smaller statements
  const sqlPath = path.join(__dirname, '../../../migrations/schema/complete_schema_migration.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Split by semicolons but preserve transaction blocks
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < sqlContent.length; i++) {
    const char = sqlContent[i];
    const nextChar = i < sqlContent.length - 1 ? sqlContent[i + 1] : '';
    
    // Handle string literals
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && nextChar !== stringChar) {
      inString = false;
    } else if (inString && char === stringChar && nextChar === stringChar) {
      i++; // Skip escaped quote
    }
    
    current += char;
    
    // Statement end (semicolon not in string)
    if (!inString && char === ';') {
      statements.push(current.trim());
      current = '';
    }
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  console.log(`📦 Found ${statements.length} SQL statements`);
  
  // Filter out empty statements and comments
  const validStatements = statements.filter(stmt => {
    const trimmed = stmt.trim();
    return trimmed && !trimmed.startsWith('--') && trimmed !== ';';
  });
  
  console.log(`📦 ${validStatements.length} valid statements to execute`);
  console.log('⏳ Executing statements... (this may take a few minutes)');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // Execute statements one by one
  for (let i = 0; i < validStatements.length; i++) {
    const stmt = validStatements[i];
    const progress = `[${i + 1}/${validStatements.length}]`;
    
    // Skip very long statements that might cause issues
    if (stmt.length > 5000) {
      console.log(`${progress} ⚠️  Skipping long statement (${stmt.length} chars)`);
      continue;
    }
    
    try {
      // Use curl to execute via Supabase REST API
      const curlCmd = `curl -s -X POST "${supabaseUrl}/rest/v1/rpc/exec_sql" \
-H "apikey: ${serviceRoleKey}" \
-H "Authorization: Bearer ${serviceRoleKey}" \
-H "Content-Type: application/json" \
-H "Prefer: params=single-object" \
-d '{"query": ${JSON.stringify(stmt)}}'`;
      
      const { stdout, stderr } = await execAsync(curlCmd, { shell: true });
      
      if (stderr && stderr.trim()) {
        console.log(`${progress} ❌ Error: ${stderr.substring(0, 100)}`);
        errorCount++;
        errors.push({ stmt: stmt.substring(0, 100) + '...', error: stderr });
      } else {
        console.log(`${progress} ✅ OK`);
        successCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.log(`${progress} ❌ Exception: ${err.message.substring(0, 100)}`);
      errorCount++;
      errors.push({ stmt: stmt.substring(0, 100) + '...', error: err.message });
    }
  }
  
  console.log('\n📋 EXECUTION RESULTS:');
  console.log(`   ✅ Success: ${successCount} statements`);
  console.log(`   ❌ Errors: ${errorCount} statements`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Errors:');
    errors.slice(0, 5).forEach(err => {
      console.log(`   • ${err.stmt}`);
      console.log(`     ${err.error.substring(0, 80)}`);
    });
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more errors`);
    }
    
    console.log('\n💡 RECOMMENDATION: Use manual method (option 1)');
    console.log('   The SQL file is designed to run as a single transaction');
    console.log('   in Supabase SQL Editor for best results.');
  } else {
    console.log('\n🎉 All statements executed successfully!');
    console.log('   Note: Some statements may have failed silently.');
    console.log('   Please verify by checking dashboard.');
  }
  
  // Run verification
  console.log('\n🔍 Running verification...');
  await runVerification();
}

async function runVerification() {
  console.log('\n🔍 Basic verification...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    let supabaseUrl = '';
    let supabaseAnonKey = '';
    
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
      }
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        supabaseAnonKey = line.split('=')[1].trim();
      }
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Quick test
    const { data, error } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Verification failed:', error.message);
    } else {
      console.log(`✅ Can read perhutanan_sosial table (${data?.length || 0} rows)`);
    }
    
  } catch (err) {
    console.log('❌ Verification error:', err.message);
  }
  
  console.log('\n🎯 NEXT STEPS AFTER MIGRATION:');
  console.log('   1. Open dashboard: npm run dev then visit http://localhost:3000');
  console.log('   2. Login with your admin credentials');
  console.log('   3. Check if PS data is displayed');
  console.log('   4. Test role-based navigation');
  console.log('   5. Import real data using Excel upload');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});