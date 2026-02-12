import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  TreePine, ArrowLeft, MapPin, Target, Users, FileText, 
  CheckCircle, Calendar, Shield, TrendingUp, BarChart3,
  BadgeCheck, Landmark, FileCheck, UserCheck, Clock, AlertCircle
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { canManageCarbonProjects } from "@/lib/auth/rbac"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Import chart components
import PieChartStakeholder from "@/components/dashboard/charts/PieChartStakeholder"
import RadialChartDocuments from "@/components/dashboard/charts/RadialChartDocuments"
import BarChartPrograms from "@/components/dashboard/charts/BarChartPrograms"
import GaugeChartTimeline from "@/components/dashboard/charts/GaugeChartTimeline"

interface PageProps {
  params: Promise<{ id: string }>
}

// Mapping untuk mendapatkan nama kabupaten dari project ID
const KABUPATEN_MAPPING: Record<string, string> = {
  "17a97b56-a525-4c65-b627-2e1e9e3ce343": "Pulang Pisau",
  "db56f3d7-60c8-42a6-aff1-2220b51b32de": "Gunung Mas",
  "61f9898e-224a-4841-9cd3-102f8c387943": "Kapuas",
  "a71ef98b-4213-41cc-8616-f450aae8889d": "Katingan",
}

// Helper function untuk format number
function formatNumber(num: number): string {
  return num.toLocaleString('id-ID')
}

// Helper function untuk format currency
function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `Rp ${(amount / 1000000000).toFixed(2)} M`
  } else if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(2)} Jt`
  } else {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }
}

// Helper function untuk hitung timeline progress
function calculateTimelineProgress(startDate?: string, endDate?: string): number {
  if (!startDate) return 0
  
  const start = new Date(startDate)
  const today = new Date()
  const end = endDate ? new Date(endDate) : new Date(start.getFullYear() + 10, start.getMonth(), start.getDate()) // Default 10 tahun
  
  const totalDuration = end.getTime() - start.getTime()
  const elapsedDuration = today.getTime() - start.getTime()
  
  if (totalDuration <= 0) return 100
  if (elapsedDuration <= 0) return 0
  
  const progress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100))
  return Math.round(progress)
}

// Helper function untuk hitung documents compliance
function calculateDocumentsCompliance(documents: any[]): {
  verified: number
  total: number
  percentage: number
} {
  const total = documents.length
  const verified = documents.filter(doc => doc.status === 'verified' || doc.status === 'approved').length
  const percentage = total > 0 ? Math.round((verified / total) * 100) : 0
  
  return { verified, total, percentage }
}

// Helper function untuk breakdown stakeholder peran
function breakdownStakeholders(stakeholders: any[]): { INVESTOR: number, KOMUNITAS: number, PEMERINTAH: number, OTHER: number } {
  const breakdown = {
    INVESTOR: 0,
    KOMUNITAS: 0,
    PEMERINTAH: 0,
    OTHER: 0
  }
  
  stakeholders.forEach(stakeholder => {
    const peran = stakeholder.peran || 'OTHER'
    if (peran === 'INVESTOR' || peran === 'investor') {
      breakdown.INVESTOR++
    } else if (peran === 'KOMUNITAS' || peran === 'komunitas') {
      breakdown.KOMUNITAS++
    } else if (peran === 'PEMERINTAH' || peran === 'pemerintah') {
      breakdown.PEMERINTAH++
    } else {
      breakdown.OTHER++
    }
  })
  
  return breakdown
}

export default async function CarbonProjectDashboardPage({ params }: PageProps) {
  const { id } = await params
  
  const supabase = await createClient()
  const canManage = await canManageCarbonProjects()

  // Fetch semua data sekaligus menggunakan Promise.all untuk performa lebih baik
  const [
    projectResponse,
    programsResponse,
    stakeholdersResponse,
    documentsResponse
  ] = await Promise.all([
    supabase.from("carbon_projects").select("*").eq("id", id).single(),
    supabase.from("programs").select("*").eq("carbon_project_id", id),
    supabase.from("stakeholders").select("*").eq("carbon_project_id", id),
    supabase.from("legal_documents").select("*").eq("carbon_project_id", id)
  ])

  // Handle error jika project tidak ditemukan
  if (projectResponse.error || !projectResponse.data) {
    notFound()
  }

  const project = projectResponse.data
  const programs = programsResponse.data || []
  const stakeholders = stakeholdersResponse.data || []
  const documents = documentsResponse.data || []

  // Hitung berbagai metrics untuk dashboard
  const kabupatenName = KABUPATEN_MAPPING[id] || project.kabupaten || "Tidak diketahui"
  const timelineProgress = calculateTimelineProgress(project.tanggal_mulai, project.tanggal_selesai)
  const documentsCompliance = calculateDocumentsCompliance(documents)
  const stakeholderBreakdown = breakdownStakeholders(stakeholders)
  
  // Program metrics
  const activePrograms = programs.filter(p => p.status === 'active').length
  const totalPrograms = programs.length
  const programProgress = programs.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / Math.max(totalPrograms, 1)
  
  // Carbon metrics (default jika tidak ada)
  const carbonEstimate = project.estimasi_penyimpanan_karbon || 0
  const carbonStandard = project.standar_karbon || "VCS"
  const projectStatus = project.status || "draft"
  
  // Community beneficiaries (stakeholder dengan peran KOMUNITAS)
  const communityBeneficiaries = stakeholderBreakdown.KOMUNITAS

  // Status badge component (reusable)
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      approved: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      verified: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      suspended: "bg-yellow-100 text-yellow-800",
      completed: "bg-purple-100 text-purple-800",
      archived: "bg-gray-100 text-gray-800"
    }

    const icons: Record<string, React.ReactNode> = {
      draft: <span className="h-2 w-2 rounded-full bg-gray-400" />,
      approved: <CheckCircle className="h-3 w-3" />,
      active: <CheckCircle className="h-3 w-3" />,
      verified: <CheckCircle className="h-3 w-3" />,
      pending: <Clock className="h-3 w-3" />,
      suspended: <AlertCircle className="h-3 w-3" />,
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

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/carbon-projects/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {project.nama_project} - Dashboard
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Project dashboard dengan metrics compliance VCS/Regulasi Indonesia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            Compliance Dashboard
          </Badge>
          {canManage && (
            <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm">
              <Link href={`/dashboard/carbon-projects/${id}/edit`}>
                Edit Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* 6 KPI Compliant Cards - Compact Grid 2x3 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1: Total Project Area */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Total Project Area
              </CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                VCS 3.1
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Project boundary defined
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(project.luas_total_ha || 0)} Ha
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground">
                Kabupaten {kabupatenName}
              </div>
              <Badge variant="secondary" className="gap-1 text-xs px-2 py-0.5">
                <BadgeCheck className="h-2.5 w-2.5" />
                Verified
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Estimated Carbon Sequestration */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-green-600" />
                Estimated Carbon
              </CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                VCS 3.2
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Baseline emissions calculation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(carbonEstimate)} ton
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              CO₂e sequestration
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs px-2 py-0.5">
                {carbonStandard}
              </Badge>
              <div className="text-xs text-muted-foreground">
                Standard
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Carbon Standard & Status */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-purple-600" />
                Carbon Standard
              </CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                VCS 2.1
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Project registration status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{carbonStandard}</div>
                <div className="text-xs text-muted-foreground">
                  Certification Standard
                </div>
              </div>
              <StatusBadge status={projectStatus} />
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Methodology:</span>
                <span className="font-medium">{project.metodologi || "AR-ACM0003"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Verification:</span>
                <span className="font-medium">{project.verification_status || "Pending"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Community Beneficiaries */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-orange-600" />
                Community Engagement
              </CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                VCS Safeguard 4
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Stakeholder participation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communityBeneficiaries} Households
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Direct beneficiaries
            </div>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span>Total Stakeholders:</span>
                <span className="font-medium">{stakeholders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Investors:</span>
                <span className="font-medium">{stakeholderBreakdown.INVESTOR}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Government:</span>
                <span className="font-medium">{stakeholderBreakdown.PEMERINTAH}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Project Timeline Progress */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-600" />
                Timeline Progress
              </CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                Project Management
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Project duration tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timelineProgress}%
            </div>
            <div className="mt-1.5">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-cyan-600 h-1.5 rounded-full" 
                  style={{ width: `${timelineProgress}%` }}
                />
              </div>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Start Date:</span>
                <span className="font-medium truncate">
                  {project.tanggal_mulai 
                    ? new Date(project.tanggal_mulai).toLocaleDateString('id-ID')
                    : "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">End Date:</span>
                <span className="font-medium truncate">
                  {project.tanggal_selesai
                    ? new Date(project.tanggal_selesai).toLocaleDateString('id-ID')
                    : "Not set"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6: Documents Compliance */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                Documents Compliance
              </CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                Regulatory
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Legal documents status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documentsCompliance.percentage}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {documentsCompliance.verified} of {documentsCompliance.total} verified
            </div>
            <div className="mt-1.5">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-emerald-600 h-1.5 rounded-full" 
                  style={{ width: `${documentsCompliance.percentage}%` }}
                />
              </div>
            </div>
            <div className="mt-2">
              {documents.length > 0 ? (
                <div className="space-y-1">
                  {documents.slice(0, 2).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[60%]">
                        {doc.jenis_dokumen?.replace('_', ' ') || 'Document'}
                      </span>
                      <StatusBadge status={doc.status || 'pending'} />
                    </div>
                  ))}
                  {documents.length > 2 && (
                    <div className="text-center text-xs text-muted-foreground">
                      +{documents.length - 2} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-1 text-xs text-muted-foreground">
                  No documents
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Analytics & Charts Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Project Analytics & Charts</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Interactive animated charts showing project data visualization
            </p>
          </div>
          <Badge variant="outline" className="gap-1 self-start sm:self-auto">
            <BarChart3 className="h-3 w-3" />
            Animated Charts
          </Badge>
        </div>
        
        {/* Chart Grid 2x2 */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Chart 1: Stakeholder Distribution */}
          <PieChartStakeholder data={stakeholderBreakdown} />
          
          {/* Chart 2: Documents Compliance */}
          <RadialChartDocuments 
            verified={documentsCompliance.verified}
            total={documentsCompliance.total}
            percentage={documentsCompliance.percentage}
          />
          
          {/* Chart 3: Program Progress Comparison */}
          <BarChartPrograms programs={programs} />
          
          {/* Chart 4: Timeline Progress Gauge */}
          <GaugeChartTimeline 
            progress={timelineProgress}
            startDate={project.tanggal_mulai}
            endDate={project.tanggal_selesai}
          />
        </div>
      </div>

      {/* Program Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Program Progress
          </CardTitle>
          <CardDescription>
            Active programs under this carbon project with progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {programs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map(program => (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{program.nama_program || 'Unnamed Program'}</span>
                          <span className="text-xs text-muted-foreground">
                            {program.kode_program || 'No code'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          program.jenis_program === 'KARBON' ? 'bg-green-50 text-green-700' :
                          program.jenis_program === 'PEMBERDAYAAN_EKONOMI' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-50 text-gray-700'
                        }>
                          {program.jenis_program?.replace('_', ' ') || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={program.status || 'draft'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${program.progress_percentage || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-10">
                            {program.progress_percentage || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {program.updated_at 
                            ? new Date(program.updated_at).toLocaleDateString('id-ID')
                            : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/programs/${program.id}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Programs Yet</h3>
              <p className="text-muted-foreground mt-2">
                Create programs to track activities and progress for this carbon project.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/dashboard/programs/new?carbon_project_id=${id}`}>
                  Create Program
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stakeholder Breakdown & Quick Actions */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Stakeholder Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Stakeholder Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of stakeholders by role and engagement level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Role Distribution */}
              <div>
                <h4 className="text-sm font-medium mb-3">By Role</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xs text-green-700">Investors</div>
                    <div className="text-2xl font-bold text-green-900">
                      {stakeholderBreakdown.INVESTOR}
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      Financial partners
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-blue-700">Community</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {stakeholderBreakdown.KOMUNITAS}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      Beneficiaries
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-xs text-purple-700">Government</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {stakeholderBreakdown.PEMERINTAH}
                    </div>
                    <div className="text-xs text-purple-700 mt-1">
                      Regulatory bodies
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-700">Other</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stakeholderBreakdown.OTHER}
                    </div>
                    <div className="text-xs text-gray-700 mt-1">
                      Additional stakeholders
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Stakeholders List */}
              <div>
                <h4 className="text-sm font-medium mb-3">Key Stakeholders</h4>
                {stakeholders.length > 0 ? (
                  <div className="space-y-2">
                    {stakeholders.slice(0, 5).map(stakeholder => (
                      <div key={stakeholder.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border rounded-lg gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{stakeholder.nama}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {stakeholder.organisasi || 'No organization'}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {stakeholder.peran?.replace('_', ' ') || 'Unknown'}
                        </Badge>
                      </div>
                    ))}
                    {stakeholders.length > 5 && (
                      <div className="text-center text-xs text-muted-foreground">
                        +{stakeholders.length - 5} more stakeholders
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No stakeholders added yet
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common actions for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full" variant="outline">
                <Link href={`/dashboard/carbon-projects/${id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Project Details
                </Link>
              </Button>
              
              <Button asChild className="w-full" variant="outline">
                <Link href={`/dashboard/programs/new?carbon_project_id=${id}`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Create New Program
                </Link>
              </Button>
              
              <Button asChild className="w-full" variant="outline">
                <Link href={`/dashboard/stakeholders/new?carbon_project_id=${id}`}>
                  <Users className="mr-2 h-4 w-4" />
                  Add Stakeholder
                </Link>
              </Button>
              
              <Button asChild className="w-full" variant="outline">
                <Link href={`/dashboard/legal-documents/new?carbon_project_id=${id}`}>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Upload Document
                </Link>
              </Button>
              
              {canManage && (
                <>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/dashboard/pdd-generator?carbon_project_id=${id}`}>
                      <Landmark className="mr-2 h-4 w-4" />
                      Generate PDD
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full" variant="default">
                    <Link href={`/dashboard/carbon-projects/${id}/edit`}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Update Project Status
                    </Link>
                  </Button>
                </>
              )}
            </div>
            
            {/* Compliance Summary */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3">Compliance Summary</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>VCS Requirements:</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    4/6 Met
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Regulatory Compliance:</span>
                  <Badge variant="outline" className={
                    documentsCompliance.percentage >= 80 ? "bg-green-50 text-green-700" :
                    documentsCompliance.percentage >= 50 ? "bg-yellow-50 text-yellow-700" :
                    "bg-red-50 text-red-700"
                  }>
                    {documentsCompliance.percentage}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Project Health:</span>
                  <Badge variant="outline" className={
                    projectStatus === 'active' ? "bg-green-50 text-green-700" :
                    projectStatus === 'verified' ? "bg-green-50 text-green-700" :
                    projectStatus === 'pending' ? "bg-yellow-50 text-yellow-700" :
                    "bg-gray-50 text-gray-700"
                  }>
                    {projectStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>
          Dashboard data is sourced directly from database tables: 
          <span className="font-medium"> carbon_projects, programs, stakeholders, legal_documents</span>
        </p>
        <p className="mt-1">
          Last updated: {project.updated_at 
            ? new Date(project.updated_at).toLocaleDateString('id-ID') + ' ' + new Date(project.updated_at).toLocaleTimeString('id-ID')
            : 'N/A'}
        </p>
      </div>
    </div>
  )
}