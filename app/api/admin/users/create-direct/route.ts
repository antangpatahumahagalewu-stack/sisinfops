import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// POST: Create a new user using direct SQL approach
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
    
    // Check if role is valid
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
    
    console.log('🔄 Attempting direct SQL user creation for:', { email, full_name, role })
    
    try {
      // First, check if user already exists
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', email) // Check by email (profiles.id is UUID, but we'll do another check)
        .limit(1)
      
      // Also check auth.users via admin client
      const adminClient = await createAdminClient()
      const { data: authUsers } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 100
      })
      
      const emailExists = authUsers?.users?.some((user: any) => user.email === email)
      
      if (emailExists) {
        return NextResponse.json({ 
          error: 'User already exists',
          details: `Email ${email} is already registered`
        }, { status: 400 })
      }
      
      console.log('🔧 No existing user found, proceeding with SQL creation')
      
      // OPTION 1: Try to use the SIMPLE SQL function (NEW APPROACH)
      console.log('🔧 Attempting to call create_user_direct SQL function...')
      
      try {
        const { data: sqlResult, error: sqlError } = await supabase.rpc('create_user_direct', {
          p_email: email,
          p_password: password,
          p_full_name: full_name,
          p_role: role
        })
        
        if (!sqlError && sqlResult) {
          console.log('✅ User created via SQL function:', sqlResult)
          
          // Verify user was created
          const { data: newUser } = await adminClient.auth.admin.getUserById(sqlResult)
          
          return NextResponse.json({ 
            success: true, 
            user: {
              id: sqlResult,
              email,
              full_name,
              role
            },
            message: 'User created successfully via SQL function',
            method: 'sql_function_direct'
          }, { status: 201 })
        }
        
        console.log('⚠️ SQL function not available or failed:', sqlError?.message || 'Unknown error')
        
        // Check if function doesn't exist
        if (sqlError?.message?.includes('Could not find the function') || 
            sqlError?.message?.includes('function public.create_user_direct') ||
            sqlError?.message?.includes('function public.create_user_with_profile')) {
          console.log('❌ SQL function does not exist in database')
          
          return NextResponse.json({ 
            error: 'SQL function not configured',
            details: 'The create_user_direct function does not exist in the database.',
            instructions: [
              '🚨 ACTION REQUIRED:',
              '1. Open: https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql',
              '2. Copy ALL content from: scripts/simple_user_function.sql',
              '3. Paste into SQL Editor and click "Run"',
              '4. Wait for confirmation message',
              '5. Try creating user again'
            ],
            sqlScriptPath: 'scripts/simple_user_function.sql',
            sqlScriptUrl: 'https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql'
          }, { status: 500 })
        }
      } catch (rpcError: any) {
        console.error('❌ RPC call failed:', rpcError)
      }
      
      // OPTION 2: Fallback - Use regular Supabase Auth API (with workarounds)
      console.log('🔄 Falling back to Supabase Auth API with workaround...')
      
      // Try signUp as fallback
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
        }
      })
      
      if (authError) {
        console.error('❌ Error in signUp fallback:', authError)
        
        let userFriendlyError = authError.message
        if (authError.message.includes('User already registered')) {
          userFriendlyError = 'Email already exists in the system'
        } else if (authError.message.includes('Password')) {
          userFriendlyError = 'Password does not meet requirements'
        }
        
        return NextResponse.json({ 
          error: userFriendlyError,
          details: authError.message,
          originalError: {
            name: authError.name,
            status: authError.status
          }
        }, { status: 500 })
      }
      
      const newUser = authData.user
      
      if (!newUser) {
        console.error('❌ No user returned from signUp')
        return NextResponse.json({ 
          error: 'User creation failed - no user returned',
          details: 'Authentication service did not return a user object'
        }, { status: 500 })
      }
      
      console.log('✅ User created via signUp fallback:', newUser.id)
      
      // Create profile
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.id,
          full_name: full_name,
          role: role
        })
      
      if (profileInsertError) {
        console.error('❌ Error creating profile:', profileInsertError)
        
        // Try to rollback
        try {
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
      
      // Auto-confirm email
      try {
        await adminClient.auth.admin.updateUserById(newUser.id, {
          email_confirm: true
        })
        console.log('✅ Email auto-confirmed')
      } catch (confirmError) {
        console.warn('⚠️ Could not auto-confirm email:', confirmError)
      }
      
      return NextResponse.json({ 
        success: true, 
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name,
          role
        },
        message: 'User created successfully via fallback method',
        method: 'signup_fallback'
      }, { status: 201 })
      
    } catch (error: any) {
      console.error('❌ Unexpected error in direct user creation:', error)
      return NextResponse.json({ 
        error: 'Unexpected error creating user',
        details: error.message,
        stack: error.stack
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Unexpected error in direct user creation API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}