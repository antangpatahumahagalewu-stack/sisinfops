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
    const model_type = searchParams.get("model_type")

    let query = supabase
      .from("carbon_model_details")
      .select("*, carbon_projects(kode_project, nama_project)")

    if (id) {
      // Get single carbon model detail
      const { data, error } = await query
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else if (carbon_project_id) {
      // Get carbon model details by carbon project
      if (model_type) {
        query = query.eq("carbon_project_id", carbon_project_id).eq("model_type", model_type)
      } else {
        query = query.eq("carbon_project_id", carbon_project_id)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all carbon model details (with pagination)
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Carbon model details GET error:", error)
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
    if (!body.model_type) {
      return NextResponse.json({ error: "Model type is required" }, { status: 400 })
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

    // Check if carbon model detail already exists for this project and type
    const { data: existing } = await supabase
      .from("carbon_model_details")
      .select("id")
      .eq("carbon_project_id", body.carbon_project_id)
      .eq("model_type", body.model_type)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: "Carbon model detail already exists for this project and type. Use PUT to update.",
        existing_id: existing.id 
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("carbon_model_details")
      .insert({
        carbon_project_id: body.carbon_project_id,
        model_type: body.model_type,
        planting_density_per_ha: body.planting_density_per_ha,
        species_composition: body.species_composition || {},
        number_of_seedlings: body.number_of_seedlings,
        tree_functions: body.tree_functions || [],
        mortality_rate: body.mortality_rate,
        planting_challenges: body.planting_challenges,
        historical_deforestation_analysis: body.historical_deforestation_analysis,
        satellite_data_used: body.satellite_data_used,
        baseline_scenario: body.baseline_scenario,
        forest_protection_experience: body.forest_protection_experience,
        current_practices: body.current_practices,
        improved_practices: body.improved_practices,
        carbon_benefits_agriculture: body.carbon_benefits_agriculture,
        farmer_benefits: body.farmer_benefits,
        general_notes: body.general_notes,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Carbon model details POST error:", error)
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
      return NextResponse.json({ error: "Carbon model detail ID is required" }, { status: 400 })
    }

    // Check if carbon model detail exists
    const { data: existing } = await supabase
      .from("carbon_model_details")
      .select("id, carbon_project_id, model_type")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Carbon model detail not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("carbon_model_details")
      .update({
        planting_density_per_ha: body.planting_density_per_ha,
        species_composition: body.species_composition,
        number_of_seedlings: body.number_of_seedlings,
        tree_functions: body.tree_functions,
        mortality_rate: body.mortality_rate,
        planting_challenges: body.planting_challenges,
        historical_deforestation_analysis: body.historical_deforestation_analysis,
        satellite_data_used: body.satellite_data_used,
        baseline_scenario: body.baseline_scenario,
        forest_protection_experience: body.forest_protection_experience,
        current_practices: body.current_practices,
        improved_practices: body.improved_practices,
        carbon_benefits_agriculture: body.carbon_benefits_agriculture,
        farmer_benefits: body.farmer_benefits,
        general_notes: body.general_notes,
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
    console.error("Carbon model details PUT error:", error)
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
      return NextResponse.json({ error: "Carbon model detail ID is required" }, { status: 400 })
    }

    // Check if carbon model detail exists
    const { data: existing } = await supabase
      .from("carbon_model_details")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Carbon model detail not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("carbon_model_details")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Carbon model detail deleted" })
  } catch (error) {
    console.error("Carbon model details DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
