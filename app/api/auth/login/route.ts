import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password diperlukan" },
        { status: 400 }
      )
    }

    // Create server-side Supabase client (no CORS issues)
    const supabase = await createClient()

    console.log('🔧 Server-side login attempt for:', email.substring(0, 10) + '...')
    
    // Use server-side auth (no CORS issues)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('📊 Server-side login response:', { 
      hasError: !!error, 
      hasData: !!data,
      errorMessage: error?.message 
    })

    if (error) {
      // Map Supabase auth errors to user-friendly messages
      let errorMessage = "Terjadi kesalahan. Silakan coba lagi."
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Email atau password salah."
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Email belum dikonfirmasi. Periksa inbox email Anda."
      } else if (error.message?.includes('User not found')) {
        errorMessage = "Pengguna tidak ditemukan."
      } else {
        errorMessage = error.message || "Terjadi kesalahan. Silakan coba lagi."
      }

      return NextResponse.json(
        { error: errorMessage, details: error.message },
        { status: 401 }
      )
    }

    console.log('✅ Server-side login successful for user:', data.user?.id)
    
    // Return session data (tokens will be set in cookies by Supabase)
    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: data.session,
    })
  } catch (err: any) {
    console.error('❌ Unexpected server-side login error:', err)
    
    return NextResponse.json(
      { 
        error: "Terjadi kesalahan server. Silakan coba lagi.",
        details: err.message 
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}