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
    const { currentPassword, newPassword, confirmPassword } = body

    // Validate input
    if (!currentPassword || currentPassword.trim() === "") {
      return NextResponse.json({ error: "Password saat ini diperlukan" }, { status: 400 })
    }

    if (!newPassword || newPassword.trim() === "") {
      return NextResponse.json({ error: "Password baru diperlukan" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Konfirmasi password tidak cocok" }, { status: 400 })
    }

    // Verify current password by attempting to reauthenticate
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json({ error: "Gagal mengubah password" }, { status: 500 })
    }

    // Log activity (optional - bisa ditambahkan ke tabel activity_logs)
    // ...

    return NextResponse.json({
      success: true,
      message: "Password berhasil diubah"
    })

  } catch (error) {
    console.error("Error in change password API:", error)
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return PUT(request)
}