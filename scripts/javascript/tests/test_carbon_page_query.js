// Test the exact query used in the carbon projects page
const { createClient } = require('@supabase/supabase-js');

async function testQuery() {
  // Read .env.local
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  
  envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  });
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
  
  // Create client (similar to server component)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });
  
  try {
    console.log('\n🔍 Testing exact query from page.tsx...');
    console.log('Query: supabase.from("carbon_projects").select("*").order("created_at", { ascending: false })');
    
    const { data, error } = await supabase
      .from('carbon_projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Query error:', error);
      console.error('Error details:', error.message, error.details, error.hint);
    } else {
      console.log(`✅ Query successful. Found ${data?.length || 0} projects`);
      
      if (data && data.length > 0) {
        console.log('\n📋 First project sample:');
        const project = data[0];
        console.log('  ID:', project.id);
        console.log('  Kode:', project.kode_project);
        console.log('  Nama:', project.nama_project);
        console.log('  Luas Total Ha:', project.luas_total_ha);
        console.log('  Kabupaten:', project.kabupaten);
        console.log('  Status:', project.status);
        console.log('  Validation Status:', project.validation_status);
        
        // Calculate totals like in the page
        const totalLuasHa = data.reduce((sum, p) => sum + (p.luas_total_ha || 0), 0);
        const kabupatenNames = data.map(p => p.kabupaten).filter(name => name && typeof name === 'string');
        const uniqueKabupatenNames = [...new Set(kabupatenNames)];
        const totalKabupatenWithCarbon = uniqueKabupatenNames.length;
        
        console.log('\n📈 Calculated totals (like in page.tsx):');
        console.log('  Total Projects:', data.length);
        console.log('  Total Luas Ha:', totalLuasHa);
        console.log('  Kabupaten Names:', kabupatenNames);
        console.log('  Unique Kabupaten:', uniqueKabupatenNames);
        console.log('  Total Kabupaten with Carbon:', totalKabupatenWithCarbon);
        
        // Check if any projects have luas_total_ha = 0 or null
        const zeroLuas = data.filter(p => !p.luas_total_ha);
        console.log('\n🔍 Projects with missing luas_total_ha:', zeroLuas.length);
        zeroLuas.forEach(p => {
          console.log(`  - ${p.kode_project}: luas_total_ha = ${p.luas_total_ha}`);
        });
        
        // Check kabupaten values
        const emptyKabupaten = data.filter(p => !p.kabupaten);
        console.log('🔍 Projects with empty kabupaten:', emptyKabupaten.length);
        
      } else {
        console.log('❌ No data returned (but no error)');
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testQuery();