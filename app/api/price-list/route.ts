import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Query parameter schema for filtering
const priceListQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  is_active: z.enum(["true", "false"]).optional().transform(val => val === "true"),
  limit: z.string().regex(/^\d+$/).default("100").transform(val => parseInt(val)),
  offset: z.string().regex(/^\d+$/).default("0").transform(val => parseInt(val)),
  sort_by: z.enum(["item_code", "item_name", "unit_price", "category", "created_at"]).default("item_code"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
});

// Response item schema
const priceListItemSchema = z.object({
  id: z.string().uuid(),
  item_code: z.string(),
  item_name: z.string(),
  item_description: z.string().nullable(),
  unit: z.string(),
  unit_price: z.number(),
  currency: z.string(),
  category: z.string(),
  is_active: z.boolean(),
  valid_from: z.string().nullable(),
  valid_until: z.string().nullable(),
  created_at: z.string(),
});

export type PriceListItem = z.infer<typeof priceListItemSchema>;

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

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      is_active: searchParams.get("is_active") || undefined,
      limit: searchParams.get("limit") || "100",
      offset: searchParams.get("offset") || "0",
      sort_by: searchParams.get("sort_by") || "item_code",
      sort_order: searchParams.get("sort_order") || "asc",
    };

    const validationResult = priceListQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid query parameters", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const { search, category, is_active, limit, offset, sort_by, sort_order } = validationResult.data;

    // Build query
    let query = supabase
      .from("price_list")
      .select("*", { count: "exact" });

    // Apply filters
    if (search) {
      query = query.or(`item_code.ilike.%${search}%,item_name.ilike.%${search}%,item_description.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active);
    }

    // Apply sorting
    if (sort_by === "created_at") {
      query = query.order(sort_by, { ascending: sort_order === "asc" });
    } else {
      // For other columns, sort case-insensitive
      query = query.order(sort_by, { ascending: sort_order === "asc", nullsFirst: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: priceList, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch price list", details: error.message },
        { status: 500 }
      );
    }

    // Validate response data
    const validatedData = priceList?.map(item => priceListItemSchema.parse(item)) || [];

    return NextResponse.json(
      { 
        data: validatedData,
        total: count || 0,
        limit,
        offset,
        filters: {
          search: search || null,
          category: category || null,
          is_active: is_active !== undefined ? is_active : null,
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

// Optional: Create a simple POST endpoint for adding price list items (admin only)
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

    // Get user profile for role check - only admin can add price list items
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin can add price list items" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const createPriceListSchema = z.object({
      item_code: z.string().min(1, "Item code wajib diisi").max(50, "Item code maksimal 50 karakter"),
      item_name: z.string().min(1, "Item name wajib diisi").max(255, "Item name maksimal 255 karakter"),
      item_description: z.string().optional().nullable(),
      unit: z.string().min(1, "Unit wajib diisi").max(50, "Unit maksimal 50 karakter"),
      unit_price: z.number().min(0, "Unit price tidak boleh negatif").max(1000000000000, "Unit price terlalu besar"),
      currency: z.string().min(1, "Currency wajib diisi").max(3, "Currency maksimal 3 karakter").default("IDR"),
      category: z.string().min(1, "Category wajib diisi").max(100, "Category maksimal 100 karakter"),
      is_active: z.boolean().default(true),
      valid_from: z.string().optional().nullable(),
      valid_until: z.string().optional().nullable(),
    });

    const validationResult = createPriceListSchema.safeParse(body);
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

    // Check if item_code already exists
    const { data: existingItem } = await supabase
      .from("price_list")
      .select("id")
      .eq("item_code", data.item_code)
      .single();

    if (existingItem) {
      return NextResponse.json(
        { error: `Item code '${data.item_code}' sudah digunakan` },
        { status: 409 }
      );
    }

    // Insert into database
    const { data: newItem, error } = await supabase
      .from("price_list")
      .insert({
        ...data,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create price list item", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Price list item berhasil dibuat", 
        data: newItem 
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