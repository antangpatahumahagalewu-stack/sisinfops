import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";

// Schema for master price list
const priceListItemSchema = z.object({
  item_code: z.string().min(1).max(50),
  item_name: z.string().min(1).max(255),
  item_description: z.string().optional().nullable(),
  item_category: z.enum(['MATERIAL', 'SERVICE', 'LABOR', 'EQUIPMENT', 'TRANSPORTATION', 'ADMINISTRATIVE', 'OTHER']),
  unit: z.string().min(1).max(50),
  unit_price: z.number().positive(),
  currency: z.string().length(3).default('IDR'),
  validity_start: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid (YYYY-MM-DD)",
  }),
  validity_end: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid (YYYY-MM-DD)",
  }),
  version: z.number().int().positive().default(1),
  is_active: z.boolean().default(true),
  approval_status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).default('DRAFT'),
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

    // Check if user has permission to view price list
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat master price list" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const item_category = searchParams.get("item_category");
    const is_active = searchParams.get("is_active");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    let query = supabase
      .from("master_price_list")
      .select(`
        *,
        profiles:created_by (full_name),
        approver:approved_by (full_name)
      `, { count: 'exact' });

    // Apply filters
    if (item_category) {
      query = query.eq("item_category", item_category);
    }
    
    if (is_active) {
      query = query.eq("is_active", is_active === "true");
    }

    // Search filter
    if (search) {
      query = query.or(`item_code.ilike.%${search}%,item_name.ilike.%${search}%,item_description.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query.order("item_code", { ascending: true })
                 .order("version", { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: priceList, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data master price list", details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const summary = {
      total_items: count || 0,
      active_items: priceList?.filter(item => item.is_active).length || 0,
      by_category: {} as Record<string, number>,
      total_value: 0,
    };

    if (priceList) {
      // Count by category
      priceList.forEach(item => {
        summary.by_category[item.item_category] = (summary.by_category[item.item_category] || 0) + 1;
        if (item.is_active) {
          summary.total_value += item.unit_price;
        }
      });
    }

    return NextResponse.json(
      { 
        data: priceList || [],
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

    // Check if user has permission to manage price list
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola master price list" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = priceListItemSchema.safeParse(body);
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

    // Check if item code and version already exists
    const { data: existingItem } = await supabase
      .from("master_price_list")
      .select("id")
      .eq("item_code", data.item_code)
      .eq("version", data.version)
      .single();

    if (existingItem) {
      return NextResponse.json(
        { error: `Item dengan kode '${data.item_code}' versi ${data.version} sudah ada` },
        { status: 409 }
      );
    }

    // Validate dates
    const validityStart = new Date(data.validity_start);
    const today = new Date();
    
    if (validityStart < today) {
      return NextResponse.json(
        { error: "Tanggal berlaku mulai tidak boleh di masa lalu" },
        { status: 400 }
      );
    }

    if (data.validity_end) {
      const validityEnd = new Date(data.validity_end);
      if (validityEnd <= validityStart) {
        return NextResponse.json(
          { error: "Tanggal berlaku selesai harus setelah tanggal mulai" },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      ...data,
      validity_start: validityStart.toISOString(),
      validity_end: data.validity_end ? new Date(data.validity_end).toISOString() : null,
      created_by: session.user.id,
    };

    // Insert into database
    const { data: newItem, error } = await supabase
      .from("master_price_list")
      .insert(insertData)
      .select(`
        *,
        profiles:created_by (full_name)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal membuat item price list", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Item price list berhasil dibuat", 
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
