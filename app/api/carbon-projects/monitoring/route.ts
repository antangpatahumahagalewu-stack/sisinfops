import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for monitoring data entry
const monitoringDataSchema = z.object({
  carbon_project_id: z.string().uuid("Invalid carbon project ID"),
  monitoring_date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  carbon_sequestration_actual: z.number().min(0, "Actual carbon sequestration must be >= 0").optional().nullable(),
  carbon_sequestration_target: z.number().min(0, "Target carbon sequestration must be >= 0").optional().nullable(),
  forest_cover_ha: z.number().min(0, "Forest cover must be >= 0").optional().nullable(),
  deforestation_rate: z.number().min(0, "Deforestation rate must be >= 0").max(100, "Deforestation rate cannot exceed 100%").optional().nullable(),
  community_participation_count: z.number().int().min(0, "Community participation count must be >= 0").optional().nullable(),
  carbon_credits_issued: z.number().min(0, "Carbon credits issued must be >= 0").optional().nullable(),
  carbon_credits_sold: z.number().min(0, "Carbon credits sold must be >= 0").optional().nullable(),
  revenue_generated: z.number().min(0, "Revenue generated must be >= 0").optional().nullable(),
  notes: z.string().optional().nullable(),
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const carbon_project_id = searchParams.get("carbon_project_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    let query = supabase
      .from("carbon_monitoring_data")
      .select(`
        *,
        carbon_projects!inner(kode_project, nama_project, standar_karbon)
      `, { count: 'exact' });

    // Apply filters
    if (carbon_project_id) {
      query = query.eq("carbon_project_id", carbon_project_id);
    }
    if (start_date) {
      query = query.gte("monitoring_date", start_date);
    }
    if (end_date) {
      query = query.lte("monitoring_date", end_date);
    }

    // Apply ordering and pagination
    query = query.order("monitoring_date", { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: monitoringData, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch monitoring data", details: error.message },
        { status: 500 }
      );
    }

    // If no specific project ID, also return summary statistics
    let summary = null;
    if (carbon_project_id) {
      const { data: projectData } = await supabase
        .from("carbon_projects")
        .select("estimasi_penyimpanan_karbon, luas_total_ha")
        .eq("id", carbon_project_id)
        .single();

      if (projectData && monitoringData && monitoringData.length > 0) {
        const totalActual = monitoringData.reduce((sum, item) => sum + (item.carbon_sequestration_actual || 0), 0);
        const latestData = monitoringData[0]; // most recent
        const progressPercentage = projectData.estimasi_penyimpanan_karbon 
          ? (totalActual / projectData.estimasi_penyimpanan_karbon) * 100 
          : 0;

        summary = {
          total_actual_carbon_sequestration: totalActual,
          target_carbon_sequestration: projectData.estimasi_penyimpanan_karbon,
          progress_percentage: Math.min(progressPercentage, 100),
          latest_monitoring_date: latestData.monitoring_date,
          forest_cover_ha: latestData.forest_cover_ha,
          deforestation_rate: latestData.deforestation_rate,
          carbon_credits_issued: monitoringData.reduce((sum, item) => sum + (item.carbon_credits_issued || 0), 0),
          carbon_credits_sold: monitoringData.reduce((sum, item) => sum + (item.carbon_credits_sold || 0), 0),
          total_revenue: monitoringData.reduce((sum, item) => sum + (item.revenue_generated || 0), 0),
        };
      }
    }

    return NextResponse.json(
      {
        data: monitoringData || [],
        summary,
        total: count || 0,
        limit,
        offset,
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

    // Check user role - only admin, carbon_specialist, or monev_officer can add monitoring data
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["admin", "carbon_specialist", "monev_officer"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin, carbon specialist, or M&E officer can add monitoring data" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = monitoringDataSchema.safeParse(body);
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

    // Check if carbon project exists
    const { data: projectExists } = await supabase
      .from("carbon_projects")
      .select("id")
      .eq("id", data.carbon_project_id)
      .single();

    if (!projectExists) {
      return NextResponse.json(
        { error: "Carbon project not found" },
        { status: 404 }
      );
    }

    // Check if monitoring entry already exists for this project and date
    const monitoringDate = new Date(data.monitoring_date).toISOString().split('T')[0];
    const { data: existingEntry } = await supabase
      .from("carbon_monitoring_data")
      .select("id")
      .eq("carbon_project_id", data.carbon_project_id)
      .eq("monitoring_date", monitoringDate)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: "Monitoring data already exists for this project and date. Use PUT to update." },
        { status: 409 }
      );
    }

    // Prepare insert data
    const insertData = {
      carbon_project_id: data.carbon_project_id,
      monitoring_date: monitoringDate,
      carbon_sequestration_actual: data.carbon_sequestration_actual || null,
      carbon_sequestration_target: data.carbon_sequestration_target || null,
      forest_cover_ha: data.forest_cover_ha || null,
      deforestation_rate: data.deforestation_rate || null,
      community_participation_count: data.community_participation_count || null,
      carbon_credits_issued: data.carbon_credits_issued || null,
      carbon_credits_sold: data.carbon_credits_sold || null,
      revenue_generated: data.revenue_generated || null,
      notes: data.notes || null,
      recorded_by: session.user.id,
    };

    // Insert into database
    const { data: newMonitoringEntry, error } = await supabase
      .from("carbon_monitoring_data")
      .insert(insertData)
      .select(`
        *,
        carbon_projects(kode_project, nama_project)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create monitoring entry", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Monitoring data berhasil ditambahkan", 
        data: newMonitoringEntry,
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

    // Check user role - only admin, carbon_specialist, or monev_officer can update
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["admin", "carbon_specialist", "monev_officer"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin, carbon specialist, or M&E officer can update monitoring data" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Monitoring entry ID is required" },
        { status: 400 }
      );
    }

    // Validate input (partial validation for updates)
    const validationResult = monitoringDataSchema.partial().safeParse(body);
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

    // Check if monitoring entry exists
    const { data: existingEntry } = await supabase
      .from("carbon_monitoring_data")
      .select("id, carbon_project_id")
      .eq("id", id)
      .single();

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Monitoring entry not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (data.monitoring_date) {
      updateData.monitoring_date = new Date(data.monitoring_date).toISOString().split('T')[0];
    }
    if (data.carbon_sequestration_actual !== undefined) updateData.carbon_sequestration_actual = data.carbon_sequestration_actual;
    if (data.carbon_sequestration_target !== undefined) updateData.carbon_sequestration_target = data.carbon_sequestration_target;
    if (data.forest_cover_ha !== undefined) updateData.forest_cover_ha = data.forest_cover_ha;
    if (data.deforestation_rate !== undefined) updateData.deforestation_rate = data.deforestation_rate;
    if (data.community_participation_count !== undefined) updateData.community_participation_count = data.community_participation_count;
    if (data.carbon_credits_issued !== undefined) updateData.carbon_credits_issued = data.carbon_credits_issued;
    if (data.carbon_credits_sold !== undefined) updateData.carbon_credits_sold = data.carbon_credits_sold;
    if (data.revenue_generated !== undefined) updateData.revenue_generated = data.revenue_generated;
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updated_at = new Date().toISOString();

    // Update in database
    const { data: updatedEntry, error } = await supabase
      .from("carbon_monitoring_data")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        carbon_projects(kode_project, nama_project)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update monitoring entry", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Monitoring data berhasil diperbarui", 
        data: updatedEntry,
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
