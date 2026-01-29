import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";

// Schema for investor dashboard access
const investorAccessSchema = z.object({
  investor_id: z.string().uuid().optional().nullable(),
  investor_external_id: z.string().max(100).optional().nullable(),
  investor_name: z.string().min(1).max(255),
  investor_email: z.string().email().optional().nullable(),
  access_type: z.enum(['FULL', 'LIMITED', 'PROJECT_ONLY', 'READ_ONLY']),
  allowed_projects: z.array(z.string().uuid()).default([]),
  is_active: z.boolean().default(true),
});

// Schema for generating investor token
const generateTokenSchema = z.object({
  investor_access_id: z.string().uuid(),
  token_expiry_days: z.number().min(1).max(365).default(30),
});

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

    // Check if user has permission to view investor dashboard access
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat investor dashboard" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const is_active = searchParams.get("is_active");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    let query = supabase
      .from("investor_dashboard_access")
      .select(`
        *,
        profiles:investor_id (full_name, email),
        creator:created_by (full_name)
      `, { count: 'exact' });

    // Apply filters
    if (is_active) {
      query = query.eq("is_active", is_active === "true");
    }

    // Search filter
    if (search) {
      query = query.or(`investor_name.ilike.%${search}%,investor_email.ilike.%${search}%,investor_external_id.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query.order("created_at", { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: investorAccess, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data investor dashboard access", details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const summary = {
      total_investors: count || 0,
      active_investors: investorAccess?.filter(inv => inv.is_active).length || 0,
      by_access_type: {} as Record<string, number>,
      total_access_count: investorAccess?.reduce((sum, inv) => sum + (inv.access_count || 0), 0) || 0,
    };

    if (investorAccess) {
      // Count by access type
      investorAccess.forEach(inv => {
        summary.by_access_type[inv.access_type] = (summary.by_access_type[inv.access_type] || 0) + 1;
      });
    }

    return NextResponse.json(
      { 
        data: investorAccess || [],
        summary: summary,
        pagination: {
          limit,
          offset,
          total: count || 0
        }
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

    // Check if user has permission to manage investor dashboard access
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola investor dashboard" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = investorAccessSchema.safeParse(body);
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

    // Validate that either investor_id or investor_external_id is provided
    if (!data.investor_id && !data.investor_external_id) {
      return NextResponse.json(
        { error: "Salah satu dari investor_id atau investor_external_id harus diisi" },
        { status: 400 }
      );
    }

    // Check if investor_id exists in profiles if provided
    if (data.investor_id) {
      const { data: investorProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", data.investor_id)
        .single();
      
      if (!investorProfile) {
        return NextResponse.json(
          { error: "Investor profile tidak ditemukan" },
          { status: 404 }
        );
      }

      // Auto-fill name and email if not provided
      if (!data.investor_name) {
        data.investor_name = investorProfile.full_name || "Unknown";
      }
      if (!data.investor_email) {
        data.investor_email = investorProfile.email;
      }
    }

    // Check for existing access with same investor_id or investor_external_id
    const { data: existingAccess } = await supabase
      .from("investor_dashboard_access")
      .select("id")
      .or(`investor_id.eq.${data.investor_id},investor_external_id.eq.${data.investor_external_id}`)
      .single();

    if (existingAccess) {
      return NextResponse.json(
        { error: "Investor sudah memiliki akses dashboard" },
        { status: 409 }
      );
    }

    // Validate allowed_projects if provided
    if (data.allowed_projects && data.allowed_projects.length > 0) {
      const { data: projects } = await supabase
        .from("carbon_projects")
        .select("id")
        .in("id", data.allowed_projects);

      if (!projects || projects.length !== data.allowed_projects.length) {
        return NextResponse.json(
          { error: "Salah satu atau lebih proyek tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      ...data,
      created_by: session.user.id,
    };

    // Insert into database
    const { data: newAccess, error } = await supabase
      .from("investor_dashboard_access")
      .insert(insertData)
      .select(`
        *,
        profiles:investor_id (full_name, email),
        creator:created_by (full_name)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal membuat investor dashboard access", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Investor dashboard access berhasil dibuat", 
        data: newAccess,
        id: newAccess.id 
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

// Generate access token for investor
export async function PUT(request: NextRequest) {
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

    // Check if user has permission to manage investor dashboard access
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola investor dashboard" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = generateTokenSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const { investor_access_id, token_expiry_days } = validationResult.data;

    // Check if investor access exists
    const { data: investorAccess } = await supabase
      .from("investor_dashboard_access")
      .select("id, investor_name, is_active")
      .eq("id", investor_access_id)
      .single();

    if (!investorAccess) {
      return NextResponse.json(
        { error: "Investor dashboard access tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!investorAccess.is_active) {
      return NextResponse.json(
        { error: "Investor dashboard access tidak aktif" },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = require('crypto').randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + token_expiry_days);

    // Update investor access with token
    const { data: updatedAccess, error } = await supabase
      .from("investor_dashboard_access")
      .update({
        access_token: token,
        token_expires_at: tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", investor_access_id)
      .select(`
        *,
        profiles:investor_id (full_name, email)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal membuat token akses", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Token akses berhasil dibuat", 
        data: {
          investor_access_id: updatedAccess.id,
          investor_name: updatedAccess.investor_name,
          access_token: updatedAccess.access_token,
          token_expires_at: updatedAccess.token_expires_at,
          access_url: `/investor/dashboard?token=${updatedAccess.access_token}`
        },
        warning: "Simpan token ini dengan aman. Token tidak akan ditampilkan lagi."
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