import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for linking program and aksi mitigasi
const programAksiMitigasiSchema = z.object({
  program_id: z.string().uuid("Program ID harus UUID"),
  aksi_mitigasi_id: z.number().int("Aksi mitigasi ID harus integer"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user profile for role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    // Only admin and program_planner can create program-aksi mitigasi links
    if (!profile || !["admin", "program_planner"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and program planner can link aksi mitigasi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = programAksiMitigasiSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if program exists and user has access
    const { data: program, error: programError } = await supabase
      .from("programs")
      .select("id, created_by")
      .eq("id", data.program_id)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { error: "Program tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if aksi mitigasi exists
    const { data: aksiMitigasi, error: aksiError } = await supabase
      .from("master_aksi_mitigasi")
      .select("id")
      .eq("id", data.aksi_mitigasi_id)
      .single();

    if (aksiError || !aksiMitigasi) {
      return NextResponse.json(
        { error: "Aksi mitigasi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from("program_aksi_mitigasi")
      .select("id")
      .eq("program_id", data.program_id)
      .eq("aksi_mitigasi_id", data.aksi_mitigasi_id)
      .single();

    if (existingLink) {
      return NextResponse.json(
        { error: "Aksi mitigasi sudah terhubung dengan program ini" },
        { status: 409 }
      );
    }

    // Insert link
    const { data: newLink, error: insertError } = await supabase
      .from("program_aksi_mitigasi")
      .insert({
        program_id: data.program_id,
        aksi_mitigasi_id: data.aksi_mitigasi_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json(
        { error: "Failed to link aksi mitigasi", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Aksi mitigasi berhasil dihubungkan dengan program", 
        data: newLink 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}