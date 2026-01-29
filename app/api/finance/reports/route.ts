import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";

// Valid report types
const REPORT_TYPES = [
  'BALANCE_SHEET',
  'INCOME_STATEMENT',
  'CASH_FLOW',
  'BUDGET_VS_ACTUAL',
  'LEDGER_SUMMARY',
  'PROJECT_PERFORMANCE'
] as const;

// Valid report periods
const REPORT_PERIODS = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
] as const;

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

    // Check if user has permission to view financial reports
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat laporan keuangan" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get("report_type") as typeof REPORT_TYPES[number];
    const reportPeriod = searchParams.get("report_period") as typeof REPORT_PERIODS[number] || 'MONTHLY';
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

    // Validate report type
    if (!reportType) {
      return NextResponse.json(
        { error: "Parameter report_type wajib diisi" },
        { status: 400 }
      );
    }

    if (!REPORT_TYPES.includes(reportType)) {
      return NextResponse.json(
        { error: `Jenis laporan tidak valid. Pilihan: ${REPORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!REPORT_PERIODS.includes(reportPeriod)) {
      return NextResponse.json(
        { error: `Periode laporan tidak valid. Pilihan: ${REPORT_PERIODS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate year
    if (year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "Tahun harus antara 2000 dan 2100" },
        { status: 400 }
      );
    }

    // Validate month if provided
    if (month && (month < 1 || month > 12)) {
      return NextResponse.json(
        { error: "Bulan harus antara 1 dan 12" },
        { status: 400 }
      );
    }

    // Generate report using database function
    const { data: reportData, error } = await supabase.rpc(
      'generate_financial_report',
      {
        p_report_type: reportType,
        p_report_period: reportPeriod,
        p_year: year,
        p_month: month,
        p_user_id: session.user.id
      }
    );

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal menghasilkan laporan keuangan", details: error.message },
        { status: 500 }
      );
    }

    // If report data is null or empty, return appropriate message
    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      return NextResponse.json(
        { 
          message: "Tidak ada data untuk laporan yang diminta",
          report_type: reportType,
          report_period: reportPeriod,
          year: year,
          month: month,
          data: []
        },
        { status: 200 }
      );
    }

    // Format response based on report type
    let formattedData = reportData;
    let summary = null;

    switch (reportType) {
      case 'BALANCE_SHEET':
        // Calculate totals for balance sheet
        const assets = reportData.filter((item: any) => item.section === 'ASSETS');
        const liabilities = reportData.filter((item: any) => item.section === 'LIABILITIES');
        const equity = reportData.filter((item: any) => item.section === 'EQUITY');

        const totalAssets = assets.reduce((sum: number, item: any) => sum + parseFloat(item.balance || 0), 0);
        const totalLiabilities = liabilities.reduce((sum: number, item: any) => sum + parseFloat(item.balance || 0), 0);
        const totalEquity = equity.reduce((sum: number, item: any) => sum + parseFloat(item.balance || 0), 0);

        summary = {
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          total_equity: totalEquity,
          balance_check: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 // Accounting for floating point
        };
        break;

      case 'INCOME_STATEMENT':
        // Calculate totals for income statement
        const revenueItems = reportData.filter((item: any) => item.section === 'REVENUE');
        const expenseItems = reportData.filter((item: any) => item.section === 'EXPENSES');
        const netIncomeItem = reportData.find((item: any) => item.section === 'NET_INCOME');

        const totalRevenueAmount = revenueItems.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
        const totalExpensesAmount = expenseItems.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
        const netIncomeValue = netIncomeItem ? parseFloat(netIncomeItem.amount || 0) : totalRevenueAmount - totalExpensesAmount;

        summary = {
          total_revenue: totalRevenueAmount,
          total_expenses: totalExpensesAmount,
          net_income: netIncomeValue,
          profit_margin: totalRevenueAmount > 0 ? (netIncomeValue / totalRevenueAmount) * 100 : 0
        };
        break;

      case 'CASH_FLOW':
        // Calculate totals for cash flow
        const operatingActivity = reportData.find((item: any) => item.activity_type === 'OPERATING');
        const investingActivity = reportData.find((item: any) => item.activity_type === 'INVESTING');
        const financingActivity = reportData.find((item: any) => item.activity_type === 'FINANCING');

        const netOperatingCash = operatingActivity ? operatingActivity.net_cash_flow : 0;
        const netInvestingCash = investingActivity ? investingActivity.net_cash_flow : 0;
        const netFinancingCash = financingActivity ? financingActivity.net_cash_flow : 0;
        const netCashChangeTotal = netOperatingCash + netInvestingCash + netFinancingCash;

        summary = {
          net_operating_cash_flow: netOperatingCash,
          net_investing_cash_flow: netInvestingCash,
          net_financing_cash_flow: netFinancingCash,
          net_cash_change: netCashChangeTotal
        };
        break;

      case 'PROJECT_PERFORMANCE':
        // Calculate project performance summary
        const totalProjects = reportData.length;
        const projectTotalRevenue = reportData.reduce((sum: number, item: any) => sum + parseFloat(item.total_revenue || 0), 0);
        const projectTotalExpenses = reportData.reduce((sum: number, item: any) => sum + parseFloat(item.total_expenses || 0), 0);
        const projectTotalNetIncome = reportData.reduce((sum: number, item: any) => sum + parseFloat(item.net_income || 0), 0);
        const averageBudgetUtilization = totalProjects > 0 
          ? reportData.reduce((sum: number, item: any) => sum + parseFloat(item.budget_utilization_percentage || 0), 0) / totalProjects
          : 0;

        summary = {
          total_projects: totalProjects,
          total_revenue: projectTotalRevenue,
          total_expenses: projectTotalExpenses,
          total_net_income: projectTotalNetIncome,
          average_budget_utilization: averageBudgetUtilization
        };
        break;
    }

    return NextResponse.json(
      {
        message: "Laporan keuangan berhasil dihasilkan",
        report_type: reportType,
        report_period: reportPeriod,
        year: year,
        month: month,
        generated_at: new Date().toISOString(),
        data: formattedData,
        summary: summary,
        metadata: {
          row_count: Array.isArray(formattedData) ? formattedData.length : 1,
          is_cached: false // We could add cache detection later
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

// Export report to various formats
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

    // Check if user has permission to export reports
    const canExport = await hasPermission("FINANCIAL_REPORT_EXPORT", session.user.id);
    if (!canExport) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk mengekspor laporan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { report_type, export_type, parameters } = body;

    // Validate required fields
    if (!report_type || !export_type) {
      return NextResponse.json(
        { error: "Parameter report_type dan export_type wajib diisi" },
        { status: 400 }
      );
    }

    // Validate export type
    const validExportTypes = ['PDF', 'EXCEL', 'CSV', 'JSON'];
    if (!validExportTypes.includes(export_type)) {
      return NextResponse.json(
        { error: `Format ekspor tidak valid. Pilihan: ${validExportTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate report type
    if (!REPORT_TYPES.includes(report_type)) {
      return NextResponse.json(
        { error: `Jenis laporan tidak valid. Pilihan: ${REPORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate export using database function
    const { data: exportResult, error } = await supabase.rpc(
      'export_financial_report',
      {
        p_report_type: report_type,
        p_export_type: export_type,
        p_parameters: parameters || {},
        p_user_id: session.user.id
      }
    );

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal mengekspor laporan", details: error.message },
        { status: 500 }
      );
    }

    if (!exportResult || exportResult.length === 0) {
      return NextResponse.json(
        { error: "Gagal menghasilkan ekspor laporan" },
        { status: 500 }
      );
    }

    const exportData = exportResult[0];

    return NextResponse.json(
      {
        message: "Laporan berhasil diekspor",
        export_id: exportData.export_id,
        download_url: exportData.download_url,
        file_size_bytes: exportData.file_size_bytes,
        export_type: export_type,
        report_type: report_type,
        exported_at: new Date().toISOString()
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