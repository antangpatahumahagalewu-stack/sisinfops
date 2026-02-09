#!/usr/bin/env node

/**
 * Script untuk memverifikasi update harga di tabel price_list
 * Cek apakah harga MAT-001 sudah berubah dari 15,000 menjadi 5,000
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase configuration in .env.local')
  console.error('   Perlu NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPriceList() {
  console.log('🔍 Memeriksa update harga di tabel price_list...')
  console.log('=====================================================\n')

  try {
    // Cari item dengan kode MAT-001
    const { data: items, error } = await supabase
      .from('price_list')
      .select('*')
      .eq('item_code', 'MAT-001')

    if (error) {
      console.error('❌ Error fetching data:', error.message)
      return false
    }

    if (!items || items.length === 0) {
      console.error('❌ Item dengan kode MAT-001 tidak ditemukan')
      return false
    }

    const item = items[0]
    
    console.log('📋 DETAIL ITEM MAT-001:')
    console.log('   ID:', item.id)
    console.log('   Kode:', item.item_code)
    console.log('   Nama:', item.item_name)
    console.log('   Harga saat ini:', new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: item.currency || 'IDR'
    }).format(item.unit_price))
    console.log('   Kategori:', item.category || item.item_category || 'N/A')
    console.log('   Satuan:', item.unit)
    console.log('   Versi:', item.version || 1)
    console.log('   Aktif:', item.is_active ? '✅ Ya' : '❌ Tidak')
    console.log('   Dibuat:', new Date(item.created_at).toLocaleString('id-ID'))
    
    if (item.updated_at) {
      console.log('   Diperbarui:', new Date(item.updated_at).toLocaleString('id-ID'))
    }

    console.log('\n🔍 VERIFIKASI HARGA:')
    const expectedPrice = 5000
    const currentPrice = item.unit_price
    
    if (currentPrice === expectedPrice) {
      console.log(`   ✅ Harga sudah benar: ${formatCurrency(currentPrice)}`)
      console.log('   🎉 Update berhasil! Database sudah mencerminkan perubahan.')
    } else if (currentPrice === 15000) {
      console.log(`   ❌ Harga masih lama: ${formatCurrency(currentPrice)}`)
      console.log(`   ⚠️  Seharusnya: ${formatCurrency(expectedPrice)}`)
      console.log('   🔧 Update belum berhasil. Kemungkinan masalah:')
      console.log('      1. Frontend tidak mengirim update ke database')
      console.log('      2. Ada error di fungsi update')
      console.log('      3. Row Level Security (RLS) memblokir update')
    } else {
      console.log(`   ⚠️  Harga tidak sesuai: ${formatCurrency(currentPrice)}`)
      console.log(`      Diharapkan: ${formatCurrency(expectedPrice)}`)
    }

    // Cek semua item untuk comparison
    console.log('\n📊 SEMUA ITEM DI price_list:')
    const { data: allItems, error: allError } = await supabase
      .from('price_list')
      .select('item_code, item_name, unit_price, category, unit')
      .order('item_code')

    if (!allError && allItems) {
      console.log(`   Total ${allItems.length} item ditemukan:`)
      allItems.forEach((it, index) => {
        console.log(`   ${index + 1}. ${it.item_code} - ${it.item_name}: ${formatCurrency(it.unit_price)} (${it.category}, ${it.unit})`)
      })
    }

    // Cek apakah ada kolom yang missing
    console.log('\n🔍 STRUKTUR TABEL:')
    console.log('   Columns yang ada di item pertama:')
    Object.keys(item).forEach(key => {
      console.log(`     • ${key}: ${item[key] !== null ? item[key] : 'NULL'}`)
    })

    return currentPrice === expectedPrice

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

async function main() {
  console.log('🚀 VERIFIKASI UPDATE HARGA PRICE LIST')
  console.log('=====================================================')
  console.log('Target: Ubah harga MAT-001 dari 15,000 menjadi 5,000')
  console.log('=====================================================\n')

  const success = await checkPriceList()
  
  if (success) {
    console.log('\n🎉 VERIFIKASI BERHASIL!')
    console.log('   Harga MAT-001 sudah berhasil diupdate di database.')
    console.log('\n📋 Next steps:')
    console.log('   1. Refresh halaman price list di browser')
    console.log('   2. Pastikan tampilan frontend menunjukkan harga baru')
    console.log('   3. Test CRUD operations lainnya')
    process.exit(0)
  } else {
    console.log('\n❌ VERIFIKASI GAGAL')
    console.log('   Harga belum berubah di database.')
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Cek console log browser untuk error')
    console.log('   2. Verifikasi fungsi handleSubmit di price-list-client.tsx')
    console.log('   3. Cek RLS policies di Supabase')
    console.log('   4. Test langsung update via Supabase dashboard')
    process.exit(1)
  }
}

// Handle promise
main().catch(error => {
  console.error('❌ Script execution failed:', error)
  process.exit(1)
})
