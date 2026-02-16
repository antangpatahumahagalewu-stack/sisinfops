// Script untuk mengecek schema mismatch antara API dan database
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkSchemaMismatch() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Environment variables missing')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 Checking financial schema mismatch...')

  try {
    // 1. Get actual table structure from database
    console.log('\n📋 ACTUAL DATABASE SCHEMA for financial_transactions:')
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('financial_transactions')
      .select('*')
      .limit(1)
      .single()

    if (tableError && tableError.code === 'PGRST116') {
      console.log('ℹ️ Table exists but has no rows')
      
      // Check columns via information schema
      const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', { 
        table_name: 'financial_transactions' 
      }).catch(async () => {
        // Fallback: try to get column info via raw SQL
        try {
          // Create a temporary view to check structure
          const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .limit(0)
            
          return { data: null, error: { message: 'No rows, cannot infer columns' } }
        } catch (err) {
          return { data: null, error: err }
        }
      })

      if (columnsError) {
        console.log('❌ Cannot get column info:', columnsError.message)
      } else if (columns) {
        console.log('📋 Columns in database:')
        columns.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type}`)
        })
      }
    } else if (tableError) {
      console.log('❌ Error getting table info:', tableError.message)
    } else if (tableInfo) {
      console.log('📋 Sample row structure:')
      Object.keys(tableInfo).forEach(key => {
        console.log(`   - ${key}: ${typeof tableInfo[key]} (${JSON.stringify(tableInfo[key])?.substring(0, 50)})`)
      })
    }

    // 2. Check API expected schema from the route.ts file
    console.log('\n📋 API EXPECTED SCHEMA (from app/api/finance/transactions/route.ts):')
    const expectedFields = [
      'transaction_date',
      'transaction_number', 
      'jenis_transaksi',
      'jumlah_idr',
      'description',
      'status',
      'ledger_id',
      'supporting_document_url',
      'project_id',
      'budget_id',
      'debit_account_code',
      'credit_account_code',
      'created_by'
    ]
    
    console.log('Required fields for POST:')
    expectedFields.forEach(field => {
      console.log(`   - ${field}`)
    })

    // 3. Check if financial_budgets table has expected structure
    console.log('\n📋 Checking financial_budgets table structure...')
    
    const { data: budgetSample, error: budgetError } = await supabase
      .from('financial_budgets')
      .select('*')
      .limit(1)
      .single()

    if (budgetError && budgetError.code === 'PGRST116') {
      console.log('ℹ️ financial_budgets exists but has no rows')
    } else if (budgetError) {
      console.log('❌ Error checking financial_budgets:', budgetError.message)
    } else if (budgetSample) {
      console.log('📋 financial_budgets columns:')
      Object.keys(budgetSample).forEach(key => {
        console.log(`   - ${key}`)
      })
    }

    // 4. Check accounting_ledgers table
    console.log('\n📋 Checking accounting_ledgers table structure...')
    
    const { data: ledgerSample, error: ledgerError } = await supabase
      .from('accounting_ledgers')
      .select('*')
      .limit(2)

    if (ledgerError) {
      console.log('❌ Error checking accounting_ledgers:', ledgerError.message)
    } else if (ledgerSample && ledgerSample.length > 0) {
      console.log(`✅ accounting_ledgers has ${ledgerSample.length} rows`)
      console.log('Sample ledger:')
      const ledger = ledgerSample[0]
      Object.keys(ledger).forEach(key => {
        console.log(`   - ${key}: ${JSON.stringify(ledger[key])?.substring(0, 100)}`)
      })
    }

    // 5. Test RLS policies by trying to insert a test transaction
    console.log('\n🔧 Testing RLS policy with service role key...')
    
    const testTransaction = {
      transaction_code: `TEST-${Date.now()}`,
      transaction_date: new Date().toISOString().split('T')[0],
      description: 'Test transaction for schema check',
      amount: 1000.00,
      currency: 'IDR',
      transaction_type: 'expense',
      status: 'pending'
    }

    try {
      const { data: insertResult, error: insertError } = await supabase
        .from('financial_transactions')
        .insert(testTransaction)
        .select()
        .single()

      if (insertError) {
        console.log(`❌ Insert test failed: ${insertError.message}`)
        console.log(`   Error details: ${JSON.stringify(insertError)}`)
        
        // Check if it's a column mismatch error
        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
          console.log('🚨 SCHEMA MISMATCH DETECTED!')
          console.log('   Database has different columns than expected by API')
        }
      } else {
        console.log('✅ Test transaction inserted successfully:', insertResult.id)
        
        // Clean up
        await supabase
          .from('financial_transactions')
          .delete()
          .eq('id', insertResult.id)
        console.log('🧹 Cleaned up test transaction')
      }
    } catch (err) {
      console.log('❌ Insert test threw exception:', err.message)
    }

    // 6. Check what the frontend dashboard is actually expecting
    console.log('\n📋 What frontend dashboard expects (from components/dashboard/financial-dashboard.tsx):')
    console.log('API calls made:')
    console.log('  1. GET /api/finance/transactions?limit=10')
    console.log('  2. GET /api/finance/budgets?status=active&limit=10')  
    console.log('  3. GET /api/finance/ledgers/balances')
    
    console.log('\nExpected response structure for transactions:')
    console.log('  - id, transaction_date, transaction_number, jenis_transaksi, jumlah_idr')
    console.log('  - description, status, ledger_name, created_by_name')
    
    console.log('\nExpected response structure for budgets:')
    console.log('  - budget_name, total_amount, utilized_amount, remaining_amount, utilization_percentage')

  } catch (error) {
    console.error('❌ Unexpected error in schema check:', error)
  }
}

// Run the check
checkSchemaMismatch().then(() => {
  console.log('\n🎉 Schema mismatch check completed')
  console.log('\n📋 DIAGNOSIS SUMMARY:')
  console.log('1. If database columns dont match API expectations:')
  console.log('   Option A: Update database schema (run migration)')
  console.log('   Option B: Update API to match existing schema')
  console.log('   Option C: Create missing columns with ALTER TABLE')
  console.log('\n2. If RLS policies blocking:')
  console.log('   Check Supabase Dashboard → Authentication → Policies')
  console.log('   Or temporarily disable RLS for testing')
  console.log('\n3. Quick fix for testing:')
  console.log('   Update API to use existing column names')
  console.log('   Or run correct migration SQL')
}).catch(error => {
  console.error('❌ Check failed:', error)
})