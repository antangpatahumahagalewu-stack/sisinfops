import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TreePine, ArrowLeft, Edit, Calendar, MapPin, Target, Users, FileText, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { canManageCarbonProjects } from "@/lib/auth/rbac"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CarbonProjectDetailPage({ params }: PageProps) {
  const { id } = await params
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/carbon-projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.nama_project}</h1>
            <p className="text-muted-foreground">
              Kode: {project.kode_project} • {project.standar_karbon} • {project.metodologi}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
          {canManage && (
            <Button asChild>
              <Link href={`/dashboard/carbon-projects/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Details</CardTitle>
            <TreePine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Timeline:</span>
                <span className="text-sm">
                  {project.tanggal_mulai ? new Date(project.tanggal_mulai).toLocaleDateString('id-ID') : 'Not set'} 
                  {' → '}
                  {project.tanggal_selesai ? new Date(project.tanggal_selesai).toLocaleDateString('id-ID') : 'Ongoing'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Luas Area:</span>
                <span className="text-sm">{project.luas_total_ha?.toLocaleString('id-ID')} Ha</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Estimasi Karbon:</span>
                <span className="text-sm">{project.estimasi_penyimpanan_karbon?.toLocaleString('id-ID')} ton CO₂e</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {programs?.filter(p => p.status === 'active').length || 0} active programs
            </p>
            <div className="mt-4 space-y-2">
              {programs?.slice(0, 3).map((program) => (
                <div key={program.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{program.nama_program}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    program.status === 'active' ? 'bg-green-100 text-green-800' :
                    program.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {program.status}
                  </span>
                </div>
              ))}
              {programs && programs.length > 3 && (
                <p className="text-xs text-muted-foreground">+{programs.length - 3} more</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stakeholders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stakeholders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registered stakeholders</p>
            <div className="mt-4 space-y-2">
              {stakeholders?.slice(0, 3).map((stakeholder) => (
                <div key={stakeholder.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{stakeholder.nama}</span>
                  <span className="text-xs text-muted-foreground">{stakeholder.peran}</span>
                </div>
              ))}
              {stakeholders && stakeholders.length > 3 && (
                <p className="text-xs text-muted-foreground">+{stakeholders.length - 3} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs Section */}
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

      {/* Legal Documents */}
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

      {/* Quick Actions */}
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
