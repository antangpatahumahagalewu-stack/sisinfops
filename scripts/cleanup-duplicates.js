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

// Mapping of duplicates: keep ID -> delete IDs
const duplicatesMap = {
  // GUNUNG MAS
  '17ae5cc0-5c49-425f-801f-77b3341a5460': ['b3ef84ec-3daf-4db5-962b-d56f6e2a891c'],
  // KAPUAS
  '70e0c5f1-fc72-48b5-aa97-a22bfe915689': ['dbb31edd-cc44-478b-9cbc-517b72bbe7b2'],
  // KATINGAN
  'c602e5e9-01ee-410f-bf0b-f7b1991f7608': ['94ef2c66-4544-463b-9c3d-9c4a4885ca90'],
  // PULANG PISAU
  'f1a733b0-1ac9-49ea-818a-540de16dd66d': ['4b02bb56-50b1-4d99-ac66-c81d4f744204']
};

async function updateReferences(tableName, keepId, deleteIds) {
  console.log(`\nUpdating ${tableName} references from ${deleteIds.join(', ')} to ${keepId}...`);
  
  for (const deleteId of deleteIds) {
    const { data, error } = await supabase
      .from(tableName)
      .update({ kabupaten_id: keepId })
      .eq('kabupaten_id', deleteId);
      
    if (error) {
      console.error(`  Error updating ${tableName} for deleteId ${deleteId}:`, error.message);
    } else {
      console.log(`  Updated ${data?.length || 0} records from ${deleteId} to ${keepId}`);
    }
  }
}

async function deleteDuplicateKabupaten(deleteIds) {
  console.log(`\nDeleting duplicate kabupaten IDs: ${deleteIds.join(', ')}`);
  
  for (const deleteId of deleteIds) {
    const { error } = await supabase
      .from('kabupaten')
      .delete()
      .eq('id', deleteId);
      
    if (error) {
      console.error(`  Error deleting kabupaten ${deleteId}:`, error.message);
    } else {
      console.log(`  Deleted kabupaten ID: ${deleteId}`);
    }
  }
}

async function verifyCleanup() {
  console.log('\n=== Verifying cleanup ===');
  
  const { data: kabupatenData, error } = await supabase
    .from('kabupaten')
    .select('id, nama')
    .order('nama');
    
  if (error) {
    console.error('Error fetching kabupaten:', error);
    return;
  }
  
  console.log(`Total kabupaten after cleanup: ${kabupatenData.length}`);
  console.log('Kabupaten list:');
  kabupatenData.forEach(k => console.log(`  - ${k.nama} (ID: ${k.id})`));
  
  // Check for any remaining duplicates
  const normalizedMap = {};
  kabupatenData.forEach(k => {
    const normalized = k.nama.toUpperCase().replace(/^KABUPATEN /, '').trim();
    if (!normalizedMap[normalized]) {
      normalizedMap[normalized] = [];
    }
    normalizedMap[normalized].push(k);
  });
  
  const remainingDuplicates = Object.entries(normalizedMap).filter(([_, values]) => values.length > 1);
  if (remainingDuplicates.length > 0) {
    console.log('\nWARNING: Remaining duplicates found!');
    remainingDuplicates.forEach(([key, values]) => {
      console.log(`  ${key}: ${values.map(v => v.nama).join(', ')}`);
    });
  } else {
    console.log('\n✓ No duplicates remaining!');
  }
}

async function main() {
  try {
    console.log('=== Starting Duplicate Cleanup ===');
    
    // First, update all references
    for (const [keepId, deleteIds] of Object.entries(duplicatesMap)) {
      await updateReferences('perhutanan_sosial', keepId, deleteIds);
      await updateReferences('potensi', keepId, deleteIds);
    }
    
    // Then delete duplicate kabupaten
    const allDeleteIds = Object.values(duplicatesMap).flat();
    await deleteDuplicateKabupaten(allDeleteIds);
    
    // Verify cleanup
    await verifyCleanup();
    
    console.log('\n=== Cleanup completed successfully! ===');
    console.log('\nExpected kabupaten list:');
    console.log('1. Kabupaten Gunung Mas');
    console.log('2. Kabupaten Kapuas');
    console.log('3. Kabupaten Katingan');
    console.log('4. Kabupaten Pulang Pisau');
    console.log('5. KABUPATEN PALANGKA RAYA');
    console.log('\nTotal: 5 kabupaten');
    
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
