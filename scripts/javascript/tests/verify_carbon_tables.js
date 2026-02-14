const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verifyCarbonTables() {
  console.log('🔍 Verifying Carbon Tables Structure\n');
  
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
  
  console.log('📋 CARBON PROJECTS TABLE STRUCTURE:');
  
  try {
    // Get column information by fetching one row and examining keys
    const { data, error } = await supabase
      .from('carbon_projects')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching carbon_projects:', error.message);
    } else if (data && data.length > 0) {
      const sample = data[0];
      console.log('\n✅ carbon_projects table exists with columns:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        console.log(`  - ${key}: ${typeof value} (example: ${value})`);
      });
      
      // Check for required columns from frontend
      const requiredColumns = [
        'kode_project',
        'nama_project', 
        'status',
        'luas_total_ha',
        'standar_karbon',
        'metodologi',
        'tanggal_mulai'
      ];
      
      console.log('\n🔍 CHECKING FRONTEND-REQUIRED COLUMNS:');
      requiredColumns.forEach(col => {
        if (col in sample) {
          console.log(`  ✅ ${col}: EXISTS`);
        } else {
          console.log(`  ❌ ${col}: MISSING - Frontend expects this column`);
        }
      });
      
      // Check for new schema columns
      const newSchemaColumns = [
        'project_code',
        'project_name',
        'validation_status',
        'estimated_credits'
      ];
      
      console.log('\n🔍 CHECKING NEW SCHEMA COLUMNS:');
      newSchemaColumns.forEach(col => {
        if (col in sample) {
          console.log(`  ⚠️  ${col}: EXISTS (new schema)`);
        } else {
          console.log(`  ℹ️  ${col}: NOT FOUND (old schema?)`);
        }
      });
      
    } else {
      console.log('ℹ️ carbon_projects table exists but has no data');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  // Check carbon model details
  console.log('\n📋 CARBON MODEL DETAILS TABLE:');
  
  try {
    const { data, error } = await supabase
      .from('carbon_model_details')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ carbon_model_details table does not exist');
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    } else if (data && data.length > 0) {
      console.log('✅ carbon_model_details exists with data');
      console.log('  Columns:', Object.keys(data[0]));
    } else {
      console.log('✅ carbon_model_details exists but empty');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  // Check carbon monitoring data
  console.log('\n📋 CARBON MONITORING DATA TABLE:');
  
  try {
    const { data, error } = await supabase
      .from('carbon_monitoring_data')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ carbon_monitoring_data table does not exist');
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    } else if (data && data.length > 0) {
      console.log('✅ carbon_monitoring_data exists with data');
      console.log('  Columns:', Object.keys(data[0]));
    } else {
      console.log('✅ carbon_monitoring_data exists but empty');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  // Check actual data in carbon_projects
  console.log('\n📊 CARBON PROJECTS DATA SAMPLE:');
  
  try {
    const { data, error } = await supabase
      .from('carbon_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Error fetching data:', error.message);
    } else if (data && data.length > 0) {
      data.forEach((project, idx) => {
        console.log(`\nProject ${idx + 1}:`);
        console.log(`  Code: ${project.kode_project || project.project_code || 'N/A'}`);
        console.log(`  Name: ${project.nama_project || project.project_name || 'N/A'}`);
        console.log(`  Status: ${project.status || project.validation_status || 'N/A'}`);
        console.log(`  Area: ${project.luas_total_ha || 'N/A'} ha`);
        console.log(`  Standard: ${project.standar_karbon || 'N/A'}`);
        console.log(`  Methodology: ${project.metodologi || 'N/A'}`);
      });
    } else {
      console.log('No carbon projects found');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  // Check frontend compatibility
  console.log('\n🎯 FRONTEND COMPATIBILITY ANALYSIS:');
  
  try {
    const { data, error } = await supabase
      .from('carbon_projects')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Cannot analyze: ' + error.message);
    } else if (data && data.length > 0) {
      const sample = data[0];
      const hasOldSchema = 'kode_project' in sample;
      const hasNewSchema = 'project_code' in sample;
      
      if (hasOldSchema) {
        console.log('✅ Database uses OLD schema (kode_project, nama_project)');
        console.log('   Frontend page.tsx EXPECTS this schema');
        console.log('   API endpoints need to use OLD column names');
      } else if (hasNewSchema) {
        console.log('⚠️  Database uses NEW schema (project_code, project_name)');
        console.log('   Frontend page.tsx needs UPDATE to use new columns');
        console.log('   OR API needs to map new->old in response');
      } else {
        console.log('❌ Unknown schema - check column names');
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  console.log('\n🔧 RECOMMENDATIONS:');
  console.log('1. If database uses OLD schema: API should query with OLD column names');
  console.log('2. If database uses NEW schema: Update frontend OR create mapping in API');
  console.log('3. Ensure missing tables (carbon_model_details, etc.) are created');
  console.log('4. Add sample data if needed for testing');
}

verifyCarbonTables().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});