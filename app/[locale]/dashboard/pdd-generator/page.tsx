import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileCode, Download, Eye, RefreshCw, CheckCircle, AlertCircle, FileText, TreePine, Calendar } from "lucide-react"
import Link from "next/link"
import { canGeneratePDD } from "@/lib/auth/rbac"

export default async function PddGeneratorPage() {
  const supabase = await createClient()
  const canGenerate = await canGeneratePDD()

  // Fetch carbon projects for PDD generation
  const { data: carbonProjects, error } = await supabase
    .from("carbon_projects")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching carbon projects:", error)
  }

  // Fetch existing PDD documents (if we have a table for them)
  const { data: existingPdds } = await supabase
    .from("pdd_documents")
    .select("*")
    .limit(5)

  // Status badge for PDD generation
  const PddStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      generated: "bg-green-100 text-green-800",
      reviewed: "bg-blue-100 text-blue-800",
      approved: "bg-purple-100 text-purple-800",
      submitted: "bg-yellow-100 text-yellow-800"
    }

    const icons: Record<string, React.ReactNode> = {
      draft: <AlertCircle className="h-3 w-3" />,
      generated: <FileCode className="h-3 w-3" />,
      reviewed: <Eye className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      submitted: <CheckCircle className="h-3 w-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.draft}`}>
        {icons[status] || icons.draft}
        {status.toUpperCase()}
      </span>
    )
  }

  // Calculate statistics
  const totalProjects = carbonProjects?.length || 0
  const projectsWithPdds = existingPdds?.length || 0
  const latestPddDate = existingPdds && existingPdds.length > 0 
    ? new Date(Math.max(...existingPdds.map(p => new Date(p.created_at).getTime())))
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PDD Generator</h1>
          <p className="text-muted-foreground">
            Generate Project Design Document (PDD) untuk proyek karbon
          </p>
        </div>
        {canGenerate && (
          <Button asChild>
            <Link href="/dashboard/pdd-generator/generate">
              <FileCode className="mr-2 h-4 w-4" />
              Generate PDD
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbon Projects</CardTitle>
            <TreePine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {carbonProjects?.filter(p => p.status === 'active').length || 0} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDD Generated</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsWithPdds}</div>
            <p className="text-xs text-muted-foreground">
              {totalProjects > 0 ? `${Math.round((projectsWithPdds / totalProjects) * 100)}% complete` : 'No projects'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest PDD</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestPddDate ? latestPddDate.toLocaleDateString('id-ID') : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last generated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PDD Generation Process */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Project Design Document</CardTitle>
          <CardDescription>
            PDD di-generate secara otomatis dari data di database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1: Select Carbon Project */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Pilih Carbon Project</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pilih proyek karbon yang akan di-generate PDD-nya.
                </p>
                {carbonProjects && carbonProjects.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {carbonProjects.slice(0, 3).map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{project.nama_project}</p>
                          <p className="text-sm text-muted-foreground">{project.kode_project} • {project.standar_karbon}</p>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/pdd-generator/generate?project_id=${project.id}`}>
                            Select
                          </Link>
                        </Button>
                      </div>
                    ))}
                    {carbonProjects.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{carbonProjects.length - 3} more projects available
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 p-4 border rounded-lg text-center">
                    <TreePine className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm">No carbon projects available</p>
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <Link href="/dashboard/carbon-projects/new">
                        Create Carbon Project
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Data Collection */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Kumpulkan Data Otomatis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sistem akan mengumpulkan data dari database untuk section PDD:
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Project Description</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dari tabel carbon_projects dan programs
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Mitigation Actions</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dari tabel dram dan aksi_mitigasi
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Community Benefits</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dari tabel pemberdayaan_ekonomi
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Legal & Stakeholder</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dari tabel legal_documents dan stakeholders
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Generate & Download */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Generate & Download</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate dokumen PDD dalam format DOCX atau PDF.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1" asChild>
                    <Link href="/dashboard/pdd-generator/generate">
                      <FileCode className="mr-2 h-4 w-4" />
                      Generate PDD
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1" disabled={!existingPdds || existingPdds.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Latest PDD
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href="/dashboard/pdd-generator/history">
                      <Eye className="mr-2 h-4 w-4" />
                      View History
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent PDD Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent PDD Documents</CardTitle>
          <CardDescription>
            Recently generated Project Design Documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingPdds && existingPdds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Carbon Project</th>
                    <th className="text-left py-3 px-4 font-medium">Version</th>
                    <th className="text-left py-3 px-4 font-medium">Generated Date</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Format</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {existingPdds.map((pdd) => (
                    <tr key={pdd.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{pdd.project_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {pdd.standard} • v{pdd.version}
                        </div>
                      </td>
                      <td className="py-3 px-4">v{pdd.version}</td>
                      <td className="py-3 px-4">
                        {new Date(pdd.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <PddStatusBadge status={pdd.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            {pdd.format?.toUpperCase() || 'DOCX'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileCode className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No PDD Documents Yet</h3>
              <p className="text-muted-foreground mt-2">
                Generate your first Project Design Document for a carbon project.
              </p>
              {canGenerate && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/pdd-generator/generate">
                    <FileCode className="mr-2 h-4 w-4" />
                    Generate First PDD
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Notes for PDD Generation
          </CardTitle>
          <CardDescription className="text-yellow-700">
            Key considerations when generating Project Design Documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>Data Completeness:</strong> Ensure all required data is complete in the database before generating PDD.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>AI Limitation:</strong> AI is prohibited from fabricating new data for PDD. All data must come from the database.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>Verification:</strong> Generated PDD should be verified against carbon standard requirements (Verra, Gold Standard, etc.).
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>Version Control:</strong> Each generation creates a new version. Previous versions are archived for audit trail.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5" />
              Carbon Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage carbon projects before generating PDD.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/carbon-projects">
                View Carbon Projects
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              DRAM Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review DRAM data that will be included in PDD.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/dram">
                View DRAM
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Regenerate PDD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Regenerate PDD with updated data from database.
            </p>
            <Button asChild variant="outline" className="w-full" disabled={!existingPdds || existingPdds.length === 0}>
              <Link href="#">
                Regenerate Latest
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
