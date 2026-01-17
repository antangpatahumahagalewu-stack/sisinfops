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
    const perhutanan_sosial_id = searchParams.get("perhutanan_sosial_id")
    const driver_type = searchParams.get("driver_type")

    if (id) {
      // Get single deforestation driver record
      const { data, error } = await supabase
        .from("deforestation_drivers")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else if (perhutanan_sosial_id) {
      // Get deforestation drivers by perhutanan_sosial_id
      let query = supabase
        .from("deforestation_drivers")
        .select("*")
        .eq("perhutanan_sosial_id", perhutanan_sosial_id)

      if (driver_type) {
        query = query.eq("driver_type", driver_type)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all deforestation driver records (with pagination)
      const { data, error } = await supabase
        .from("deforestation_drivers")
        .select("*, perhutanan_sosial(pemegang_izin, desa, kecamatan)")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Deforestation drivers GET error:", error)
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
    if (!body.perhutanan_sosial_id) {
      return NextResponse.json({ error: "Perhutanan Sosial ID is required" }, { status: 400 })
    }
    if (!body.driver_type) {
      return NextResponse.json({ error: "Driver type is required" }, { status: 400 })
    }
    if (!body.driver_description) {
      return NextResponse.json({ error: "Driver description is required" }, { status: 400 })
    }
    if (!body.intervention_activity) {
      return NextResponse.json({ error: "Intervention activity is required" }, { status: 400 })
    }

    // Check if perhutanan_sosial exists
    const { data: psExists } = await supabase
      .from("perhutanan_sosial")
      .select("id")
      .eq("id", body.perhutanan_sosial_id)
      .single()

    if (!psExists) {
      return NextResponse.json({ error: "Perhutanan Sosial not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("deforestation_drivers")
      .insert({
        perhutanan_sosial_id: body.perhutanan_sosial_id,
        driver_type: body.driver_type,
        driver_description: body.driver_description,
        historical_trend: body.historical_trend,
        intervention_activity: body.intervention_activity,
        intervention_rationale: body.intervention_rationale,
        expected_impact: body.expected_impact,
        data_source: body.data_source,
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
    console.error("Deforestation drivers POST error:", error)
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
      return NextResponse.json({ error: "Deforestation driver ID is required" }, { status: 400 })
    }

    // Check if deforestation driver exists
    const { data: existing } = await supabase
      .from("deforestation_drivers")
      .select("id, perhutanan_sosial_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Deforestation driver record not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("deforestation_drivers")
      .update({
        driver_type: body.driver_type,
        driver_description: body.driver_description,
        historical_trend: body.historical_trend,
        intervention_activity: body.intervention_activity,
        intervention_rationale: body.intervention_rationale,
        expected_impact: body.expected_impact,
        data_source: body.data_source,
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
    console.error("Deforestation drivers PUT error:", error)
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
      return NextResponse.json({ error: "Deforestation driver ID is required" }, { status: 400 })
    }

    // Check if deforestation driver exists
    const { data: existing } = await supabase
      .from("deforestation_drivers")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Deforestation driver record not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("deforestation_drivers")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Deforestation driver record deleted" })
  } catch (error) {
    console.error("Deforestation drivers DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
