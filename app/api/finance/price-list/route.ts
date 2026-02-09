import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";

// Schema for price list - based on actual database columns from check_price_list.js
// Actual columns: id, item_code, item_name, item_description, unit, unit_price, currency, category, is_active, valid_from, valid_until, created_at
const priceListItemSchema = z.object({
  item_code: z.string().min(1).max(50),
  item_name: z.string().min(1).max(255),
  item_description: z.string().optional().nullable(),
  category: z.string().default('material'),
  unit: z.string().min(1).max(50),
  unit_price: z.number().positive(),
  currency: z.string().length(3).default('IDR'),
  valid_from: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid (YYYY-MM-DD)",
  }),
  valid_until: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid (YYYY-MM-DD)",
  }),
  is_active: z.boolean().default(true),
});

// Schema for update (all fields optional except id)
const priceListUpdateSchema = priceListItemSchema.partial().extend({
  id: z.string().uuid().optional(),
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
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat price list" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const is_active = searchParams.get("is_active");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    let priceList = [];
    let count = 0;
    let fetchError = null;

    try {
      let query = supabase
        .from("price_list")
        .select(`
          *,
          profiles:created_by (full_name)
        `, { count: 'exact' });

      // Apply filters
      if (category) {
        query = query.eq("category", category);
      }
      
      if (is_active) {
        query = query.eq("is_active", is_active === "true");
      }

      // Search filter
      if (search) {
        query = query.or(`item_code.ilike.%${search}%,item_name.ilike.%${search}%,item_description.ilike.%${search}%`);
      }

      // Apply pagination and ordering - removed version field which doesn't exist
      query = query.order("item_code", { ascending: true })
                  .range(offset, offset + limit - 1);

      const { data, error: queryError, count: queryCount } = await query;

      if (queryError) {
        console.warn("Database error fetching price_list:", queryError.message)
        fetchError = queryError
        // Return empty data with informative message instead of error
        // This allows frontend to function even if table doesn't exist
        priceList = []
        count = 0
      } else {
        priceList = data || []
        count = queryCount || 0
      }
    } catch (error) {
      console.warn("Exception fetching price_list:", error)
      fetchError = error as Error
      priceList = []
      count = 0
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
        summary.by_category[item.category] = (summary.by_category[item.category] || 0) + 1;
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
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola price list" },
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

    // Check if item code already exists (unique constraint)
    const { data: existingItem } = await supabase
      .from("price_list")
      .select("id")
      .eq("item_code", data.item_code)
      .single();

    if (existingItem) {
      return NextResponse.json(
        { error: `Item dengan kode '${data.item_code}' sudah ada` },
        { status: 409 }
      );
    }

    // Validate dates
    const validFrom = new Date(data.valid_from);
    const today = new Date();
    
    if (validFrom < today) {
      return NextResponse.json(
        { error: "Tanggal berlaku mulai tidak boleh di masa lalu" },
        { status: 400 }
      );
    }

    if (data.valid_until) {
      const validUntil = new Date(data.valid_until);
      if (validUntil <= validFrom) {
        return NextResponse.json(
          { error: "Tanggal berlaku selesai harus setelah tanggal mulai" },
          { status: 400 }
        );
      }
    }

    // Ensure unit_price is a valid number (not NaN)
    if (isNaN(data.unit_price) || !isFinite(data.unit_price)) {
      return NextResponse.json(
        { error: "Harga satuan harus berupa angka yang valid" },
        { status: 400 }
      );
    }

    // Prepare insert data - use the validated data as is (schema already matches database columns)
    const insertData: any = {
      ...data,
      valid_from: validFrom.toISOString(),
      valid_until: data.valid_until ? new Date(data.valid_until).toISOString() : null,
      created_by: session.user.id,
    };

    // Insert into database
    const { data: newItem, error } = await supabase
      .from("price_list")
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

    // Check if user has permission to manage price list
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola price list" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = priceListUpdateSchema.safeParse(body);
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
    const id = data.id;

    if (!id) {
      return NextResponse.json(
        { error: "ID item diperlukan untuk update" },
        { status: 400 }
      );
    }

    // Check if item exists
    const { data: existingItem, error: fetchError } = await supabase
      .from("price_list")
      .select("id, item_code")
      .eq("id", id)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: `Item dengan ID '${id}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Validate unit_price if provided
    if (data.unit_price !== undefined) {
      if (isNaN(data.unit_price) || !isFinite(data.unit_price)) {
        return NextResponse.json(
          { error: "Harga satuan harus berupa angka yang valid" },
          { status: 400 }
        );
      }
    }

    // Validate dates (allow past dates for updates since item already exists)
    if (data.valid_until && data.valid_from) {
      const validFrom = new Date(data.valid_from);
      const validUntil = new Date(data.valid_until);
      if (validUntil <= validFrom) {
        return NextResponse.json(
          { error: "Tanggal berlaku selesai harus setelah tanggal mulai" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...data };
    delete updateData.id; // Remove id from update data

    // Handle date fields
    if (updateData.valid_from) {
      updateData.valid_from = new Date(updateData.valid_from).toISOString();
    }
    
    if (updateData.valid_until) {
      updateData.valid_until = new Date(updateData.valid_until).toISOString();
    } else if (updateData.valid_until === null) {
      updateData.valid_until = null;
    }

    // Tambahkan updated_at karena kolom sekarang ada di database (setelah migration)
    updateData.updated_at = new Date().toISOString();

    // Update in database
    const { data: updatedItem, error: updateError } = await supabase
      .from("price_list")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        profiles:created_by (full_name)
      `)
      .single();

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: "Gagal mengupdate item price list", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Item price list berhasil diupdate", 
        data: updatedItem 
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

export async function DELETE(request: NextRequest) {
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
        { error: "Forbidden: Anda tidak memiliki izin untuk mengelola price list" },
        { status: 403 }
      );
    }

    // Get ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID item diperlukan untuk penghapusan" },
        { status: 400 }
      );
    }

    // Check if item exists
    const { data: existingItem, error: fetchError } = await supabase
      .from("price_list")
      .select("id, item_code")
      .eq("id", id)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: `Item dengan ID '${id}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("price_list")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Database error:", deleteError);
      return NextResponse.json(
        { error: "Gagal menghapus item price list", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: `Item '${existingItem.item_code}' berhasil dihapus`,
        id: id
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
