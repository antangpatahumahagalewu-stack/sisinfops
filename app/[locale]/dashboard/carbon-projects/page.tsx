import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TreePine, Plus, Eye, Edit, Trash2, ArrowUpRight, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { canManageCarbonProjects } from "@/lib/auth/rbac"

export default async function CarbonProjectsPage() {
  const supabase = await createClient()
  const canManage = await canManageCarbonProjects()

  // Fetch carbon projects
  const { data: carbonProjects, error } = await supabase
    .from("carbon_projects")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching carbon projects:", error)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carbon Projects</h1>
          <p className="text-muted-foreground">
            Kelola proyek karbon dan pilih standar (Verra, Gold Standard, dll)
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

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <TreePine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carbonProjects?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {carbonProjects?.filter(p => p.status === 'active').length || 0} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Standar Karbon</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(carbonProjects?.map(p => p.standar_karbon).filter(Boolean))).length}
            </div>
            <p className="text-xs text-muted-foreground">Jenis standar berbeda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Luas Total</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {carbonProjects?.reduce((sum, p) => sum + (p.luas_total_ha || 0), 0).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">Hektar</p>
          </CardContent>
        </Card>
      </div>

      {/* Carbon Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Carbon Projects</CardTitle>
          <CardDescription>
            Semua proyek karbon yang terdaftar dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carbonProjects && carbonProjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Kode Project</th>
                    <th className="text-left py-3 px-4 font-medium">Nama Project</th>
                    <th className="text-left py-3 px-4 font-medium">Standar</th>
                    <th className="text-left py-3 px-4 font-medium">Luas (Ha)</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Tanggal Mulai</th>
                    <th className="text-left py-3 px-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {carbonProjects.map((project) => (
                    <tr key={project.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{project.kode_project}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{project.nama_project}</div>
                          <div className="text-xs text-muted-foreground">
                            {project.metodologi}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {project.standar_karbon}
                        </span>
                      </td>
                      <td className="py-3 px-4">{project.luas_total_ha?.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="py-3 px-4">
                        {project.tanggal_mulai ? new Date(project.tanggal_mulai).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/carbon-projects/${project.id}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                          {canManage && (
                            <>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/carbon-projects/${project.id}/edit`}>
                                  <Edit className="h-3 w-3" />
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" disabled>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <TreePine className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Belum ada Carbon Projects</h3>
              <p className="text-muted-foreground mt-2">
                Mulai dengan membuat carbon project pertama Anda.
              </p>
              {canManage && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/carbon-projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Carbon Project
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Output Carbon Projects
          </CardTitle>
          <CardDescription className="text-blue-700">
            Setiap carbon project menghasilkan input untuk PDD (Project Design Document)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Project Description section untuk PDD</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Pemilihan standar karbon (Verra, Gold Standard, Indonesia Standard)</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Penentuan metodologi dan baseline</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Estimasi penyimpanan karbon (ton CO2e)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}