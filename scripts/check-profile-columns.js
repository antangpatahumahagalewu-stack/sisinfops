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

// Use service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfileColumns() {
  console.log('Memeriksa kolom pada tabel profiles...\n');
  
  try {
    // Coba ambil satu baris dari profiles
    console.log('1. Mengambil sampel data profil...');
    const { data: sample, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (sampleError) {
      console.error('   Error:', sampleError.message);
    } else {
      console.log('   Kolom yang ada pada sampel:');
      if (sample) {
        Object.keys(sample).forEach(key => {
          console.log(`     - ${key}`);
        });
      } else {
        console.log('   Tidak ada data profil.');
      }
    }
    
    // Cek spesifik kolom phone, location, bio dengan query langsung
    console.log('\n2. Mengecek kolom phone, location, bio...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('phone, location, bio')
      .limit(1);
    
    if (testError) {
      console.log('   Error:', testError.message);
      if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('\n   ⚠️  KESIMPULAN: Kolom belum ditambahkan ke tabel profiles.');
        console.log('   Jalankan migrasi SQL berikut di Supabase SQL Editor:');
        console.log(`
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(255);
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255);
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
        `);
        return;
      }
    } else {
      console.log('   ✅ Kolom phone, location, dan bio dapat diakses.');
      console.log('\n   ✅ KESIMPULAN: Kolom sudah tersedia di tabel profiles.');
    }
    
    // Coba update untuk memastikan kolom bisa ditulis
    console.log('\n3. Menguji penulisan data...');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      const testId = profiles[0].id;
      console.log(`   Mengupdate profil ID: ${testId}`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: '+62123456789',
          location: 'Jakarta',
          bio: 'Testing migrasi'
        })
        .eq('id', testId);
      
      if (updateError) {
        console.log('   Error saat update:', updateError.message);
      } else {
        console.log('   ✅ Berhasil mengupdate dengan data dummy.');
        
        // Bersihkan data dummy
        await supabase
          .from('profiles')
          .update({
            phone: null,
            location: null,
            bio: null
          })
          .eq('id', testId);
        console.log('   ✅ Data dummy dibersihkan.');
      }
    }
    
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
}

checkProfileColumns();
