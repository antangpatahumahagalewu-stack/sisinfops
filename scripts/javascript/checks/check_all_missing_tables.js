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

// Find all table references in the codebase
async function findTableReferences() {
  console.log('🔍 Searching for table references in codebase...');
  
  const tables = new Set();
  
  // Search in TypeScript/JavaScript files
  const searchDirs = ['app', 'components', 'lib'];
  
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    const files = await findFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/\.from\(["']([^"']+)["']\)/g);
      
      if (matches) {
        matches.forEach(match => {
          const tableName = match.match(/\.from\(["']([^"']+)["']\)/)[1];
          if (tableName && !tableName.includes('${') && !tableName.includes(' ')) {
            tables.add(tableName);
          }
        });
      }
    }
  }
  
  return Array.from(tables).sort();
}

function findFiles(dir, extensions) {
  const results = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return results;
}

async function checkTableExistence(tables) {
  console.log('\n🔍 Checking which tables exist in database...');
  
  const results = [];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('Could not find the table')) {
          results.push({ table, exists: false, error: error.message });
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
  
  return results;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 COMPREHENSIVE MISSING TABLES CHECK');
  console.log('='.repeat(60));
  
  const tables = await findTableReferences();
  console.log(`\n📋 Found ${tables.length} table references in codebase:`);
  console.log(tables.map(t => `  • ${t}`).join('\n'));
  
  const results = await checkTableExistence(tables);
  
  const missingTables = results.filter(r => !r.exists);
  const existingTables = results.filter(r => r.exists);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 DATABASE TABLE STATUS');
  console.log('='.repeat(60));
  
  console.log(`\n✅ EXISTING TABLES (${existingTables.length}):`);
  existingTables.forEach(r => {
    console.log(`  • ${r.table}`);
  });
  
  console.log(`\n❌ MISSING TABLES (${missingTables.length}):`);
  missingTables.forEach(r => {
    console.log(`  • ${r.table} - ${r.error?.split('\n')[0]?.substring(0, 50)}...`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (missingTables.length === 0) {
    console.log('\n🎉 All tables referenced in codebase exist in the database!');
  } else {
    console.log('\n⚠️  Missing tables detected. These will cause frontend errors.');
    console.log('\n📋 Suggested next steps:');
    console.log('   1. Check if these are Phase 2 tables (financial, carbon, monitoring)');
    console.log('   2. Run the existing Phase 2 migration: create_phase2_tables_minimal.sql');
    console.log('   3. Create additional migrations for any remaining missing tables');
    console.log('   4. Restart Next.js dev server after creating tables');
    
    console.log('\n📄 You can run the Phase 2 migration with:');
    console.log('   python3 run_simple_migration.py');
    
    // Group tables by category for easier debugging
    const carbonTables = missingTables.filter(t => t.table.includes('carbon'));
    const financeTables = missingTables.filter(t => t.table.includes('financial') || t.table.includes('accounting') || t.table.includes('budget'));
    const monitoringTables = missingTables.filter(t => t.table.includes('monitoring') || t.table.includes('activity') || t.table.includes('dram'));
    const otherTables = missingTables.filter(t => 
      !carbonTables.includes(t) && !financeTables.includes(t) && !monitoringTables.includes(t)
    );
    
    if (carbonTables.length > 0) {
      console.log('\n🔬 Carbon-related missing tables:');
      carbonTables.forEach(t => console.log(`   • ${t.table}`));
    }
    
    if (financeTables.length > 0) {
      console.log('\n💰 Finance-related missing tables:');
      financeTables.forEach(t => console.log(`   • ${t.table}`));
    }
    
    if (monitoringTables.length > 0) {
      console.log('\n📊 Monitoring-related missing tables:');
      monitoringTables.forEach(t => console.log(`   • ${t.table}`));
    }
    
    if (otherTables.length > 0) {
      console.log('\n📋 Other missing tables:');
      otherTables.forEach(t => console.log(`   • ${t.table}`));
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);