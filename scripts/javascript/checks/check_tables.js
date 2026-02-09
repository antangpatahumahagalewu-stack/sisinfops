const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking required tables...');

  // Check master_aksi_mitigasi
  const { data: aksiData, error: aksiError } = await supabase
    .from('master_aksi_mitigasi')
    .select('count', { count: 'exact', head: true });

  if (aksiError) {
    console.error('Error checking master_aksi_mitigasi:', aksiError.message);
    console.log('Table master_aksi_mitigasi might not exist');
  } else {
    console.log(`✓ master_aksi_mitigasi exists (${aksiData.count} rows)`);
  }

  // Check programs
  const { data: progData, error: progError } = await supabase
    .from('programs')
    .select('count', { count: 'exact', head: true });

  if (progError) {
    console.error('Error checking programs:', progError.message);
  } else {
    console.log(`✓ programs exists (${progData.count} rows)`);
  }

  // Check program_aksi_mitigasi
  const { data: pamData, error: pamError } = await supabase
    .from('program_aksi_mitigasi')
    .select('count', { count: 'exact', head: true });

  if (pamError) {
    console.error('Error checking program_aksi_mitigasi:', pamError.message);
    console.log('Table program_aksi_mitigasi might not exist');
  } else {
    console.log(`✓ program_aksi_mitigasi exists (${pamData.count} rows)`);
  }

  // List all tables
  const { data: allTables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (!tablesError && allTables) {
    console.log('\nAll public tables:');
    allTables.forEach(table => console.log(`  - ${table.table_name}`));
  }
}

checkTables().catch(console.error);
