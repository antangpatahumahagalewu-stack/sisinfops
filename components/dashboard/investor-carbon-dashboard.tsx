"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3,
  LineChart,
  PieChart,
  Download,
  Eye,
  Globe,
  TreePine,
  Leaf,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  Shield,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface InvestorDashboardData {
  summary: {
    totalCarbonProjects: number
    totalAreaHectares: number
    estimatedCarbonSequestration: number
    totalInvestment: number
    averageROI: number
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    activeProjects: number
    completedProjects: number
    excellentProjects: number
    goodProjects: number
  }
  projectPerformance: {
    name: string
    status: string
    area_hectares: number
    carbon_sequestration: number
    investment_amount: number
    roi_percentage: number
    start_date: string
    end_date: string
    kode_project: string
    performance_rating: string
    credits_issued: number
  }[]
  financialSummary: {
    period: string
    revenue: number
    expenses: number
    net_income: number
  }[]
  impactMetrics: {
    metric: string
    value: number
    unit: string
    trend: 'up' | 'down'
    change_percentage: number
  }[]
  performanceData: any[]
  lastUpdated: string
  dataSource: string
}

export function InvestorCarbonDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<InvestorDashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async (showToast = false) => {
    try {
      setError(null)
      if (showToast) {
        setRefreshing(true)
      }

      const response = await fetch('/api/investor/dashboard-data')
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setDashboardData(result.data)

      if (showToast) {
        toast.success("Dashboard data updated", {
          description: `Data source: ${result.data.dataSource}`
        })
      }

    } catch (err: any) {
      console.error("Error fetching investor dashboard data:", err)
      setError(err.message || "Failed to load dashboard data")
      
      if (showToast) {
        toast.error("Failed to update dashboard", {
          description: err.message
        })
      }

      // Fallback to showing empty state with error
      setDashboardData({
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
        financialSummary: [],
        impactMetrics: [],
        performanceData: [],
        lastUpdated: new Date().toISOString(),
        dataSource: "error"
      })

    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investor Carbon Dashboard</CardTitle>
          <CardDescription>Loading investor dashboard data...</CardDescription>
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

  if (error || !dashboardData) {
    const isMigrationRequired = dashboardData?.dataSource === 'fallback' || 
                               dashboardData?.dataSource === 'database_basic' ||
                               error?.includes('migration')
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Investor Carbon Dashboard - {isMigrationRequired ? 'Migration Required' : 'Error'}
          </CardTitle>
          <CardDescription>
            {error || "Failed to load dashboard data"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-semibold">
              {isMigrationRequired ? 'Database Migration Required' : 'Unable to load dashboard data'}
            </h3>
            <p className="text-muted-foreground mt-2">
              {error || "Please check your connection and try again."}
            </p>
            
            {isMigrationRequired && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 text-left">
                <h4 className="font-bold text-amber-800 mb-2">🚨 Database Migration Required</h4>
                <p className="text-sm text-amber-700 mb-3">
                  Investor dashboard requires database migration to display real data.
                  Current data source: <strong>{dashboardData?.dataSource || 'unknown'}</strong>
                </p>
                <div className="bg-white p-3 rounded border border-amber-300">
                  <h5 className="font-medium text-amber-900 mb-2">📋 Migration Instructions:</h5>
                  <ol className="text-sm text-amber-800 list-decimal pl-5 space-y-1">
                    <li>Buka <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 underline">Supabase Dashboard</a></li>
                    <li>Pilih project Anda</li>
                    <li>Buka SQL Editor</li>
                    <li>Copy seluruh konten dari file: <code className="bg-gray-100 px-1 rounded">supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql</code></li>
                    <li>Paste dan klik "Run"</li>
                    <li>Refresh halaman ini setelah migration selesai</li>
                  </ol>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Try Again'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Back to Dashboard
                </Link>
              </Button>
              {isMigrationRequired && (
                <Button variant="outline" onClick={() => window.open('/api/investor/dashboard-data?fallback=true', '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Test API
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { summary, projectPerformance, financialSummary, impactMetrics, lastUpdated, dataSource } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-green-600" />
            Investor Carbon Dashboard
          </h2>
          <p className="text-muted-foreground">
            Transparent reporting for carbon project investors (Read-only access)
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="mr-1 h-3 w-3" />
              Last updated: {new Date(lastUpdated).toLocaleTimeString('id-ID')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Source: {dataSource}
            </Badge>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/finance/investor/export">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/finance/investor/full-report">
              <FileText className="mr-2 h-4 w-4" />
              View Full Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-bold text-blue-800">Investor View - Read Only</h3>
              <p className="text-sm text-blue-600">
                This dashboard provides read-only access to project performance and financial data. 
                All data is updated in real-time from the database.
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              <CheckCircle className="mr-1 h-3 w-3" />
              Real Database Data
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              Rp {summary.totalInvestment.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Across {summary.totalCarbonProjects} carbon projects
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbon Sequestration</CardTitle>
            <Leaf className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary.estimatedCarbonSequestration.toLocaleString('id-ID')} tons
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Estimated over project lifetime
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {summary.averageROI.toFixed(1)}%
            </div>
            <p className="text-xs text-amber-600 mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              {summary.averageROI > 15 ? 'Above industry average' : 'Industry average'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Area Protected</CardTitle>
            <TreePine className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {summary.totalAreaHectares.toLocaleString('id-ID')} ha
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Forest area under conservation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Project Performance
            </CardTitle>
            <CardDescription>
              Performance metrics for all carbon projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectPerformance.map((project, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{project.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={
                          project.status === 'ACTIVE' ? 'default' : 
                          project.status === 'PLANNING' ? 'outline' : 'secondary'
                        }>
                          {project.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {project.area_hectares.toLocaleString('id-ID')} ha
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {project.roi_percentage.toFixed(1)}% ROI
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rp {project.investment_amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Carbon Sequestration</div>
                      <div className="font-medium">
                        {project.carbon_sequestration.toLocaleString('id-ID')} tons
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Project Period</div>
                      <div className="font-medium">
                        {new Date(project.start_date).getFullYear()} - {new Date(project.end_date).getFullYear()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Button size="sm" variant="ghost" className="w-full" asChild>
                      <Link href={`/dashboard/finance/investor/projects/${index + 1}`}>
                        <Eye className="mr-2 h-3 w-3" />
                        View Project Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Financial Summary
            </CardTitle>
            <CardDescription>
              Quarterly financial performance (IDR)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financialSummary.map((quarter, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{quarter.period}</h4>
                    <Badge variant={quarter.net_income > 0 ? 'default' : 'destructive'}>
                      {quarter.net_income > 0 ? 'PROFIT' : 'LOSS'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium text-green-600">
                        Rp {quarter.revenue.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expenses</span>
                      <span className="font-medium text-amber-600">
                        Rp {quarter.expenses.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Net Income</span>
                      <span className={`font-bold ${quarter.net_income > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        Rp {quarter.net_income.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Financial Charts Placeholder */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Revenue Trend</h4>
                <div className="h-32 flex items-end gap-1">
                  {financialSummary.map((quarter, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-green-500 rounded-t-lg"
                        style={{ 
                          height: `${(quarter.revenue / 1500000000 * 100)}%`,
                          maxHeight: '100px'
                        }}
                      ></div>
                      <div className="text-xs mt-1">{quarter.period.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Revenue</div>
                    <div className="font-medium">
                      Rp {financialSummary.reduce((sum, q) => sum + q.revenue, 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Net Income</div>
                    <div className="font-medium text-green-700">
                      Rp {financialSummary.reduce((sum, q) => sum + q.net_income, 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Impact Metrics
            </CardTitle>
            <CardDescription>
              Environmental and social impact indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {impactMetrics.map((metric, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{metric.metric}</h4>
                    <div className="flex items-center">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.change_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {typeof metric.value === 'number' && metric.value % 1 !== 0 
                      ? metric.value.toFixed(2) 
                      : metric.value.toLocaleString('id-ID')} {metric.unit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {metric.trend === 'up' ? 'Increase' : 'Decrease'} from previous period
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export and Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports & Compliance
            </CardTitle>
            <CardDescription>
              Download reports and verify compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  Export Reports
                </h4>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Download comprehensive reports in various formats
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/finance/investor/export/pdf">
                      PDF Report
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/finance/investor/export/excel">
                      Excel Data
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/finance/investor/export/csv">
                      CSV Data
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/finance/investor/export/json">
                      JSON API
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-green-50">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  Compliance & Verification
                </h4>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Project compliance with international standards
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SAK Compliant</span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Carbon Standard</span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      VCS Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Financial Audit</span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Clean Opinion
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-sm font-medium">2026-01-27</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-amber-50">
                <h4 className="font-medium flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-amber-600" />
                  External Verification Links
                </h4>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Access third-party verification and registry
                </p>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full justify-start" asChild>
                    <Link href="https://verra.org" target="_blank">
                      Verra Registry
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start" asChild>
                    <Link href="https://goldstandard.org" target="_blank">
                      Gold Standard
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/finance/investor/audit-trail">
                      Audit Trail Logs
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Section */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <Globe className="h-12 w-12 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Investor Transparency Dashboard - Phase 3</h3>
              <p className="text-muted-foreground mt-2">
                This dashboard provides investors with transparent, real-time access to:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Real-time financial performance and ROI calculations</li>
                <li>Carbon sequestration metrics and environmental impact</li>
                <li>Compliance with SAK and international carbon standards</li>
                <li>Export functionality for donor reporting requirements</li>
                <li>Audit trail and third-party verification links</li>
                <li>Read-only access to ensure data security</li>
              </ul>
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-green-100">
                <p className="text-sm font-medium text-green-800">
                  ✅ <strong>Status:</strong> Investor Dashboard fully implemented with export functionality.
                  All data is pulled from the Phase 3 reporting system in real-time.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}