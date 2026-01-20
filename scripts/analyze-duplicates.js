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

async function analyzeDuplicates() {
  // Get all kabupaten
  const { data: kabupatenData, error: kabError } = await supabase
    .from('kabupaten')
    .select('id, nama')
    .order('nama');
    
  if (kabError) {
    console.error('Error fetching kabupaten:', kabError);
    return;
  }
  
  console.log('Total kabupaten records:', kabupatenData.length);
  
  // Normalize names: uppercase and remove 'KABUPATEN ' prefix
  const normalizedMap = {};
  kabupatenData.forEach(k => {
    const normalized = k.nama.toUpperCase().replace(/^KABUPATEN /, '').trim();
    if (!normalizedMap[normalized]) {
      normalizedMap[normalized] = [];
    }
    normalizedMap[normalized].push(k);
  });
  
  console.log('\nDuplicate analysis:');
  const duplicates = [];
  Object.entries(normalizedMap).forEach(([key, values]) => {
    if (values.length > 1) {
      console.log(`\n${key}:`);
      values.forEach(v => console.log(`  - ${v.nama} (ID: ${v.id})`));
      duplicates.push({ normalized: key, entries: values });
    }
  });
  
  if (duplicates.length === 0) {
    console.log('\nNo duplicates found!');
    return;
  }
  
  console.log('\n=== References Check ===');
  // Check references for each duplicate
  for (const dup of duplicates) {
    console.log(`\nChecking references for ${dup.normalized}:`);
    for (const entry of dup.entries) {
      const { data: psRefs, error: psErr } = await supabase
        .from('perhutanan_sosial')
        .select('id')
        .eq('kabupaten_id', entry.id);
        
      const { data: potensiRefs, error: potErr } = await supabase
        .from('potensi')
        .select('id')
        .eq('kabupaten_id', entry.id);
        
      console.log(`  ${entry.nama}: PS=${psRefs?.length || 0}, Potensi=${potensiRefs?.length || 0}`);
    }
  }
  
  console.log('\n=== Recommended actions ===');
  for (const dup of duplicates) {
    // Find the entry with most references
    const entriesWithCounts = await Promise.all(dup.entries.map(async (entry) => {
      const { data: psRefs } = await supabase
        .from('perhutanan_sosial')
        .select('id')
        .eq('kabupaten_id', entry.id);
        
      const { data: potensiRefs } = await supabase
        .from('potensi')
        .select('id')
        .eq('kabupaten_id', entry.id);
        
      return {
        ...entry,
        refCount: (psRefs?.length || 0) + (potensiRefs?.length || 0)
      };
    }));
    
    // Sort by reference count descending
    entriesWithCounts.sort((a, b) => b.refCount - a.refCount);
    
    console.log(`\nFor ${dup.normalized}:`);
    console.log(`  ✓ Keep: '${entriesWithCounts[0].nama}' (ID: ${entriesWithCounts[0].id}) - ${entriesWithCounts[0].refCount} references`);
    for (let i = 1; i < entriesWithCounts.length; i++) {
      console.log(`  ✗ Delete: '${entriesWithCounts[i].nama}' (ID: ${entriesWithCounts[i].id}) - ${entriesWithCounts[i].refCount} references`);
    }
  }
}

analyzeDuplicates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
