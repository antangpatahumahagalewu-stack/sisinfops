import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/auth/rbac"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users2, FileCheck, AlertTriangle, Calendar, Plus, Filter, Download, UserCheck, Building, Users, Globe } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StakeholderTable from "./components/stakeholder-table"
import StakeholderStats from "./components/stakeholder-stats"
import CreateStakeholderModal from "./components/create-stakeholder-modal"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  return {
    title: "Stakeholder & FPIC Management",
    description: "Kelola stakeholder dan tracking FPIC untuk proyek karbon dan program"
  }
}

export default async function StakeholdersPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/stakeholders`)
  }

  // Check if user has permission to view stakeholders
  const canView = await hasPermission("STAKEHOLDER_MANAGEMENT", session.user.id)
  if (!canView) {
    redirect(`/${locale}/dashboard?error=unauthorized`)
  }

  // Check if user has permission to manage stakeholders (admin, carbon_specialist, program_planner)
  const canManage = await hasPermission("STAKEHOLDER_MANAGEMENT", session.user.id)

  // Fetch stakeholders data
  let stakeholders: any[] = []
  let fetchError: any = null
  
  try {
    // First, try to fetch without joins to see if table exists
    const { data, error } = await supabase
      .from("stakeholders")
      .select("*")
      .order("nama_stakeholder", { ascending: true })
      .limit(100)

    if (error) {
      console.error("Error fetching stakeholders (basic):", error)
      fetchError = error
      // Try to get more details about the error
      if (error.code === '42P01') {
        console.error("Table 'stakeholders' does not exist. Please run the migration SQL.")
      }
    } else {
      stakeholders = data || []
      
      // If we have stakeholders, try to enrich with project/program names
      if (stakeholders.length > 0) {
        // Try to fetch carbon projects
        const { data: projectsData } = await supabase
          .from("carbon_projects")
          .select("kode_project, nama_project")
          .order("nama_project", { ascending: true })
        
        const projectsMap = new Map()
        if (projectsData) {
          projectsData.forEach(p => projectsMap.set(p.kode_project, p.nama_project))
        }
        
        // Try to fetch programs
        const { data: programsData } = await supabase
          .from("programs")
          .select("kode_program, nama_program")
          .order("nama_program", { ascending: true })
        
        const programsMap = new Map()
        if (programsData) {
          programsData.forEach(p => programsMap.set(p.kode_program, p.nama_program))
        }
        
        // Enrich stakeholders with project/program names
        stakeholders = stakeholders.map(s => ({
          ...s,
          carbon_projects: s.kode_project && projectsMap.has(s.kode_project) 
            ? { nama_project: projectsMap.get(s.kode_project), kode_project: s.kode_project }
            : null,
          programs: s.program_id && programsMap.has(s.program_id)
            ? { nama_program: programsMap.get(s.program_id), kode_program: s.program_id }
            : null
        }))
      }
    }
  } catch (error) {
    console.error("Exception fetching stakeholders:", error)
    fetchError = error as Error
  }

  // Fetch carbon projects for filter dropdown
  const { data: carbonProjects } = await supabase
    .from("carbon_projects")
    .select("id, kode_project, nama_project")
    .order("nama_project", { ascending: true })

  // Fetch programs for filter dropdown
  const { data: programs } = await supabase
    .from("programs")
    .select("id, kode_program, nama_program")
    .order("nama_program", { ascending: true })

  // Calculate stats for dashboard
  const totalStakeholders = stakeholders.length
  const fpicCompleted = stakeholders.filter(s => s.fpic_status === 'completed').length
  const highInfluence = stakeholders.filter(s => s.tingkat_pengaruh === 'high').length
  const recentEngagement = stakeholders.filter(s => {
    if (!s.tanggal_engagement_terakhir) return false
    const lastEngagement = new Date(s.tanggal_engagement_terakhir)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return lastEngagement > thirtyDaysAgo
  }).length

  // Categorize stakeholders
  const stakeholderCategories: Record<string, number> = {}
  stakeholders.forEach(stakeholder => {
    const category = stakeholder.kategori || 'other'
    stakeholderCategories[category] = (stakeholderCategories[category] || 0) + 1
  })

  // Valid categories for dropdowns
  const validCategories = [
    'government', 'community', 'ngo_cso', 'investor', 'academic', 
    'private_sector', 'media', 'international_organization', 'other'
  ]

  // Valid influence levels
  const validInfluenceLevels = ['low', 'medium', 'high']

  // Valid FPIC statuses
  const validFPICStatuses = ['not_started', 'in_progress', 'completed', 'on_hold']

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stakeholder & FPIC Management</h1>
          <p className="text-muted-foreground">
            Kelola stakeholder, tracking FPIC (Free, Prior and Informed Consent), dan dokumentasi konsultasi
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <CreateStakeholderModal 
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Stakeholder
                </Button>
              }
              carbonProjects={carbonProjects || []}
              programs={programs || []}
              validCategories={validCategories}
              validInfluenceLevels={validInfluenceLevels}
              validFPICStatuses={validFPICStatuses}
            />
          )}
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StakeholderStats 
        totalStakeholders={totalStakeholders}
        fpicCompleted={fpicCompleted}
        highInfluence={highInfluence}
        recentEngagement={recentEngagement}
        stakeholderCategories={stakeholderCategories}
      />

      {/* Main Content with Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="all">Semua Stakeholder</TabsTrigger>
          <TabsTrigger value="fpic">FPIC Process</TabsTrigger>
          <TabsTrigger value="mapping">Stakeholder Mapping</TabsTrigger>
          <TabsTrigger value="calendar">Engagement Calendar</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Stakeholder</CardTitle>
              <CardDescription>
                Semua stakeholder yang terdaftar dalam sistem dengan kemampuan filter dan pencarian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StakeholderTable
                stakeholders={stakeholders}
                carbonProjects={carbonProjects || []}
                programs={programs || []}
                canManage={canManage}
                validCategories={validCategories}
                validInfluenceLevels={validInfluenceLevels}
                validFPICStatuses={validFPICStatuses}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fpic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FPIC Process Tracking</CardTitle>
              <CardDescription>
                Monitoring proses Free, Prior and Informed Consent untuk setiap stakeholder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">FPIC Process Tracker</h3>
                <p className="text-muted-foreground mt-2">
                  Fitur FPIC Process Tracking sedang dalam pengembangan.
                </p>
                <div className="mt-4 grid grid-cols-5 gap-2 max-w-lg mx-auto">
                  <div className="text-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">1</div>
                    <p className="text-xs mt-1">Identification</p>
                  </div>
                  <div className="text-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">2</div>
                    <p className="text-xs mt-1">Consultation</p>
                  </div>
                  <div className="text-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">3</div>
                    <p className="text-xs mt-1">Documentation</p>
                  </div>
                  <div className="text-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">4</div>
                    <p className="text-xs mt-1">Approval</p>
                  </div>
                  <div className="text-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">5</div>
                    <p className="text-xs mt-1">Implementation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stakeholder Mapping & Power/Interest Grid</CardTitle>
              <CardDescription>
                Visualisasi tingkat pengaruh dan kepentingan stakeholder dalam grid matrix
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Power/Interest Grid Visualization</h3>
                <p className="text-muted-foreground mt-2">
                  Fitur Stakeholder Mapping sedang dalam pengembangan.
                </p>
                <div className="mt-6 border rounded-lg p-4 max-w-lg mx-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-blue-200 bg-blue-50 p-3 rounded">
                      <p className="text-sm font-medium text-blue-800">High Power</p>
                      <p className="text-xs text-blue-600">Keep Satisfied</p>
                    </div>
                    <div className="border border-green-200 bg-green-50 p-3 rounded">
                      <p className="text-sm font-medium text-green-800">High Power</p>
                      <p className="text-xs text-green-600">Manage Closely</p>
                    </div>
                    <div className="border border-amber-200 bg-amber-50 p-3 rounded">
                      <p className="text-sm font-medium text-amber-800">Low Power</p>
                      <p className="text-xs text-amber-600">Monitor</p>
                    </div>
                    <div className="border border-purple-200 bg-purple-50 p-3 rounded">
                      <p className="text-sm font-medium text-purple-800">Low Power</p>
                      <p className="text-xs text-purple-600">Keep Informed</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Calendar</CardTitle>
              <CardDescription>
                Jadwal konsultasi, meeting, dan engagement dengan stakeholder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Engagement Calendar</h3>
                <p className="text-muted-foreground mt-2">
                  Fitur Engagement Calendar sedang dalam pengembangan.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stakeholder Reports</CardTitle>
              <CardDescription>
                Laporan analisis stakeholder, FPIC status, dan engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Stakeholder Reports</h3>
                <p className="text-muted-foreground mt-2">
                  Fitur Reports sedang dalam pengembangan.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pentingnya Stakeholder Management untuk PDD
          </CardTitle>
          <CardDescription className="text-blue-700">
            Data stakeholder dan FPIC akan otomatis masuk ke section "Stakeholder Consultation" dalam Project Design Document (PDD)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Identification of Stakeholders:</strong> Daftar semua pihak yang terdampak atau berkepentingan</span>
            </li>
            <li className="flex items-start gap-2">
              <Building className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Consultation Process:</strong> Dokumentasi proses konsultasi dan pertemuan</span>
            </li>
            <li className="flex items-start gap-2">
              <FileCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>FPIC Documentation:</strong> Bukti persetujuan masyarakat setempat (Free, Prior and Informed Consent)</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>Risk Assessment:</strong> Identifikasi dan mitigasi risiko terkait stakeholder</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}