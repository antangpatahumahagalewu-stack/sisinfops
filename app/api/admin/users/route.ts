import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// GET: List all users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    
    if (profileError || !profile) {
      console.error("Failed to fetch user profile:", profileError)
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
    
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const status = searchParams.get('status') // active, inactive, etc.
    
    // Build query for profiles (without auth.users join due to Supabase limitations)
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (role) {
      query = query.eq('role', role)
    }
    
    if (search) {
      query = query.or(`full_name.ilike.%${search}%`)
    }
    
    const { data: profiles, error, count } = await query
    
    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Create admin client for auth.admin operations
    const adminClient = await createAdminClient()
    
    // For each profile, get auth user info using admin API
    const usersWithAuthInfo = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profile.id)
          
          if (authError) {
            console.error(`Error fetching auth user for ${profile.id}:`, authError)
            return {
              id: profile.id,
              full_name: profile.full_name,
              role: profile.role,
              email: 'Error fetching email',
              is_active: true,
              profile_created_at: profile.created_at,
              profile_updated_at: profile.updated_at
            }
          }
          
          return {
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role,
            email: authUser.user?.email || 'No email',
            last_sign_in_at: authUser.user?.last_sign_in_at,
            created_at: authUser.user?.created_at,
            confirmed_at: authUser.user?.confirmed_at,
            banned_until: authUser.user?.banned_until,
            is_active: !authUser.user?.banned_until,
            profile_created_at: profile.created_at,
            profile_updated_at: profile.updated_at
          }
        } catch (error) {
          console.error(`Error processing user ${profile.id}:`, error)
          return {
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role,
            email: 'Error',
            is_active: true,
            profile_created_at: profile.created_at,
            profile_updated_at: profile.updated_at
          }
        }
      })
    )
    
    // Apply status filter in memory if needed
    let filteredData = usersWithAuthInfo
    if (status === 'active') {
      filteredData = usersWithAuthInfo.filter(user => user.is_active)
    } else if (status === 'inactive') {
      filteredData = usersWithAuthInfo.filter(user => !user.is_active)
    }
    
    let filteredCount = count || 0
    if (status && (status === 'active' || status === 'inactive')) {
      filteredCount = filteredData.length
    }
    
    return NextResponse.json({
      data: filteredData,
      pagination: {
        page,
        limit,
        total: filteredCount || 0,
        totalPages: Math.ceil((filteredCount || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Unexpected error in users API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST: Create a new user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Get current user profile to check role
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single()
    
    if (profileError || !currentProfile) {
      console.error("Failed to fetch user profile:", profileError)
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
    
    if (currentProfile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    const { email, password, full_name, role } = body
    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ 
        error: "Missing required fields: email, password, full_name, role" 
      }, { status: 400 })
    }
    
    // Check if role is valid (from the 13 roles defined in the system)
    const validRoles = [
      'admin', 'monev', 'viewer', 
      'program_planner', 'program_implementer', 
      'carbon_specialist', 'monev_officer',
      'finance_manager', 'finance_operational', 'finance_project_carbon',
      'finance_project_implementation', 'finance_project_social', 'investor'
    ]
    
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: "Invalid role. Must be one of: " + validRoles.join(', ') 
      }, { status: 400 })
    }
    
    // WORKAROUND: Use regular signUp since admin.createUser is failing with "Database error"
    // This approach creates the user through regular auth flow then updates their role
    console.log('🔄 Using workaround: regular signUp + role update for:', { email, full_name, role })
    
    try {
      // First, check if user already exists by trying to sign in
      console.log('🔍 Checking if user already exists...')
      const { data: { user: existingUser } } = await supabase.auth.signInWithPassword({
        email,
        password: 'temporary_password_for_check' // Will fail if user doesn't exist
      }).catch(() => ({ data: { user: null }, error: null }))
      
      // If signInWithPassword succeeds, user exists
      if (existingUser) {
        return NextResponse.json({ 
          error: 'User already exists',
          details: `Email ${email} is already registered`
        }, { status: 400 })
      }
      
      // Create user using regular signUp (requires email confirmation)
      console.log('🔧 Creating user via signUp...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
        }
      })
      
      if (authError) {
        console.error('❌ Error in signUp:', authError)
        
        // Provide helpful error messages
        let userFriendlyError = authError.message
        let suggestions: string[] = []
        
        if (authError.message.includes('User already registered')) {
          userFriendlyError = 'Email already exists in the system'
          suggestions = ['Use a different email address']
        } else if (authError.message.includes('Password')) {
          userFriendlyError = 'Password does not meet requirements'
          suggestions = ['Use a stronger password (min 6 characters, mix of letters and numbers)']
        } else if (authError.message.includes('rate limit')) {
          userFriendlyError = 'Rate limit exceeded. Please try again later.'
          suggestions = ['Wait a few minutes before trying again']
        }
        
        return NextResponse.json({ 
          error: userFriendlyError,
          details: authError.message,
          suggestions,
          originalError: {
            name: authError.name,
            status: authError.status
          }
        }, { status: 500 })
      }
      
      const newUser = authData.user
      
      if (!newUser) {
        console.error('❌ No user returned from signUp:', authData)
        return NextResponse.json({ 
          error: 'User creation failed',
          details: 'No user object returned from authentication service'
        }, { status: 500 })
      }
      
      console.log('✅ User created via signUp:', newUser.id)
      
      // Create profile with the specified role
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.id,
          full_name: full_name,
          role: role
        })
      
      if (profileInsertError) {
        console.error('❌ Error creating profile:', profileInsertError)
        
        // Try to delete the auth user (need admin client for this)
        try {
          const adminClient = await createAdminClient()
          await adminClient.auth.admin.deleteUser(newUser.id)
          console.log('🧹 Rollback: deleted auth user')
        } catch (deleteError) {
          console.error('⚠️ Failed to rollback auth user:', deleteError)
        }
        
        return NextResponse.json({ 
          error: 'Failed to create user profile',
          details: profileInsertError.message 
        }, { status: 500 })
      }
      
      console.log('✅ Profile created with role:', role)
      
      // Auto-confirm email for admin-created users using admin client
      try {
        const adminClient = await createAdminClient()
        await adminClient.auth.admin.updateUserById(newUser.id, {
          email_confirm: true
        })
        console.log('✅ Email auto-confirmed for admin-created user')
      } catch (confirmError) {
        console.warn('⚠️ Could not auto-confirm email (admin client may still have issues):', confirmError)
        // Continue anyway - user can confirm via email
      }
      
      return NextResponse.json({ 
        success: true, 
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name,
          role,
          needsEmailConfirmation: !newUser.email_confirmed_at
        },
        message: newUser.email_confirmed_at 
          ? 'User created successfully with confirmed email' 
          : 'User created successfully. Email confirmation may be required.'
      }, { status: 201 })
      
    } catch (error: any) {
      console.error('❌ Unexpected error in createUser workaround:', error)
      return NextResponse.json({ 
        error: 'Unexpected error creating user',
        details: error.message,
        stack: error.stack
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Unexpected error in user creation API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
