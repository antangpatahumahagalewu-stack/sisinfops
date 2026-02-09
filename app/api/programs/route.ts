import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema validation based on programs table
const programCreateSchema = z.object({
  kode_program: z.string()
    .min(1, "Kode program wajib diisi")
    .max(50, "Kode program maksimal 50 karakter")
    .regex(/^[A-Za-z0-9-_]+$/, "Kode program hanya boleh berisi huruf, angka, dash, dan underscore"),
  nama_program: z.string()
    .min(1, "Nama program wajib diisi")
    .max(255, "Nama program maksimal 255 karakter"),
  jenis_program: z.enum(["KARBON", "PEMBERDAYAAN_EKONOMI", "KAPASITAS", "LAINNYA"])
    .default("KARBON"),
  kategori_hutan: z.enum(["MINERAL", "GAMBUT"])
    .optional()
    .nullable(),
  tujuan: z.string().optional().nullable(),
  lokasi_spesifik: z.string().optional().nullable(),
  target: z.string().optional().nullable(),
  risiko: z.string().optional().nullable(),
  carbon_project_id: z.string().uuid("Carbon project ID harus UUID").optional().nullable(),
  perhutanan_sosial_id: z.string().uuid("Perhutanan sosial ID harus UUID").min(1, "Perhutanan sosial wajib dipilih"),
  status: z.enum(["draft", "approved", "active", "completed", "cancelled"])
    .default("draft"),
  total_budget: z.number()
    .min(0, "Total anggaran tidak boleh negatif")
    .max(1000000000000, "Total anggaran terlalu besar")
    .optional()
    .nullable()
    .default(0),
  budget_status: z.enum(["draft", "submitted_for_review", "under_review", "approved", "rejected", "needs_revision"])
    .optional()
    .nullable()
    .default("draft"),
  budget_notes: z.string()
    .optional()
    .nullable(),
  logical_framework: z.any().optional().nullable(),
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

    // Only admin and program_planner can create programs
    if (!profile || !["admin", "program_planner"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and program planner can create programs" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = programCreateSchema.safeParse(body);
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

    // Additional validation: if jenis_program is KARBON, kategori_hutan is required
    if (data.jenis_program === "KARBON" && !data.kategori_hutan) {
      return NextResponse.json(
        { error: "Kategori hutan wajib diisi untuk program Karbon" },
        { status: 400 }
      );
    }

    // Check if kode_program already exists
    const { data: existingProgram } = await supabase
      .from("programs")
      .select("id")
      .eq("kode_program", data.kode_program)
      .single();

    if (existingProgram) {
      return NextResponse.json(
        { error: `Kode program '${data.kode_program}' sudah digunakan` },
        { status: 409 }
      );
    }

    // Check if perhutanan_sosial_id exists
    const { data: existingPS } = await supabase
      .from("perhutanan_sosial")
      .select("id")
      .eq("id", data.perhutanan_sosial_id)
      .single();

    if (!existingPS) {
      return NextResponse.json(
        { error: "Perhutanan sosial tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if carbon_project_id exists (if provided)
    if (data.carbon_project_id) {
      const { data: existingCarbonProject } = await supabase
        .from("carbon_projects")
        .select("id")
        .eq("id", data.carbon_project_id)
        .single();

      if (!existingCarbonProject) {
        return NextResponse.json(
          { error: "Carbon project tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      kode_program: data.kode_program,
      nama_program: data.nama_program,
      jenis_program: data.jenis_program,
      kategori_hutan: data.kategori_hutan || null,
      tujuan: data.tujuan || null,
      lokasi_spesifik: data.lokasi_spesifik || null,
      target: data.target || null,
      risiko: data.risiko || null,
      carbon_project_id: data.carbon_project_id || null,
      perhutanan_sosial_id: data.perhutanan_sosial_id,
      status: data.status,
      logical_framework: data.logical_framework || null,
      created_by: session.user.id,
    };

    // Insert into database
    const { data: newProgram, error } = await supabase
      .from("programs")
      .insert(insertData)
      .select(`
        *,
        carbon_projects:kode_project,nama_project,
        perhutanan_sosial:pemegang_izin,desa
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create program", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Program berhasil dibuat", 
        data: newProgram,
        id: newProgram.id 
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

import { cacheGet } from "@/lib/redis/client";
import { generateQueryCacheKey } from "@/lib/redis/security";

export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const jenis_program = searchParams.get("jenis_program");
    const kategori_hutan = searchParams.get("kategori_hutan");
    const carbon_project_id = searchParams.get("carbon_project_id");
    const perhutanan_sosial_id = searchParams.get("perhutanan_sosial_id");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const search = searchParams.get("search");

    // Build params object for cache key
    const params: Record<string, any> = {
      status,
      jenis_program,
      kategori_hutan,
      carbon_project_id,
      perhutanan_sosial_id,
      limit,
      offset,
      search
    };

    const cacheKey = generateQueryCacheKey('programs', params);

    return await cacheGet(
      cacheKey,
      async () => {
        let query = supabase
          .from("programs")
          .select(`
            *,
            carbon_projects:kode_project,nama_project,
            perhutanan_sosial:pemegang_izin,desa,
            profiles:created_by (full_name, role)
          `, { count: 'exact' });

        // Apply filters
        if (status) {
          query = query.eq("status", status);
        }
        
        if (jenis_program) {
          query = query.eq("jenis_program", jenis_program);
        }

        if (kategori_hutan) {
          query = query.eq("kategori_hutan", kategori_hutan);
        }

        if (carbon_project_id) {
          query = query.eq("carbon_project_id", carbon_project_id);
        }

        if (perhutanan_sosial_id) {
          query = query.eq("perhutanan_sosial_id", perhutanan_sosial_id);
        }

        if (search) {
          query = query.or(`kode_program.ilike.%${search}%,nama_program.ilike.%${search}%`);
        }

        // Apply pagination
        query = query.order("created_at", { ascending: false })
                     .range(offset, offset + limit - 1);

        const { data: programs, error, count } = await query;

        if (error) {
          console.error("Database error:", error);
          return NextResponse.json(
            { error: "Failed to fetch programs", details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { 
            data: programs || [],
            total: count || 0,
            limit,
            offset 
          },
          { status: 200 }
        );
      },
      60, // TTL 60 seconds for dynamic program listings
      false // No encryption needed for program data
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}