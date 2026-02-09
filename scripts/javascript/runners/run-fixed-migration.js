#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function main() {
  console.log('🚀 RUN FIXED PHASE 2 DATABASE MIGRATION\n');
  
  // Check if fixed SQL file exists
  const sqlPath = path.join(__dirname, '../../../migrations/schema/complete_schema_migration_fixed.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Fixed SQL file not found: complete_schema_migration_fixed.sql');
    console.log('   Generating it now...');
    
    // Check if original exists
    const originalPath = path.join(__dirname, '../../../migrations/schema/complete_schema_migration.sql');
    if (fs.existsSync(originalPath)) {
      console.log('   Original SQL file exists. Please wait for fixed version.');
      process.exit(1);
    } else {
      console.error('   No SQL files found!');
      process.exit(1);
    }
  }
  
  const sqlStats = fs.statSync(sqlPath);
  console.log('📋 SQL File: complete_schema_migration_fixed.sql');
  console.log(`📄 Size: ${Math.round(sqlStats.size / 1024)} KB`);
  console.log(`📝 Lines: ${countLines(sqlPath)}`);
  
  console.log('\n✨ FIXED VERSION FEATURES:');
  console.log('   • IDEMPOTENT: Can run multiple times without errors');
  console.log('   • No duplicate trigger errors');
  console.log('   • Conditional creation (only creates what doesn\'t exist)');
  console.log('   • Fixed RLS recursion issues');
  
  console.log('\n⚠️  IMPORTANT MIGRATION ACTIONS:');
  console.log('   1. Fixes RLS infinite recursion in profiles table');
  console.log('   2. Creates all Phase 2 tables (Carbon, Finance, Programs)');
  console.log('   3. Inserts sample PS data if table is empty');
  console.log('   4. Sets up proper indexes and triggers');
  console.log('   5. Configures role-based access control');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🎯 MIGRATION METHOD (Choose 1):');
  console.log('   1. Manual - Copy-paste to Supabase SQL Editor (RECOMMENDED)');
  console.log('   2. View SQL first 20 lines for verification');
  console.log('   3. Cancel migration');
  
  const choice = await new Promise(resolve => {
    rl.question('\n❓ Select option (1/2/3): ', resolve);
  });
  
  rl.close();
  
  if (choice === '3') {
    console.log('\n⏭️  Migration cancelled.');
    console.log('   You can run this script again when ready.');
    process.exit(0);
  }
  
  if (choice === '2') {
    // Show SQL preview
    showSqlPreview(sqlPath);
    console.log('\n\n💡 After reviewing, run option 1 to execute.');
    process.exit(0);
  }
  
  if (choice === '1') {
    // Manual method with detailed instructions
    showManualInstructions(sqlPath);
  } else {
    console.log('❌ Invalid choice');
    process.exit(1);
  }
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

function showSqlPreview(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log('\n📝 SQL PREVIEW (First 20 lines):');
  console.log('=' .repeat(60));
  
  // Show first 20 non-comment lines
  let count = 0;
  let lineNumber = 0;
  
  while (count < 20 && lineNumber < lines.length) {
    const line = lines[lineNumber];
    if (!line.trim().startsWith('--') && line.trim()) {
      console.log(`Line ${lineNumber + 1}: ${line.substring(0, 80)}`);
      count++;
    }
    lineNumber++;
  }
  
  console.log('=' .repeat(60));
  console.log(`... and ${lines.length - lineNumber} more lines`);
}

function showManualInstructions(filePath) {
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  
  console.log('\n📋 MANUAL MIGRATION INSTRUCTIONS');
  console.log('=' .repeat(60));
  console.log('\nSTEP 1: OPEN SUPABASE SQL EDITOR');
  console.log('   URL: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql');
  console.log('   • Make sure you are logged into Supabase');
  console.log('   • Select the correct project (rrvhekjdhdhtkmswjgwk)');
  
  console.log('\nSTEP 2: COPY THE SQL');
  console.log('   File location: ' + filePath);
  console.log('   You can:');
  console.log('   • Open the file in a text editor');
  console.log('   • Or use this command to copy to clipboard:');
  console.log('     cat "' + filePath + '" | xclip -selection clipboard');
  console.log('     (Linux) or pbcopy (Mac)');
  
  console.log('\nSTEP 3: PASTE AND EXECUTE');
  console.log('   • Paste the entire SQL into the SQL Editor');
  console.log('   • Click the "RUN" button');
  console.log('   • Wait 30-60 seconds for completion');
  
  console.log('\nSTEP 4: VERIFY SUCCESS');
  console.log('   Look for these success messages:');
  console.log('   • "COMPLETE DATABASE MIGRATION SUCCESSFUL (FIXED VERSION)"');
  console.log('   • "✅ Complete Phase 2 Database Migration Successful!"');
  console.log('   • Table counts and data status messages');
  
  console.log('\nSTEP 5: TEST AFTER MIGRATION');
  console.log('   After successful migration, run:');
  console.log('   node scripts/javascript/checks/check-ps-data.js');
  console.log('   This will verify database connectivity and data.');
  
  console.log('\n⚠️  TROUBLESHOOTING TIPS:');
  console.log('   • If you see "trigger already exists" error, this FIXED version should handle it');
  console.log('   • The SQL is transactional - if any error occurs, it rolls back');
  console.log('   • You can run the migration multiple times (idempotent)');
  console.log('   • Check Supabase logs for detailed error messages');
  
  console.log('\n🎯 EXPECTED OUTCOME:');
  console.log('   • Frontend dashboard should show PS data');
  console.log('   • Role-based navigation should work');
  console.log('   • All Phase 2 modules ready for development');
  
  console.log('\n💡 QUICK TEST COMMANDS:');
  console.log('   After migration, test with:');
  console.log('   1. node scripts/javascript/checks/check-ps-data.js          # Check database connectivity');
  console.log('   2. npm run dev                    # Start development server');
  console.log('   3. Visit http://localhost:3000    # Check frontend');
  
  console.log('\n=' .repeat(60));
  
  // Offer to show a sample of the SQL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n❓ Show first 5 lines of SQL for verification? (yes/no): ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      const lines = sqlContent.split('\n').slice(0, 5);
      console.log('\n📝 First 5 lines:');
      console.log('-' .repeat(50));
      lines.forEach((line, i) => console.log(`${i + 1}: ${line}`));
      console.log('-' .repeat(50));
    }
    
    console.log('\n✅ Instructions complete. Ready for migration!');
    console.log('\n🚀 NEXT: Follow the manual steps above.');
  });
}

// Handle command line arguments
if (process.argv.includes('--preview')) {
  const sqlPath = path.join(__dirname, '../../../migrations/schema/complete_schema_migration_fixed.sql');
  if (fs.existsSync(sqlPath)) {
    showSqlPreview(sqlPath);
  } else {
    console.error('Fixed SQL file not found.');
  }
} else if (process.argv.includes('--instructions')) {
  const sqlPath = path.join(__dirname, '../../../migrations/schema/complete_schema_migration_fixed.sql');
  if (fs.existsSync(sqlPath)) {
    showManualInstructions(sqlPath);
  } else {
    console.error('Fixed SQL file not found.');
  }
} else {
  main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}
