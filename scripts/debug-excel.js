const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const rootPath = path.join(__dirname, '..', '..', '..', '..');
const filePath = path.join(
  rootPath, 
  'DIV PERENCANAAN', 
  'DOKUMEN PERENCANAAN', 
  'DATA UPDATE', 
  'JANUARI 06012026', 
  'DATA POTENSI.xlsx'
);

console.log('Checking Excel file structure...');
console.log('File exists:', fs.existsSync(filePath));

if (!fs.existsSync(filePath)) {
  console.error('File not found');
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
console.log('\nSheet names:', workbook.SheetNames);

// Analyze each sheet
workbook.SheetNames.forEach((sheetName, sheetIndex) => {
  console.log('\n=== Sheet:', sheetName, '===');
  
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  
  console.log('Total rows:', rawData.length);
  
  // Show first 15 rows to understand structure
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const row = rawData[i];
    console.log(`Row ${i}:`, JSON.stringify(row));
  }
});
