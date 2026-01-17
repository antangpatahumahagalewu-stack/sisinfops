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

    // Check user role - allow admin and program_planner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "program_planner")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const carbon_project_id = searchParams.get("carbon_project_id")
    const year = searchParams.get("year")

    if (id) {
      // Get single timeline entry
      const { data, error } = await supabase
        .from("implementation_timeline")
        .select("*, carbon_projects(kode_project, nama_project)")
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else if (carbon_project_id) {
      // Get timeline entries by carbon project
      let query = supabase
        .from("implementation_timeline")
        .select("*, carbon_projects(kode_project, nama_project)")
        .eq("carbon_project_id", carbon_project_id)
        .order("year", { ascending: true })

      if (year) {
        query = query.eq("year", parseInt(year))
      }

      const { data, error } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all timeline entries (with pagination)
      const { data, error } = await supabase
        .from("implementation_timeline")
        .select("*, carbon_projects(kode_project, nama_project)")
        .order("carbon_project_id", { ascending: true })
        .order("year", { ascending: true })
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Implementation timeline GET error:", error)
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

    // Check user role - allow admin and program_planner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "program_planner")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.carbon_project_id) {
      return NextResponse.json({ error: "Carbon Project ID is required" }, { status: 400 })
    }
    if (!body.year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 })
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

    // Check if timeline entry already exists for this project and year
    const { data: existing } = await supabase
      .from("implementation_timeline")
      .select("id")
      .eq("carbon_project_id", body.carbon_project_id)
      .eq("year", body.year)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: "Timeline entry already exists for this project and year. Use PUT to update.",
        existing_id: existing.id 
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("implementation_timeline")
      .insert({
        carbon_project_id: body.carbon_project_id,
        year: body.year,
        target_area_ha: body.target_area_ha,
        activities: body.activities,
        phase: body.phase,
        carbon_credit_period: body.carbon_credit_period || false,
        implementation_period: body.implementation_period || false,
        verification_frequency: body.verification_frequency,
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
    console.error("Implementation timeline POST error:", error)
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

    // Check user role - allow admin and program_planner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "program_planner")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Timeline entry ID is required" }, { status: 400 })
    }

    // Check if timeline entry exists
    const { data: existing } = await supabase
      .from("implementation_timeline")
      .select("id, carbon_project_id, year")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Timeline entry not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("implementation_timeline")
      .update({
        target_area_ha: body.target_area_ha,
        activities: body.activities,
        phase: body.phase,
        carbon_credit_period: body.carbon_credit_period,
        implementation_period: body.implementation_period,
        verification_frequency: body.verification_frequency,
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
    console.error("Implementation timeline PUT error:", error)
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
      return NextResponse.json({ error: "Timeline entry ID is required" }, { status: 400 })
    }

    // Check if timeline entry exists
    const { data: existing } = await supabase
      .from("implementation_timeline")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Timeline entry not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("implementation_timeline")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Timeline entry deleted" })
  } catch (error) {
    console.error("Implementation timeline DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
