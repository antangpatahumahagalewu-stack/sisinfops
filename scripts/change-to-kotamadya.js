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

async function updateDatabase() {
  console.log('=== Updating Database ===');
  
  // Update kabupaten table
  const { error: updateError } = await supabase
    .from('kabupaten')
    .update({ nama: 'Kotamadya Palangka Raya' })
    .eq('nama', 'Kabupaten Palangka Raya');
    
  if (updateError) {
    console.error('Error updating kabupaten:', updateError.message);
    return false;
  } else {
    console.log('✓ Updated Kabupaten Palangka Raya to Kotamadya Palangka Raya in database');
    return true;
  }
}

async function updateSourceFiles() {
  console.log('\n=== Updating Source Files ===');
  
  // List of files to update (based on search results)
  const filesToUpdate = [
    'app/[locale]/dashboard/potensi/page.tsx',
    'app/[locale]/dashboard/data/page.tsx',
    'scripts/init-kabupaten.js',
    'scripts/standardize-kabupaten-names.js',
    'supabase/migrations/20250125_add_palangka_raya_kabupaten.sql'
  ];
  
  let updatedCount = 0;
  
  for (const filePath of filesToUpdate) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Replace "Kabupaten Palangka Raya" with "Kotamadya Palangka Raya"
    content = content.replace(/Kabupaten Palangka Raya/g, 'Kotamadya Palangka Raya');
    
    // Replace "Palangka Raya" in contexts where it's referring to kabupaten
    // We need to be careful not to replace all occurrences, only in specific contexts
    // For now, we'll update more specifically
    
    // Also update descriptions
    content = content.replace(/Data Perhutanan Sosial untuk Kabupaten Palangka Raya/g, 'Data Perhutanan Sosial untuk Kotamadya Palangka Raya');
    content = content.replace(/Data potensi Perhutanan Sosial untuk Kabupaten Palangka Raya/g, 'Data potensi Perhutanan Sosial untuk Kotamadya Palangka Raya');
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      updatedCount++;
    } else {
      console.log(`  No changes needed: ${filePath}`);
    }
  }
  
  console.log(`\nUpdated ${updatedCount} source files`);
  return updatedCount > 0;
}

async function updateUINames() {
  console.log('\n=== Updating UI Display Names ===');
  
  // We also need to update the tab display names from "Palangka Raya" to "Kotamadya Palangka Raya"
  // But careful not to break the filter logic
  
  const files = [
    'app/[locale]/dashboard/potensi/page.tsx',
    'app/[locale]/dashboard/data/page.tsx'
  ];
  
  for (const filePath of files) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Update tab trigger display name but keep value the same for filter logic
    content = content.replace(/<TabsTrigger value="Palangka Raya">Palangka Raya<\/TabsTrigger>/g, '<TabsTrigger value="Palangka Raya">Kotamadya Palangka Raya</TabsTrigger>');
    
    // Update card titles
    content = content.replace(/<CardTitle>Data Palangka Raya<\/CardTitle>/g, '<CardTitle>Data Kotamadya Palangka Raya</CardTitle>');
    content = content.replace(/<CardTitle>Potensi Palangka Raya<\/CardTitle>/g, '<CardTitle>Potensi Kotamadya Palangka Raya</CardTitle>');
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✓ Updated UI names in: ${filePath}`);
    }
  }
}

async function verifyChanges() {
  console.log('\n=== Verifying Changes ===');
  
  const { data: kabupatenData, error } = await supabase
    .from('kabupaten')
    .select('id, nama')
    .order('nama');
    
  if (error) {
    console.error('Error fetching kabupaten:', error);
    return;
  }
  
  console.log('Current kabupaten list:');
  kabupatenData.forEach(k => console.log(`  - ${k.nama} (ID: ${k.id})`));
  
  const palangka = kabupatenData.find(k => k.nama.includes('Palangka Raya'));
  if (palangka && palangka.nama === 'Kotamadya Palangka Raya') {
    console.log('\n✓ Database updated successfully');
  } else {
    console.log('\n⚠️  Database update may have failed');
  }
}

async function main() {
  try {
    console.log('=== Changing "Kabupaten Palangka Raya" to "Kotamadya Palangka Raya" ===');
    
    // 1. Update database
    const dbUpdated = await updateDatabase();
    if (!dbUpdated) {
      console.error('Failed to update database');
      process.exit(1);
    }
    
    // 2. Update source files
    await updateSourceFiles();
    
    // 3. Update UI display names
    await updateUINames();
    
    // 4. Verify changes
    await verifyChanges();
    
    console.log('\n=== Change completed! ===');
    console.log('\nNext steps:');
    console.log('1. Rebuild the Next.js application if needed');
    console.log('2. Restart development server');
    console.log('3. Clear browser cache if UI changes are not visible');
    
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
