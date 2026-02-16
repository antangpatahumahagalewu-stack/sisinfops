// Script untuk mengecek apakah SQL function sudah ada
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkFunctions() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Environment variables missing')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 Checking database functions...')

  try {
    // Cek apakah function create_user_with_profile ada
    const { data: func1, error: err1 } = await supabase.rpc('create_user_with_profile', {
      p_email: 'test-check@example.com',
      p_password: 'password123',
      p_full_name: 'Test Check',
      p_role: 'viewer'
    }).then(
      (result) => ({ data: result.data, error: result.error }),
      (error) => ({ data: null, error })
    )

    if (err1) {
      console.log('❌ Function create_user_with_profile not found or error:', err1.message)
      
      // Coba function simple
      const { data: func2, error: err2 } = await supabase.rpc('create_simple_user', {
        p_email: 'test-check@example.com',
        p_password: 'password123'
      }).then(
        (result) => ({ data: result.data, error: result.error }),
        (error) => ({ data: null, error })
      )
      
      if (err2) {
        console.log('❌ Function create_simple_user also not found:', err2.message)
        console.log('\n📋 RECOMMENDATION: Run the SQL function creation script:')
        console.log('1. Open Supabase Dashboard → SQL Editor')
        console.log('2. Copy content from scripts/ensure_user_function.sql')
        console.log('3. Run the SQL')
      } else {
        console.log('✅ Function create_simple_user exists (returns:', func2, ')')
      }
    } else {
      console.log('✅ Function create_user_with_profile exists (returns:', func1, ')')
    }

    // Cek profiles table dan auth.users permissions
    console.log('\n🔍 Checking table permissions...')
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single()
    
    if (profilesError) {
      console.log('❌ Cannot access profiles table:', profilesError.message)
    } else {
      console.log('✅ Can access profiles table')
    }

    // Cek apakah user sudah login sebagai admin
    console.log('\n🔍 Checking admin permissions...')
    
    // Coba get current user via admin API
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    })
    
    if (usersError) {
      console.log('❌ Cannot list users (admin permission issue):', usersError.message)
    } else {
      console.log(`✅ Can list users (found ${users?.users?.length || 0} users)`)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkFunctions().then(() => {
  console.log('\n🎉 Check completed')
  console.log('\n📋 NEXT STEPS:')
  console.log('1. If functions not found, run scripts/ensure_user_function.sql in Supabase SQL Editor')
  console.log('2. If permission errors, check service role key permissions')
  console.log('3. Test manually in Supabase Dashboard → Auth → Users → Add User')
})