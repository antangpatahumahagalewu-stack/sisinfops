"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  DollarSign, 
  Shield, 
  BarChart3, 
  TreePine, 
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Users,
  MapPin,
  Calendar,
  Coins
} from "lucide-react"
import Link from "next/link"

interface CarbonProject {
  id: string
  kode_project: string
  nama_project: string
  standar_karbon: string
  luas_total_ha: number
  estimasi_penyimpanan_karbon: number
  status: string
  tanggal_mulai: string
  tanggal_selesai: string
}

interface RiskAssessment {
  risk: string
  level: "low" | "medium" | "high"
  mitigation: string
}

interface FinancialProjection {
  year: number
  revenue: number
  cost: number
  net_cash_flow: number
  cumulative_cash_flow: number
}

export function InvestorCarbonDashboard() {
  const [loading, setLoading] = useState(true)
  const [carbonProjects, setCarbonProjects] = useState<CarbonProject[]>([])
  const [totalPotentialCO2, setTotalPotentialCO2] = useState(0)
  const [averageROI, setAverageROI] = useState(0)
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([
    { risk: "Legal & Land Tenure", level: "medium", mitigation: "Clear land ownership verification needed" },
    { risk: "Community Acceptance", level: "low", mitigation: "Strong community engagement programs" },
    { risk: "Market Price Volatility", level: "high", mitigation: "Forward contracts & price hedging" },
    { risk: "Implementation Capacity", level: "medium", mitigation: "Technical assistance & training" },
    { risk: "MRV Compliance", level: "high", mitigation: "Third-party verification partnerships" }
  ])
  const [financialProjections, setFinancialProjections] = useState<FinancialProjection[]>([
    { year: 1, revenue: 0, cost: 150000, net_cash_flow: -150000, cumulative_cash_flow: -150000 },
    { year: 2, revenue: 50000, cost: 100000, net_cash_flow: -50000, cumulative_cash_flow: -200000 },
    { year: 3, revenue: 150000, cost: 80000, net_cash_flow: 70000, cumulative_cash_flow: -130000 },
    { year: 4, revenue: 250000, cost: 70000, net_cash_flow: 180000, cumulative_cash_flow: 50000 },
    { year: 5, revenue: 350000, cost: 60000, net_cash_flow: 290000, cumulative_cash_flow: 340000 },
    { year: 6, revenue: 450000, cost: 60000, net_cash_flow: 390000, cumulative_cash_flow: 730000 },
    { year: 7, revenue: 550000, cost: 60000, net_cash_flow: 490000, cumulative_cash_flow: 1220000 },
  ])

  useEffect(() => {
    fetchCarbonProjects()
  }, [])

  async function fetchCarbonProjects() {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("carbon_projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching carbon projects:", error)
        return
      }

      if (data) {
        setCarbonProjects(data as CarbonProject[])
        
        // Calculate total potential CO2
        const totalCO2 = data.reduce((sum, project) => 
          sum + (project.estimasi_penyimpanan_karbon || 0), 0
        )
        setTotalPotentialCO2(totalCO2)

        // Calculate average ROI (simplified)
        const activeProjects = data.filter(p => p.status === 'active').length
        const totalProjects = data.length
        const roi = totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0
        setAverageROI(roi)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate key metrics
  const totalProjects = carbonProjects.length
  const activeProjects = carbonProjects.filter(p => p.status === 'active').length
  const totalArea = carbonProjects.reduce((sum, p) => sum + (p.luas_total_ha || 0), 0)
  const compliantProjects = carbonProjects.filter(p => 
    p.standar_karbon && p.estimasi_penyimpanan_karbon && p.luas_total_ha
  ).length
  const complianceRate = totalProjects > 0 ? Math.round((compliantProjects / totalProjects) * 100) : 0

  // Calculate financial metrics
  const totalInvestment = financialProjections[0].cost
  const peakInvestment = Math.min(...financialProjections.map(p => p.cumulative_cash_flow))
  const paybackYear = financialProjections.find(p => p.cumulative_cash_flow > 0)?.year || 0
  const totalRevenue = financialProjections.reduce((sum, p) => sum + p.revenue, 0)
  const totalCost = financialProjections.reduce((sum, p) => sum + p.cost, 0)
  const totalNetCashFlow = financialProjections.reduce((sum, p) => sum + p.net_cash_flow, 0)
  const roiPercentage = totalInvestment !== 0 ? ((totalNetCashFlow - totalInvestment) / totalInvestment) * 100 : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investor Carbon Dashboard</CardTitle>
          <CardDescription>Loading investment analysis...</CardDescription>
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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TreePine className="h-6 w-6 text-green-600" />
          Investor Carbon Dashboard
        </h2>
        <p className="text-muted-foreground">
          Comprehensive investment analysis for carbon projects - Risk, ROI, Compliance & Projections
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Potential CO₂</CardTitle>
            <TreePine className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {totalPotentialCO2.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-green-600">Ton CO₂e sequestered</p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">≈ </span>
              <span className="font-medium">
                ${(totalPotentialCO2 * 15).toLocaleString('id-ID')} 
              </span>
              <span className="text-muted-foreground"> @ $15/ton</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${roiPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {roiPercentage > 0 ? '+' : ''}{roiPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-blue-600">Over 7 years</p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Payback: </span>
              <span className="font-medium">Year {paybackYear}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            <Shield className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">Medium</div>
            <p className="text-xs text-yellow-600">Controlled risks</p>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i}
                  className={`h-1 w-5 rounded-full ${i <= 3 ? 'bg-yellow-500' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{complianceRate}%</div>
            <p className="text-xs text-purple-600">VERRA/Gold Standard ready</p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">{compliantProjects}</span>
              <span className="text-muted-foreground">/{totalProjects} projects</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Project Analysis */}
        <div className="space-y-6">
          {/* Project Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Carbon Project Portfolio
              </CardTitle>
              <CardDescription>
                Active and pipeline carbon projects for investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {carbonProjects.length > 0 ? (
                <div className="space-y-3">
                  {carbonProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{project.kode_project}</span>
                          <Badge variant={
                            project.status === 'active' ? 'default' :
                            project.status === 'approved' ? 'secondary' :
                            project.status === 'draft' ? 'outline' : 'destructive'
                          } className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{project.nama_project}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.luas_total_ha?.toLocaleString('id-ID')} ha
                          </span>
                          <span className="flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            {project.estimasi_penyimpanan_karbon?.toLocaleString('id-ID')} tCO₂e
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {project.standar_karbon || 'No standard'}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/carbon-projects/${project.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TreePine className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">No carbon projects yet</h3>
                  <p className="text-muted-foreground mt-2">
                    Start by creating carbon projects to build your investment portfolio
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/carbon-projects/new">
                      Create Carbon Project
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Assessment Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Risk Assessment Matrix
              </CardTitle>
              <CardDescription>
                Key investment risks and mitigation strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskAssessments.map((assessment, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{assessment.risk}</span>
                      <Badge variant={
                        assessment.level === 'high' ? 'destructive' :
                        assessment.level === 'medium' ? 'outline' : 'default'
                      }>
                        {assessment.level.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{assessment.mitigation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial Analysis */}
        <div className="space-y-6">
          {/* Financial Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                7-Year Financial Projections
              </CardTitle>
              <CardDescription>
                Revenue, costs, and cash flow projections (USD)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Year</th>
                        <th className="text-left py-2 font-medium">Revenue</th>
                        <th className="text-left py-2 font-medium">Cost</th>
                        <th className="text-left py-2 font-medium">Net Cash Flow</th>
                        <th className="text-left py-2 font-medium">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialProjections.map((projection) => (
                        <tr key={projection.year} className="border-b hover:bg-gray-50">
                          <td className="py-2">{projection.year}</td>
                          <td className="py-2">
                            <span className={projection.revenue > 0 ? "text-green-600" : ""}>
                              ${projection.revenue.toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className="text-red-600">
                              ${projection.cost.toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={
                              projection.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"
                            }>
                              ${projection.net_cash_flow.toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={
                              projection.cumulative_cash_flow >= 0 ? "text-green-600" : "text-red-600"
                            }>
                              ${projection.cumulative_cash_flow.toLocaleString('id-ID')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      ${totalRevenue.toLocaleString('id-ID')}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      ${totalCost.toLocaleString('id-ID')}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Compliance Tracker
              </CardTitle>
              <CardDescription>
                Progress against VERRA/Gold Standard requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { requirement: "Legal Documentation", progress: 65, color: "bg-blue-500" },
                  { requirement: "MRV Plan", progress: 40, color: "bg-yellow-500" },
                  { requirement: "Stakeholder Consultation", progress: 80, color: "bg-green-500" },
                  { requirement: "Environmental Safeguards", progress: 55, color: "bg-purple-500" },
                  { requirement: "Benefit Sharing Mechanism", progress: 30, color: "bg-red-500" }
                ].map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.requirement}</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all duration-300`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Investor Actions Required
                </h4>
                <ul className="mt-2 space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Complete due diligence checklist for 3 high-potential projects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Review and approve benefit sharing agreements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Finalize forward contracts for carbon credits</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Section */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Ready to Invest?</h3>
              <p className="text-muted-foreground">
                Access detailed due diligence reports and investment documentation
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/carbon-projects">
                  <TreePine className="mr-2 h-4 w-4" />
                  Browse Projects
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/due-diligence">
                  <Shield className="mr-2 h-4 w-4" />
                  Due Diligence Toolkit
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
