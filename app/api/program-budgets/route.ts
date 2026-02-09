import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/rbac";

// Schema for program budget creation
const programBudgetCreateSchema = z.object({
  program_id: z.string()
    .uuid("Program ID harus UUID valid")
    .min(1, "Program ID wajib diisi"),
  budget_code: z.string()
    .min(1, "Kode anggaran wajib diisi")
    .max(50, "Kode anggaran maksimal 50 karakter")
    .regex(/^[A-Za-z0-9-]+$/, "Kode anggaran hanya boleh berisi huruf, angka, dan dash"),
  budget_name: z.string()
    .min(1, "Nama anggaran wajib diisi")
    .max(255, "Nama anggaran maksimal 255 karakter"),
  fiscal_year: z.number()
    .int("Tahun fiskal harus bilangan bulat")
    .min(2000, "Tahun fiskal minimal 2000")
    .max(2100, "Tahun fiskal maksimal 2100")
    .default(new Date().getFullYear()),
  total_amount: z.number()
    .positive("Jumlah total anggaran harus lebih dari 0")
    .max(1000000000000, "Jumlah anggaran terlalu besar"),
  currency: z.string()
    .length(3, "Kode mata uang harus 3 karakter")
    .default("IDR"),
  status: z.enum(["draft", "submitted", "approved", "rejected", "archived"])
    .default("draft"),
  notes: z.string()
    .optional()
    .nullable(),
});

// Schema for program budget item creation
const programBudgetItemCreateSchema = z.object({
  program_budget_id: z.string()
    .uuid("Program budget ID harus UUID valid")
    .min(1, "Program budget ID wajib diisi"),
  price_list_id: z.string()
    .uuid("Price list ID harus UUID valid")
    .min(1, "Price list ID wajib diisi"),
  item_code: z.string()
    .optional()
    .nullable(),
  item_name: z.string()
    .min(1, "Nama item wajib diisi")
    .max(255, "Nama item maksimal 255 karakter"),
  description: z.string()
    .optional()
    .nullable(),
  quantity: z.number()
    .positive("Jumlah harus lebih dari 0")
    .default(1),
  unit: z.string()
    .optional()
    .nullable(),
  unit_price: z.number()
    .positive("Harga satuan harus lebih dari 0"),
  category: z.string()
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

    // Check if user has permission to manage program budgets
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola anggaran program" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = programBudgetCreateSchema.safeParse(body);
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
    const { data: program } = await supabase
      .from("programs")
      .select("id, nama_program")
      .eq("id", data.program_id)
      .single();
    
    if (!program) {
      return NextResponse.json(
        { error: "Program tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if budget_code already exists
    const { data: existingBudget } = await supabase
      .from("program_budgets")
      .select("id")
      .eq("budget_code", data.budget_code)
      .single();

    if (existingBudget) {
      return NextResponse.json(
        { error: `Kode anggaran '${data.budget_code}' sudah digunakan` },
        { status: 409 }
      );
    }

    // Prepare insert data
    const insertData: any = {
      program_id: data.program_id,
      budget_code: data.budget_code,
      budget_name: data.budget_name,
      fiscal_year: data.fiscal_year,
      total_amount: data.total_amount,
      currency: data.currency,
      status: data.status,
      created_by: session.user.id,
    };

    if (data.notes) insertData.notes = data.notes;

    // Insert into database
    const { data: newBudget, error } = await supabase
      .from("program_budgets")
      .insert(insertData)
      .select(`
        *,
        programs:program_id (kode_program, nama_program),
        profiles:created_by (full_name, role)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal membuat anggaran program", details: error.message },
        { status: 500 }
      );
    }

    // Update total_budget in programs table
    await supabase
      .from("programs")
      .update({ total_budget: data.total_amount })
      .eq("id", data.program_id);

    return NextResponse.json(
      { 
        message: "Anggaran program berhasil dibuat", 
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

    // Check if user has permission to view program budgets
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat anggaran program" },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const program_id = searchParams.get("program_id");
    const status = searchParams.get("status");
    const fiscal_year = searchParams.get("fiscal_year");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const search = searchParams.get("search");

    let query = supabase
      .from("program_budgets")
      .select(`
        *,
        programs:program_id (kode_program, nama_program, status),
        profiles:created_by (full_name, role)
      `, { count: 'exact' });

    // Apply filters
    if (program_id) {
      query = query.eq("program_id", program_id);
    }
    
    if (status) {
      query = query.eq("status", status);
    }

    if (fiscal_year) {
      query = query.eq("fiscal_year", parseInt(fiscal_year));
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
        { error: "Gagal mengambil data anggaran program", details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const totalAmount = budgets?.reduce((sum, budget) => sum + budget.total_amount, 0) || 0;
    
    // Count by status
    const draftCount = budgets?.filter(b => b.status === 'draft').length || 0;
    const submittedCount = budgets?.filter(b => b.status === 'submitted').length || 0;
    const approvedCount = budgets?.filter(b => b.status === 'approved').length || 0;
    const rejectedCount = budgets?.filter(b => b.status === 'rejected').length || 0;

    return NextResponse.json(
      { 
        data: budgets || [],
        summary: {
          total_budgets: count || 0,
          total_amount: totalAmount,
          status_counts: {
            draft: draftCount,
            submitted: submittedCount,
            approved: approvedCount,
            rejected: rejectedCount
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

// Endpoint for adding budget items
export async function POST_ITEM(request: NextRequest) {
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

    // Check if user has permission to manage program budgets
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola item anggaran" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = programBudgetItemCreateSchema.safeParse(body);
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

    // Check if program budget exists
    const { data: programBudget } = await supabase
      .from("program_budgets")
      .select("id, program_id, total_amount")
      .eq("id", data.program_budget_id)
      .single();
    
    if (!programBudget) {
      return NextResponse.json(
        { error: "Anggaran program tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if price list item exists
    const { data: priceListItem } = await supabase
      .from("price_list")
      .select("id, item_code, item_name, unit_price")
      .eq("id", data.price_list_id)
      .single();
    
    if (!priceListItem) {
      return NextResponse.json(
        { error: "Item price list tidak ditemukan" },
        { status: 404 }
      );
    }

    // Prepare insert data (use price list data as defaults)
    const insertData: any = {
      program_budget_id: data.program_budget_id,
      price_list_id: data.price_list_id,
      item_code: data.item_code || priceListItem.item_code,
      item_name: data.item_name || priceListItem.item_name,
      unit_price: data.unit_price || priceListItem.unit_price,
      quantity: data.quantity,
      created_by: session.user.id,
    };

    if (data.description) insertData.description = data.description;
    if (data.unit) insertData.unit = data.unit;
    if (data.category) insertData.category = data.category;
    if (data.notes) insertData.notes = data.notes;

    // Insert into database
    const { data: newItem, error } = await supabase
      .from("program_budget_items")
      .insert(insertData)
      .select(`
        *,
        price_list:price_list_id (item_code, item_name, unit, category)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal menambahkan item anggaran", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Item anggaran berhasil ditambahkan", 
        data: newItem,
        id: newItem.id 
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

// Endpoint for getting budget items
export async function GET_ITEMS(request: NextRequest) {
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

    // Check if user has permission to view program budgets
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat item anggaran" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const program_budget_id = searchParams.get("program_budget_id");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    if (!program_budget_id) {
      return NextResponse.json(
        { error: "Program budget ID wajib diisi" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("program_budget_items")
      .select(`
        *,
        price_list:price_list_id (item_code, item_name, unit, category, is_active)
      `, { count: 'exact' })
      .eq("program_budget_id", program_budget_id);

    // Apply pagination and ordering
    query = query.order("created_at", { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: items, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data item anggaran", details: error.message },
        { status: 500 }
      );
    }

    // Calculate total for this budget
    const totalAmount = items?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;

    return NextResponse.json(
      { 
        data: items || [],
        summary: {
          total_items: count || 0,
          total_amount: totalAmount
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