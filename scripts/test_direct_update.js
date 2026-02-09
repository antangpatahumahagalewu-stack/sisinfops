#!/usr/bin/env node

/**
 * Script untuk test update harga langsung ke Supabase
 * Mengabaikan RLS dengan menggunakan service role key jika diperlukan
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase configuration in .env.local')
  console.error('   Perlu NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Gunakan service role key jika ada, jika tidak gunakan anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey)

async function testDirectUpdate() {
  console.log('🔧 TEST UPDATE LANGSUNG KE DATABASE')
  console.log('=====================================================\n')
  
  console.log('📊 Informasi koneksi:')
  console.log('   URL:', supabaseUrl)
  console.log('   Menggunakan kunci:', supabaseServiceKey ? 'Service Role (RLS bypass)' : 'Anon Key')
  
  try {
    // 1. Cek data sebelum update
    console.log('\n🔍 1. Data sebelum update:')
    const { data: beforeData, error: fetchError } = await supabase
      .from('price_list')
      .select('*')
      .eq('item_code', 'MAT-001')
      .single()

    if (fetchError) {
      console.error('❌ Gagal fetch data:', fetchError.message)
      console.error('   Error details:', fetchError)
      
      // Coba cek apakah tabel ada
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%price%')
      
      console.log('   Tabel yang tersedia dengan "price":', tables?.map(t => t.table_name))
      return false
    }

    if (!beforeData) {
      console.error('❌ Item MAT-001 tidak ditemukan')
      return false
    }

    console.log('   ID:', beforeData.id)
    console.log('   Harga saat ini:', beforeData.unit_price)
    console.log('   Kategori:', beforeData.category)
    console.log('   Dibuat:', new Date(beforeData.created_at).toLocaleString('id-ID'))

    // 2. Lakukan update langsung
    console.log('\n🔄 2. Melakukan update harga dari 15000 → 5000...')
    
    const { data: updateData, error: updateError } = await supabase
      .from('price_list')
      .update({
        unit_price: 5000,
        updated_at: new Date().toISOString()
      })
      .eq('id', beforeData.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Gagal update:', updateError.message)
      console.error('   Error code:', updateError.code)
      console.error('   Error details:', updateError)
      
      // Coba cek RLS policies
      console.log('\n🔍 Cek masalah RLS:')
      console.log('   Jika error mengandung "new row violates row-level security policy",')
      console.log('   berarti RLS memblokir update.')
      
      // Coba dengan raw SQL jika perlu
      console.log('\n⚠️  Mencoba bypass RLS dengan raw SQL via REST API...')
      return false
    }

    console.log('✅ Update berhasil!')
    console.log('   Data setelah update:', updateData)

    // 3. Verifikasi update
    console.log('\n✅ 3. Verifikasi update:')
    const { data: afterData, error: afterError } = await supabase
      .from('price_list')
      .select('*')
      .eq('item_code', 'MAT-001')
      .single()

    if (afterError) {
      console.error('❌ Gagal verifikasi:', afterError.message)
      return false
    }

    console.log('   Harga setelah update:', afterData.unit_price)
    console.log('   Berhasil diupdate:', afterData.unit_price === 5000 ? '✅ Ya' : '❌ Tidak')

    // 4. Test frontend bisa baca data yang sama
    console.log('\n🔍 4. Test fetch all items:')
    const { data: allItems, error: allError } = await supabase
      .from('price_list')
      .select('item_code, unit_price')
      .order('item_code')

    if (allError) {
      console.error('❌ Gagal fetch semua items:', allError.message)
    } else {
      console.log(`   Total ${allItems?.length || 0} items ditemukan:`)
      allItems?.forEach(item => {
        console.log(`   • ${item.item_code}: ${item.unit_price}`)
      })
    }

    return afterData.unit_price === 5000

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function checkRlsPolicies() {
  console.log('\n🔍 CEK RLS POLICIES:')
  console.log('=====================================================\n')
  
  try {
    // Coba cek apakah ada RLS yang aktif
    const { data: policies, error } = await supabase.rpc('get_rls_policies', { 
      table_name: 'price_list' 
    }).catch(() => ({ data: null, error: 'RPC not available' }))

    if (error) {
      console.log('   Tidak bisa cek RLS policies secara langsung')
      console.log('   (RPC function get_rls_policies mungkin tidak ada)')
    } else {
      console.log('   RLS Policies untuk price_list:', policies)
    }

    // Coba cek metadata
    const { data: tableInfo } = await supabase
      .from('information_schema.tables')
      .select('table_name, is_insertable_into')
      .eq('table_schema', 'public')
      .eq('table_name', 'price_list')
      .single()
    
    if (tableInfo) {
      console.log('\n📋 Informasi tabel:')
      console.log('   Table:', tableInfo.table_name)
      console.log('   Insertable:', tableInfo.is_insertable_into)
    }

  } catch (error) {
    console.log('   Gagal cek RLS:', error.message)
  }
}

async function main() {
  console.log('🚀 TEST UPDATE LANGSUNG KE SUPABASE')
  console.log('=====================================================')
  console.log('Mengabaikan RLS untuk test update harga')
  console.log('=====================================================\n')

  // Cek RLS terlebih dahulu
  await checkRlsPolicies()

  const success = await testDirectUpdate()
  
  if (success) {
    console.log('\n🎉 TEST BERHASIL!')
    console.log('   Harga MAT-001 berhasil diupdate ke 5.000')
    console.log('\n📋 Next steps:')
    console.log('   1. Refresh halaman Master Price List di browser')
    console.log('   2. Cek apakah frontend menampilkan harga baru')
    console.log('   3. Test update melalui UI')
    process.exit(0)
  } else {
    console.log('\n❌ TEST GAGAL')
    console.log('   Update langsung ke database gagal.')
    console.log('\n🔧 Kemungkinan penyelesaian:')
    console.log('   1. Nonaktifkan RLS untuk tabel price_list di Supabase dashboard:')
    console.log('      - Buka Supabase → Authentication → Policies')
    console.log('      - Nonaktifkan semua policies untuk tabel price_list')
    console.log('   2. Atau tambahkan policy yang mengizinkan CRUD untuk semua user')
    console.log('   3. Pastikan Service Role Key ada di .env.local jika ingin bypass RLS')
    process.exit(1)
  }
}

// Handle promise
main().catch(error => {
  console.error('❌ Script execution failed:', error)
  process.exit(1)
})
