import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/rbac";

// Schema for program approval
const programApproveSchema = z.object({
  review_notes: z.string().optional().nullable(),
  status: z.enum(["approved", "rejected", "needs_revision"])
    .default("approved"),
});

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

    // Check if user has permission to approve programs
    const canApprove = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canApprove) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk menyetujui program" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = programApproveSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

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

    // Validate program status - must be 'submitted_for_review' or 'under_review'
    const allowedStatuses = ['submitted_for_review', 'under_review', 'needs_revision'];
    if (!allowedStatuses.includes(existingProgram.status)) {
      return NextResponse.json(
        { 
          error: `Program tidak dapat disetujui. Status saat ini: ${existingProgram.status}. 
                  Program harus dalam status 'submitted_for_review', 'under_review', atau 'needs_revision'` 
        },
        { status: 400 }
      );
    }

    // Determine new status based on action
    let newStatus = data.status;
    if (data.status === "needs_revision") {
      newStatus = "needs_revision";
    } else if (data.status === "rejected") {
      newStatus = "rejected";
    } else {
      newStatus = "approved";
    }

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    };

    if (data.review_notes) {
      updateData.review_notes = data.review_notes;
    }

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
        { error: "Gagal memperbarui status program", details: updateError.message },
        { status: 500 }
      );
    }

    // Create notification for program creator
    if (existingProgram.created_by) {
      const notificationData = {
        user_id: existingProgram.created_by,
        type: data.status === 'approved' ? 'program_approved' : 
              data.status === 'rejected' ? 'program_rejected' : 'revision_requested',
        title: data.status === 'approved' ? 'Program Disetujui' : 
               data.status === 'rejected' ? 'Program Ditolak' : 'Revisi Diperlukan',
        message: data.status === 'approved' 
          ? `Program "${existingProgram.nama_program}" telah disetujui oleh Finance Team.`
          : data.status === 'rejected'
          ? `Program "${existingProgram.nama_program}" ditolak oleh Finance Team.`
          : `Program "${existingProgram.nama_program}" memerlukan revisi dari tim program.`,
        data: {
          program_id: id,
          program_name: existingProgram.nama_program,
          reviewer_id: session.user.id,
          status: newStatus,
          review_notes: data.review_notes || null,
          timestamp: new Date().toISOString(),
        },
      };

      await supabase
        .from("notifications")
        .insert(notificationData);
    }

    return NextResponse.json(
      { 
        message: data.status === 'approved' 
          ? "Program berhasil disetujui" 
          : data.status === 'rejected'
          ? "Program berhasil ditolak"
          : "Permintaan revisi berhasil dikirim",
        data: updatedProgram,
        notification_sent: existingProgram.created_by ? true : false,
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