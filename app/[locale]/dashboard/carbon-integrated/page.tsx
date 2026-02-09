import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CarbonWorkflowTracker } from "@/components/dashboard/carbon-workflow-tracker"
import { 
  DollarSign, 
  TreePine, 
  Users, 
  ShieldCheck,
  FileText,
  Target,
  Coins,
  TrendingUp,
  Download,
  ExternalLink
} from "lucide-react"
import Link from "next/link"

export default async function CarbonIntegratedDashboardPage({
  searchParams,
}: {
  searchParams: { project?: string }
}) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  // Check if user has access
  const allowedRoles = ["admin", "carbon_specialist", "program_planner", "program_implementer"]
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/dashboard")
  }

  // Get project ID from search params
  const projectId = searchParams.project

  // Fetch integrated data if project ID is provided
  let projectData = null
  let financialData = null
  let workflowData = null

  if (projectId) {
    // Fetch integrated project data
    const { data: project } = await supabase
      .from("v_carbon_project_integrated")
      .select("*")
      .eq("id", projectId)
      .single()

    // Fetch financial integration data
    const { data: financial } = await supabase
      .from("v_carbon_financial_integration")
      .select("*")
      .eq("project_id", projectId)
      .single()

    // Fetch workflow data
    const { data: workflow } = await supabase
      .from("v_carbon_workflow_dashboard")
      .select("*")
      .eq("project_id", projectId)
      .single()

    projectData = project
    financialData = financial
    workflowData = workflow
  }

  // Fetch all carbon projects for selector
  const { data: allProjects } = await supabase
    .from("carbon_projects")
    .select("id, kode_project, nama_project, workflow_status")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carbon Integrated Dashboard</h1>
          <p className="text-muted-foreground">
            Dashboard terintegrasi untuk monitoring semua aspek proyek karbon
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/carbon-integrated/export">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/carbon-projects">
              <Target className="mr-2 h-4 w-4" />
              Kelola Projects
            </Link>
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Carbon Project</CardTitle>
          <CardDescription>
            Pilih project untuk melihat dashboard terintegrasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allProjects?.map(project => (
              <Button
                key={project.id}
                size="sm"
                variant={projectId === project.id ? "default" : "outline"}
                asChild
              >
                <Link href={`/dashboard/carbon-integrated?project=${project.id}`}>
                  {project.kode_project}
                  <span className="ml-2 text-xs opacity-75">
                    {project.nama_project}
                  </span>
                </Link>
              </Button>
            ))}
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/carbon-projects/new">
                + Project Baru
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {projectId ? (
        <>
          {/* Project Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status Project</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 capitalize">
                  {projectData?.overall_status?.replace(/_/g, ' ') || 'draft'}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {projectData?.kode_project}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Luas Area</CardTitle>
                <TreePine className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {projectData?.luas_total_ha?.toLocaleString('id-ID') || '0'} ha
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Total area proyek
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Program</CardTitle>
                <FileText className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">
                  {projectData?.program_count || 0}
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  Program aktif
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Carbon Credits</CardTitle>
                <Coins className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  {projectData?.total_credits_issued?.toLocaleString('id-ID') || '0'}
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  VCUs issued
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Workflow Tracker */}
            <div className="lg:col-span-2">
              <CarbonWorkflowTracker projectId={projectId} />
            </div>

            {/* Financial Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Integration
                </CardTitle>
                <CardDescription>
                  Integrasi dengan modul keuangan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {financialData ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Account Financial</h4>
                        <Badge variant="outline">
                          {financialData.account_code}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Account Name</span>
                          <span className="font-medium">{financialData.account_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Balance</span>
                          <span className="font-medium text-green-600">
                            Rp {financialData.current_balance?.toLocaleString('id-ID') || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Budget Amount</span>
                          <span className="font-medium">
                            Rp {financialData.budget_amount?.toLocaleString('id-ID') || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent Amount</span>
                          <span className="font-medium text-amber-600">
                            Rp {financialData.spent_amount?.toLocaleString('id-ID') || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className={`font-bold ${financialData.remaining_amount && financialData.remaining_amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                            Rp {financialData.remaining_amount?.toLocaleString('id-ID') || '0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-medium mb-3">Transaction Summary</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Total Expenses</div>
                          <div className="text-lg font-bold text-amber-600">
                            Rp {financialData.total_expenses?.toLocaleString('id-ID') || '0'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Revenue</div>
                          <div className="text-lg font-bold text-green-600">
                            Rp {financialData.total_revenue?.toLocaleString('id-ID') || '0'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-green-50">
                      <h4 className="font-medium mb-3">Carbon Credits Value</h4>
                      <div className="text-2xl font-bold text-green-700">
                        ${financialData.estimated_credits_value_usd?.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Estimated value of issued credits (based on market price)
                      </p>
                    </div>

                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/dashboard/finance/proyek?project=${projectId}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Buka Detail Keuangan
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Belum ada data keuangan</h3>
                    <p className="text-muted-foreground mt-2">
                      Hubungkan project ke account keuangan terlebih dahulu.
                    </p>
                    <Button asChild className="mt-4">
                      <Link href={`/dashboard/finance/proyek?project=${projectId}`}>
                        Hubungkan Keuangan
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Akses cepat ke modul terkait
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button asChild className="w-full justify-start">
                    <Link href={`/dashboard/programs?project=${projectId}`}>
                      <Target className="mr-2 h-4 w-4" />
                      Kelola Program
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href={`/dashboard/dram?project=${projectId}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Buat DRAM
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href={`/dashboard/verra-registration?project=${projectId}`}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verra Registration
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href={`/dashboard/vvb-management?project=${projectId}`}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      VVB Management
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href={`/dashboard/carbon-credits?project=${projectId}`}>
                      <Coins className="mr-2 h-4 w-4" />
                      Carbon Credits
                    </Link>
                  </Button>
                  
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href={`/dashboard/investor?project=${projectId}`}>
                      <Users className="mr-2 h-4 w-4" />
                      Investor Dashboard
                    </Link>
                  </Button>
                </div>

                {/* Export Options */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">Export Options</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/carbon-integrated/export/pdf?project=${projectId}`}>
                        PDF Report
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/carbon-integrated/export/excel?project=${projectId}`}>
                        Excel Data
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/carbon-integrated/export/csv?project=${projectId}`}>
                        CSV Data
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/carbon-integrated/export/json?project=${projectId}`}>
                        JSON API
                      </Link>
                    </Button>
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
                  <Target className="h-12 w-12 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Carbon Integrated Dashboard - Fix Inconsistencies</h3>
                  <p className="text-muted-foreground mt-2">
                    Dashboard ini mengintegrasikan semua modul PROYEK KARBON untuk menghilangkan inkonsistensi:
                  </p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                    <li><strong>Standardized Workflow:</strong> Status terintegrasi antar semua modul</li>
                    <li><strong>Financial Integration:</strong> Link langsung ke modul keuangan</li>
                    <li><strong>Real-time Sync:</strong> Automatic status synchronization</li>
                    <li><strong>Unified View:</strong> Semua data dalam satu dashboard</li>
                    <li><strong>Backward Compatible:</strong> Tidak mengubah tabel perhutanan_sosial</li>
                  </ul>
                  <div className="mt-4 p-3 bg-white/50 rounded-lg border border-green-100">
                    <p className="text-sm font-medium text-green-700">
                      Dashboard ini adalah bagian dari perbaikan inkonsistensi PROYEK KARBON. 
                      Semua modul sekarang terintegrasi dengan status yang tersinkronisasi otomatis.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pilih Project Terlebih Dahulu</CardTitle>
            <CardDescription>
              Pilih carbon project dari daftar di atas untuk melihat dashboard terintegrasi
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Target className="mx-auto h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Belum ada project yang dipilih</h3>
            <p className="text-muted-foreground mt-2">
              Pilih salah satu carbon project untuk melihat dashboard terintegrasi.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Atau mulai dengan membuat carbon project baru.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
