#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  console.error('   Perlu NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running Kabupaten Luas Migration')
  console.log('=====================================\n')
  
  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '202602100831_add_kabupaten_luas_total.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(`📄 Migration file: ${path.basename(migrationPath)}`)
  console.log(`📏 Size: ${migrationSQL.length} characters\n`)
  
  // Split SQL into individual statements
  // This is a simple splitter - for production use a proper SQL parser
  const sqlStatements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
  
  console.log(`📝 Found ${sqlStatements.length} SQL statements`)
  
  // Execute each statement
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i] + ';'
    
    // Skip BEGIN and COMMIT blocks as we're executing individually
    if (sql.includes('BEGIN;') || sql.includes('COMMIT;')) {
      console.log(`   ⏭️  Skipping transaction statement`)
      continue
    }
    
    // Skip DO $$ blocks - need special handling
    if (sql.includes('DO $$')) {
      console.log(`   ⏭️  Skipping DO block (needs special handling)`)
      continue
    }
    
    try {
      console.log(`   🔧 Executing statement ${i + 1}/${sqlStatements.length}`)
      
      const { error } = await supabase.rpc('exec_sql', { sql_statement: sql })
      
      if (error) {
        // Try direct query if rpc doesn't work
        const { error: directError } = await supabase.query(sql)
        
        if (directError) {
          console.error(`   ❌ Error: ${directError.message}`)
          errorCount++
        } else {
          console.log(`   ✅ Success`)
          successCount++
        }
      } else {
        console.log(`   ✅ Success`)
        successCount++
      }
      
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`)
      errorCount++
    }
  }
  
  console.log('\n📊 Migration Results:')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run the migration manually via Supabase Dashboard.')
    console.log('   Go to: https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql-editor')
    process.exit(1)
  } else {
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n🔍 Verifying migration...')
    
    // Check if column was added
    const { data: checkData, error: checkError } = await supabase
      .from('kabupaten')
      .select('*')
      .limit(1)
    
    if (checkError) {
      console.error(`❌ Error checking table: ${checkError.message}`)
    } else if (checkData && checkData.length > 0) {
      const row = checkData[0]
      if ('luas_total_ha' in row) {
        console.log(`✅ Column 'luas_total_ha' exists in kabupaten table`)
      } else {
        console.log(`❌ Column 'luas_total_ha' NOT found in kabupaten table`)
      }
    }
    
    // Test the view
    const { data: viewData, error: viewError } = await supabase
      .from('v_carbon_projects_kabupaten_luas')
      .select('*')
      .limit(2)
    
    if (viewError) {
      console.error(`❌ View not accessible: ${viewError.message}`)
    } else {
      console.log(`✅ View 'v_carbon_projects_kabupaten_luas' accessible`)
    }
  }
}

runMigration().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})