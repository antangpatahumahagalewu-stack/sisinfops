// Test the investor dashboard API
const https = require('https');

const testAPI = async () => {
  return new Promise((resolve, reject) => {
    const req = https.get('http://localhost:3000/api/investor/dashboard-data', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('API Status:', res.statusCode);
          console.log('API Success:', jsonData.success);
          console.log('Data Source:', jsonData.data?.dataSource);
          console.log('Message:', jsonData.message);
          
          if (jsonData.data?.summary) {
            const summary = jsonData.data.summary;
            console.log('\n📊 Summary Data:');
            console.log('  Total Carbon Projects:', summary.totalCarbonProjects);
            console.log('  Total Area Hectares:', summary.totalAreaHectares);
            console.log('  Total Investment:', summary.totalInvestment);
            console.log('  Average ROI:', summary.averageROI);
            console.log('  Estimated Carbon Sequestration:', summary.estimatedCarbonSequestration);
          }
          
          if (jsonData.data?.projectPerformance) {
            console.log('\n📋 Project Performance Data:');
            console.log('  Count:', jsonData.data.projectPerformance.length);
            jsonData.data.projectPerformance.forEach((project, i) => {
              console.log(`  ${i+1}. ${project.name} - ${project.area_hectares} ha - ROI: ${project.roi_percentage}%`);
            });
          }
          
          resolve(jsonData);
        } catch (error) {
          console.error('Error parsing response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.end();
  });
};

// First check if server is running
const checkServer = async () => {
  console.log('Checking if Next.js dev server is running...');
  
  return new Promise((resolve, reject) => {
    const req = https.get('http://localhost:3000', (res) => {
      console.log('Server status:', res.statusCode);
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log('Server not running or error:', error.code);
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      console.log('Timeout connecting to server');
      resolve(false);
    });
    
    req.end();
  });
};

const main = async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('\n⚠️  Server not running. Starting dev server...');
    // We'll just test the API directly using supabase instead
    await testDirectQuery();
    return;
  }
  
  console.log('\n🔍 Testing investor dashboard API...');
  await testAPI();
};

const testDirectQuery = async () => {
  const { createClient } = require('@supabase/supabase-js');
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
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  
  console.log('\n🔍 Direct query to carbon_projects...');
  const { data, error } = await supabase
    .from('carbon_projects')
    .select('*');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} projects`);
  
  // Calculate what the API should return
  const totalLuasHa = data.reduce((sum, p) => sum + (p.luas_total_ha || 0), 0);
  const totalInvestment = data.reduce((sum, p) => sum + (p.investment_amount || 0), 0);
  const avgROI = data.reduce((sum, p) => sum + (p.roi_percentage || 0), 0) / data.length;
  const totalCarbon = data.reduce((sum, p) => sum + (p.carbon_sequestration_estimated || 0), 0);
  
  console.log('\n📊 Calculated Summary:');
  console.log('  Total Projects:', data.length);
  console.log('  Total Area Ha:', totalLuasHa);
  console.log('  Total Investment:', totalInvestment);
  console.log('  Average ROI:', avgROI);
  console.log('  Total Carbon Seq:', totalCarbon);
};

main().catch(console.error);