import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";

export async function POST(
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

    // Check if user has permission to manage programs (program planner or admin)
    const canManagePrograms = await hasPermission("PROGRAM_MANAGEMENT", session.user.id);
    if (!canManagePrograms) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengirim program untuk review" },
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
        { error: "Program tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validate program status - must be 'draft' or 'needs_revision'
    if (existingProgram.status !== 'draft' && existingProgram.status !== 'needs_revision') {
      return NextResponse.json(
        { 
          error: `Program tidak dapat dikirim untuk review. Status saat ini: ${existingProgram.status}. 
                  Program harus dalam status 'draft' atau 'needs_revision' untuk dikirim review.` 
        },
        { status: 400 }
      );
    }

    // Check if program has required fields
    const requiredFields = ['nama_program', 'jenis_program', 'perhutanan_sosial_id'];
    const missingFields = requiredFields.filter(field => !existingProgram[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: `Program belum lengkap. Field yang harus diisi: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // If KARBON program, check kategori_hutan
    if (existingProgram.jenis_program === 'KARBON' && !existingProgram.kategori_hutan) {
      return NextResponse.json(
        { error: "Program KARBON harus memiliki kategori hutan (MINERAL atau GAMBUT)" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status: 'submitted_for_review',
      submitted_at: new Date().toISOString(),
      submitted_by: session.user.id,
    };

    // Update program status
    const { data: updatedProgram, error: updateError } = await supabase
      .from("programs")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        carbon_projects(kode_project, nama_project),
        perhutanan_sosial(pemegang_izin, desa),
        profiles:created_by (full_name, role)
      `)
      .single();

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: "Gagal mengirim program untuk review", details: updateError.message },
        { status: 500 }
      );
    }

    // Create notifications for finance approvers
    // Get all finance approvers (finance_manager, finance_approver roles)
    const { data: financeUsers } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ['finance_manager', 'finance_approver']);

    if (financeUsers && financeUsers.length > 0) {
      const notifications = financeUsers.map(user => ({
        user_id: user.id,
        type: 'program_submitted',
        title: 'Program Baru Perlu Review',
        message: `Program "${existingProgram.nama_program}" telah dikirim untuk review oleh ${session.user.email}.`,
        data: {
          program_id: id,
          program_name: existingProgram.nama_program,
          submitted_by: session.user.id,
          submitted_by_email: session.user.email,
          timestamp: new Date().toISOString(),
        },
      }));

      await supabase
        .from("notifications")
        .insert(notifications);
    }

    return NextResponse.json(
      { 
        message: "Program berhasil dikirim untuk review",
        data: updatedProgram,
        notifications_sent: financeUsers?.length || 0,
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