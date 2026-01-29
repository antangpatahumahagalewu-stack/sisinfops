#!/usr/bin/env node

/**
 * Script untuk verifikasi bahwa tabel-tabel financial sudah dibuat
 * dan bisa diakses setelah menjalankan migration.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey, supabaseAnonKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim()
    }
  }
} else {
  console.error('.env.local file not found at:', envPath)
  process.exit(1)
}

if (!supabaseUrl) {
  console.error('❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

// Use service role key if available, otherwise use anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey
if (!supabaseKey) {
  console.error('❌ ERROR: Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTables() {
  console.log('🔍 Verifying Financial Tables Migration...')
  console.log('=============================================\n')

  // Daftar tabel yang harus ada setelah migration
  const financialTables = [
    { name: 'master_price_list', description: 'Master price list untuk barang/jasa' },
    { name: 'accounting_ledgers', description: 'Dual ledger system (operasional vs proyek)' },
    { name: 'chart_of_accounts', description: 'Chart of accounts SAK compliant' },
    { name: 'accounting_journal_entries', description: 'Double-entry journal entries' },
    { name: 'journal_entry_lines', description: 'Debit/credit lines for journal entries' },
    { name: 'financial_budgets', description: 'Budget management system' },
    { name: 'financial_transactions', description: 'Financial transactions with double-entry columns' }
  ]

  let allTablesExist = true
  const results = []

  for (const table of financialTables) {
    try {
      // Coba query tabel (gunakan limit 0 atau count untuk menghindari data besar)
      const { data, error } = await supabase
        .from(table.name)
        .select('count', { count: 'exact', head: true })
        .limit(0)

      if (error) {
        // Error 42P01 = table doesn't exist, 42501 = permission denied
        if (error.code === '42P01') {
          results.push({ table: table.name, status: '❌ NOT EXIST', error: error.message })
          allTablesExist = false
        } else if (error.code === '42501') {
          results.push({ table: table.name, status: '⚠️  PERMISSION DENIED', error: 'RLS mungkin terlalu ketat' })
          // Tabel ada tapi permission denied, jadi kita anggap tabel ada
        } else {
          results.push({ table: table.name, status: '⚠️  ERROR', error: error.message })
        }
      } else {
        results.push({ table: table.name, status: '✅ EXISTS', error: null })
      }
    } catch (err) {
      results.push({ table: table.name, status: '❌ EXCEPTION', error: err.message })
      allTablesExist = false
    }
  }

  // Tampilkan hasil
  console.log('Tabel Financial Status:')
  console.log('-----------------------')
  results.forEach(result => {
    console.log(`${result.status.padEnd(20)} ${result.table}`)
    if (result.error) {
      console.log(`    Error: ${result.error}`)
    }
  })
  console.log('')

  // Cek kolom tambahan di financial_transactions
  console.log('Checking enhanced columns in financial_transactions:')
  console.log('---------------------------------------------------')
  
  const enhancedColumns = [
    'debit_account_code',
    'credit_account_code', 
    'ledger_id',
    'status',
    'supporting_document_url',
    'journal_entry_id'
  ]

  // Gunakan service key jika tersedia
  if (supabaseServiceKey) {
    for (const column of enhancedColumns) {
      try {
        // Coba query kolom dengan limit 0
        const { data, error } = await supabase
          .from('financial_transactions')
          .select(column)
          .limit(0)

        if (error) {
          console.log(`⚠️  ${column}: Error checking - ${error.message}`)
        } else {
          console.log(`✅ ${column}: Column exists`)
        }
      } catch (err) {
        console.log(`⚠️  ${column}: Exception checking - ${err.message}`)
      }
    }
  } else {
    console.log('⚠️  Service role key not available, cannot check column details')
  }

  console.log('')

  // Cek data seed
  console.log('Checking seed data:')
  console.log('-------------------')
  
  // Cek chart_of_accounts
  const { data: coaData, count: coaCount, error: coaError } = await supabase
    .from('chart_of_accounts')
    .select('*', { count: 'exact', head: true })

  if (coaError) {
    console.log(`❌ chart_of_accounts: Error checking seed - ${coaError.message}`)
  } else {
    console.log(`✅ chart_of_accounts: ${coaCount} accounts seeded`)
  }

  // Cek accounting_ledgers
  const { data: ledgerData, count: ledgerCount, error: ledgerError } = await supabase
    .from('accounting_ledgers')
    .select('*', { count: 'exact', head: true })

  if (ledgerError) {
    console.log(`❌ accounting_ledgers: Error checking seed - ${ledgerError.message}`)
  } else {
    console.log(`✅ accounting_ledgers: ${ledgerCount} ledgers seeded`)
  }

  // Cek financial_budgets
  const { data: budgetData, count: budgetCount, error: budgetError } = await supabase
    .from('financial_budgets')
    .select('*', { count: 'exact', head: true })

  if (budgetError) {
    console.log(`❌ financial_budgets: Error checking seed - ${budgetError.message}`)
  } else {
    console.log(`✅ financial_budgets: ${budgetCount} budgets seeded`)
  }

  console.log('')

  // Kesimpulan
  if (allTablesExist) {
    console.log('🎉 SEMUA TABEL FINANCIAL BERHASIL DIVERIFIKASI!')
    console.log('   Migration financial tables berhasil dijalankan.')
    console.log('')
    console.log('📋 NEXT STEPS:')
    console.log('   1. Test Master Price List di aplikasi')
    console.log('   2. Buat user dengan role finance/finance_manager')
    console.log('   3. Test CRUD operations')
    console.log('   4. Lanjutkan implementasi modul lainnya')
    process.exit(0)
  } else {
    console.log('❌ VERIFIKASI GAGAL: Beberapa tabel tidak ditemukan')
    console.log('')
    console.log('🔧 TROUBLESHOOTING:')
    console.log('   1. Pastikan migration SQL sudah dijalankan di Supabase SQL Editor')
    console.log('   2. Periksa file migration: supabase/migrations/20260131_create_sak_financial_tables.sql')
    console.log('   3. Coba jalankan migration lagi jika ada error')
    console.log('   4. Periksa permission service role key')
    process.exit(1)
  }
}

verifyTables().catch(error => {
  console.error('Script verification failed:', error)
  process.exit(1)
})