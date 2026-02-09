import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/rbac";

// Schema validation based on budgets table
const budgetCreateSchema = z.object({
  budget_code: z.string()
    .min(1, "Kode anggaran wajib diisi")
    .max(50, "Kode anggaran maksimal 50 karakter")
    .regex(/^[A-Za-z0-9-]+$/, "Kode anggaran hanya boleh berisi huruf, angka, dan dash"),
  budget_name: z.string()
    .min(1, "Nama anggaran wajib diisi")
    .max(255, "Nama anggaran maksimal 255 karakter"),
  budget_type: z.enum(["operational", "project", "program", "capital"])
    .default("operational"),
  project_id: z.string()
    .uuid("ID proyek tidak valid")
    .optional()
    .nullable(),
  fiscal_year: z.number()
    .int("Tahun fiskal harus berupa bilangan bulat")
    .min(2000, "Tahun fiskal minimal 2000")
    .max(2100, "Tahun fiskal maksimal 2100")
    .default(new Date().getFullYear()),
  total_amount: z.number()
    .positive("Jumlah total anggaran harus lebih dari 0")
    .max(1000000000000, "Jumlah anggaran terlalu besar"),
  description: z.string()
    .optional()
    .nullable(),
  notes: z.string()
    .optional()
    .nullable(),
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

    // Check if user has permission to create budgets
    const canCreate = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk membuat anggaran" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = budgetCreateSchema.safeParse(body);
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

    // Check if budget_code already exists
    const { data: existingBudget } = await supabase
      .from("budgets")
      .select("id")
      .eq("budget_code", data.budget_code)
      .single();

    if (existingBudget) {
      return NextResponse.json(
        { error: `Kode anggaran '${data.budget_code}' sudah digunakan` },
        { status: 409 }
      );
    }

    // Validate project exists if provided
    if (data.project_id) {
      const { data: project } = await supabase
        .from("carbon_projects")
        .select("id, project_name")
        .eq("id", data.project_id)
        .single();
      
      if (!project) {
        return NextResponse.json(
          { error: "Proyek tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      budget_code: data.budget_code,
      budget_name: data.budget_name,
      budget_type: data.budget_type,
      project_id: data.project_id || null,
      fiscal_year: data.fiscal_year,
      total_amount: data.total_amount,
      allocated_amount: 0,
      spent_amount: 0,
      status: "draft",
      created_by: session.user.id,
    };

    // Add optional fields if provided
    if (data.description) insertData.description = data.description;
    if (data.notes) insertData.notes = data.notes;

    // Insert into database
    const { data: newBudget, error } = await supabase
      .from("budgets")
      .insert(insertData)
      .select(`
        *,
        carbon_projects:project_id (project_name, project_code),
        profiles:created_by (full_name, role)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal membuat anggaran", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Anggaran berhasil dibuat", 
        data: newBudget,
        id: newBudget.id 
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

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to view budgets
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat anggaran" },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const budget_type = searchParams.get("budget_type");
    const fiscal_year = searchParams.get("fiscal_year");
    const status = searchParams.get("status");
    const project_id = searchParams.get("project_id");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const search = searchParams.get("search");

    let query = supabase
      .from("budgets")
      .select(`
        *,
        carbon_projects:project_id (project_name, project_code),
        profiles:created_by (full_name, role)
      `, { count: 'exact' });

    // Apply filters
    if (budget_type) {
      query = query.eq("budget_type", budget_type);
    }
    
    if (fiscal_year) {
      query = query.eq("fiscal_year", parseInt(fiscal_year));
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (project_id) {
      query = query.eq("project_id", project_id);
    }

    // Search filter
    if (search) {
      query = query.or(`budget_code.ilike.%${search}%,budget_name.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query.order("created_at", { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: budgets, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data anggaran", details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const totalAmount = budgets?.reduce((sum, budget) => sum + budget.total_amount, 0) || 0;
    const totalAllocated = budgets?.reduce((sum, budget) => sum + budget.allocated_amount, 0) || 0;
    const totalSpent = budgets?.reduce((sum, budget) => sum + budget.spent_amount, 0) || 0;
    const totalRemaining = budgets?.reduce((sum, budget) => sum + budget.remaining_amount, 0) || 0;

    // Count by status
    const draftCount = budgets?.filter(b => b.status === 'draft').length || 0;
    const activeCount = budgets?.filter(b => b.status === 'active').length || 0;
    const closedCount = budgets?.filter(b => b.status === 'closed').length || 0;

    // Count by budget type
    const operationalCount = budgets?.filter(b => b.budget_type === 'operational').length || 0;
    const projectCount = budgets?.filter(b => b.budget_type === 'project').length || 0;
    const programCount = budgets?.filter(b => b.budget_type === 'program').length || 0;
    const capitalCount = budgets?.filter(b => b.budget_type === 'capital').length || 0;

    return NextResponse.json(
      { 
        data: budgets || [],
        summary: {
          total_budgets: count || 0,
          total_amount: totalAmount,
          total_allocated: totalAllocated,
          total_spent: totalSpent,
          total_remaining: totalRemaining,
          utilization_percentage: totalAmount > 0 ? (totalSpent / totalAmount) * 100 : 0,
          status_counts: {
            draft: draftCount,
            active: activeCount,
            closed: closedCount
          },
          type_counts: {
            operational: operationalCount,
            project: projectCount,
            program: programCount,
            capital: capitalCount
          }
        },
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