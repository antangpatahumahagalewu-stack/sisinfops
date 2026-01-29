import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";

// Schema for impact metrics calculation
const impactMetricsSchema = z.object({
  metric_type: z.enum(['COST_PER_HECTARE', 'COST_PER_TON_CARBON', 'BENEFIT_PER_HH', 'ROI', 'SOCIAL_IMPACT', 'ENVIRONMENTAL_IMPACT']),
  program_id: z.string().uuid().optional().nullable(),
  carbon_project_id: z.string().uuid().optional().nullable(),
  calculation_period: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'PROJECT_LIFETIME']),
  period_year: z.number().int().min(2000).max(2100),
  period_month: z.number().int().min(1).max(12).optional().nullable(),
  metric_value: z.number().positive(),
  currency: z.string().length(3).default('IDR'),
  unit: z.string().min(1).max(50),
  calculation_method: z.string().optional().nullable(),
  data_source: z.string().optional().nullable(),
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

    // Check if user has permission to view impact metrics
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat metrik dampak" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const metric_type = searchParams.get("metric_type");
    const program_id = searchParams.get("program_id");
    const carbon_project_id = searchParams.get("carbon_project_id");
    const calculation_period = searchParams.get("calculation_period");
    const period_year = searchParams.get("period_year");
    const period_month = searchParams.get("period_month");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    let query = supabase
      .from("impact_metrics_calculation")
      .select(`
        *,
        programs:program_id (name, description),
        carbon_projects:carbon_project_id (project_name, project_code)
      `, { count: 'exact' });

    // Apply filters
    if (metric_type) {
      query = query.eq("metric_type", metric_type);
    }
    
    if (program_id) {
      query = query.eq("program_id", program_id);
    }

    if (carbon_project_id) {
      query = query.eq("carbon_project_id", carbon_project_id);
    }

    if (calculation_period) {
      query = query.eq("calculation_period", calculation_period);
    }

    if (period_year) {
      query = query.eq("period_year", parseInt(period_year));
    }

    if (period_month) {
      query = query.eq("period_month", parseInt(period_month));
    }

    // Apply pagination and ordering
    query = query.order("calculated_at", { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: metrics, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data metrik dampak", details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const summary = {
      total_metrics: count || 0,
      by_metric_type: {} as Record<string, number>,
      by_program: {} as Record<string, number>,
      by_project: {} as Record<string, number>,
    };

    if (metrics) {
      // Count by metric type
      metrics.forEach(metric => {
        summary.by_metric_type[metric.metric_type] = (summary.by_metric_type[metric.metric_type] || 0) + 1;
        
        if (metric.program_id && metric.programs?.[0]?.name) {
          const programName = metric.programs[0].name;
          summary.by_program[programName] = (summary.by_program[programName] || 0) + 1;
        }
        
        if (metric.carbon_project_id && metric.carbon_projects?.[0]?.project_name) {
          const projectName = metric.carbon_projects[0].project_name;
          summary.by_project[projectName] = (summary.by_project[projectName] || 0) + 1;
        }
      });
    }

    return NextResponse.json(
      { 
        data: metrics || [],
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

    // Check if user has permission to create impact metrics
    const canCreate = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk membuat metrik dampak" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = impactMetricsSchema.safeParse(body);
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

    // Validate that either program_id or carbon_project_id is provided
    if (!data.program_id && !data.carbon_project_id) {
      return NextResponse.json(
        { error: "Salah satu dari program_id atau carbon_project_id harus diisi" },
        { status: 400 }
      );
    }

    // Check if program exists if provided
    if (data.program_id) {
      const { data: program } = await supabase
        .from("programs")
        .select("id")
        .eq("id", data.program_id)
        .single();
      
      if (!program) {
        return NextResponse.json(
          { error: "Program tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Check if carbon project exists if provided
    if (data.carbon_project_id) {
      const { data: carbonProject } = await supabase
        .from("carbon_projects")
        .select("id")
        .eq("id", data.carbon_project_id)
        .single();
      
      if (!carbonProject) {
        return NextResponse.json(
          { error: "Proyek karbon tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      ...data,
      calculated_by: session.user.id,
      calculated_at: new Date().toISOString(),
    };

    // Insert into database
    const { data: newMetric, error } = await supabase
      .from("impact_metrics_calculation")
      .insert(insertData)
      .select(`
        *,
        programs:program_id (name, description),
        carbon_projects:carbon_project_id (project_name, project_code)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal membuat metrik dampak", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Metrik dampak berhasil dibuat", 
        data: newMetric,
        id: newMetric.id 
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

// Endpoint to calculate cost per hectare
export async function GETCostPerHectare(request: NextRequest) {
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

    // Check if user has permission to view financial reports
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat metrik dampak" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const program_id = searchParams.get("program_id");
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    if (!program_id) {
      return NextResponse.json(
        { error: "Parameter program_id wajib diisi" },
        { status: 400 }
      );
    }

    // Validate program exists
    const { data: program } = await supabase
      .from("programs")
      .select("id, name")
      .eq("id", program_id)
      .single();

    if (!program) {
      return NextResponse.json(
        { error: "Program tidak ditemukan" },
        { status: 404 }
      );
    }

    // Use database function to calculate cost per hectare
    const { data: costData, error } = await supabase.rpc(
      'calculate_cost_per_hectare',
      {
        p_program_id: program_id,
        p_year: year
      }
    );

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal menghitung biaya per hektar", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Biaya per hektar berhasil dihitung",
        program_id: program_id,
        program_name: program.name,
        year: year,
        data: costData || [],
        calculated_at: new Date().toISOString()
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

// Endpoint to calculate cost per ton carbon
export async function GETCostPerTonCarbon(request: NextRequest) {
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

    // Check if user has permission to view financial reports
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat metrik dampak" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const carbon_project_id = searchParams.get("carbon_project_id");
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    if (!carbon_project_id) {
      return NextResponse.json(
        { error: "Parameter carbon_project_id wajib diisi" },
        { status: 400 }
      );
    }

    // Validate carbon project exists
    const { data: carbonProject } = await supabase
      .from("carbon_projects")
      .select("id, project_name")
      .eq("id", carbon_project_id)
      .single();

    if (!carbonProject) {
      return NextResponse.json(
        { error: "Proyek karbon tidak ditemukan" },
        { status: 404 }
      );
    }

    // Use database function to calculate cost per ton carbon
    const { data: costData, error } = await supabase.rpc(
      'calculate_cost_per_ton_carbon',
      {
        p_carbon_project_id: carbon_project_id,
        p_year: year
      }
    );

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal menghitung biaya per ton karbon", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Biaya per ton karbon berhasil dihitung",
        carbon_project_id: carbon_project_id,
        project_name: carbonProject.project_name,
        year: year,
        data: costData || [],
        calculated_at: new Date().toISOString()
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