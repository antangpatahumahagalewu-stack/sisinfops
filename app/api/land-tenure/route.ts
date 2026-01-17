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

    if (id) {
      // Get single land tenure record
      const { data, error } = await supabase
        .from("land_tenure")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else if (perhutanan_sosial_id) {
      // Get land tenure by perhutanan_sosial_id
      const { data, error } = await supabase
        .from("land_tenure")
        .select("*")
        .eq("perhutanan_sosial_id", perhutanan_sosial_id)
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
      // Get all land tenure records (with pagination for safety)
      const { data, error } = await supabase
        .from("land_tenure")
        .select("*, perhutanan_sosial(pemegang_izin, desa, kecamatan)")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Land tenure GET error:", error)
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

    // Check if perhutanan_sosial exists
    const { data: psExists } = await supabase
      .from("perhutanan_sosial")
      .select("id")
      .eq("id", body.perhutanan_sosial_id)
      .single()

    if (!psExists) {
      return NextResponse.json({ error: "Perhutanan Sosial not found" }, { status: 404 })
    }

    // Check if land tenure already exists for this PS
    const { data: existing } = await supabase
      .from("land_tenure")
      .select("id")
      .eq("perhutanan_sosial_id", body.perhutanan_sosial_id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: "Land tenure record already exists for this Perhutanan Sosial. Use PUT to update.",
        existing_id: existing.id 
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("land_tenure")
      .insert({
        perhutanan_sosial_id: body.perhutanan_sosial_id,
        ownership_status: body.ownership_status,
        land_certificate_number: body.land_certificate_number,
        certificate_date: body.certificate_date,
        area_ha: body.area_ha,
        challenges: body.challenges,
        government_involvement: body.government_involvement,
        ministry_engagement: body.ministry_engagement,
        conflict_history: body.conflict_history,
        resolution_status: body.resolution_status,
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
    console.error("Land tenure POST error:", error)
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
      return NextResponse.json({ error: "Land tenure ID is required" }, { status: 400 })
    }

    // Check if land tenure exists
    const { data: existing } = await supabase
      .from("land_tenure")
      .select("id, perhutanan_sosial_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Land tenure record not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("land_tenure")
      .update({
        ownership_status: body.ownership_status,
        land_certificate_number: body.land_certificate_number,
        certificate_date: body.certificate_date,
        area_ha: body.area_ha,
        challenges: body.challenges,
        government_involvement: body.government_involvement,
        ministry_engagement: body.ministry_engagement,
        conflict_history: body.conflict_history,
        resolution_status: body.resolution_status,
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
    console.error("Land tenure PUT error:", error)
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
      return NextResponse.json({ error: "Land tenure ID is required" }, { status: 400 })
    }

    // Check if land tenure exists
    const { data: existing } = await supabase
      .from("land_tenure")
      .select("id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Land tenure record not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("land_tenure")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Land tenure record deleted" })
  } catch (error) {
    console.error("Land tenure DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
