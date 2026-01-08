const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'templates', 'template-import-data.xlsx');
console.log('Template path:', templatePath);

if (!fs.existsSync(templatePath)) {
  console.error('Template file does not exist');
  process.exit(1);
}

const workbook = XLSX.readFile(templatePath);
console.log('Sheets:', workbook.SheetNames);

// For each sheet, get the first few rows
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log(`Range: ${range.s.r} to ${range.e.r}, ${range.s.c} to ${range.e.c}`);

  // Get the first 5 rows
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('First 5 rows:');
  for (let i = 0; i < Math.min(5, data.length); i++) {
    console.log(`Row ${i}:`, data[i]);
  }
});