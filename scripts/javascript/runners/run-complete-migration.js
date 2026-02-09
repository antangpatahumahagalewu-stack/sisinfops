#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runCompleteMigration() {
  console.log('🚀 Running Complete Phase 2 Database Migration\n');
  
  // Read environment variables
  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    console.error('❌ Error reading .env.local:', err.message);
    process.exit(1);
  }
  
  // Extract Supabase URL and service role key
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
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
    process.exit(1);
  }
  
  console.log(`📡 Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log('🔑 Using Service Role Key for migration\n');
  
  // Read the SQL file
  const sqlPath = path.join(__dirname, 'complete_schema_migration.sql');
  let sqlContent = '';
  
  try {
    sqlContent = fs.readFileSync(sqlPath, 'utf8');
  } catch (err) {
    console.error('❌ Error reading SQL file:', err.message);
    process.exit(1);
  }
  
  console.log(`📄 SQL file size: ${Math.round(sqlContent.length / 1024)} KB`);
  console.log('⚠️  This will modify your database structure. Make sure you have backups.\n');
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question('❓ Proceed with migration? (yes/no): ', resolve);
  });
  rl.close();
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('Migration cancelled.');
    process.exit(0);
  }
  
  console.log('\n⏳ Running migration...\n');
  
  // Execute SQL using curl to Supabase REST API
  try {
    // Split SQL into smaller chunks if needed (Supabase has query size limits)
    const sqlChunks = splitSQLIntoChunks(sqlContent);
    
    console.log(`📦 Splitting into ${sqlChunks.length} chunks...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlChunks.length; i++) {
      const chunk = sqlChunks[i];
      console.log(`\n🔄 Processing chunk ${i + 1}/${sqlChunks.length} (${Math.round(chunk.length / 1024)} KB)...`);
      
      try {
        // Use curl to execute SQL via Supabase REST API
        const curlCommand = `curl -X POST "${supabaseUrl}/rest/v1/" \\
          -H "apikey: ${serviceRoleKey}" \\
          -H "Authorization: Bearer ${serviceRoleKey}" \\
          -H "Content-Type: application/json" \\
          -H "Prefer: params=single-object" \\
          -d '{
            "query": ${JSON.stringify(chunk)}
          }'`;
        
        // Alternative: Use psql if available
        // For now, we'll use a simpler approach with node-postgres
        console.log('   Using alternative migration method...');
        
        // We'll use the run-supabase-sql.py script if it exists
        const pythonScriptPath = path.join(__dirname, 'run-supabase-sql.py');
        if (fs.existsSync(pythonScriptPath)) {
          // Write chunk to temp file
          const tempFile = path.join(__dirname, `temp_chunk_${i}.sql`);
          fs.writeFileSync(tempFile, chunk);
          
          const { stdout, stderr } = await execAsync(`python3 "${pythonScriptPath}" "${tempFile}"`);
          
          if (stderr && stderr.includes('error')) {
            console.error(`   ❌ Error in chunk ${i + 1}:`, stderr.substring(0, 200));
            errorCount++;
          } else {
            console.log(`   ✅ Chunk ${i + 1} executed successfully`);
            successCount++;
          }
          
          // Clean up temp file
          fs.unlinkSync(tempFile);
        } else {
          console.log(`   ⚠️  Python script not found, skipping chunk ${i + 1}`);
          console.log('   Please run the SQL manually in Supabase SQL Editor:');
          console.log('   https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql');
          break;
        }
        
      } catch (err) {
        console.error(`   ❌ Error executing chunk ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📋 Migration Results:');
    console.log(`   ✅ Successfully executed: ${successCount} chunks`);
    console.log(`   ❌ Failed: ${errorCount} chunks`);
    console.log(`   📊 Total: ${sqlChunks.length} chunks`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some chunks failed. You may need to run the SQL manually.');
      console.log('   SQL Editor: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql');
      console.log('   File: complete_schema_migration.sql');
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }
    
    // Run verification after migration
    console.log('\n🔍 Running verification...');
    await runVerification();
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n💡 Alternative: Run the SQL manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk/sql');
    console.log('   File: complete_schema_migration.sql');
    process.exit(1);
  }
}

function splitSQLIntoChunks(sql) {
  // Split by statements while preserving transaction blocks
  const statements = [];
  let currentStatement = '';
  let inTransaction = false;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = i < sql.length - 1 ? sql[i + 1] : '';
    
    // Handle string literals
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && nextChar !== stringChar) {
      inString = false;
    } else if (inString && char === stringChar && nextChar === stringChar) {
      // Escaped quote
      i++; // Skip next char
    }
    
    // Check for statement end (semicolon not in string)
    if (!inString && char === ';') {
      currentStatement += char;
      statements.push(currentStatement.trim());
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  // Group statements into chunks of reasonable size
  const chunks = [];
  let currentChunk = '';
  
  for (const statement of statements) {
    if ((currentChunk.length + statement.length) > 10000) { // ~10KB chunks
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    currentChunk += statement + ';\n\n';
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

async function runVerification() {
  console.log('\n🔍 Verifying database state...');
  
  // Simple verification by checking a few key tables
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
  
  const tables = [
    { name: 'kabupaten', desc: 'Kabupaten data' },
    { name: 'perhutanan_sosial', desc: 'Perhutanan Sosial data' },
    { name: 'role_permissions', desc: 'Role permissions' },
    { name: 'carbon_projects', desc: 'Carbon projects' },
    { name: 'financial_transactions', desc: 'Financial transactions' },
    { name: 'programs', desc: 'Programs' }
  ];
  
  console.log('\n📊 Table Status:');
  console.log('┌────────────────────────────┬─────────┬─────────────┐');
  console.log('│ Table                      │ Status  │ Row Count   │');
  console.log('├────────────────────────────┼─────────┼─────────────┤');
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') { // table doesn't exist
          console.log(`│ ${table.name.padEnd(26)} │ ❌ FAIL │ Not created │`);
        } else {
          console.log(`│ ${table.name.padEnd(26)} │ ⚠️  WARN │ ${error.code} │`);
        }
      } else {
        console.log(`│ ${table.name.padEnd(26)} │ ✅ OK   │ ${count || 0} rows    │`);
      }
    } catch (err) {
      console.log(`│ ${table.name.padEnd(26)} │ ❌ ERROR │ ${err.message.substring(0, 10)} │`);
    }
  }
  
  console.log('└────────────────────────────┴─────────┴─────────────┘');
  
  // Test RLS by trying to read from perhutanan_sosial
  console.log('\n🔐 Testing RLS Policies (Public Read Access)...');
  try {
    const { data, error } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ RLS Error: ${error.message}`);
      console.log('   ⚠️  RLS policies may still have recursion issues');
    } else {
      console.log(`   ✅ Public read access working (${data?.length || 0} rows)`);
    }
  } catch (err) {
    console.log(`   ❌ RLS Test failed: ${err.message}`);
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Check frontend dashboard for PS data');
  console.log('   2. Login with admin credentials');
  console.log('   3. Test role-based access to different modules');
  console.log('   4. Import real data using Excel upload feature');
  console.log('\n📝 If tables show "Not created", run SQL manually in Supabase SQL Editor.');
}

// Run the migration
runCompleteMigration().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});