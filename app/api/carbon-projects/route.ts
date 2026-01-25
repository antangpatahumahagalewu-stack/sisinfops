import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema validation based on carbon_projects table
const carbonProjectCreateSchema = z.object({
  kode_project: z.string()
    .min(1, "Kode project wajib diisi")
    .max(50, "Kode project maksimal 50 karakter")
    .regex(/^[A-Za-z0-9-_]+$/, "Kode project hanya boleh berisi huruf, angka, dash, dan underscore"),
  nama_project: z.string()
    .min(1, "Nama project wajib diisi")
    .max(255, "Nama project maksimal 255 karakter"),
  standar_karbon: z.enum(["VERRA", "GOLD_STANDARD", "INDONESIA", "OTHER"])
    .default("VERRA"),
  metodologi: z.string().optional().nullable(),
  luas_total_ha: z.number()
    .min(0, "Luas total harus >= 0")
    .optional()
    .nullable(),
  estimasi_penyimpanan_karbon: z.number()
    .min(0, "Estimasi penyimpanan karbon harus >= 0")
    .optional()
    .nullable(),
  tanggal_mulai: z.string()
    .optional()
    .nullable()
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Format tanggal tidak valid",
    }),
  tanggal_selesai: z.string()
    .optional()
    .nullable()
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Format tanggal tidak valid",
    }),
  status: z.enum(["draft", "approved", "active", "suspended", "completed", "archived"])
    .default("draft"),
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

    // Only admin and carbon_specialist can create carbon projects
    if (!profile || !["admin", "carbon_specialist"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and carbon specialist can create carbon projects" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = carbonProjectCreateSchema.safeParse(body);
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

    // Additional validation: tanggal_mulai harus sebelum tanggal_selesai jika keduanya ada
    if (data.tanggal_mulai && data.tanggal_selesai) {
      const startDate = new Date(data.tanggal_mulai);
      const endDate = new Date(data.tanggal_selesai);
      if (startDate > endDate) {
        return NextResponse.json(
          { error: "Tanggal mulai harus sebelum tanggal selesai" },
          { status: 400 }
        );
      }
    }

    // Check if kode_project already exists
    const { data: existingProject } = await supabase
      .from("carbon_projects")
      .select("id")
      .eq("kode_project", data.kode_project)
      .single();

    if (existingProject) {
      return NextResponse.json(
        { error: `Kode project '${data.kode_project}' sudah digunakan` },
        { status: 409 }
      );
    }

    // Prepare insert data
    const insertData: any = {
      kode_project: data.kode_project,
      nama_project: data.nama_project,
      standar_karbon: data.standar_karbon,
      metodologi: data.metodologi || null,
      luas_total_ha: data.luas_total_ha || null,
      estimasi_penyimpanan_karbon: data.estimasi_penyimpanan_karbon || null,
      tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai).toISOString() : null,
      tanggal_selesai: data.tanggal_selesai ? new Date(data.tanggal_selesai).toISOString() : null,
      status: data.status,
      created_by: session.user.id,
    };

    // Insert into database
    const { data: newProject, error } = await supabase
      .from("carbon_projects")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create carbon project", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Carbon project berhasil dibuat", 
        data: newProject,
        id: newProject.id 
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
    const standar_karbon = searchParams.get("standar_karbon");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const search = searchParams.get("search");

    // Build params object for cache key
    const params: Record<string, any> = {
      status,
      standar_karbon,
      limit,
      offset,
      search
    };

    const cacheKey = generateQueryCacheKey('carbon-projects', params);

    return await cacheGet(
      cacheKey,
      async () => {
        let query = supabase
          .from("carbon_projects")
          .select(`
            *,
            profiles:created_by (full_name, role)
          `, { count: 'exact' });

        // Apply filters
        if (status) {
          query = query.eq("status", status);
        }
        
        if (standar_karbon) {
          query = query.eq("standar_karbon", standar_karbon);
        }

        if (search) {
          query = query.or(`kode_project.ilike.%${search}%,nama_project.ilike.%${search}%`);
        }

        // Apply pagination
        query = query.order("created_at", { ascending: false })
                     .range(offset, offset + limit - 1);

        const { data: projects, error, count } = await query;

        if (error) {
          console.error("Database error:", error);
          return NextResponse.json(
            { error: "Failed to fetch carbon projects", details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { 
            data: projects || [],
            total: count || 0,
            limit,
            offset 
          },
          { status: 200 }
        );
      },
      60, // TTL 60 seconds for dynamic project listings
      false // No encryption needed for project data
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
