import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageCarbonProjects } from "@/lib/auth/rbac";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const canManage = await canManageCarbonProjects();
    
    if (!canManage) {
      return NextResponse.json(
        { 
          error: "Forbidden",
          message: "You don't have permission to manage carbon projects",
          status: 403
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['kode_project', 'nama_project', 'status'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: "Validation error",
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields,
          status: 400
        },
        { status: 400 }
      );
    }
    
    // Prepare data for insertion - map frontend fields to database columns
    const projectData = {
      kode_project: body.kode_project,
      nama_project: body.nama_project,
      project_code: body.kode_project, // Also populate new schema columns
      project_name: body.nama_project,
      status: body.status,
      validation_status: body.status,
      standard: body.standar_karbon || body.standard || 'VCS',
      methodology: body.metodologi || body.methodology || 'VM0007',
      project_type: body.project_type || 'REDD+',
      estimated_credits: body.estimated_credits || 0,
      project_description: body.project_description || '',
      // For missing columns expected by frontend, we'll store as metadata
      ps_id: body.ps_id || null,
      crediting_period_start: body.crediting_period_start || null,
      crediting_period_end: body.crediting_period_end || null
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('carbon_projects')
      .insert([projectData])
      .select()
      .single();
    
    if (error) {
      console.error("Error creating carbon project:", error);
      return NextResponse.json(
        { 
          error: "Database error",
          message: "Failed to create carbon project",
          details: error.message,
          status: 500
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: "Carbon project created successfully",
        status: 201,
        data: data
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/carbon-projects:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Error processing request",
        status: 500
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') || 'created_at';
    const orderDirection = searchParams.get('orderDirection') || 'desc';
    
    // Build query
    let query = supabase
      .from('carbon_projects')
      .select('*');
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`kode_project.ilike.%${search}%,nama_project.ilike.%${search}%,project_name.ilike.%${search}%`);
    }
    
    // Apply sorting and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error("Error fetching carbon projects:", error);
      return NextResponse.json(
        { 
          error: "Database error",
          message: "Failed to fetch carbon projects",
          details: error.message,
          status: 500
        },
        { status: 500 }
      );
    }
    
    // Transform data to match frontend expectations
    const transformedData = data?.map(project => ({
      id: project.id,
      kode_project: project.kode_project || project.project_code,
      nama_project: project.nama_project || project.project_name,
      status: project.status || project.validation_status || 'draft',
      // Map columns for frontend - use available data
      standar_karbon: project.standard || project.standar_karbon || 'VCS',
      metodologi: project.methodology || project.metodologi || 'VM0007',
      // For missing columns, provide defaults or calculate
      luas_total_ha: 0, // Placeholder - would need to calculate from PS data
      tanggal_mulai: project.crediting_period_start || null,
      // Include other useful data
      project_type: project.project_type,
      estimated_credits: project.estimated_credits,
      issued_credits: project.issued_credits,
      verification_status: project.verification_status,
      project_description: project.project_description,
      created_at: project.created_at,
      updated_at: project.updated_at
    })) || [];
    
    return NextResponse.json(
      { 
        message: "Carbon projects fetched successfully",
        status: 200,
        data: transformedData,
        pagination: {
          total: count || transformedData.length,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/carbon-projects:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Error fetching data",
        status: 500
      },
      { status: 500 }
    );
  }
}
