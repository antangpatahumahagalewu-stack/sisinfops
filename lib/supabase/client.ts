import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    })
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  console.log('🔧 Supabase Client Configuration:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyPresent: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0
  })

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
    console.log('✅ Supabase client created successfully')
    return client
  } catch (error: any) {
    console.error('❌ Failed to create Supabase client:', error)
    throw new Error(`Failed to initialize Supabase client: ${error.message}`)
  }
}
