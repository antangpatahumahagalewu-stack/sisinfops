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

    if (id) {
      // Get single organization
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all organizations
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Organizations GET error:", error)
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
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: body.name,
        legal_form: body.legal_form,
        history: body.history,
        mission: body.mission,
        technical_experience: body.technical_experience,
        working_areas: body.working_areas || [],
        partners: body.partners,
        years_of_operation: body.years_of_operation,
        number_of_staff: body.number_of_staff,
        annual_budget: body.annual_budget,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Organizations POST error:", error)
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
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Check if organization exists
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("organizations")
      .update({
        name: body.name,
        legal_form: body.legal_form,
        history: body.history,
        mission: body.mission,
        technical_experience: body.technical_experience,
        working_areas: body.working_areas,
        partners: body.partners,
        years_of_operation: body.years_of_operation,
        number_of_staff: body.number_of_staff,
        annual_budget: body.annual_budget,
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
    console.error("Organizations PUT error:", error)
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
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Check if organization exists
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Organization deleted" })
  } catch (error) {
    console.error("Organizations DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
