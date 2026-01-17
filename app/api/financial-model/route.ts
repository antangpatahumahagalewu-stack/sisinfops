import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - allow admin and carbon_specialist
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "carbon_specialist")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const carbon_project_id = searchParams.get("carbon_project_id")

    if (id) {
      // Get single financial model
      const { data, error } = await supabase
        .from("financial_model")
        .select("*, carbon_projects(kode_project, nama_project)")
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else if (carbon_project_id) {
      // Get financial model by carbon project
      const { data, error } = await supabase
        .from("financial_model")
        .select("*, carbon_projects(kode_project, nama_project)")
        .eq("carbon_project_id", carbon_project_id)
        .single()

      if (error) {
        // Return empty object if not found
        if (error.code === 'PGRST116') {
          return NextResponse.json({})
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all financial models (with pagination)
      const { data, error } = await supabase
        .from("financial_model")
        .select("*, carbon_projects(kode_project, nama_project)")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Financial model GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - allow admin and carbon_specialist
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "carbon_specialist")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.carbon_project_id) {
      return NextResponse.json({ error: "Carbon Project ID is required" }, { status: 400 })
    }

    // Check if carbon project exists
    const { data: projectExists } = await supabase
      .from("carbon_projects")
      .select("id")
      .eq("id", body.carbon_project_id)
      .single()

    if (!projectExists) {
      return NextResponse.json({ error: "Carbon Project not found" }, { status: 404 })
    }

    // Check if financial model already exists for this project
    const { data: existing } = await supabase
      .from("financial_model")
      .select("id")
      .eq("carbon_project_id", body.carbon_project_id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: "Financial model already exists for this Carbon Project. Use PUT to update.",
        existing_id: existing.id 
      }, { status: 409 })
    }

    // Calculate total if not provided
    const total_cost = body.total_project_cost || 
      (Number(body.planting_protection_cost_per_ha) || 0) +
      (Number(body.management_human_resource_cost) || 0) +
      (Number(body.community_livelihood_cost) || 0) +
      (Number(body.carbon_costs_mrv_validation) || 0) +
      (Number(body.carbon_costs_registry) || 0)

    const { data, error } = await supabase
      .from("financial_model")
      .insert({
        carbon_project_id: body.carbon_project_id,
        planting_protection_cost_per_ha: body.planting_protection_cost_per_ha,
        management_human_resource_cost: body.management_human_resource_cost,
        community_livelihood_cost: body.community_livelihood_cost,
        carbon_costs_mrv_validation: body.carbon_costs_mrv_validation,
        carbon_costs_registry: body.carbon_costs_registry,
        total_project_cost: total_cost,
        funding_sources: body.funding_sources,
        financing_plan: body.financing_plan,
        investor_partners: body.investor_partners,
        cost_breakdown: body.cost_breakdown || {},
        currency: body.currency || 'IDR',
        notes: body.notes,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Financial model POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - allow admin and carbon_specialist
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "carbon_specialist")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Financial model ID is required" }, { status: 400 })
    }

    // Check if financial model exists
    const { data: existing } = await supabase
      .from("financial_model")
      .select("id, carbon_project_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Financial model not found" }, { status: 404 })
    }

    // Calculate total if not provided
    const total_cost = body.total_project_cost || 
      (Number(body.planting_protection_cost_per_ha) || 0) +
      (Number(body.management_human_resource_cost) || 0) +
      (Number(body.community_livelihood_cost) || 0) +
      (Number(body.carbon_costs_mrv_validation) || 0) +
      (Number(body.carbon_costs_registry) || 0)

    const { data, error } = await supabase
      .from("financial_model")
      .update({
        planting_protection_cost_per_ha: body.planting_protection_cost_per_ha,
        management_human_resource_cost: body.management_human_resource_cost,
        community_livelihood_cost: body.community_livelihood_cost,
        carbon_costs_mrv_validation: body.carbon_costs_mrv_validation,
        carbon_costs_registry: body.carbon_costs_registry,
        total_project_cost: total_cost,
        funding_sources: body.funding_sources,
        financing_plan: body.financing_plan,
        investor_partners: body.investor_partners,
        cost_breakdown: body.cost_breakdown,
        currency: body.currency,
        notes: body.notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Financial model PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - allow admin only for delete
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Financial model ID is required" }, { status: 400 })
    }

    // Check if financial model exists
    const { data: existing } = await supabase
      .from("financial_model")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Financial model not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("financial_model")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Financial model deleted" })
  } catch (error) {
    console.error("Financial model DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
