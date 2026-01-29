"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
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
  ExternalLink
} from "lucide-react"
import Link from "next/link"

interface InvestorDashboardData {
  totalCarbonProjects: number
  totalAreaHectares: number
  estimatedCarbonSequestration: number
  totalInvestment: number
  averageROI: number
  projectPerformance: {
    name: string
    status: string
    area_hectares: number
    carbon_sequestration: number
    investment_amount: number
    roi_percentage: number
    start_date: string
    end_date: string
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
}

export function InvestorCarbonDashboard() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<InvestorDashboardData>({
    totalCarbonProjects: 3,
    totalAreaHectares: 1250,
    estimatedCarbonSequestration: 125000,
    totalInvestment: 7500000000,
    averageROI: 18.5,
    projectPerformance: [
      {
        name: "Hutan Tropis Kalimantan",
        status: "ACTIVE",
        area_hectares: 500,
        carbon_sequestration: 50000,
        investment_amount: 3000000000,
        roi_percentage: 22.5,
        start_date: "2025-01-01",
        end_date: "2035-01-01"
      },
      {
        name: "Restorasi Ekosistem Sumatera",
        status: "ACTIVE",
        area_hectares: 450,
        carbon_sequestration: 45000,
        investment_amount: 2500000000,
        roi_percentage: 16.8,
        start_date: "2025-03-01",
        end_date: "2035-03-01"
      },
      {
        name: "Konservasi Mangrove Jawa",
        status: "PLANNING",
        area_hectares: 300,
        carbon_sequestration: 30000,
        investment_amount: 2000000000,
        roi_percentage: 15.2,
        start_date: "2026-01-01",
        end_date: "2036-01-01"
      }
    ],
    financialSummary: [
      {
        period: "Q1 2025",
        revenue: 1250000000,
        expenses: 750000000,
        net_income: 500000000
      },
      {
        period: "Q2 2025",
        revenue: 1350000000,
        expenses: 800000000,
        net_income: 550000000
      },
      {
        period: "Q3 2025",
        revenue: 1420000000,
        expenses: 820000000,
        net_income: 600000000
      },
      {
        period: "Q4 2025",
        revenue: 1480000000,
        expenses: 850000000,
        net_income: 630000000
      }
    ],
    impactMetrics: [
      {
        metric: "Carbon Sequestration Rate",
        value: 100,
        unit: "tons/ha/year",
        trend: 'up',
        change_percentage: 8.5
      },
      {
        metric: "Cost per Ton Carbon",
        value: 25000,
        unit: "IDR/ton",
        trend: 'down',
        change_percentage: 5.2
      },
      {
        metric: "Community Beneficiaries",
        value: 1250,
        unit: "households",
        trend: 'up',
        change_percentage: 15.3
      },
      {
        metric: "Biodiversity Index",
        value: 0.85,
        unit: "index",
        trend: 'up',
        change_percentage: 12.7
      }
    ]
  })

  useEffect(() => {
    // In production, this would fetch real data from API
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [])

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
                All data is updated in real-time from the financial system.
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              <CheckCircle className="mr-1 h-3 w-3" />
              Verified Data
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
              Rp {dashboardData.totalInvestment.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Across {dashboardData.totalCarbonProjects} carbon projects
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
              {dashboardData.estimatedCarbonSequestration.toLocaleString('id-ID')} tons
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
              {dashboardData.averageROI.toFixed(1)}%
            </div>
            <p className="text-xs text-amber-600 mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Above industry average
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
              {dashboardData.totalAreaHectares.toLocaleString('id-ID')} ha
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
              {dashboardData.projectPerformance.map((project, index) => (
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
              {dashboardData.financialSummary.map((quarter, index) => (
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
                  {dashboardData.financialSummary.map((quarter, index) => (
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
                      Rp {dashboardData.financialSummary.reduce((sum, q) => sum + q.revenue, 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Net Income</div>
                    <div className="font-medium text-green-700">
                      Rp {dashboardData.financialSummary.reduce((sum, q) => sum + q.net_income, 0).toLocaleString('id-ID')}
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
              {dashboardData.impactMetrics.map((metric, index) => (
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