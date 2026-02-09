import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

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

    // Only admin can delete programs
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden: Only admin can delete programs" },
        { status: 403 }
      );
    }

    // Check if program exists
    const { data: existingProgram, error: fetchError } = await supabase
      .from("programs")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingProgram) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // First, delete related records in program_aksi_mitigasi
    const { error: deleteAksiError } = await supabase
      .from("program_aksi_mitigasi")
      .delete()
      .eq("program_id", id);

    if (deleteAksiError) {
      console.error("Error deleting related aksi mitigasi:", deleteAksiError);
      // Continue anyway, but log the error
    }

    // Delete program from database
    const { error } = await supabase
      .from("programs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to delete program", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Program berhasil dihapus",
        deletedId: id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get program by ID with related data
    const { data: programData, error } = await supabase
      .from("programs")
      .select(`
        *,
        carbon_projects:kode_project,nama_project,
        perhutanan_sosial:pemegang_izin,desa,
        program_aksi_mitigasi (
          master_aksi_mitigasi:kode,nama_aksi,kelompok,deskripsi
        )
      `)
      .eq("id", id)
      .single();

    if (error || !programData) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        data: programData
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

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

    // Only admin and program_planner can update programs
    if (!profile || !["admin", "program_planner"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and program planner can update programs" },
        { status: 403 }
      );
    }

    // Check if program exists
    const { data: existingProgram, error: fetchError } = await supabase
      .from("programs")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingProgram) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Basic validation
    if (body.kode_program && body.kode_program !== existingProgram.kode_program) {
      // Check if new kode_program already exists
      const { data: existingWithSameCode } = await supabase
        .from("programs")
        .select("id")
        .eq("kode_program", body.kode_program)
        .neq("id", id)
        .single();

      if (existingWithSameCode) {
        return NextResponse.json(
          { error: `Kode program '${body.kode_program}' sudah digunakan` },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    // Update fields if provided
    const fields = [
      "kode_program", "nama_program", "jenis_program", "kategori_hutan",
      "tujuan", "lokasi_spesifik", "target", "risiko",
      "carbon_project_id", "perhutanan_sosial_id", "status",
      "logical_framework"
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Update program in database
    const { data: updatedProgram, error } = await supabase
      .from("programs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update program", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Program berhasil diperbarui", 
        data: updatedProgram
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}