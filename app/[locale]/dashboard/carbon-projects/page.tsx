"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TreePine, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ArrowUpRight, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Leaf,
  TrendingUp,
  Globe,
  Shield,
  RefreshCw,
  AlertCircle,
  Download,
  FileText,
  ExternalLink,
  Users,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// Types for dashboard data (same as investor dashboard)
interface DashboardData {
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
    project_id?: string
    uuid?: string
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

// Format numbers with Indonesian locale
const formatNumber = (num: number, decimals: number = 2) => {
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// Format currency
const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000_000_000) {
    return `Rp ${(amount / 1_000_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} T`
  } else if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`
  } else if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} juta`
  } else {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    approved: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    completed: "bg-purple-100 text-purple-800",
    archived: "bg-gray-100 text-gray-800"
  }

  const icons: Record<string, React.ReactNode> = {
    draft: <span className="h-2 w-2 rounded-full bg-gray-400" />,
    approved: <CheckCircle className="h-3 w-3" />,
    active: <CheckCircle className="h-3 w-3" />,
    suspended: <XCircle className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    archived: <span className="h-2 w-2 rounded-full bg-gray-400" />
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.draft}`}>
      {icons[status] || icons.draft}
      {status.toUpperCase()}
    </span>
  )
}

export default function CarbonProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [canManage, setCanManage] = useState(false)

  const fetchDashboardData = async (showToast = false) => {
    try {
      setError(null)
      if (showToast) {
        setRefreshing(true)
      }

      // Fetch dashboard data from the same API as investor dashboard
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
      console.error("Error fetching carbon projects dashboard data:", err)
      setError(err.message || "Failed to load dashboard data")
      
      if (showToast) {
        toast.error("Failed to update dashboard", {
          description: err.message
        })
      }

      // Fallback data
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
    // Check if user can manage carbon projects
    const checkPermissions = async () => {
      try {
        // In a real implementation, you would check user role/permissions
        // For now, we'll assume admin/carbon_specialist can manage
        setCanManage(true)
      } catch (err) {
        console.error("Error checking permissions:", err)
        setCanManage(false)
      }
    }

    checkPermissions()
    fetchDashboardData()
  }, [])

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-48 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !dashboardData) {
    const isMigrationRequired = dashboardData?.dataSource === 'fallback' || 
                               dashboardData?.dataSource === 'database_basic' ||
                               error?.includes('migration')
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Carbon Projects</h1>
            <p className="text-muted-foreground">
              Dashboard proyek karbon dengan data investasi dan performa
            </p>
          </div>
          {canManage && (
            <Button asChild>
              <Link href="/dashboard/carbon-projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Carbon Project Baru
              </Link>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Carbon Projects Dashboard - {isMigrationRequired ? 'Migration Required' : 'Error'}
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { summary, projectPerformance, lastUpdated, dataSource } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carbon Projects</h1>
          <p className="text-muted-foreground">
            Dashboard proyek karbon dengan data investasi dan performa yang sama dengan investor dashboard
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="mr-1 h-3 w-3" />
              Last updated: {new Date(lastUpdated).toLocaleTimeString('id-ID')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Source: {dataSource}
            </Badge>
            <Badge className="bg-green-100 text-green-800 text-xs">
              <CheckCircle className="mr-1 h-3 w-3" />
              Approved Programs Only
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
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/carbon-projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Carbon Project Baru
            </Link>
          </Button>
        )}
      </div>

      {/* Key Metrics - Same as Investor Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(summary.totalInvestment)}
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
              {formatNumber(summary.estimatedCarbonSequestration, 0)} tons
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
              {formatNumber(summary.totalAreaHectares)} ha
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Forest area under conservation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Carbon Projects Performance
          </CardTitle>
          <CardDescription>
            Performance metrics for all carbon projects - same data as investor dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectPerformance.length > 0 ? (
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
                          {project.kode_project}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(project.area_hectares)} ha
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {project.roi_percentage.toFixed(1)}% ROI
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(project.investment_amount)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Carbon Sequestration</div>
                      <div className="font-medium">
                        {formatNumber(project.carbon_sequestration, 0)} tons
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
                      {project.project_id || project.uuid ? (
                        <Link href={`/dashboard/carbon-projects/${project.project_id || project.uuid}`}>
                          <Eye className="mr-2 h-3 w-3" />
                          View Project Details
                        </Link>
                      ) : (
                        <Link href={`/dashboard/carbon-projects`}>
                          <Eye className="mr-2 h-3 w-3" />
                          Browse Projects
                        </Link>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TreePine className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Carbon Projects Data</h3>
              <p className="text-muted-foreground mt-2">
                Carbon projects data is not available from the investor dashboard API.
              </p>
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Section */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <Globe className="h-12 w-12 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Carbon Projects Dashboard - Integrated View</h3>
              <p className="text-muted-foreground mt-2">
                Dashboard ini menyajikan data proyek karbon yang konsisten dengan investor dashboard:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Data investasi dan ROI yang sama dengan investor dashboard</li>
                <li>Metrik sequestrasi karbon real-time dari API yang sama</li>
                <li>Performa proyek dengan rating investasi</li>
                <li>Konsistensi data 100% antara dashboard karbon dan investor</li>
                <li>Real-time updates dari database utama</li>
                <li>Menggunakan API: <code>/api/investor/dashboard-data</code></li>
              </ul>
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-green-100">
                <p className="text-sm font-medium text-green-800">
                  ✅ <strong>Status:</strong> Dashboard Carbon Projects telah dirombak untuk menggunakan data yang sama dengan investor dashboard.
                  Semua metrik investasi, ROI, dan carbon sequestration sekarang konsisten.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}