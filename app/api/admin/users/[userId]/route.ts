import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

// GET: Get user by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
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
    
    // Get user profile with auth info
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (userError) {
      console.error('Error fetching user profile:', userError)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }
    
    // Create admin client for auth.admin operations
    const adminClient = await createAdminClient()
    
    // Get auth user info using admin API
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId)
    
    if (authError) {
      console.error('Error fetching auth user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        full_name: userProfile.full_name,
        role: userProfile.role,
        email: authUser.user?.email || 'No email',
        last_sign_in_at: authUser.user?.last_sign_in_at,
        created_at: authUser.user?.created_at,
        confirmed_at: authUser.user?.confirmed_at,
        banned_until: authUser.user?.banned_until,
        is_active: !authUser.user?.banned_until,
        profile_created_at: userProfile.created_at,
        profile_updated_at: userProfile.updated_at
      }
    })
    
  } catch (error) {
    console.error('Unexpected error in user detail API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// PUT: Update user (including role change - promote/demote)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
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
    const { full_name, role, email, password, is_active } = body
    
    // Check if role is valid (from the 13 roles defined in the system)
    if (role) {
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
    }
    
    // Create admin client for auth.admin operations
    const adminClient = await createAdminClient()
    
    // Update auth user if email, password, or is_active provided
    if (email || password || is_active !== undefined) {
      const updateData: any = {}
      if (email) updateData.email = email
      if (password) updateData.password = password
      if (is_active !== undefined) {
        updateData.ban_duration = is_active ? null : 'none' // 'none' means permanent ban
      }
      
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        userId,
        updateData
      )
      
      if (authUpdateError) {
        console.error('Error updating auth user:', authUpdateError)
        return NextResponse.json({ error: authUpdateError.message }, { status: 500 })
      }
    }
    
    // Update profile
    const profileUpdateData: any = {}
    if (full_name) profileUpdateData.full_name = full_name
    if (role) profileUpdateData.role = role
    
    if (Object.keys(profileUpdateData).length > 0) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', userId)
      
      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError)
        return NextResponse.json({ error: profileUpdateError.message }, { status: 500 })
      }
    }
    
    // Get updated user data
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      console.error('Error fetching updated profile:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: updatedProfile.id,
        full_name: updatedProfile.full_name,
        role: updatedProfile.role,
        email: authUser.user?.email || 'No email',
        is_active: !authUser.user?.banned_until,
        profile_updated_at: updatedProfile.updated_at
      },
      message: 'User updated successfully' 
    })
    
  } catch (error) {
    console.error('Unexpected error in user update API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE: Delete user
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
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
    
    // Prevent self-deletion
    if (userId === currentUser.id) {
      return NextResponse.json({ 
        error: "Cannot delete your own account" 
      }, { status: 400 })
    }
    
    // Create admin client for auth.admin operations
    const adminClient = await createAdminClient()
    
    // Delete user from auth (this will cascade to profile due to foreign key)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully' 
    })
    
  } catch (error) {
    console.error('Unexpected error in user deletion API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}