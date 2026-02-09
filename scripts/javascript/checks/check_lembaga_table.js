const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL or SUPABASE_ANON_KEY not set in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('Checking lembaga_pengelola table existence...');
  try {
    const { data, error } = await supabase
      .from('lembaga_pengelola')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error checking table:', error.message);
      if (error.message.includes('Could not find the table')) {
        console.log('Table does not exist in schema cache');
        return false;
      }
      return null;
    } else {
      console.log('✅ Table exists. Data sample:', data);
      return true;
    }
  } catch (err) {
    console.error('Exception:', err.message);
    return null;
  }
}

async function checkTableViaSQL() {
  console.log('Checking via SQL query...');
  try {
    const { data, error } = await supabase.rpc('check_table_exists', { table_name: 'lembaga_pengelola' });
    if (error) {
      console.log('RPC not available, trying direct query...');
      const { data: sqlData, error: sqlError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .eq('tablename', 'lembaga_pengelola')
        .single();
      if (sqlError) {
        console.error('SQL query error:', sqlError.message);
        return false;
      }
      console.log('SQL result:', sqlData);
      return !!sqlData;
    }
    console.log('RPC result:', data);
    return data;
  } catch (err) {
    console.error('Exception in SQL check:', err.message);
    return false;
  }
}

async function main() {
  console.log('=== Checking lembaga_pengelola table ===');
  const exists = await checkTable();
  if (exists === false) {
    console.log('Table does not exist. Need to create it.');
    const sqlExists = await checkTableViaSQL();
    console.log('SQL check result:', sqlExists);
  }
}

main().catch(console.error);