import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { full_name, phone, location, bio } = body

    // Validate input
    if (!full_name || full_name.trim() === "") {
      return NextResponse.json({ error: "Nama lengkap diperlukan" }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      full_name: full_name.trim(),
      updated_at: new Date().toISOString()
    }

    // Optional fields
    if (phone !== undefined) updateData.phone = phone
    if (location !== undefined) updateData.location = location
    if (bio !== undefined) updateData.bio = bio

    // Update profile in database
    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()

    if (error) {
      console.error("Error updating profile:", error)
      return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: data?.[0]
    })

  } catch (error) {
    console.error("Error in profile update API:", error)
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request)
}
