const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const supabaseUrl = 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRealTables() {
  console.log('🔍 Checking real database tables...\n');
  
  try {
    // 1. Check information_schema to see all tables
    console.log('1. Listing ALL tables in public schema...');
    
    // Try to query information_schema directly
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.error('❌ Error querying information_schema:', tablesError.message);
      
      // Alternative: try to query pg_tables
      console.log('\nTrying alternative: query pg_tables...');
      const { data: pgTables, error: pgError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .order('tablename');
      
      if (pgError) {
        console.error('❌ Error querying pg_tables:', pgError.message);
      } else {
        console.log(`✅ Found ${pgTables.length} tables in public schema:`);
        pgTables.forEach(table => {
          console.log(`   - ${table.tablename}`);
        });
        
        // Check specific tables
        await checkSpecificTables(pgTables.map(t => t.tablename));
      }
    } else {
      console.log(`✅ Found ${tables.length} tables in public schema:`);
      tables.forEach(table => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
      
      // Check specific tables
      await checkSpecificTables(tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function checkSpecificTables(tableNames) {
  console.log('\n2. Checking specific tables...');
  
  const tablesToCheck = [
    'perhutanan_sosial',
    'profiles', 
    'kabupaten',
    'potensi',
    'role_permissions',
    'auth.users'
  ];
  
  for (const tableName of tablesToCheck) {
    const exists = tableNames.includes(tableName);
    
    if (exists) {
      console.log(`   ✅ ${tableName}: EXISTS`);
      
      // Try to get row count
      try {
        if (tableName !== 'auth.users') {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (!error && count !== undefined) {
            console.log(`       Rows: ${count}`);
          }
        }
      } catch (err) {
        // Ignore errors for row count
      }
    } else {
      console.log(`   ❌ ${tableName}: DOES NOT EXIST`);
    }
  }
}

async function checkDataInTables() {
  console.log('\n3. Checking data in key tables (if accessible)...');
  
  // Try to access perhutanan_sosial with different approaches
  console.log('\n   Trying to access perhutanan_sosial...');
  try {
    // Try with simple select
    const { data, error } = await supabase
      .from('perhutanan_sosial')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Cannot access: ${error.message}`);
    } else {
      console.log(`   ✅ Accessible! Sample count: ${data?.length || 0}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
  
  // Try to access profiles
  console.log('\n   Trying to access profiles...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role')
      .limit(3);
    
    if (error) {
      console.log(`   ❌ Cannot access: ${error.message}`);
    } else {
      console.log(`   ✅ Accessible! Found ${data?.length || 0} profiles`);
      if (data && data.length > 0) {
        data.forEach(p => {
          console.log(`       - ID: ${p.id.substring(0,8)}..., Role: ${p.role || 'NULL'}`);
        });
      }
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
}

async function checkCurrentSchema() {
  console.log('\n4. Checking current schema from migrations...');
  
  // Read the create_tables_simple.sql to see expected schema
  const fs = require('fs');
  const path = require('path');
  
  try {
    const migrationPath = path.join(__dirname, 'supabase/migrations/202601291247_create_tables_simple.sql');
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf8');
      
      // Extract table names from CREATE TABLE statements
      const tableMatches = content.match(/CREATE TABLE IF NOT EXISTS (\w+)/g);
      if (tableMatches) {
        console.log('   Tables expected from migration:');
        tableMatches.forEach(match => {
          const tableName = match.replace('CREATE TABLE IF NOT EXISTS ', '');
          console.log(`   - ${tableName}`);
        });
      }
    }
  } catch (err) {
    console.log(`   ❌ Error reading migration: ${err.message}`);
  }
}

// Main execution
async function main() {
  console.log('📊 REAL DATABASE STRUCTURE CHECK');
  console.log('=================================\n');
  
  await checkRealTables();
  await checkDataInTables();
  await checkCurrentSchema();
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 RECOMMENDATIONS:');
  console.log('1. If tables are missing, run the migration SQL first');
  console.log('2. If RLS is blocking, use service role key');
  console.log('3. Check Supabase Dashboard for actual table structure');
}

main().catch(console.error);