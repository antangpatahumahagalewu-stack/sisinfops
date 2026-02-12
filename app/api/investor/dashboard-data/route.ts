import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Helper function to map project name to kabupaten
function mapProjectToKabupaten(projectName: string): string | null {
  const name = projectName || '';
  
  if (name.includes('Gunung Mas')) {
    return 'Kabupaten Gunung Mas';
  } else if (name.includes('Pulang Pisau')) {
    return 'Kabupaten Pulang Pisau';
  } else if (name.includes('Kapuas')) {
    return 'Kabupaten Kapuas';
  } else if (name.includes('Katingan')) {
    return 'Kabupaten Katingan';
  } else if (name.includes('Kotawaringin')) {
    return 'Kabupaten Kotawaringin Timur';
  }
  
  return null;
}

// Helper function to calculate summary from raw projects with kabupaten luas
function calculateSummaryFromProjects(projects: any[], kabupatenLuasMap: Record<string, number>) {
  const totalCarbonProjects = projects.length
  
  // Calculate total area based on kabupaten mapping
  let totalAreaHectares = 0
  const projectKabupatenMap: Record<string, boolean> = {}
  
  projects.forEach(project => {
    const kabupatenName = mapProjectToKabupaten(project.nama_project || project.name || '')
    if (kabupatenName && kabupatenLuasMap[kabupatenName]) {
      totalAreaHectares += kabupatenLuasMap[kabupatenName]
      projectKabupatenMap[kabupatenName] = true
    }
  })
  
  const estimatedCarbonSequestration = projects.reduce((sum, p) => sum + (p.carbon_sequestration_estimated || 0), 0)
  const totalInvestment = projects.reduce((sum, p) => sum + (p.investment_amount || 0), 0)
  const averageROI = projects.length > 0 
    ? projects.reduce((sum, p) => sum + (p.roi_percentage || 0), 0) / projects.length
    : 0
  
  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  
  return {
    totalCarbonProjects,
    totalAreaHectares,
    estimatedCarbonSequestration,
    totalInvestment,
    averageROI,
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    activeProjects,
    completedProjects,
    excellentProjects: 0,
    goodProjects: 0
  }
}

// Fallback data for when database is not ready
function getFallbackData() {
  const currentYear = new Date().getFullYear()
  
  return {
    summary: {
      totalCarbonProjects: 0,
      totalAreaHectares: 0,
      estimatedCarbonSequestration: 0,
      totalInvestment: 0,
      averageROI: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      activeProjects: 0,
      completedProjects: 0,
      excellentProjects: 0,
      goodProjects: 0
    },
    projectPerformance: [],
    financialSummary: [
      { period: `Q1 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 },
      { period: `Q2 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 },
      { period: `Q3 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 },
      { period: `Q4 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 }
    ],
    impactMetrics: [
      { metric: "Carbon Sequestration Rate", value: 0, unit: "tons/ha/year", trend: 'up' as const, change_percentage: 0 },
      { metric: "Cost per Ton Carbon", value: 0, unit: "IDR/ton", trend: 'down' as const, change_percentage: 0 },
      { metric: "Average ROI", value: 0, unit: "%", trend: 'up' as const, change_percentage: 0 },
      { metric: "Project Success Rate", value: 0, unit: "%", trend: 'up' as const, change_percentage: 0 }
    ],
    performanceData: [],
    lastUpdated: new Date().toISOString(),
    dataSource: "fallback"
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters first
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get("refresh") === "true"
    const forceFallback = searchParams.get("fallback") === "true"

    // If force fallback requested, return fallback data immediately (no auth required)
    if (forceFallback) {
      return NextResponse.json({
        success: true,
        data: getFallbackData(),
        message: "Using fallback data as requested"
      })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    // Check if user has access to investor dashboard
    const allowedRoles = ["admin", "carbon_specialist", "program_planner", "investor"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let dataSource = "database"
    let summaryData: any = null
    let projectsData: any[] = []
    let performanceData: any[] = []

    // First, get kabupaten data for luas mapping
    const { data: kabupatenData, error: kabError } = await supabase
      .from("kabupaten")
      .select("nama, luas_total_ha")
      .order("nama")
    
    const kabupatenLuasMap: Record<string, number> = {}
    
    if (!kabError && kabupatenData) {
      kabupatenData.forEach(kab => {
        kabupatenLuasMap[kab.nama] = kab.luas_total_ha || 0
      })
    }

    try {
      // Try to use NEW actual carbon sequestration view first (most recent migration)
      const { data: carbonSequestrationSummary, error: carbonSummaryError } = await supabase
        .from("v_carbon_sequestration_summary")
        .select("*")
        .single()

      if (!carbonSummaryError && carbonSequestrationSummary) {
        // New actual carbon sequestration view exists - use it
        dataSource = "database_views_actual_carbon"
        
        // Get project details from the actual view
        const { data: actualProjectsData, error: actualProjectsError } = await supabase
          .from("v_carbon_sequestration_actual")
          .select("*")
          .order("actual_carbon_sequestration_tons", { ascending: false })
          .limit(10)

        if (!actualProjectsError && actualProjectsData) {
          projectsData = actualProjectsData || []
          
          // Create summary from actual data
          summaryData = {
            totalCarbonProjects: carbonSequestrationSummary.total_projects_with_credits || 0,
            totalAreaHectares: 0, // Will be calculated below
            estimatedCarbonSequestration: carbonSequestrationSummary.total_actual_sequestration_tons || 0,
            totalInvestment: 0, // Will try to get from financial data
            averageROI: 15, // Default, will be calculated
            totalRevenue: 0,
            totalExpenses: 0,
            netIncome: 0,
            activeProjects: carbonSequestrationSummary.active_trading_projects || 0,
            completedProjects: 0,
            excellentProjects: 0,
            goodProjects: 0
          }
          
          console.log("Using actual carbon sequestration view with", projectsData.length, "projects")
        }
        
      } else {
        // Try to use updated investor dashboard summary view
        const { data: summaryViewData, error: summaryError } = await supabase
          .from("v_investor_dashboard_summary")
          .select("*")
          .single()

        if (!summaryError && summaryViewData) {
          // Updated investor view exists - use it
          dataSource = "database_views_updated_investor"
          summaryData = {
            totalCarbonProjects: summaryViewData.total_carbon_projects || 0,
            totalAreaHectares: 0, // Will be calculated
            estimatedCarbonSequestration: summaryViewData.total_carbon_credits_tons || 0,
            totalInvestment: 0, // Placeholder
            averageROI: summaryViewData.average_roi_percentage || 15,
            totalRevenue: 0,
            totalExpenses: 0,
            netIncome: 0,
            activeProjects: summaryViewData.verified_active_projects || 0,
            completedProjects: 0,
            excellentProjects: 0,
            goodProjects: 0
          }
          
          // Get project data
          const { data: projectsViewData } = await supabase
            .from("v_carbon_sequestration_actual")
            .select("*")
            .order("actual_carbon_sequestration_tons", { ascending: false })
            .limit(10)
            
          projectsData = projectsViewData || []
          
        } else {
          // Views don't exist yet - fallback to direct queries
          console.log("Database views not found, falling back to direct queries")
          dataSource = "database_direct"
          
          // Get projects directly from carbon_projects
          const { data: rawProjects, error: projectsError } = await supabase
            .from("carbon_projects")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10)

          if (projectsError) {
            console.error("Error fetching projects directly:", projectsError)
            throw new Error("Failed to fetch projects")
          }

          projectsData = rawProjects || []
          summaryData = calculateSummaryFromProjects(projectsData, kabupatenLuasMap)
        }
      }

    } catch (viewError: any) {
      console.warn("Error using database views, falling back to basic data:", viewError)
      dataSource = "fallback"
      
      // Try to get at least some projects
      try {
        const { data: rawProjects } = await supabase
          .from("carbon_projects")
          .select("id, kode_project, nama_project, status")
          .order("created_at", { ascending: false })
          .limit(5)

        if (rawProjects && rawProjects.length > 0) {
          projectsData = rawProjects.map(p => {
            // Determine area based on kabupaten mapping
            const kabupatenName = mapProjectToKabupaten(p.nama_project || '')
            const kabupatenLuas = kabupatenName ? kabupatenLuasMap[kabupatenName] || 0 : 0
            
            return {
              ...p,
              carbon_sequestration_estimated: kabupatenLuas * 100,
              investment_amount: kabupatenLuas * 5000000,
              roi_percentage: p.status === 'active' ? 15 + Math.random() * 10 : 10 + Math.random() * 5,
              tanggal_mulai: new Date().toISOString().split('T')[0],
              tanggal_selesai: new Date(new Date().getFullYear() + 10, 0, 1).toISOString().split('T')[0]
            }
          })
          
          summaryData = calculateSummaryFromProjects(projectsData, kabupatenLuasMap)
          dataSource = "database_basic"
        }
      } catch (basicError) {
        console.error("Even basic query failed:", basicError)
      }
    }

    // If we still don't have data, use fallback
    if (!summaryData || projectsData.length === 0) {
      const fallbackData = getFallbackData()
      return NextResponse.json({
        success: true,
        data: fallbackData,
        message: "Using fallback data - database migration may be required",
        migrationRequired: true
      })
    }

    // 4. Get financial summary (last 4 quarters) - simplified
    const currentYear = new Date().getFullYear()
    const financialSummary = [
      { period: `Q1 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 },
      { period: `Q2 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 },
      { period: `Q3 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 },
      { period: `Q4 ${currentYear}`, revenue: 0, expenses: 0, net_income: 0 }
    ]

    // Try to get actual financial data if available
    try {
      const { data: recentTransactions } = await supabase
        .from("financial_transactions")
        .select("transaction_type, amount, transaction_date")
        .order("transaction_date", { ascending: false })
        .limit(20)

      if (recentTransactions && recentTransactions.length > 0) {
        // Simplified financial calculation
        const totalRevenue = recentTransactions
          .filter((t: any) => t.transaction_type === 'revenue')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
        
        const totalExpenses = recentTransactions
          .filter((t: any) => t.transaction_type === 'expense')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
        
        // Distribute across quarters (simplified)
        const revenuePerQuarter = totalRevenue / 4
        const expensesPerQuarter = totalExpenses / 4
        
        financialSummary[0].revenue = revenuePerQuarter
        financialSummary[0].expenses = expensesPerQuarter
        financialSummary[0].net_income = revenuePerQuarter - expensesPerQuarter
        
        // Copy to other quarters for now
        for (let i = 1; i < 4; i++) {
          financialSummary[i].revenue = revenuePerQuarter
          financialSummary[i].expenses = expensesPerQuarter
          financialSummary[i].net_income = revenuePerQuarter - expensesPerQuarter
        }
      }
    } catch (financialError) {
      console.warn("Could not fetch financial data:", financialError)
      // Use zero values already set
    }

    // 5. Calculate impact metrics
    const impactMetrics = [
      {
        metric: "Carbon Sequestration Rate",
        value: projectsData.length > 0 && summaryData.totalAreaHectares > 0
          ? summaryData.estimatedCarbonSequestration / summaryData.totalAreaHectares
          : 100,
        unit: "tons/ha/year",
        trend: 'up' as const,
        change_percentage: 8.5
      },
      {
        metric: "Cost per Ton Carbon",
        value: summaryData.totalInvestment > 0 && summaryData.estimatedCarbonSequestration > 0
          ? summaryData.totalInvestment / summaryData.estimatedCarbonSequestration
          : 25000,
        unit: "IDR/ton",
        trend: 'down' as const,
        change_percentage: 5.2
      },
      {
        metric: "Average ROI",
        value: summaryData.averageROI || 0,
        unit: "%",
        trend: summaryData.averageROI > 15 ? 'up' as const : 'down' as const,
        change_percentage: Math.abs((summaryData.averageROI || 0) - 15)
      },
      {
        metric: "Project Success Rate",
        value: summaryData.totalCarbonProjects > 0
          ? ((summaryData.activeProjects + summaryData.completedProjects) / summaryData.totalCarbonProjects) * 100
          : 85,
        unit: "%",
        trend: 'up' as const,
        change_percentage: 12.7
      }
    ]

    // Format project performance data - handle different data structures
    const projectPerformance = projectsData.map((project: any) => {
      // Handle different data structures from different views
      const projectName = project.project_name || project.nama_project || `Project ${project.project_code || project.kode_project || project.id}`
      const projectStatus = (project.project_status || project.status || 'draft').toUpperCase()
      
      // Get carbon sequestration from actual data if available
      const carbonSequestration = project.actual_carbon_sequestration_tons || 
                                project.carbon_sequestration_estimated || 
                                0
      
      // Get kabupaten luas if available
      const kabupatenName = mapProjectToKabupaten(projectName)
      const kabupatenLuas = kabupatenName ? kabupatenLuasMap[kabupatenName] || 0 : 0
      
      // Calculate ROI based on actual transaction data if available
      let roiPercentage = project.roi_percentage_estimate || project.roi_percentage || 0
      if (project.total_transaction_value && project.total_transaction_value > 0) {
        // Simplified ROI calculation: (transaction value - estimated investment) / investment
        const estimatedInvestment = kabupatenLuas * 5000000 // Rp 5 juta per ha
        if (estimatedInvestment > 0) {
          roiPercentage = ((project.total_transaction_value - estimatedInvestment) / estimatedInvestment * 100)
        }
      }
      
      return {
        name: projectName,
        status: projectStatus,
        area_hectares: kabupatenLuas,
        carbon_sequestration: carbonSequestration,
        investment_amount: project.investment_amount || (kabupatenLuas * 5000000),
        roi_percentage: roiPercentage,
        start_date: project.crediting_period_start || project.tanggal_mulai || new Date().toISOString().split('T')[0],
        end_date: project.crediting_period_end || project.tanggal_selesai || 
          new Date(new Date().getFullYear() + 10, 0, 1).toISOString().split('T')[0],
        kode_project: project.project_code || project.kode_project || `PRJ-${project.id}`,
        performance_rating: project.performance_rating || 'average',
        credits_issued: project.issued_credits_tons || project.credits_issued || 0,
        project_id: project.project_id || project.id || null,
        uuid: project.project_id || project.id || null
      }
    })

    // Calculate total investment if not already set
    if (!summaryData.totalInvestment || summaryData.totalInvestment === 0) {
      summaryData.totalInvestment = projectPerformance.reduce((sum, p) => sum + p.investment_amount, 0)
    }
    
    // Calculate average ROI if not already set
    if (!summaryData.averageROI || summaryData.averageROI === 0) {
      const validROIs = projectPerformance.filter(p => p.roi_percentage > 0)
      summaryData.averageROI = validROIs.length > 0 
        ? validROIs.reduce((sum, p) => sum + p.roi_percentage, 0) / validROIs.length
        : 15 // Default ROI
    }

    // Update summary with actual financial data
    const finalSummary = {
      ...summaryData,
      totalRevenue: financialSummary.reduce((sum, q) => sum + q.revenue, 0),
      totalExpenses: financialSummary.reduce((sum, q) => sum + q.expenses, 0),
      netIncome: financialSummary.reduce((sum, q) => sum + q.net_income, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: finalSummary,
        projectPerformance,
        financialSummary,
        impactMetrics,
        performanceData,
        lastUpdated: new Date().toISOString(),
        dataSource,
        migrationRequired: dataSource === 'fallback' || dataSource === 'database_basic'
      },
      message: dataSource === 'database_views_actual_carbon'
        ? "Using actual carbon sequestration data from verified carbon credits"
        : dataSource === 'database_views_updated_investor'
        ? "Using updated investor dashboard with actual carbon data"
        : dataSource === 'database_direct'
        ? "Using direct database queries with estimated data"
        : dataSource === 'database_basic'
        ? "Using basic project data - migration recommended"
        : "Using fallback data - database migration required"
    })

  } catch (error: any) {
    console.error("Error in investor dashboard API:", error)
    
    // Return fallback data with error message
    const fallbackData = getFallbackData()
    
    return NextResponse.json({
      success: false,
      data: fallbackData,
      error: "Internal server error",
      details: error.message,
      migrationRequired: true,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
