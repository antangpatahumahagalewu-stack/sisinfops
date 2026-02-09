import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    const allowedRoles = ["admin", "carbon_specialist", "program_planner", "program_implementer"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (projectId) {
      // Get integrated status for specific project
      const { data: workflowData, error: workflowError } = await supabase
        .from("v_carbon_workflow_dashboard")
        .select("*")
        .eq("project_id", projectId)
        .single()

      if (workflowError) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }

      // Get module status details
      const { data: moduleStatuses } = await supabase
        .from("carbon_workflow_status")
        .select("*")
        .eq("carbon_project_id", projectId)
        .order("module_name")

      // Get financial integration data
      const { data: financialData } = await supabase
        .from("v_carbon_financial_integration")
        .select("*")
        .eq("project_id", projectId)
        .single()

      return NextResponse.json({
        success: true,
        data: {
          project: workflowData,
          modules: moduleStatuses || [],
          financial: financialData || null,
          last_updated: new Date().toISOString()
        }
      })
    } else {
      // Get all projects workflow status
      const { data: allProjects } = await supabase
        .from("v_carbon_workflow_dashboard")
        .select("*")
        .order("last_update", { ascending: false })

      return NextResponse.json({
        success: true,
        data: {
          projects: allProjects || [],
          summary: {
            total_projects: allProjects?.length || 0,
            active_projects: allProjects?.filter(p => p.overall_status !== 'completed' && p.overall_status !== 'archived').length || 0,
            completed_projects: allProjects?.filter(p => p.overall_status === 'completed').length || 0
          },
          last_updated: new Date().toISOString()
        }
      })
    }
  } catch (error: any) {
    console.error("Error in carbon workflow status API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    const allowedRoles = ["admin", "carbon_specialist", "program_planner"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { projectId, moduleName, moduleStatus, moduleData } = body

    if (!projectId || !moduleName || !moduleStatus) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, moduleName, moduleStatus" },
        { status: 400 }
      )
    }

    // Validate module name
    const validModules = ['program', 'dram', 'due_diligence', 'verra_registration', 'vvb_management', 'carbon_credits', 'investor_dashboard']
    if (!validModules.includes(moduleName)) {
      return NextResponse.json(
        { error: "Invalid module name" },
        { status: 400 }
      )
    }

    // Update or insert workflow status
    const { data, error } = await supabase
      .from("carbon_workflow_status")
      .upsert({
        carbon_project_id: projectId,
        module_name: moduleName,
        module_status: moduleStatus,
        module_data: moduleData || {},
        updated_by: session.user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'carbon_project_id,module_name'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger automatic status sync
    try {
      await supabase.rpc('update_carbon_project_workflow_status', {
        p_project_id: projectId
      })
    } catch (err: any) {
      console.warn("Failed to trigger automatic status sync:", err.message)
    }

    return NextResponse.json({
      success: true,
      message: "Workflow status updated successfully",
      data
    })
  } catch (error: any) {
    console.error("Error in carbon workflow update API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}