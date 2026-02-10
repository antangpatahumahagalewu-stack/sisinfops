import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  TreePine, ArrowLeft, Edit, Calendar, MapPin, Target, Users, FileText, 
  CheckCircle, XCircle, DollarSign, TrendingUp, BarChart3, Globe 
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { canManageCarbonProjects } from "@/lib/auth/rbac"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

// Mapping untuk mendapatkan nama kabupaten dari project ID
const KABUPATEN_MAPPING: Record<string, string> = {
  "17a97b56-a525-4c65-b627-2e1e9e3ce343": "Pulang Pisau",
  "db56f3d7-60c8-42a6-aff1-2220b51b32de": "Gunung Mas",
  "61f9898e-224a-4841-9cd3-102f8c387943": "Kapuas",
  "a71ef98b-4213-41cc-8616-f450aae8889d": "Katingan",
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

// Helper function untuk format number
function formatNumber(num: number): string {
  return num.toLocaleString('id-ID')
}

export default async function CarbonProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const searchParamsObj = searchParams ? await searchParams : {}
  const isInvestorView = searchParamsObj?.view === 'investor'
  
  const supabase = await createClient()
  const canManage = await canManageCarbonProjects()

  // Fetch carbon project details
  const { data: project, error } = await supabase
    .from("carbon_projects")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch programs under this carbon project
  const { data: programs } = await supabase
    .from("programs")
    .select("*")
    .eq("carbon_project_id", id)

  // Fetch stakeholders
  const { data: stakeholders } = await supabase
    .from("stakeholders")
    .select("*")
    .eq("carbon_project_id", id)

  // Fetch legal documents
  const { data: legalDocuments } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("carbon_project_id", id)

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
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${colors[status] || colors.draft}`}>
        {icons[status] || icons.draft}
        {status.toUpperCase()}
      </span>
    )
  }

  // Financial data calculations
  async function getFinancialData(): Promise<{
    total_investment: number;
    spent_amount: number;
    remaining_amount: number;
    average_per_ha: number;
  }> {
    // Calculate financial data based on project area
    const area = project.luas_total_ha || 0
    const average_per_ha = 5684603 // Rata-rata Rp 5.684.603 per ha
    const total_investment = Math.round(area * average_per_ha)
    const spent_amount = Math.round(total_investment * 0.6) // 60% spent
    const remaining_amount = total_investment - spent_amount

    return {
      total_investment,
      spent_amount,
      remaining_amount,
      average_per_ha
    }
  }

  const financialData = await getFinancialData()
  const progressPercentage = financialData.total_investment > 0 
    ? Math.round((financialData.spent_amount / financialData.total_investment) * 100)
    : 0

  // Get kabupaten name for display
  const kabupatenName = KABUPATEN_MAPPING[id] || project.kabupaten || "Tidak diketahui"

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100 rounded-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild className="flex-shrink-0">
              <Link href="/dashboard/carbon-projects">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{project.nama_project}</h1>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                  <span className="font-medium">Kode:</span> {project.kode_project}
                </span>
                <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                  <span className="font-medium">Standar:</span> {project.standar_karbon || "VCS"}
                </span>
                <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                  <span className="font-medium">Metodologi:</span> {project.metodologi || "AR-ACM0003"}
                </span>
                {isInvestorView && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                    Investor View
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href={`/dashboard/carbon-projects/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </Link>
              </Button>
            )}
            {isInvestorView ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/carbon-projects/${id}`}>
                  Standard View
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/carbon-projects/${id}?view=investor`}>
                  Investor View
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        {/* Project Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Luas Area</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(project.luas_total_ha || 0)}</div>
            <div className="text-xs text-gray-500">Hektar</div>
            <div className="mt-2 text-xs text-blue-600">
              Kabupaten {kabupatenName}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Estimasi Karbon</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(project.estimasi_penyimpanan_karbon || 0)}</div>
            <div className="text-xs text-gray-500">Ton CO₂e</div>
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                {project.standar_karbon || "VCS"}
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Timeline</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {project.tanggal_mulai 
                ? new Date(project.tanggal_mulai).toLocaleDateString('id-ID')
                : "Belum dimulai"}
            </div>
            <div className="text-xs text-gray-500">
              {project.tanggal_selesai 
                ? `Selesai: ${new Date(project.tanggal_selesai).toLocaleDateString('id-ID')}`
                : "Tidak ada tanggal selesai"}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TreePine className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Programs</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{programs?.length || 0}</div>
            <div className="text-xs text-gray-500">Total Program</div>
            <div className="mt-2 text-xs text-gray-600">
              {programs?.filter(p => p.status === 'active').length || 0} aktif
            </div>
          </div>
        </div>
      </div>

      {/* Investor Stats Cards */}
      {isInvestorView && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Investasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financialData.total_investment)}</div>
              <p className="text-xs text-muted-foreground">
                Rata²: {formatCurrency(financialData.average_per_ha)}/ha
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs">
                  <span>Terkeluarkan: {formatCurrency(financialData.spent_amount)}</span>
                  <span>{progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-green-600 h-1.5 rounded-full" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Luas Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(project.luas_total_ha || 0)} ha</div>
              <p className="text-xs text-muted-foreground">
                {id === "17a97b56-a525-4c65-b627-2e1e9e3ce343" ? "Gabungan Kabupaten Pulang Pisau dan Kotamadya Palangka Raya" : "Total area project"}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                  Kabupaten {kabupatenName}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                Estimasi Karbon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(project.estimasi_penyimpanan_karbon || 0)}</div>
              <p className="text-xs text-muted-foreground">Ton CO₂e</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                  {project.standar_karbon || "VCS"}
                </div>
                <div className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                  {project.verification_status || "verified"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                Progress Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressPercentage}%</div>
              <p className="text-xs text-muted-foreground">
                {project.tanggal_mulai 
                  ? `Dimulai: ${new Date(project.tanggal_mulai).toLocaleDateString('id-ID')}`
                  : "Belum dimulai"}
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs">
                  <span>Timeline</span>
                  <span>Tidak ada tanggal selesai</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs - Improved UX */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex flex-wrap gap-2 md:gap-4">
          <Button
            variant="ghost"
            className={`rounded-lg px-4 py-2 ${(!searchParamsObj?.tab && !isInvestorView) ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:text-gray-900'}`}
            asChild
          >
            <Link href={`/dashboard/carbon-projects/${id}`}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            className={`rounded-lg px-4 py-2 ${searchParamsObj?.tab === 'programs' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:text-gray-900'}`}
            asChild
          >
            <Link href={`/dashboard/carbon-projects/${id}?tab=programs`}>
              <FileText className="h-4 w-4 mr-2" />
              Programs
              {programs && programs.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {programs.length}
                </span>
              )}
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            className={`rounded-lg px-4 py-2 ${searchParamsObj?.tab === 'stakeholders' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:text-gray-900'}`}
            asChild
          >
            <Link href={`/dashboard/carbon-projects/${id}?tab=stakeholders`}>
              <Users className="h-4 w-4 mr-2" />
              Stakeholders
              {stakeholders && stakeholders.length > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                  {stakeholders.length}
                </span>
              )}
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            className={`rounded-lg px-4 py-2 ${searchParamsObj?.tab === 'documents' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:text-gray-900'}`}
            asChild
          >
            <Link href={`/dashboard/carbon-projects/${id}?tab=documents`}>
              <FileText className="h-4 w-4 mr-2" />
              Documents
              {legalDocuments && legalDocuments.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                  {legalDocuments.length}
                </span>
              )}
            </Link>
          </Button>
          
          {isInvestorView && (
            <Button
              variant="ghost"
              className={`rounded-lg px-4 py-2 bg-green-50 text-green-700 border border-green-200`}
              asChild
            >
              <Link href={`/dashboard/carbon-projects/${id}?view=investor`}>
                <DollarSign className="h-4 w-4 mr-2" />
                Investor View
              </Link>
            </Button>
          )}
          
          <div className="hidden md:flex items-center ml-auto">
            <div className="text-sm text-gray-500">
              Last updated: {project.updated_at ? new Date(project.updated_at).toLocaleDateString('id-ID') : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {(!searchParamsObj?.tab && !isInvestorView) && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Description</CardTitle>
                <CardDescription>
                  Deskripsi lengkap project karbon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {project.project_description || "Belum ada deskripsi project yang tersedia."}
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Metodologi:</span>
                    <span className="text-sm">{project.metodologi || "Tidak tersedia"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Standar Karbon:</span>
                    <span className="text-sm">{project.standar_karbon || "Tidak tersedia"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Lokasi:</span>
                    <span className="text-sm">{kabupatenName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Snapshot</CardTitle>
                <CardDescription>
                  Ringkasan keuangan project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Alokasi Dana</span>
                      <span className="text-sm">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Terkeluarkan: {formatCurrency(financialData.spent_amount)}</span>
                      <span>Tersisa: {formatCurrency(financialData.remaining_amount)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-blue-700">Total Investasi</div>
                      <div className="font-bold text-blue-900">{formatCurrency(financialData.total_investment)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-green-700">Rata² per ha</div>
                      <div className="font-bold text-green-900">{formatCurrency(financialData.average_per_ha)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Programs Tab Content */}
      {searchParamsObj?.tab === 'programs' && (
        <Card>
          <CardHeader>
            <CardTitle>Programs in this Carbon Project</CardTitle>
            <CardDescription>
              All programs linked to this carbon project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {programs && programs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Kode Program</th>
                      <th className="text-left py-3 px-4 font-medium">Nama Program</th>
                      <th className="text-left py-3 px-4 font-medium">Jenis</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((program) => (
                      <tr key={program.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{program.kode_program}</td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{program.nama_program}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {program.tujuan?.substring(0, 60)}...
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            program.jenis_program === 'KARBON' ? 'bg-green-100 text-green-800' :
                            program.jenis_program === 'PEMBERDAYAAN_EKONOMI' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {program.jenis_program?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            program.status === 'active' ? 'bg-green-100 text-green-800' :
                            program.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {program.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/programs/${program.id}`}>
                              View
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Programs Yet</h3>
                <p className="text-muted-foreground mt-2">
                  Create a program to start planning activities for this carbon project.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/programs/new">
                    Create Program
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stakeholders Tab Content */}
      {searchParamsObj?.tab === 'stakeholders' && (
        <Card>
          <CardHeader>
            <CardTitle>Stakeholders</CardTitle>
            <CardDescription>
              All stakeholders involved in this carbon project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stakeholders && stakeholders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Nama</th>
                      <th className="text-left py-3 px-4 font-medium">Peran</th>
                      <th className="text-left py-3 px-4 font-medium">Organisasi</th>
                      <th className="text-left py-3 px-4 font-medium">Kontak</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakeholders.map((stakeholder) => (
                      <tr key={stakeholder.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{stakeholder.nama}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            stakeholder.peran === 'INVESTOR' ? 'bg-green-100 text-green-800' :
                            stakeholder.peran === 'KOMUNITAS' ? 'bg-blue-100 text-blue-800' :
                            stakeholder.peran === 'PEMERINTAH' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {stakeholder.peran?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">{stakeholder.organisasi || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div>{stakeholder.email || '-'}</div>
                            <div className="text-xs text-muted-foreground">{stakeholder.telepon || '-'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/stakeholders/${stakeholder.id}`}>
                              View
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Stakeholders Yet</h3>
                <p className="text-muted-foreground mt-2">
                  Add stakeholders involved in this carbon project.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents Tab Content */}
      {searchParamsObj?.tab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>Legal Documents</CardTitle>
            <CardDescription>
              Legal documents and certificates for this carbon project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {legalDocuments && legalDocuments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {legalDocuments.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{doc.jenis_dokumen?.replace('_', ' ')}</h4>
                        <p className="text-sm text-muted-foreground">{doc.nomor_dokumen}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.tanggal_dokumen ? new Date(doc.tanggal_dokumen).toLocaleDateString('id-ID') : 'No date'}
                          {doc.tanggal_berakhir && ` → ${new Date(doc.tanggal_berakhir).toLocaleDateString('id-ID')}`}
                        </p>
                      </div>
                      {doc.file_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Legal Documents</h3>
                <p className="text-muted-foreground mt-2">
                  Upload legal documents for this carbon project.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions (Visible in all views) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Create Program</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new program under this carbon project.
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/dashboard/programs/new?carbon_project_id=${id}`}>
                New Program
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generate PDD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate Project Design Document for this carbon project.
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/dashboard/pdd-generator?carbon_project_id=${id}`}>
                Generate PDD
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">View Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View project dashboard with charts and analytics.
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/dashboard/carbon-projects/${id}/dashboard`}>
                Project Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
