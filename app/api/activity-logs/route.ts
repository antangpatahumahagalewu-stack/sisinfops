import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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
    
    const userId = searchParams.get('userId')
    const activityType = searchParams.get('activityType')
    const resourceType = searchParams.get('resourceType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')
    
    // Build query
    let query = supabase
      .from('activity_log')
      .select(`
        *,
        profiles:user_id (
          full_name,
          role
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }
    
    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      // Add one day to include the end date
      const endDateObj = new Date(endDate)
      endDateObj.setDate(endDateObj.getDate() + 1)
      query = query.lt('created_at', endDateObj.toISOString())
    }
    
    if (search) {
      query = query.or(`details->>'endpoint'.ilike.%${search}%,details->>'message'.ilike.%${search}%`)
    }
    
    const { data: activities, error, count } = await query
    
    if (error) {
      console.error('Error fetching activity logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Transform data to include user info
    const transformedData = activities?.map(activity => ({
      ...activity,
      user_name: activity.profiles?.full_name || 'Unknown',
      user_role: activity.user_role || activity.profiles?.role || 'unknown'
    })) || []
    
    return NextResponse.json({
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Unexpected error in activity logs API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Optional: POST endpoint for manual activity logging (e.g., from client-side)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    const { activity_type, resource_type, resource_id, details } = body
    if (!activity_type) {
      return NextResponse.json({ error: "activity_type is required" }, { status: 400 })
    }
    
    // Get IP address from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Call the database function to log activity
    const { data, error } = await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_activity_type: activity_type,
      p_resource_type: resource_type || null,
      p_resource_id: resource_id || null,
      p_details: details || {},
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    })
    
    if (error) {
      console.error('Error logging activity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      log_id: data,
      message: 'Activity logged successfully' 
    })
    
  } catch (error) {
    console.error('Unexpected error in activity log POST:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}