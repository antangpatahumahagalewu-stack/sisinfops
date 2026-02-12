// Test untuk memverifikasi perhitungan persentase berdasarkan luasan
// Dibandingkan dengan perhitungan lama berdasarkan jumlah PS

// Data contoh
const psData = [
  { jenis_hutan: 'Mineral', luas_ha: 15000 },
  { jenis_hutan: 'Mineral', luas_ha: 5000 },
  { jenis_hutan: 'Gambut', luas_ha: 8000 },
  { jenis_hutan: 'Mineral', luas_ha: 2000 },
  { jenis_hutan: 'Gambut', luas_ha: 4000 },
  { jenis_hutan: 'Gambut', luas_ha: 6000 }
];

// Normalisasi jenis hutan (sama seperti di kode)
const normalizeJenisHutan = (jenis) => {
  if (!jenis) return 'Mineral';
  const lower = jenis.toLowerCase().trim();
  if (lower.includes('gambut')) {
    return 'Gambut';
  }
  return 'Mineral';
};

// Hitung statistik
const jenisHutanStats = psData.reduce((acc, ps) => {
  const jenis = normalizeJenisHutan(ps.jenis_hutan);
  if (!acc[jenis]) {
    acc[jenis] = { count: 0, luas: 0 };
  }
  acc[jenis].count += 1;
  acc[jenis].luas += ps.luas_ha || 0;
  return acc;
}, {});

const totalPS = psData.length;
const totalLuas = psData.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0);

console.log('=== PERHITUNGAN PERSENTASE ===');
console.log(`Total PS: ${totalPS}`);
console.log(`Total Luas: ${totalLuas} Ha\n`);

console.log('Statistik Jenis Hutan:');
Object.entries(jenisHutanStats).forEach(([jenis, stats]) => {
  const persentaseLama = totalPS > 0 ? (stats.count / totalPS) * 100 : 0;
  const persentaseBaru = totalLuas > 0 ? (stats.luas / totalLuas) * 100 : 0;
  
  console.log(`\n${jenis}:`);
  console.log(`  Jumlah PS: ${stats.count} unit`);
  console.log(`  Luas Area: ${stats.luas} Ha`);
  console.log(`  Persentase Lama (berdasarkan jumlah): ${persentaseLama.toFixed(1)}%`);
  console.log(`  Persentase Baru (berdasarkan luasan): ${persentaseBaru.toFixed(1)}%`);
  
  const perbedaan = Math.abs(persentaseBaru - persentaseLama);
  console.log(`  Perbedaan: ${perbedaan.toFixed(1)}%`);
});

console.log('\n=== CONTOH KASUS: LUAS TIDAK PROPOSIONAL ===');
// Contoh dimana luas tidak proporsional dengan jumlah
const contohData = [
  { jenis_hutan: 'Mineral', luas_ha: 10000, count: 1 }, // 1 PS besar
  { jenis_hutan: 'Mineral', luas_ha: 1000, count: 4 },  // 4 PS kecil
  { jenis_hutan: 'Gambut', luas_ha: 500, count: 5 }     // 5 PS sangat kecil
];

const contohStats = contohData.reduce((acc, ps) => {
  const jenis = normalizeJenisHutan(ps.jenis_hutan);
  if (!acc[jenis]) {
    acc[jenis] = { count: 0, luas: 0 };
  }
  acc[jenis].count += ps.count;
  acc[jenis].luas += ps.luas_ha || 0;
  return acc;
}, {});

const totalContohPS = contohData.reduce((sum, ps) => sum + ps.count, 0);
const totalContohLuas = contohData.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0);

console.log(`\nTotal PS: ${totalContohPS}`);
console.log(`Total Luas: ${totalContohLuas} Ha\n`);

Object.entries(contohStats).forEach(([jenis, stats]) => {
  const persentaseLama = totalContohPS > 0 ? (stats.count / totalContohPS) * 100 : 0;
  const persentaseBaru = totalContohLuas > 0 ? (stats.luas / totalContohLuas) * 100 : 0;
  
  console.log(`${jenis}:`);
  console.log(`  ${stats.count} PS (${persentaseLama.toFixed(1)}% jumlah)`);
  console.log(`  ${stats.luas} Ha (${persentaseBaru.toFixed(1)}% luasan)`);
});

console.log('\n=== KESIMPULAN ===');
console.log('1. Persentase lama berdasarkan jumlah PS: (jumlah PS jenis tertentu / total semua PS) × 100%');
console.log('2. Persentase baru berdasarkan luasan: (luas area jenis tertentu / total luas semua area) × 100%');
console.log('3. Perubahan ini lebih akurat karena mencerminkan proporsi area sebenarnya, bukan jumlah unit.');