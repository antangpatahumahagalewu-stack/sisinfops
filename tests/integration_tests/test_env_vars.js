#!/usr/bin/env node

// Test environment variables loading
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
console.log('📄 Reading .env.local from:', envPath);

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('✅ .env.local exists');
  
  // Parse lines
  const lines = content.split('\n');
  let hasNewUrl = false;
  let hasOldUrl = false;
  
  for (const line of lines) {
    if (line.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      console.log('🔍 Found NEXT_PUBLIC_SUPABASE_URL:', line);
      if (line.includes('saelrsljpneclsbfdxfy')) {
        hasNewUrl = true;
        console.log('   ✅ Contains new project ID (saelrsljpneclsbfdxfy)');
      }
      if (line.includes('rrvhekjdhdhtkmswjgwk')) {
        hasOldUrl = true;
        console.log('   ⚠️  Contains old project ID (rrvhekjdhdhtkmswjgwk)');
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   New project in .env.local: ${hasNewUrl ? '✅' : '❌'}`);
  console.log(`   Old project in .env.local: ${hasOldUrl ? '⚠️' : '✅'}`);
} else {
  console.log('❌ .env.local not found');
}

// Check process environment
console.log('\n🔧 Process environment variables:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);

// Check if Next.js might be using different values
console.log('\n🔍 Checking for hardcoded fallbacks in source files...');
const sourceFiles = [
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'app/[locale]/(auth)/login/page.tsx'
];

for (const file of sourceFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('rrvhekjdhdhtkmswjgwk')) {
      console.log(`   ⚠️  ${file} contains hardcoded old project URL`);
    }
    if (content.includes('saelrsljpneclsbfdxfy')) {
      console.log(`   ✅ ${file} contains new project URL`);
    }
  }
}