// CARBON PROJECTS API UPDATE PREVIEW
// File: app/api/carbon-projects/route.ts
// Status: PLACEHOLDER → UPDATED FOR NEW SCHEMA

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canEdit, isAdmin, hasPermission } from "@/lib/auth/rbac";

// Schema validation based on NEW carbon_projects table structure
export const carbonProjectCreateSchema = z.object({
  ps_id: z.string()
    .min(1, "PS ID wajib dipilih")
    .uuid("ID PS tidak valid"),
  project_code: z.string()
    .min(3, "Kode project minimal 3 karakter")
    .max(50, "Kode project maksimal 50 karakter"),
  project_name: z.string()
    .min(5, "Nama project minimal 5 karakter")
    .max(255, "Nama project maksimal 255 karakter"),
  project_type: z.enum(["REDD+", "ARR", "IFM", "Blue Carbon"]),
  standard: z.string().default("VCS"),
  methodology: z.string().optional().nullable(),
  validation_status: z.enum(["draft", "submitted", "validated", "rejected"]).default("draft"),
  verification_status: z.enum(["not_started", "planned", "in_progress", "completed", "failed"]).default("not_started"),
  crediting_period_start: z.string().optional().nullable(),
  crediting_period_end: z.string().optional().nullable(),
  estimated_credits: z.number().min(0, "Estimasi credits harus >= 0").optional(),
  issued_credits: z.number().min(0, "Issued credits harus >= 0").default(0),
  retired_credits: z.number().min(0, "Retired credits harus >= 0").default(0),
  current_price: z.number().min(0, "Harga harus >= 0").optional(),
  project_description: z.string().optional().nullable(),
  project_developer: z.string().optional().nullable(),
  investor: z.string().optional().nullable(),
  project_manager: z.string().optional().nullable(),
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

    // Check if user can create carbon projects (admin or carbon_specialist)
    const userRole = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    
    const allowedRoles = ["admin", "carbon_specialist"];
    if (!userRole.data || !allowedRoles.includes(userRole.data.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and carbon specialists can create carbon projects" },
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

    // Check if PS exists
    const { data: psExists, error: psError } = await supabase
      .from("perhutanan_sosial")
      .select("id")
      .eq("id", data.ps_id)
      .single();
    
    if (psError || !psExists) {
      return NextResponse.json(
        { error: "Perhutanan Sosial tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if project code is unique
    const { data: existingCode } = await supabase
      .from("carbon_projects")
      .select("id")
      .eq("project_code", data.project_code)
      .maybeSingle();
    
    if (existingCode) {
      return NextResponse.json(
        { error: "Project code sudah digunakan" },
        { status: 409 }
      );
    }

    // Prepare insert data
    const insertData = {
      ps_id: data.ps_id,
      project_code: data.project_code,
      project_name: data.project_name,
      project_type: data.project_type,
      standard: data.standard,
      methodology: data.methodology || null,
      validation_status: data.validation_status,
      verification_status: data.verification_status,
      crediting_period_start: data.crediting_period_start ? new Date(data.crediting_period_start).toISOString() : null,
      crediting_period_end: data.crediting_period_end ? new Date(data.crediting_period_end).toISOString() : null,
      estimated_credits: data.estimated_credits || 0,
      issued_credits: data.issued_credits,
      retired_credits: data.retired_credits,
      current_price: data.current_price || null,
      project_description: data.project_description || null,
      project_developer: data.project_developer || null,
      investor: data.investor || null,
      project_manager: data.project_manager || null,
    };

    // Insert into database
    const { data: newProject, error } = await supabase
      .from("carbon_projects")
      .insert(insertData)
      .select(`
        *,
        perhutanan_sosial:ps_id (
          id,
          pemegang_izin,
          luas_ha,
          kabupaten_id
        )
      `)
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication (optional for public read)
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const ps_id = searchParams.get("ps_id");
    const validation_status = searchParams.get("validation_status");
    const project_type = searchParams.get("project_type");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const search = searchParams.get("search");

    // Build query
    let query = supabase
      .from("carbon_projects")
      .select(`
        *,
        perhutanan_sosial:ps_id (
          id,
          pemegang_izin,
          desa,
          kecamatan,
          luas_ha,
          kabupaten:kabupaten_id (
            id,
            nama
          )
        )
      `, { count: 'exact' });

    // Apply filters
    if (ps_id) {
      query = query.eq("ps_id", ps_id);
    }
    
    if (validation_status) {
      query = query.eq("validation_status", validation_status);
    }

    if (project_type) {
      query = query.eq("project_type", project_type);
    }

    if (search) {
      query = query.or(`project_code.ilike.%${search}%,project_name.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    query = query.order("created_at", { ascending: false });

    const { data: projects, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch carbon projects", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: projects || [],
      total: count || 0,
      limit,
      offset,
      has_more: (offset + limit) < (count || 0)
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// UPDATE preview for carbon-stats API
/*
OLD QUERY (app/api/dashboard/carbon-stats/route.ts):
const { data: carbonProjects, error: carbonError } = await supabase
  .from("carbon_projects")
  .select("id, kode_project, nama_project, status, luas_total_ha, estimasi_penyimpanan_karbon, standar_karbon, metodologi, tanggal_mulai, tanggal_selesai, created_at")

NEW QUERY (after migration):
const { data: carbonProjects, error: carbonError } = await supabase
  .from("carbon_projects")
  .select(`
    id, 
    project_code, 
    project_name, 
    validation_status, 
    estimated_credits,
    standard,
    methodology,
    crediting_period_start,
    crediting_period_end,
    created_at,
    perhutanan_sosial:ps_id (
      luas_ha
    )
  `)
*/