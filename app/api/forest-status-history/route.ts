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
    const year = searchParams.get("year")

    if (id) {
      // Get single forest status history record
      const { data, error } = await supabase
        .from("forest_status_history")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else if (perhutanan_sosial_id) {
      // Get forest status history by perhutanan_sosial_id
      let query = supabase
        .from("forest_status_history")
        .select("*")
        .eq("perhutanan_sosial_id", perhutanan_sosial_id)

      if (year) {
        query = query.eq("year", year)
      }

      const { data, error } = await query.order("year", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all forest status history records (with pagination)
      const { data, error } = await supabase
        .from("forest_status_history")
        .select("*, perhutanan_sosial(pemegang_izin, desa, kecamatan)")
        .order("year", { ascending: false })
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Forest status history GET error:", error)
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
    if (!body.year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 })
    }
    if (!body.forest_status) {
      return NextResponse.json({ error: "Forest status is required" }, { status: 400 })
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

    // Check if forest status history already exists for this PS and year
    const { data: existing } = await supabase
      .from("forest_status_history")
      .select("id")
      .eq("perhutanan_sosial_id", body.perhutanan_sosial_id)
      .eq("year", body.year)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: "Forest status history already exists for this Perhutanan Sosial and year. Use PUT to update.",
        existing_id: existing.id 
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("forest_status_history")
      .insert({
        perhutanan_sosial_id: body.perhutanan_sosial_id,
        year: body.year,
        forest_status: body.forest_status,
        definition_used: body.definition_used || "UNFCCC_DNA",
        area_ha: body.area_ha,
        data_source: body.data_source,
        verification_method: body.verification_method,
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
    console.error("Forest status history POST error:", error)
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
      return NextResponse.json({ error: "Forest status history ID is required" }, { status: 400 })
    }

    // Check if forest status history exists
    const { data: existing } = await supabase
      .from("forest_status_history")
      .select("id, perhutanan_sosial_id, year")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Forest status history record not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("forest_status_history")
      .update({
        forest_status: body.forest_status,
        definition_used: body.definition_used,
        area_ha: body.area_ha,
        data_source: body.data_source,
        verification_method: body.verification_method,
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
    console.error("Forest status history PUT error:", error)
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
      return NextResponse.json({ error: "Forest status history ID is required" }, { status: 400 })
    }

    // Check if forest status history exists
    const { data: existing } = await supabase
      .from("forest_status_history")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Forest status history record not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("forest_status_history")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Forest status history record deleted" })
  } catch (error) {
    console.error("Forest status history DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
