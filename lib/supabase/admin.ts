import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client with service role privileges for admin operations
 * This client can perform operations that require admin permissions, such as:
 * - supabase.auth.admin.getUserById()
 * - supabase.auth.admin.createUser()
 * - supabase.auth.admin.updateUserById()
 * - supabase.auth.admin.deleteUser()
 * - supabase.auth.admin.listUsers()
 * 
 * IMPORTANT: This client should ONLY be used in server components and API routes
 * where admin privileges are explicitly required, and only after verifying
 * that the current user has the 'admin' role.
 */
export const createAdminClient = async () => {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase admin environment variables:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
    throw new Error(
      'Missing Supabase admin environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  console.log('🔧 Supabase Admin Client Configuration:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyPresent: !!supabaseServiceKey,
    keyLength: supabaseServiceKey?.length || 0
  })

  try {
    const client = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })
    console.log('✅ Supabase admin client created successfully')
    return client
  } catch (error: any) {
    console.error('❌ Failed to create Supabase admin client:', error)
    throw new Error(`Failed to initialize Supabase admin client: ${error.message}`)
  }
}

/**
 * Helper function to check if a user is admin and then create admin client
 * This combines both steps: verify admin role + get admin client
 */
export async function getAdminClientForUser(userId: string) {
  // First, create a regular client to check permissions
  const { createClient } = await import('./server')
  const supabase = await createClient()
  
  // Get user profile to check role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()
  
  if (profileError || !profile) {
    console.error("Failed to fetch user profile:", profileError)
    throw new Error("Failed to verify admin permissions")
  }
  
  if (profile.role !== 'admin') {
    throw new Error("Forbidden: Admin access required")
  }
  
  // User is admin, create admin client
  return await createAdminClient()
}