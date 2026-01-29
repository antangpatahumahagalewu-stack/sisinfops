import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { psCreateSchema } from "../route"; // kita akan import skema dari file induk

// Schema untuk update (semua field optional kecuali id)
const psUpdateSchema = psCreateSchema.partial();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    // Only admin and monev can update
    if (!profile || !["admin", "monev"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and monev can update data" },
        { status: 403 }
      );
    }

    // Check if record exists
    const { data: existingData, error: fetchError } = await supabase
      .from("perhutanan_sosial")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: "Data not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Validate input (partial validation - semua field optional)
    const validationResult = psUpdateSchema.safeParse(body);
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

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are provided
    if (data.kabupaten_id !== undefined) updateData.kabupaten_id = data.kabupaten_id;
    if (data.skema !== undefined) updateData.skema = data.skema;
    if (data.pemegang_izin !== undefined) updateData.pemegang_izin = data.pemegang_izin;
    if (data.desa !== undefined) updateData.desa = data.desa;
    if (data.kecamatan !== undefined) updateData.kecamatan = data.kecamatan;
    if (data.nomor_sk !== undefined) updateData.nomor_sk = data.nomor_sk;
    if (data.tanggal_sk !== undefined) updateData.tanggal_sk = data.tanggal_sk ? new Date(data.tanggal_sk).toISOString() : null;
    if (data.masa_berlaku !== undefined) updateData.masa_berlaku = data.masa_berlaku;
    if (data.tanggal_berakhir_izin !== undefined) updateData.tanggal_berakhir_izin = data.tanggal_berakhir_izin ? new Date(data.tanggal_berakhir_izin).toISOString() : null;
    if (data.nomor_pks !== undefined) updateData.nomor_pks = data.nomor_pks;
    if (data.luas_ha !== undefined) updateData.luas_ha = data.luas_ha;
    if (data.jenis_hutan !== undefined) updateData.jenis_hutan = data.jenis_hutan;
    if (data.status_kawasan !== undefined) updateData.status_kawasan = data.status_kawasan;
    if (data.rkps_status !== undefined) updateData.rkps_status = data.rkps_status;
    if (data.peta_status !== undefined) updateData.peta_status = data.peta_status;
    if (data.keterangan !== undefined) updateData.keterangan = data.keterangan;
    if (data.fasilitator !== undefined) updateData.fasilitator = data.fasilitator;
    if (data.jumlah_kk !== undefined) updateData.jumlah_kk = data.jumlah_kk;
    if (data.ketua_ps !== undefined) updateData.ketua_ps = data.ketua_ps;
    if (data.kepala_desa !== undefined) updateData.kepala_desa = data.kepala_desa;

    // Update in database
    const { data: updatedPs, error } = await supabase
      .from("perhutanan_sosial")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update data", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Data berhasil diperbarui", 
        data: updatedPs
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    // Only admin can delete
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden: Only admin can delete data" },
        { status: 403 }
      );
    }

    // Check if record exists
    const { data: existingData, error: fetchError } = await supabase
      .from("perhutanan_sosial")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: "Data not found" },
        { status: 404 }
      );
    }

    // Delete from database
    const { error } = await supabase
      .from("perhutanan_sosial")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to delete data", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Data berhasil dihapus",
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication (optional, bisa juga public)
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get data by ID
    const { data: psData, error } = await supabase
      .from("perhutanan_sosial")
      .select(`
        *,
        kabupaten:kabupaten_id (
          id,
          nama
        )
      `)
      .eq("id", id)
      .single();

    if (error || !psData) {
      return NextResponse.json(
        { error: "Data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        data: psData
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
