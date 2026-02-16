// Script untuk mengecek tabel database finansial
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkFinancialTables() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Environment variables missing')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 Checking financial database tables...')

  const financialTables = [
    'financial_transactions',
    'financial_budgets', 
    'accounting_ledgers',
    'financial_accounts',
    'financial_reports',
    'benefit_distributions'
  ]

  try {
    for (const tableName of financialTables) {
      console.log(`\n📋 Checking table: ${tableName}`)
      
      try {
        // Coba select 1 row untuk test table existence
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(1)

        if (error) {
          if (error.code === '42P01') { // PostgreSQL table doesn't exist
            console.log(`❌ Table ${tableName} does NOT exist`)
          } else {
            console.log(`⚠️ Error accessing ${tableName}:`, error.message)
          }
        } else {
          console.log(`✅ Table ${tableName} exists`)
          console.log(`   Row count: ${count || 0}`)
          
          // Jika table ada, cek columns
          if (tableName === 'financial_transactions') {
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1)
              .single()
            
            if (sample) {
              console.log(`   Sample columns:`, Object.keys(sample))
            }
          }
        }
      } catch (err) {
        console.log(`❌ Failed to check ${tableName}:`, err.message)
      }
    }

    // Cek RLS policies
    console.log('\n🔍 Checking RLS policies for financial tables...')
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_rls_policies', { table_names: financialTables })
      .catch(() => ({ data: null, error: { message: 'Function not available' } }))

    if (policiesError) {
      console.log('⚠️ Cannot check RLS policies:', policiesError.message)
    } else if (policies && policies.length > 0) {
      console.log('📋 RLS Policies found:')
      policies.forEach(policy => {
        console.log(`   ${policy.table_name}: ${policy.policy_name} (${policy.cmd})`)
      })
    } else {
      console.log('ℹ️ No RLS policies info available')
    }

    // Test API endpoints secara langsung
    console.log('\n🔍 Testing financial API endpoints...')
    
    const endpoints = [
      '/api/finance/transactions?limit=1',
      '/api/finance/budgets?limit=1',
      '/api/finance/ledgers/balances'
    ]

    for (const endpoint of endpoints) {
      console.log(`\n📡 Testing: ${endpoint}`)
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          headers: {
            'Accept': 'application/json'
          }
        })
        
        console.log(`   Status: ${response.status}`)
        console.log(`   Status Text: ${response.statusText}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`   Error: ${errorText.substring(0, 200)}`)
        } else {
          const data = await response.json()
          console.log(`   Success: ${data.data?.length || 0} items`)
        }
      } catch (err) {
        console.log(`   Network error: ${err.message}`)
      }
    }

    // Check migrations history
    console.log('\n🔍 Looking for financial migrations...')
    
    const { data: migrations, error: migrationsError } = await supabase
      .from('schema_migrations')
      .select('*')
      .ilike('name', '%finance%')
      .or('name.ilike.%transaction%,name.ilike.%budget%,name.ilike.%ledger%')
      .limit(10)

    if (migrationsError) {
      console.log('⚠️ Cannot check migrations:', migrationsError.message)
    } else if (migrations && migrations.length > 0) {
      console.log('📋 Financial migrations found:')
      migrations.forEach(migration => {
        console.log(`   ${migration.name}`)
      })
    } else {
      console.log('ℹ️ No financial migrations found in schema_migrations')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Jalankan checks
checkFinancialTables().then(() => {
  console.log('\n🎉 Financial database check completed')
  console.log('\n📋 RECOMMENDATIONS:')
  console.log('1. If tables missing: Run financial migrations from migrations/schema/')
  console.log('2. If RLS blocking: Check policies in Supabase Dashboard → Authentication → Policies')
  console.log('3. If API 500: Check server logs and database schema')
  console.log('4. Test manually: Visit http://localhost:3000/api/finance/transactions')
}).catch(error => {
  console.error('❌ Check failed:', error)
})