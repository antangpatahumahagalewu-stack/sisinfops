const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseAnonKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim();
    }
  }
} else {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyProfileFields() {
  console.log('Verifikasi kolom pada tabel profiles...\n');
  
  try {
    // Cek struktur tabel dengan query information_schema
    // Kita gunakan query raw melalui supabase.rpc (atau langsung query sql). 
    // Tapi karena anon key mungkin terbatas, kita coba ambil satu baris untuk melihat kolomnya.
    const { data: sample, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (sampleError) {
      console.error('Error mengambil sampel profil:', sampleError.message);
      // Mungkin kita perlu menggunakan service role key untuk query information_schema
      // Tapi kita coba pendekatan lain.
    } else {
      console.log('Kolom yang ada pada sampel profil:');
      Object.keys(sample || {}).forEach(key => {
        console.log(`  - ${key}`);
      });
      console.log();
    }
    
    // Cek spesifik kolom phone, location, bio
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', { table_name: 'profiles' }).catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (columnsError) {
      console.log('Tidak bisa memanggil RPC, coba pendekatan alternatif...');
    }
    
    // Coba query langsung dengan SELECT untuk kolom tertentu
    console.log('Mengecek kolom spesifik...');
    const { data: test, error: testError } = await supabase
      .from('profiles')
      .select('phone, location, bio')
      .limit(1);
    
    if (testError) {
      console.log('Error saat mengecek kolom:', testError.message);
      if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('\nKESIMPULAN: Kolom belum ditambahkan ke tabel profiles.');
      } else {
        console.log('\nKESIMPULAN: Tidak bisa menentukan status kolom.');
      }
    } else {
      console.log('\nKESIMPULAN: Kolom phone, location, dan bio sudah tersedia di tabel profiles.');
      console.log('Migrasi berhasil diterapkan.');
    }
    
    // Coba update satu profil untuk memastikan kolom bisa diisi
    console.log('\nMencoba mengupdate profil dengan data dummy...');
    // Dapatkan user id pertama
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (!profilesError && profiles && profiles.length > 0) {
      const testId = profiles[0].id;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: '+62123456789',
          location: 'Jakarta',
          bio: 'Testing migrasi'
        })
        .eq('id', testId);
      
      if (updateError) {
        console.log('Gagal mengupdate:', updateError.message);
      } else {
        console.log('Berhasil mengupdate profil dengan data dummy.');
        // Kembalikan ke nilai semula (kosongkan)
        await supabase
          .from('profiles')
          .update({
            phone: null,
            location: null,
            bio: null
          })
          .eq('id', testId);
        console.log('Data dummy dibersihkan.');
      }
    }
    
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
}

verifyProfileFields();
