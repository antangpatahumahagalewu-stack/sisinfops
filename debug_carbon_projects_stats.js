#!/usr/bin/env node

/**
 * Debug script to check why Carbon Projects page shows 0 for luas and kabupaten
 * Simulates the frontend logic to see what's happening
 */

// Simulated data from database (based on actual database query)
const simulatedCarbonProjects = [
  {
    id: 'db56f3d7-60c8-42a6-aff1-2220b51b32de',
    kode_project: 'PRJ-GMS-2026',
    nama_project: 'Gunung Mas Forest Carbon Project',
    luas_total_ha: 72800.99,
    kabupaten: 'Gunung Mas',
    status: 'active',
    standard: 'VCS',
    methodology: 'AR-ACM0003',
    crediting_period_start: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: '61f9898e-224a-4841-9cd3-102f8c387943',
    kode_project: 'PRJ-KPS-2026',
    nama_project: 'Kapuas Carbon Project',
    luas_total_ha: 56771.00,
    kabupaten: 'Kapuas',
    status: 'active',
    standard: 'VCS',
    methodology: 'AR-ACM0003',
    crediting_period_start: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'a71ef98b-4213-41cc-8616-f450aae8889d',
    kode_project: 'PRJ-KTG-2026',
    nama_project: 'Katingan Peatland Carbon Program',
    luas_total_ha: 29239.00,
    kabupaten: 'Katingan',
    status: 'active',
    standard: 'VCS',
    methodology: 'AR-ACM0003',
    crediting_period_start: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: '17a97b56-a525-4c65-b627-2e1e9e3ce343',
    kode_project: 'PRJ-PLP-2026',
    nama_project: 'Pulang Pisau Peatland Carbon Project',
    luas_total_ha: 27876.00,
    kabupaten: 'Pulang Pisau',
    status: 'active',
    standard: 'VCS',
    methodology: 'AR-ACM0003',
    crediting_period_start: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z'
  }
];

console.log('='.repeat(60));
console.log('🔍 DEBUG CARBON PROJECTS STATS');
console.log('='.repeat(60));

// Simulate frontend processing
const processedCarbonProjects = simulatedCarbonProjects.map(project => ({
  ...project,
  project_luas_ha: project.luas_total_ha || 0
}));

console.log('\n1. Processed projects:');
processedCarbonProjects.forEach((project, i) => {
  console.log(`   ${i+1}. ${project.nama_project}`);
  console.log(`      luas_total_ha: ${project.luas_total_ha} (type: ${typeof project.luas_total_ha})`);
  console.log(`      kabupaten: "${project.kabupaten}" (type: ${typeof project.kabupaten})`);
  console.log(`      project_luas_ha: ${project.project_luas_ha} (type: ${typeof project.project_luas_ha})`);
});

// Calculate total statistics (frontend logic)
const totalLuasHa = processedCarbonProjects.reduce((sum, project) => 
  sum + (project.luas_total_ha || 0), 0);

console.log(`\n2. Total luas calculation:`);
console.log(`   • totalLuasHa = ${totalLuasHa}`);
console.log(`   • Using reduce: sum + (project.luas_total_ha || 0)`);

// Get unique kabupaten names
const kabupatenNames = processedCarbonProjects
  .map(project => project.kabupaten)
  .filter((name) => !!name && typeof name === 'string');

console.log(`\n3. Kabupaten names:`);
kabupatenNames.forEach((name, i) => {
  console.log(`   ${i+1}. "${name}"`);
});

const uniqueKabupatenNames = [...new Set(kabupatenNames)];
const totalKabupatenWithCarbon = uniqueKabupatenNames.length;

console.log(`\n4. Unique kabupaten:`);
uniqueKabupatenNames.forEach((name, i) => {
  console.log(`   ${i+1}. "${name}"`);
});
console.log(`   • totalKabupatenWithCarbon = ${totalKabupatenWithCarbon}`);

// Format numbers (frontend logic)
const formatNumber = (num) => {
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

console.log(`\n5. Formatting:`);
console.log(`   • totalLuasHa = ${totalLuasHa}`);
console.log(`   • formatNumber(totalLuasHa) = "${formatNumber(totalLuasHa)}"`);
console.log(`   • totalKabupatenWithCarbon = ${totalKabupatenWithCarbon}`);

console.log(`\n6. What frontend should display:`);
console.log(`   • Luas Total Card: "${formatNumber(totalLuasHa)}"`);
console.log(`   • Subtext: "${totalKabupatenWithCarbon} kabupaten dengan carbon projects"`);

// Test edge cases
console.log(`\n7. Testing edge cases:`);

// Test with empty array
const emptyProjects = [];
const emptyTotalLuas = emptyProjects.reduce((sum, project) => 
  sum + (project?.luas_total_ha || 0), 0);
console.log(`   • Empty array totalLuas: ${emptyTotalLuas}`);

// Test with null luas values
const nullProjects = [
  { luas_total_ha: null, kabupaten: null },
  { luas_total_ha: undefined, kabupaten: undefined }
];
const nullTotalLuas = nullProjects.reduce((sum, project) => 
  sum + (project.luas_total_ha || 0), 0);
console.log(`   • Null values totalLuas: ${nullTotalLuas}`);

console.log(`\n8. Conclusion:`);
console.log(`   • Database has ${simulatedCarbonProjects.length} projects with data`);
console.log(`   • Frontend should show: ${formatNumber(totalLuasHa)} ha`);
console.log(`   • Frontend should show: ${totalKabupatenWithCarbon} kabupaten`);
console.log(`   • If showing 0, possible issues:`);
console.log(`     1. Database query returning empty/incorrect data`);
console.log(`     2. Field name mismatch (luas_total_ha vs something else)`);
console.log(`     3. Server-side rendering issue`);
console.log(`     4. Cached data`);

console.log('\n' + '='.repeat(60));
console.log('💡 RECOMMENDATION:');
console.log('='.repeat(60));
console.log('1. Check browser console for errors');
console.log('2. Check network tab for API response');
console.log('3. Verify Supabase table name matches');
console.log('4. Restart development server');
console.log('5. Clear browser cache');
console.log('='.repeat(60));