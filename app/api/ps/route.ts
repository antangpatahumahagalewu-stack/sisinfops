import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema validation based on database schema and template
const psCreateSchema = z.object({
  kabupaten_id: z.string()
    .min(1, "Kabupaten wajib dipilih")
    .uuid("ID kabupaten tidak valid"),
  skema: z.enum(["HD", "HTR", "HKM", "HA", "IUPHHK", "IUPHKm"]),
  pemegang_izin: z.string().min(1, "Nama pemegang izin wajib diisi"),
  desa: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  nomor_sk: z.string().optional().nullable(),
  tanggal_sk: z.string().optional().nullable(),
  masa_berlaku: z.string().optional().nullable(),
  tanggal_berakhir_izin: z.string().optional().nullable(),
  nomor_pks: z.string().optional().nullable(),
  luas_ha: z.number().min(0, "Luas harus >= 0").optional(),
  jenis_hutan: z.string().optional(),
  status_kawasan: z.string().optional().nullable(),
  rkps_status: z.enum(["ada", "belum"]).default("belum"),
  peta_status: z.enum(["ada", "belum"]).default("belum"),
  keterangan: z.string().optional().nullable(),
  fasilitator: z.string().optional().nullable(),
  jumlah_kk: z.number().int().min(0, "Jumlah KK harus >= 0").optional(),
  nama_kabupaten: z.string().optional(), // for lookup fallback, if needed
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

    // Only admin and monev can create
    if (!profile || !["admin", "monev"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and monev can create data" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = psCreateSchema.safeParse(body);
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

    // If kabupaten_id is not provided, try to find by nama_kabupaten
    let kabupatenId = data.kabupaten_id;
    if (!kabupatenId && body.nama_kabupaten) {
      const { data: kabupaten } = await supabase
        .from("kabupaten")
        .select("id")
        .ilike("nama", `%${body.nama_kabupaten}%`)
        .single();
      
      if (kabupaten) {
        kabupatenId = kabupaten.id;
      }
    }

    // Prepare insert data
    const insertData: any = {
      skema: data.skema,
      pemegang_izin: data.pemegang_izin,
      desa: data.desa || null,
      kecamatan: data.kecamatan || null,
      nomor_sk: data.nomor_sk || null,
      tanggal_sk: data.tanggal_sk ? new Date(data.tanggal_sk).toISOString() : null,
      masa_berlaku: data.masa_berlaku || null,
      tanggal_berakhir_izin: data.tanggal_berakhir_izin ? new Date(data.tanggal_berakhir_izin).toISOString() : null,
      nomor_pks: data.nomor_pks || null,
      luas_ha: data.luas_ha || null,
      jenis_hutan: data.jenis_hutan || null,
      status_kawasan: data.status_kawasan || null,
      rkps_status: data.rkps_status,
      peta_status: data.peta_status,
      keterangan: data.keterangan || null,
      fasilitator: data.fasilitator || null,
      jumlah_kk: data.jumlah_kk || null,
    };

    if (kabupatenId) {
      insertData.kabupaten_id = kabupatenId;
    }

    // Insert into database
    const { data: newPs, error } = await supabase
      .from("perhutanan_sosial")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create data", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Data berhasil ditambahkan", 
        data: newPs,
        id: newPs.id 
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

export async function GET(request: NextRequest) {
  // Optional: Implement GET for listing or testing
  return NextResponse.json(
    { message: "Use POST to create new PS data" },
    { status: 200 }
  );
}
