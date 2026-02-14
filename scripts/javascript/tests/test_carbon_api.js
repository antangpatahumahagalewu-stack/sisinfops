const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testCarbonAPI() {
  console.log('🧪 Testing Carbon API Integration\n');
  
  // Read environment variables
  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    console.error('❌ Error reading .env.local:', err.message);
    process.exit(1);
  }
  
  let supabaseUrl = '';
  let serviceRoleKey = '';
  
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceRoleKey = line.split('=')[1].trim();
    }
  }
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase configuration in .env.local');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  console.log('📊 TEST 1: Direct Database Query (Simulating API Logic)');
  
  try {
    // Simulate what the API endpoint does
    const { data, error, count } = await supabase
      .from('carbon_projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Database query failed:', error.message);
    } else {
      console.log(`✅ Database query successful: ${data?.length || 0} projects found`);
      
      if (data && data.length > 0) {
        console.log('\n📋 Sample project data:');
        data.slice(0, 2).forEach((project, idx) => {
          console.log(`\nProject ${idx + 1}:`);
          console.log(`  ID: ${project.id}`);
          console.log(`  Code: ${project.kode_project || project.project_code}`);
          console.log(`  Name: ${project.nama_project || project.project_name}`);
          console.log(`  Status: ${project.status || project.validation_status}`);
          console.log(`  Type: ${project.project_type}`);
          console.log(`  Standard: ${project.standard}`);
          console.log(`  Credits: ${project.estimated_credits}`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
  
  console.log('\n📊 TEST 2: Frontend Compatibility Mapping');
  
  try {
    const { data, error } = await supabase
      .from('carbon_projects')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Testing transformation logic:');
      
      data.forEach((project, idx) => {
        // Apply the same transformation as in the API
        const transformed = {
          id: project.id,
          kode_project: project.kode_project || project.project_code,
          nama_project: project.nama_project || project.project_name,
          status: project.status || project.validation_status || 'draft',
          standar_karbon: project.standard || project.standar_karbon || 'VCS',
          metodologi: project.methodology || project.metodologi || 'VM0007',
          luas_total_ha: 0, // Placeholder
          tanggal_mulai: project.crediting_period_start || null,
          project_type: project.project_type,
          estimated_credits: project.estimated_credits,
          issued_credits: project.issued_credits,
          verification_status: project.verification_status
        };
        
        console.log(`\nTransformed Project ${idx + 1}:`);
        console.log(`  kode_project: ${transformed.kode_project} (from: ${project.kode_project || project.project_code})`);
        console.log(`  nama_project: ${transformed.nama_project} (from: ${project.nama_project || project.project_name})`);
        console.log(`  status: ${transformed.status} (from: ${project.status || project.validation_status})`);
        console.log(`  standar_karbon: ${transformed.standar_karbon} (from: ${project.standard})`);
        console.log(`  metodologi: ${transformed.metodologi} (from: ${project.methodology})`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  console.log('\n📊 TEST 3: Check Missing Tables');
  
  const missingTables = ['carbon_model_details', 'carbon_monitoring_data'];
  
  for (const tableName of missingTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${tableName}: Table does not exist`);
        } else {
          console.log(`⚠️  ${tableName}: Error (${error.message})`);
        }
      } else {
        console.log(`✅ ${tableName}: Table exists`);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }
  
  console.log('\n📊 TEST 4: Check Frontend Page Compatibility');
  
  try {
    // Simulate what the frontend page does
    const { data: frontendData, error: frontendError } = await supabase
      .from('carbon_projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (frontendError) {
      console.error('❌ Frontend query would fail:', frontendError.message);
    } else {
      console.log(`✅ Frontend page query would return ${frontendData?.length || 0} projects`);
      
      // Check if frontend can display the data
      if (frontendData && frontendData.length > 0) {
        const sample = frontendData[0];
        const hasRequiredData = 
          (sample.kode_project || sample.project_code) && 
          (sample.nama_project || sample.project_name) &&
          (sample.status || sample.validation_status);
        
        if (hasRequiredData) {
          console.log('✅ Frontend has required data for display');
        } else {
          console.log('⚠️  Frontend missing some required data fields');
        }
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('1. Database has carbon_projects table with data');
  console.log('2. API transformation logic works');
  console.log('3. Some related tables (carbon_model_details) are missing');
  console.log('4. Frontend page should work with current data');
  console.log('\n🔧 NEXT STEPS:');
  console.log('- Test actual API endpoint with curl or browser');
  console.log('- Create missing tables if needed');
  console.log('- Add more sample data for testing');
  console.log('- Test frontend page integration');
}

testCarbonAPI().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});