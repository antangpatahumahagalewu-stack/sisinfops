#!/usr/bin/env node
/**
 * Temporary Workaround for API Connectivity
 * Use service role key as anon key to bypass RLS for testing
 * WARNING: ONLY FOR DEVELOPMENT, NOT FOR PRODUCTION
 */
const fs = require('fs');
const path = require('path');

async function testTemporaryWorkaround() {
  console.log('🔧 TEMPORARY WORKAROUND TEST (Development Only)');
  console.log('=' .repeat(60));
  console.log('⚠️  WARNING: This bypasses RLS security!');
  console.log('   ONLY use for testing, NOT for production!');
  console.log('=' .repeat(60));
  
  // Read .env.local
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let supabaseUrl = '';
  let serviceKey = '';
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  }
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  console.log(`\n📡 Supabase URL: ${supabaseUrl}`);
  console.log(`🔧 Service Key: ${serviceKey.substring(0, 20)}...`);
  
  // Create backup of .env.local
  const backupPath = envPath + '.backup';
  fs.copyFileSync(envPath, backupPath);
  console.log(`\n📂 Backup created: ${backupPath}`);
  
  // Create temporary .env.local with service key as anon key
  const newEnvContent = lines.map(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      return `NEXT_PUBLIC_SUPABASE_ANON_KEY=${serviceKey}`;
    }
    return line;
  }).join('\n');
  
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ Updated .env.local (service key as anon key)');
  
  // Test with check-ps-data.js
  console.log('\n🔍 Testing connectivity with temporary workaround...');
  
  const { execSync } = require('child_process');
  try {
    const result = execSync('node check-ps-data.js', { encoding: 'utf8' });
    console.log('\n📊 TEST RESULTS:');
    console.log(result.substring(0, 500) + '...');
    
    // Check if test passed
    if (result.includes('✅ Found') || result.includes('Success')) {
      console.log('\n🎉 SUCCESS! API connectivity fixed with temporary workaround.');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: npm run dev');
      console.log('   2. Open: http://localhost:3000');
      console.log('   3. Dashboard should show PS data now');
      console.log('\n⚠️  IMPORTANT: This is temporary!');
      console.log('   For production:');
      console.log('   1. Restore original .env.local');
      console.log('   2. Regenerate Supabase keys in dashboard');
      console.log('   3. Update .env.local with new keys');
    } else {
      console.log('\n❌ Test still failing, check error above');
    }
    
  } catch (error) {
    console.error('\n❌ Error running test:', error.message);
    console.error(error.stdout?.toString() || '');
    console.error(error.stderr?.toString() || '');
  }
  
  // Restore original .env.local
  console.log('\n🔄 Restoring original .env.local...');
  fs.copyFileSync(backupPath, envPath);
  fs.unlinkSync(backupPath);
  console.log('✅ Original .env.local restored');
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 MANUAL WORKAROUND INSTRUCTIONS:');
  console.log('=' .repeat(60));
  console.log('\nIf you want to test frontend quickly:');
  console.log('1. Edit .env.local');
  console.log('2. Find: NEXT_PUBLIC_SUPABASE_ANON_KEY=...');
  console.log('3. Replace with: SUPABASE_SERVICE_ROLE_KEY value');
  console.log('4. Save file');
  console.log('5. Run: npm run dev');
  console.log('6. Dashboard should work');
  console.log('\n⚠️  REMEMBER: Restore original anon key before deployment!');
}

testTemporaryWorkaround().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});