#!/usr/bin/env node

/**
 * Script untuk test insert ke master_price_list
 * Menggunakan anon key untuk simulasi akses client-side
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseAnonKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim()
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).trim()
    }
  }
} else {
  console.error('.env.local file not found at:', envPath)
  process.exit(1)
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testInsert() {
  console.log('🧪 Testing insert into master_price_list...')
  console.log('===========================================\n')

  try {
    // Coba insert data test
    const testData = {
      item_code: 'TEST-001',
      item_name: 'Test Item',
      item_description: 'Item untuk testing migration',
      item_category: 'MATERIAL',
      unit: 'pcs',
      unit_price: 10000,
      currency: 'IDR',
      validity_start: new Date().toISOString(),
      validity_end: null,
      version: 1,
      is_active: true,
      approval_status: 'DRAFT',
      created_by: null // akan diisi jika ada session
    }

    console.log('Test data:')
    console.log(JSON.stringify(testData, null, 2))
    console.log('')

    const { data, error } = await supabase
      .from('master_price_list')
      .insert(testData)
      .select()
      .single()

    if (error) {
      console.log('❌ Insert failed with error:')
      console.log(`   Code: ${error.code}`)
      console.log(`   Message: ${error.message}`)
      console.log(`   Details: ${error.details}`)
      console.log(`   Hint: ${error.hint}`)

      // Analisis error
      if (error.code === '42P01') {
        console.log('\n💡 DIAGNOSIS: Table master_price_list does NOT exist!')
        console.log('   Migration belum dijalankan.')
        console.log('   Jalankan migration: supabase/migrations/20260131_create_sak_financial_tables.sql')
      } else if (error.code === '42501') {
        console.log('\n💡 DIAGNOSIS: Permission denied (RLS)')
        console.log('   Tabel ada tapi RLS memblokir insert tanpa authentication.')
        console.log('   Ini expected behavior untuk anon key.')
      } else if (error.code === '23505') {
        console.log('\n💡 DIAGNOSIS: Unique violation')
        console.log('   Item dengan kode TEST-001 sudah ada. Tabel ada dan berfungsi.')
      } else if (error.code === '23502') {
        console.log('\n💡 DIAGNOSIS: Not null violation')
        console.log('   Tabel ada tapi ada kolom required yang tidak diisi.')
      } else if (error.code === '42883') {
        console.log('\n💡 DIAGNOSIS: Function does not exist')
        console.log('   Mungkin trigger function atau function lain belum dibuat.')
      } else if (error.message.includes('cannot execute INSERT in a read-only transaction')) {
        console.log('\n💡 DIAGNOSIS: Read-only transaction error')
        console.log('   Anon key tidak memiliki izin INSERT karena RLS atau policy.')
        console.log('   Tabel mungkin ada, tapi perlu authenticated user dengan role finance.')
      } else {
        console.log('\n💡 DIAGNOSIS: Unknown error - tabel mungkin ada tapi ada masalah lain.')
      }
    } else {
      console.log('✅ INSERT SUCCESS!')
      console.log('   Tabel master_price_list ada dan bisa diakses.')
      console.log(`   Inserted ID: ${data.id}`)
      
      // Cleanup: delete test data
      const { error: deleteError } = await supabase
        .from('master_price_list')
        .delete()
        .eq('id', data.id)

      if (deleteError) {
        console.log('⚠️  Warning: Failed to cleanup test data:', deleteError.message)
      } else {
        console.log('✅ Test data cleaned up successfully.')
      }
    }

    console.log('')

    // Coba query untuk melihat apakah ada data
    console.log('🔍 Checking existing data in master_price_list...')
    const { data: existingData, error: queryError } = await supabase
      .from('master_price_list')
      .select('id, item_code, item_name, unit_price, is_active')
      .limit(5)

    if (queryError) {
      console.log('❌ Query failed:', queryError.message)
    } else {
      console.log(`✅ Found ${existingData.length} existing items:`)
      existingData.forEach(item => {
        console.log(`   - ${item.item_code}: ${item.item_name} (Rp ${item.unit_price})`)
      })
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testInsert().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})