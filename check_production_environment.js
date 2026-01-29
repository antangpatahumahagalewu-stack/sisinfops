#!/usr/bin/env node

// Check production environment differences
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Production Environment Differences...');
console.log('=========================================\n');

// 1. Check if there are production-specific environment files
console.log('1. Checking for production environment files...');
const envFiles = [
  '.env.production',
  '.env.production.local', 
  '.env',
  '.env.production.vercel',
  '.env.vercel'
];

envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ Found: ${file}`);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      console.log(`      ${lines.length} lines`);
      
      // Check for Supabase URLs
      const supabaseLines = lines.filter(line => line.includes('SUPABASE'));
      if (supabaseLines.length > 0) {
        console.log('      Supabase config found:');
        supabaseLines.forEach(line => {
          const [key] = line.split('=');
          console.log(`        - ${key}`);
        });
      }
    } catch (error) {
      console.log(`      Error reading: ${error.message}`);
    }
  } else {
    console.log(`   ❌ Not found: ${file}`);
  }
});

// 2. Check if .env.local has production values
console.log('\n2. Checking current .env.local for production values...');
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  const lines = content.split('\n');
  
  const supabaseUrlLine = lines.find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_URL='));
  const supabaseAnonKeyLine = lines.find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='));
  
  if (supabaseUrlLine) {
    const url = supabaseUrlLine.split('=')[1];
    console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${url}`);
    console.log(`      Is production URL: ${url.includes('rrvhekjdhdhtkmswjgwk') ? '✅ Yes (same as test)' : '⚠️ Different'}`);
  }
  
  if (supabaseAnonKeyLine) {
    const key = supabaseAnonKeyLine.split('=')[1];
    console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key.substring(0, 20)}...`);
  }
}

// 3. Check package.json for build scripts
console.log('\n3. Checking package.json build configuration...');
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log(`   App name: ${packageJson.name}`);
  console.log(`   Version: ${packageJson.version}`);
  
  if (packageJson.scripts) {
    console.log('   Build scripts:');
    ['build', 'dev', 'start', 'preview'].forEach(script => {
      if (packageJson.scripts[script]) {
        console.log(`      ${script}: ${packageJson.scripts[script]}`);
      }
    });
  }
}

// 4. Check vercel.json for production configuration
console.log('\n4. Checking vercel.json for production deployment config...');
const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
if (fs.existsSync(vercelJsonPath)) {
  try {
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    console.log(`   Vercel version: ${vercelJson.version}`);
    console.log(`   Build command: ${vercelJson.buildCommand}`);
    console.log(`   Dev command: ${vercelJson.devCommand}`);
    console.log(`   Framework: ${vercelJson.framework}`);
    console.log(`   Regions: ${vercelJson.regions?.join(', ') || 'Not specified'}`);
    
    if (vercelJson.env) {
      console.log('   Environment variables configured:');
      Object.keys(vercelJson.env).forEach(key => {
        console.log(`      ${key}: ${vercelJson.env[key] === process.env[key] ? '✅ Matches local' : '⚠️ Different'}`);
      });
    }
  } catch (error) {
    console.log(`   Error reading vercel.json: ${error.message}`);
  }
}

// 5. Check for middleware or authentication differences
console.log('\n5. Checking for authentication middleware...');
const middlewarePath = path.join(process.cwd(), 'middleware.ts');
const middlewareJsPath = path.join(process.cwd(), 'middleware.js');
if (fs.existsSync(middlewarePath)) {
  console.log('   ✅ Found: middleware.ts');
} else if (fs.existsSync(middlewareJsPath)) {
  console.log('   ✅ Found: middleware.js');
} else {
  console.log('   ❌ No middleware file found');
}

// 6. Check next.config.ts for rewrites/redirects
console.log('\n6. Checking next.config.ts for production-specific config...');
const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
  
  // Check for rewrites
  if (nextConfigContent.includes('async rewrites()')) {
    console.log('   ⚠️  Found rewrites configuration');
  }
  
  // Check for redirects  
  if (nextConfigContent.includes('async redirects()')) {
    console.log('   ⚠️  Found redirects configuration');
  }
  
  // Check for headers
  if (nextConfigContent.includes('async headers()')) {
    console.log('   ✅ Found headers configuration');
  }
}

// 7. Check if there's a production build directory
console.log('\n7. Checking for production build artifacts...');
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('   ✅ Found: .next directory');
  
  // Check build manifest
  const buildManifestPath = path.join(nextDir, 'build-manifest.json');
  if (fs.existsSync(buildManifestPath)) {
    console.log('   ✅ Found: build-manifest.json');
  }
  
  // Check if it's a production build
  const isProdBuild = fs.existsSync(path.join(nextDir, 'standalone')) || 
                      fs.existsSync(path.join(nextDir, 'server', 'middleware-manifest.json'));
  console.log(`   Build type: ${isProdBuild ? 'Production' : 'Development'}`);
} else {
  console.log('   ❌ No .next directory found - run "npm run build" first');
}

console.log('\n=========================================');
console.log('🔬 PRODUCTION ENVIRONMENT DIAGNOSIS:');
console.log('=========================================');
console.log('\n💡 POTENTIAL ISSUES IN PRODUCTION:');
console.log('1. Different Supabase database in production');
console.log('2. RLS migration not applied to production database');
console.log('3. Production build with old code (cache)');
console.log('4. Different environment variables');
console.log('5. Vercel deployment with cached build');
console.log('\n💡 RECOMMENDED ACTIONS:');
console.log('1. Run RLS migration in Supabase production SQL Editor');
console.log('2. Redeploy production with: vercel --prod');
console.log('3. Clear Vercel deployment cache');
console.log('4. Check production environment variables in Vercel dashboard');
console.log('5. Verify production Supabase project is same as development');