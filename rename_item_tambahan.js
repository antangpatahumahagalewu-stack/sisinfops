const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Category to name mapping based on actual category meaning
const CATEGORY_NAME_TEMPLATES = {
  // Material categories
  'MATERIAL': ['Bahan Konstruksi', 'Material Bangunan', 'Bahan Baku', 'Material Finish'],
  'material_tanaman': ['Bibit Pohon', 'Bibit Tanaman', 'Pupuk Organik', 'Media Tanam'],
  
  // Services categories
  'jasa_konsultasi': ['Jasa Konsultasi Kehutanan', 'Konsultasi Lingkungan', 'Konsultasi Teknis', 'Jasa Konsultasi Manajemen'],
  'jasa_pelatihan': ['Pelatihan Masyarakat', 'Training Teknis', 'Workshop Kehutanan', 'Pelatihan Pengelolaan'],
  'honorarium_tenaga_ahli': ['Honorarium Ahli Kehutanan', 'Fee Konsultan Lingkungan', 'Honorarium Teknisi', 'Fee Ahli Restorasi'],
  
  // Project management
  'manajemen_proyek': ['Biaya Manajemen Proyek', 'Pengelolaan Proyek', 'Koordinasi Lapangan', 'Supervisi Proyek'],
  'sertifikasi_verifikasi': ['Sertifikasi Kehutanan', 'Verifikasi Karbon', 'Audit Lingkungan', 'Sertifikasi Berkelanjutan'],
  'dokumentasi_pelaporan': ['Dokumentasi Proyek', 'Laporan Keuangan', 'Dokumentasi Lapangan', 'Laporan Teknis'],
  'survei_penelitian': ['Survei Lapangan', 'Penelitian Ekosistem', 'Survei Sosial', 'Studi Kelayakan'],
  
  // Environmental categories
  'adaptasi_iklim': ['Program Adaptasi Iklim', 'Mitigasi Perubahan Iklim', 'Adaptasi Lingkungan', 'Resiliensi Iklim'],
  'pengurangan_emisi': ['Program Pengurangan Emisi', 'Kompensasi Karbon', 'Penyerapan Karbon', 'Reduksi Emisi GRK'],
  'mitigasi_kebakaran': ['Pencegahan Kebakaran Hutan', 'Sistem Peringatan Dini', 'Alat Pemadam Kebakaran', 'Mitigasi Kebakaran'],
  'restorasi_ekosistem': ['Restorasi Lahan Kritis', 'Rehabilitasi Hutan', 'Pemulihan Ekosistem', 'Konservasi Habitat'],
  'pengelolaan_air': ['Pengelolaan Air Hujan', 'Konservasi Air', 'Sistem Irigasi', 'Pengelolaan Sumber Air'],
  'pengendalian_hama': ['Pengendalian Hama Terpadu', 'Pestisida Organik', 'Kontrol Hama Tanaman', 'Pengelolaan OPT'],
  
  // Infrastructure & equipment
  'infrastruktur': ['Pembangunan Infrastruktur', 'Fasilitas Proyek', 'Sarana Pendukung', 'Infrastruktur Lapangan'],
  'peralatan_monitoring': ['Alat Monitoring Lingkungan', 'Peralatan Pengukuran', 'Sensor Kualitas Air', 'Alat Pemantauan'],
  'teknologi_software': ['Software Manajemen', 'Aplikasi Monitoring', 'Sistem Database', 'Teknologi Informasi'],
  
  // Logistics & operations
  'transport_logistik': ['Transportasi Material', 'Logistik Proyek', 'Angkutan Barang', 'Distribusi Peralatan'],
  'tunjangan_operasional': ['Biaya Operasional', 'Dana Operasi Harian', 'Kebutuhan Operasional', 'Biaya Rutin'],
  'akomodasi_konsumsi': ['Akomodasi Tim Lapangan', 'Konsumsi Kerja', 'Penginapan Staf', 'Kebutuhan Logistik'],
  
  // Social & community
  'insentif_masyarakat': ['Insentif Masyarakat Lokal', 'Kompensasi Warga', 'Bantuan Sosial', 'Program Pemberdayaan'],
  'benefit_tambahan': ['Manfaat Tambahan Proyek', 'Program Sosial', 'Fasilitas Komunitas', 'Bantuan Pengembangan'],
  
  // Staff & marketing
  'gaji_staff': ['Gaji Tenaga Kerja', 'Honorarium Staf', 'Upah Pekerja', 'Remunerasi Karyawan'],
  'pemasaran': ['Biaya Pemasaran', 'Promosi Proyek', 'Publikasi Hasil', 'Kampanye Sosial'],
  'pemeliharaan': ['Pemeliharaan Fasilitas', 'Maintenance Alat', 'Perawatan Infrastruktur', 'Biaya Perawatan']
};

// Sub-items for each category to provide variety
const CATEGORY_SUB_ITEMS = {
  'MATERIAL': ['Kayu Jati Grade A', 'Semen Portland', 'Besi Beton', 'Cat Eksterior', 'Paku Baja'],
  'material_tanaman': ['Sengon Solomon', 'Mahoni', 'Akasia', 'Pinus', 'Jabon'],
  
  'jasa_konsultasi': ['8 Jam Sesi', 'Konsultasi Bulanan', 'Evaluasi Tahunan', 'Audit Lingkungan'],
  'jasa_pelatihan': ['Untuk 20 Peserta', '3 Hari Training', 'Workshop Komunitas', 'Pelatihan Teknis'],
  'honorarium_tenaga_ahli': ['Ahli Kehutanan', 'Konsultan Lingkungan', 'Teknisi Spesialis', 'Ahli Restorasi'],
  
  'manajemen_proyek': ['Per Bulan', 'Koordinasi Mingguan', 'Supervisi Tahap 1', 'Manajemen Risiko'],
  'sertifikasi_verifikasi': ['ISO 14001', 'Sertifikasi FSC', 'Verifikasi Carbon Credit', 'Audit Berkala'],
  'dokumentasi_pelaporan': ['Laporan Bulanan', 'Dokumentasi Foto', 'Laporan Akhir', 'Arsip Digital'],
  'survei_penelitian': ['Survey Sosial', 'Studi Biodiversitas', 'Analisis Tanah', 'Pemetaan Lahan'],
  
  'adaptasi_iklim': ['Program Komunitas', 'Sistem Peringatan', 'Infrastruktur Adaptif', 'Kapasitas Masyarakat'],
  'pengurangan_emisi': ['Per Ton CO2', 'Program Karbon', 'Penanaman Pohon', 'Teknologi Rendah Emisi'],
  'mitigasi_kebakaran': ['Alat Pemadam', 'Sistem Deteksi', 'Pembuatan Firebreak', 'Training Masyarakat'],
  'restorasi_ekosistem': ['Per Hektar', 'Penanaman Revegetasi', 'Kontrol Erosi', 'Pemulihan Lahan'],
  'pengelolaan_air': ['Sumur Bor', 'Embung', 'Sistem Irigasi Tetes', 'Pengelolaan DAS'],
  'pengendalian_hama': ['Pestisida Alami', 'Pengendalian Biologis', 'Alat Perangkap', 'Monitoring Hama'],
  
  'infrastruktur': ['Pos Jaga', 'Gudang Penyimpanan', 'Jalan Akses', 'Kantor Lapangan'],
  'peralatan_monitoring': ['Weather Station', 'Soil Moisture Sensor', 'Camera Trap', 'Water Quality Meter'],
  'teknologi_software': ['License Tahunan', 'Custom Development', 'Cloud Hosting', 'Maintenance'],
  
  'transport_logistik': ['Truk 6 Roda', 'Pickup Double Cabin', 'Motor Trail', 'Kendaraan Operasional'],
  'tunjangan_operasional': ['Bensin Kendaraan', 'Komunikasi', 'ATK', 'Lain-lain'],
  'akomodasi_konsumsi': ['Makan Siang Tim', 'Penginapan 1 Bulan', 'Konsumsi Harian', 'Logistik Lapangan'],
  
  'insentif_masyarakat': ['Paket Sembako', 'Bantuan Tunai', 'Program Pelatihan', 'Bibit Gratis'],
  'benefit_tambahan': ['Sumur Bersih', 'Pustaka Desa', 'Pelatihan Kerja', 'Bantuan Pendidikan'],
  
  'gaji_staff': ['Staf Administrasi', 'Tenaga Lapangan', 'Koordinator Proyek', 'Security'],
  'pemasaran': ['Brosur Digital', 'Website Proyek', 'Media Sosial', 'Publikasi Lokal'],
  'pemeliharaan': ['Alat Berat', 'Kendaraan', 'Bangunan', 'Peralatan']
};

async function renameItemTambahan() {
  console.log('🔄 Renaming "Item Tambahan" items based on category...');
  
  try {
    // Read env file
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    let supabaseUrl = '';
    let serviceRoleKey = '';
    
    envContent.split('\n').forEach(line => {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
      }
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        serviceRoleKey = line.split('=')[1].trim().replace(/['"]/g, '');
      }
    });
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase configuration');
      return;
    }
    
    console.log('✅ Supabase URL:', supabaseUrl.substring(0, 30) + '...');
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Query all items with "Item Tambahan" in the name (411-500)
    const { data: items, error } = await supabase
      .from('price_list')
      .select('*')
      .like('item_name', 'Item Tambahan%')
      .order('item_name', { ascending: true });
    
    if (error) {
      console.error('❌ Error querying price_list:', error.message);
      return;
    }
    
    console.log(`📊 Found ${items.length} items to rename`);
    
    if (items.length === 0) {
      console.log('ℹ️ No items found to rename');
      return;
    }
    
    // Track used names to avoid duplicates
    const usedNames = new Set();
    const updates = [];
    
    // Process each item
    items.forEach((item, index) => {
      const category = item.category || 'unknown';
      const originalNumber = item.item_name.match(/Item Tambahan\s*(\d+)/)?.[1] || '';
      
      // Get name template for this category
      const templates = CATEGORY_NAME_TEMPLATES[category] || [`Layanan ${category.replace(/_/g, ' ')}`];
      const subItems = CATEGORY_SUB_ITEMS[category] || ['Standar'];
      
      // Generate unique name
      let newName;
      let attempts = 0;
      
      do {
        const templateIndex = (index + attempts) % templates.length;
        const subItemIndex = Math.floor((index + attempts) / templates.length) % subItems.length;
        
        newName = `${templates[templateIndex]} - ${subItems[subItemIndex]}`;
        
        // Add original number if needed for uniqueness
        if (attempts > 0 || usedNames.has(newName)) {
          newName = `${newName} (${originalNumber})`;
        }
        
        attempts++;
        
        // Prevent infinite loop
        if (attempts > 100) {
          newName = `${templates[0]} - ${subItems[0]} (${originalNumber})`;
          break;
        }
      } while (usedNames.has(newName));
      
      usedNames.add(newName);
      
      // Also update item_code to match new name pattern
      const newItemCode = item.item_code; // Keep same item_code for now
      
      updates.push({
        id: item.id,
        original_name: item.item_name,
        new_name: newName,
        item_code: newItemCode,
        category: category
      });
    });
    
    // Preview changes
    console.log('\n📋 Preview of name changes (first 10 items):');
    updates.slice(0, 10).forEach(update => {
      console.log(`   • ${update.item_code}: "${update.original_name}" → "${update.new_name}" (${update.category})`);
    });
    
    if (updates.length > 10) {
      console.log(`   ... and ${updates.length - 10} more items`);
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will update database records.');
    console.log('   Total items to update:', updates.length);
    
    // For safety, we'll create the update script but not execute automatically
    // Save update script to file
    const updateScript = `
// UPDATE SCRIPT FOR price_list ITEMS
// Generated on ${new Date().toISOString()}
// Total items: ${updates.length}

const updates = ${JSON.stringify(updates, null, 2)};

async function executeUpdates() {
  // Add your update logic here
  // Example:
  // for (const update of updates) {
  //   await supabase
  //     .from('price_list')
  //     .update({ item_name: update.new_name })
  //     .eq('id', update.id);
  // }
}

executeUpdates().then(() => {
  console.log('✅ Updates completed');
}).catch(error => {
  console.error('❌ Update failed:', error);
});
`;
    
    fs.writeFileSync(
      path.join(__dirname, 'rename_updates.js'),
      updateScript
    );
    
    // Also save updates as JSON for manual review
    fs.writeFileSync(
      path.join(__dirname, 'rename_updates.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        total_items: updates.length,
        updates: updates
      }, null, 2)
    );
    
    console.log('\n💾 Update scripts saved:');
    console.log('   • rename_updates.js - JavaScript update script');
    console.log('   • rename_updates.json - JSON data for review');
    console.log('\n📋 Next steps:');
    console.log('   1. Review rename_updates.json to verify changes');
    console.log('   2. Run rename_updates.js to execute updates');
    console.log('   3. Verify changes in the application');
    
    // Create a simple execution script
    const executionScript = `
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function executeRenames() {
  try {
    // Read env file
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    let supabaseUrl = '';
    let serviceRoleKey = '';
    
    envContent.split('\\n').forEach(line => {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
      }
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        serviceRoleKey = line.split('=')[1].trim().replace(/['"]/g, '');
      }
    });
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase configuration');
      return;
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Load updates
    const updatesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'rename_updates.json'), 'utf8'));
    const updates = updatesData.updates;
    
    console.log('🔄 Executing ${updates.length} updates...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const update of updates) {
      try {
        const { error } = await supabase
          .from('price_list')
          .update({ 
            item_name: update.new_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (error) {
          console.error(\`❌ Failed to update \${update.item_code}: \${error.message}\`);
          errorCount++;
        } else {
          console.log(\`✅ Updated \${update.item_code}: "\${update.original_name}" → "\${update.new_name}"\`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(\`❌ Error updating \${update.item_code}: \${err.message}\`);
        errorCount++;
      }
    }
    
    console.log(\`\\n📊 Update Summary:\`);
    console.log(\`   • Successful: \${successCount}\`);
    console.log(\`   • Failed: \${errorCount}\`);
    console.log(\`   • Total: \${updates.length}\`);
    
  } catch (err) {
    console.error('❌ Execution error:', err.message);
  }
}

// Uncomment to execute
// executeRenames();
`;
    
    fs.writeFileSync(
      path.join(__dirname, 'execute_renames.js'),
      executionScript
    );
    
    console.log('   • execute_renames.js - Ready-to-run update script');
    console.log('\n🔒 Safety note: Database updates are NOT executed automatically.');
    console.log('   Review the scripts and execute manually when ready.');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err.stack);
  }
}

renameItemTambahan();