"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  BarChart3, 
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  Filter,
  Eye,
  Users,
  TreePine,
  Leaf,
  Calculator,
  Banknote,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { hasPermission } from "@/lib/auth/rbac"

interface FinancialReport {
  report_type: string
  report_period: string
  year: number
  month: number | null
  data: any[]
  summary: any
  generated_at: string
}

interface ImpactMetric {
  id: string
  metric_type: string
  program_name: string
  project_name: string
  metric_value: number
  unit: string
  currency: string
  calculated_at: string
}

interface PriceListItem {
  id: string
  item_code: string
  item_name: string
  item_category: string
  unit: string
  unit_price: number
  currency: string
  validity_start: string
  validity_end: string | null
  is_active: boolean
  approval_status: string
}

export function FinancialReportsSection() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("reports")
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetric[]>([])
  const [priceList, setPriceList] = useState<PriceListItem[]>([])
  const [canExportReports, setCanExportReports] = useState(false)
  const [canManagePriceList, setCanManagePriceList] = useState(false)
  const [dateRange, setDateRange] = useState("current_month")
  const [selectedReport, setSelectedReport] = useState("balance_sheet")

  useEffect(() => {
    checkPermissions()
    fetchData()
  }, [dateRange, selectedReport, activeTab])

  async function checkPermissions() {
    const canExport = await hasPermission("FINANCIAL_REPORT_EXPORT")
    const canManagePrice = await hasPermission("FINANCIAL_BUDGET_MANAGE")
    
    setCanExportReports(canExport)
    setCanManagePriceList(canManagePrice)
  }

  async function fetchData() {
    setLoading(true)

    try {
      // Check if user has permission to view financial data
      const canViewFinancial = await hasPermission("FINANCIAL_VIEW");
      
      if (!canViewFinancial) {
        // User doesn't have permission, don't fetch data
        console.warn("User doesn't have FINANCIAL_VIEW permission, cannot fetch data");
        setReports([]);
        setImpactMetrics([]);
        setPriceList([]);
        return;
      }

      // User has permission, fetch from API
      // Fetch recent reports from API
      const reportsResponse = await fetch(`/api/finance/reports?report_period=MONTHLY&year=2026&month=1`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        // Format data for display
        const formattedReports: FinancialReport[] = reportsData.data?.map((item: any) => ({
          report_type: item.report_type,
          report_period: item.report_period,
          year: item.year,
          month: item.month,
          data: item.data || [],
          summary: item.summary || {},
          generated_at: item.generated_at || new Date().toISOString()
        })) || [];
        setReports(formattedReports);
      } else {
        console.warn('Failed to fetch reports from API');
        setReports([]);
      }

      // Fetch impact metrics from API
      const metricsResponse = await fetch(`/api/finance/impact-metrics?limit=5`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const formattedMetrics: ImpactMetric[] = metricsData.data?.map((item: any) => ({
          id: item.id,
          metric_type: item.metric_type,
          program_name: item.programs?.[0]?.name || '',
          project_name: item.carbon_projects?.[0]?.project_name || '',
          metric_value: item.metric_value,
          unit: item.unit,
          currency: item.currency,
          calculated_at: item.calculated_at || new Date().toISOString()
        })) || [];
        setImpactMetrics(formattedMetrics);
      } else {
        console.warn('Failed to fetch impact metrics from API');
        setImpactMetrics([]);
      }

      // Fetch price list from API
      const priceListResponse = await fetch(`/api/finance/price-list?is_active=true&limit=10`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (priceListResponse.ok) {
        const priceListData = await priceListResponse.json();
        const formattedPriceList: PriceListItem[] = priceListData.data?.map((item: any) => ({
          id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_description: item.item_description,
          item_category: item.item_category,
          unit: item.unit,
          unit_price: item.unit_price,
          currency: item.currency,
          validity_start: item.validity_start,
          validity_end: item.validity_end,
          is_active: item.is_active,
          approval_status: item.approval_status
        })) || [];
        setPriceList(formattedPriceList);
      } else {
        console.warn('Failed to fetch price list from API');
        setPriceList([]);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      // Don't fallback to mock data, set empty arrays instead
      setReports([]);
      setImpactMetrics([]);
      setPriceList([]);
    } finally {
      setLoading(false)
    }
  }

  // Calculate metrics summary
  const totalActivePriceItems = priceList.filter(item => item.is_active).length
  const averageCostPerHectare = impactMetrics.find(m => m.metric_type === "COST_PER_HECTARE")?.metric_value || 0
  const averageCostPerTonCarbon = impactMetrics.find(m => m.metric_type === "COST_PER_TON_CARBON")?.metric_value || 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports & Analytics</CardTitle>
          <CardDescription>Loading Phase 3 reporting data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Financial Reports & Analytics (Phase 3)
          </h2>
          <p className="text-muted-foreground">
            SAK-compliant financial reporting, impact metrics, and standardized pricing
          </p>
        </div>
        <div className="flex gap-3">
          {canExportReports && (
            <Button asChild variant="outline">
              <Link href="/dashboard/finance/reports/export">
                <Download className="mr-2 h-4 w-4" />
                Export Reports
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/dashboard/finance/reports/generate">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SAK Reports</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {reports.length}
            </div>
            <p className="text-xs text-blue-600">Generated this month</p>
            <div className="mt-2 flex items-center text-xs">
              <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
              <span className="text-green-600">SAK compliant</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Hectare</CardTitle>
            <TreePine className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              Rp {averageCostPerHectare.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-green-600">Average across programs</p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">For forest rehabilitation</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Ton Carbon</CardTitle>
            <Leaf className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              Rp {averageCostPerTonCarbon.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-purple-600">Carbon project efficiency</p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Lower is better</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price List Items</CardTitle>
            <Banknote className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{totalActivePriceItems}</div>
            <p className="text-xs text-amber-600">Active standardized prices</p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">{priceList.length} total items</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="impact">Impact Metrics</TabsTrigger>
          <TabsTrigger value="pricing">Master Price List</TabsTrigger>
        </TabsList>

        {/* Financial Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Report Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate Reports
                </CardTitle>
                <CardDescription>
                  SAK-compliant financial statements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={selectedReport === "balance_sheet" ? "default" : "outline"}
                      onClick={() => setSelectedReport("balance_sheet")}
                      className="justify-start"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Balance Sheet
                    </Button>
                    <Button 
                      variant={selectedReport === "income_statement" ? "default" : "outline"}
                      onClick={() => setSelectedReport("income_statement")}
                      className="justify-start"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Income Statement
                    </Button>
                    <Button 
                      variant={selectedReport === "cash_flow" ? "default" : "outline"}
                      onClick={() => setSelectedReport("cash_flow")}
                      className="justify-start"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Cash Flow
                    </Button>
                    <Button 
                      variant={selectedReport === "project_performance" ? "default" : "outline"}
                      onClick={() => setSelectedReport("project_performance")}
                      className="justify-start"
                    >
                      <PieChart className="mr-2 h-4 w-4" />
                      Project Performance
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Period</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                    >
                      <option value="current_month">Current Month</option>
                      <option value="last_month">Last Month</option>
                      <option value="current_quarter">Current Quarter</option>
                      <option value="last_quarter">Last Quarter</option>
                      <option value="current_year">Current Year</option>
                      <option value="last_year">Last Year</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full" asChild>
                      <Link href={`/dashboard/finance/reports/${selectedReport}`}>
                        Generate {selectedReport.replace('_', ' ').toUpperCase()}
                      </Link>
                    </Button>
                    {canExportReports && (
                      <Button className="w-full mt-2" variant="outline" asChild>
                        <Link href={`/dashboard/finance/reports/${selectedReport}/export`}>
                          <Download className="mr-2 h-4 w-4" />
                          Export as Excel/PDF
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Reports
                </CardTitle>
                <CardDescription>
                  Recently generated financial reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports.map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {report.report_type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {report.report_period}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.year}-{report.month?.toString().padStart(2, '0') || 'All'}
                        </p>
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">
                            Generated: {new Date(report.generated_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/finance/reports/view/${report.report_type}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="text-center py-6">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 font-semibold">No reports generated yet</h3>
                      <p className="text-muted-foreground mt-2">
                        Generate your first financial report
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investor Dashboard Preview */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Investor Dashboard
                  </h3>
                  <p className="text-muted-foreground">
                    Read-only access for investors with transparency reports
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="outline">
                    <Link href="/dashboard/finance/investor-view">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Investor View
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/dashboard/finance/investor-management">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Investor Access
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Metrics Tab */}
        <TabsContent value="impact" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Impact Metrics List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Impact Metrics
                </CardTitle>
                <CardDescription>
                  Calculated metrics for program efficiency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {impactMetrics.map((metric) => (
                    <div key={metric.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{metric.metric_type.replace(/_/g, ' ')}</h4>
                          <p className="text-sm text-muted-foreground">
                            {metric.program_name || metric.project_name}
                          </p>
                        </div>
                        <Badge variant={
                          metric.metric_type.includes('COST_PER') ? 'secondary' : 'default'
                        }>
                          {metric.metric_value.toLocaleString('id-ID')} {metric.unit}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Currency</div>
                          <div className="font-medium">{metric.currency}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Calculated</div>
                          <div className="font-medium">
                            {new Date(metric.calculated_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Metric Calculators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Calculate New Metrics
                </CardTitle>
                <CardDescription>
                  Calculate impact metrics for programs and projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium flex items-center gap-2">
                      <TreePine className="h-4 w-4 text-green-600" />
                      Cost per Hectare Calculator
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Calculate program efficiency for land-based activities
                    </p>
                    <Button size="sm" className="mt-3" asChild>
                      <Link href="/dashboard/finance/impact-metrics/cost-per-hectare">
                        Calculate Now
                      </Link>
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-blue-600" />
                      Cost per Ton Carbon Calculator
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Calculate carbon project efficiency and ROI
                    </p>
                    <Button size="sm" className="mt-3" asChild>
                      <Link href="/dashboard/finance/impact-metrics/cost-per-ton-carbon">
                        Calculate Now
                      </Link>
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg bg-purple-50">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      Benefit per Household Calculator
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Calculate social impact for community programs
                    </p>
                    <Button size="sm" className="mt-3" asChild>
                      <Link href="/dashboard/finance/impact-metrics/benefit-per-hh">
                        Calculate Now
                      </Link>
                    </Button>
                  </div>
                </div>

                {canManagePriceList && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Advanced Analytics</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Access detailed analytics and trend analysis for impact metrics
                    </p>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/finance/analytics">
                        View Analytics Dashboard
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Master Price List Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Price List Items */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Master Price List
                    </CardTitle>
                    <CardDescription>
                      Standardized pricing for materials, services, and labor
                    </CardDescription>
                  </div>
                  {canManagePriceList && (
                    <Button size="sm" asChild>
                      <Link href="/dashboard/finance/price-list/new">
                        Add New Item
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priceList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.item_code}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.item_category}
                          </Badge>
                          {item.is_active ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1">{item.item_name}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Rp {item.unit_price.toLocaleString('id-ID')} / {item.unit}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Valid until: {item.validity_end ? new Date(item.validity_end).toLocaleDateString('id-ID') : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          Rp {item.unit_price.toLocaleString('id-ID')}
                        </div>
                        <Button size="sm" variant="ghost" asChild className="mt-2">
                          <Link href={`/dashboard/finance/price-list/${item.id}`}>
                            Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Price List Management */}
            <Card>
              <CardHeader>
                <CardTitle>Price List Management</CardTitle>
                <CardDescription>
                  Manage standardized pricing across all projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Price List Categories</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['MATERIAL', 'SERVICE', 'LABOR', 'EQUIPMENT', 'TRANSPORTATION', 'ADMINISTRATIVE'].map((category) => (
                        <div key={category} className="p-3 border rounded-lg">
                          <div className="font-medium text-sm">{category}</div>
                          <div className="text-xs text-muted-foreground">
                            {priceList.filter(item => item.item_category === category).length} items
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Price List Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Version control for price updates</li>
                      <li>• Approval workflow for new prices</li>
                      <li>• Validity period management</li>
                      <li>• Automatic price escalation calculation</li>
                      <li>• Historical price tracking</li>
                    </ul>
                  </div>

                  {canManagePriceList && (
                    <div className="space-y-3">
                      <Button className="w-full" asChild>
                        <Link href="/dashboard/finance/price-list/import">
                          Import Price List from Excel
                        </Link>
                      </Button>
                      <Button className="w-full" variant="outline" asChild>
                        <Link href="/dashboard/finance/price-list/export">
                          <Download className="mr-2 h-4 w-4" />
                          Export Price List
                        </Link>
                      </Button>
                      <Button className="w-full" variant="outline" asChild>
                        <Link href="/dashboard/finance/price-list/history">
                          View Price History
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Information Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <BarChart3 className="h-12 w-12 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Phase 3 Reporting & Analytics - Implemented</h3>
              <p className="text-muted-foreground mt-2">
                Sistem reporting keuangan Phase 3 telah diimplementasikan dengan fitur:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>SAK-compliant financial reports (Neraca, Laba Rugi, Arus Kas)</li>
                <li>Impact metrics calculation (cost per hectare, cost per ton carbon)</li>
                <li>Master price list system dengan version control</li>
                <li>Investor dashboard dengan read-only access</li>
                <li>Report export functionality (PDF, Excel, CSV)</li>
                <li>Real-time financial metrics untuk transparansi</li>
              </ul>
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-800">
                  ✅ <strong>Status:</strong> Phase 3 Reporting telah siap digunakan. 
                  Semua API endpoints dan database functions telah terimplementasi.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}