const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
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
} else {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function extractDesaFromName(pemegangIzin) {
  const name = pemegangIzin.trim();
  
  // Patterns to extract desa
  const prefixes = ['LPHD', 'KTH', 'HTR', 'KT', 'KOPERASI', 'GAPOKTAN', 'KELOMPOK'];
  
  for (const prefix of prefixes) {
    if (name.toUpperCase().startsWith(prefix)) {
      // Remove prefix and any following spaces/hyphens
      const withoutPrefix = name.substring(prefix.length).trim();
      // Remove any leading punctuation or spaces
      const cleaned = withoutPrefix.replace(/^[-\s]+/, '').trim();
      if (cleaned) {
        return cleaned;
      }
    }
  }
  
  // If no prefix matched, try to extract after first space
  const parts = name.split(' ');
  if (parts.length > 1) {
    // Remove first word (which might be the type)
    return parts.slice(1).join(' ');
  }
  
  return name;
}

async function updateDesaHeuristic() {
  console.log('Fetching all perhutanan_sosial records...');
  
  const { data: records, error } = await supabase
    .from('perhutanan_sosial')
    .select('id, pemegang_izin, desa, kecamatan')
    .order('pemegang_izin');

  if (error) {
    console.error('Error fetching records:', error);
    return;
  }

  console.log(`Total records: ${records.length}`);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of records) {
    // Skip if desa already filled
    if (record.desa && record.desa.trim() !== '') {
      console.log(`Skipping ${record.pemegang_izin} - desa already filled: "${record.desa}"`);
      skipped++;
      continue;
    }

    const extractedDesa = extractDesaFromName(record.pemegang_izin);
    
    // For kecamatan, we don't have data, so leave as is or set empty
    const kecamatan = record.kecamatan || '';

    console.log(`Updating ${record.pemegang_izin}: Desa="${extractedDesa}", Kecamatan="${kecamatan}"`);

    const { error: updateError } = await supabase
      .from('perhutanan_sosial')
      .update({
        desa: extractedDesa,
        kecamatan: kecamatan,
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id);

    if (updateError) {
      console.error(`Error updating ${record.pemegang_izin}:`, updateError);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`\nUpdate completed:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already filled): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

updateDesaHeuristic().catch(console.error);