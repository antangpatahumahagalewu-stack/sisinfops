const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function standardizeNames() {
  console.log('=== Standardizing Kabupaten Names ===');
  
  // Update Palangka Raya to proper format
  const { error: updateError } = await supabase
    .from('kabupaten')
    .update({ nama: 'Kotamadya Palangka Raya' })
    .eq('nama', 'KABUPATEN PALANGKA RAYA');
    
  if (updateError) {
    console.error('Error updating Palangka Raya:', updateError.message);
  } else {
    console.log('✓ Updated KABUPATEN PALANGKA RAYA to Kotamadya Palangka Raya');
  }
  
  // Verify all kabupaten names
  const { data: kabupatenData, error } = await supabase
    .from('kabupaten')
    .select('id, nama')
    .order('nama');
    
  if (error) {
    console.error('Error fetching kabupaten:', error);
    return;
  }
  
  console.log('\nCurrent kabupaten list:');
  kabupatenData.forEach(k => console.log(`  - ${k.nama} (ID: ${k.id})`));
  
  // Check consistency
  const inconsistent = kabupatenData.filter(k => !k.nama.startsWith('Kabupaten '));
  if (inconsistent.length > 0) {
    console.log('\n⚠️  Inconsistent naming found:');
    inconsistent.forEach(k => console.log(`  - ${k.nama}`));
  } else {
    console.log('\n✓ All kabupaten names are properly formatted.');
  }
}

async function updateInitScript() {
  console.log('\n=== Updating init-kabupaten.js ===');
  
  const scriptPath = path.join(__dirname, 'init-kabupaten.js');
  if (!fs.existsSync(scriptPath)) {
    console.error('init-kabupaten.js not found');
    return;
  }
  
  let content = fs.readFileSync(scriptPath, 'utf8');
  
  // Update the kabupaten list to use proper formatting
  const oldList = `  const kabupatenList = [
    'KABUPATEN KATINGAN',
    'KABUPATEN KAPUAS', 
    'KABUPATEN PULANG PISAU',
    'KABUPATEN GUNUNG MAS',
    'KABUPATEN PALANGKA RAYA'
  ];`;
  
  const newList = `  const kabupatenList = [
    'Kabupaten Katingan',
    'Kabupaten Kapuas', 
    'Kabupaten Pulang Pisau',
    'Kabupaten Gunung Mas',
    'Kotamadya Palangka Raya'
  ];`;
  
  if (content.includes(oldList)) {
    content = content.replace(oldList, newList);
    fs.writeFileSync(scriptPath, content, 'utf8');
    console.log('✓ Updated init-kabupaten.js with standardized names');
  } else {
    console.log('⚠️  Could not find kabupaten list in init-kabupaten.js');
  }
}

async function main() {
  try {
    await standardizeNames();
    await updateInitScript();
    
    console.log('\n=== Standardization completed! ===');
    console.log('\nExpected final kabupaten list:');
    console.log('1. Kabupaten Gunung Mas');
    console.log('2. Kabupaten Kapuas');
    console.log('3. Kabupaten Katingan');
    console.log('4. Kabupaten Pulang Pisau');
    console.log('5. Kotamadya Palangka Raya');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
