import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileCheck, ShieldCheck, Coins, Target, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { canManageCarbonProjects } from "@/lib/auth/rbac"

export default async function VerraRegistrationPage() {
  const supabase = await createClient()
  const canManage = await canManageCarbonProjects()

  // Fetch carbon projects with Verra registration status
  const { data: carbonProjects, error } = await supabase
    .from("carbon_projects")
    .select(`
      *,
      verra_project_registrations (
        status,
        verra_project_id,
        registration_date
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching carbon projects:", error)
  }

  // Fetch Verra registration statistics
  const { data: verraStats } = await supabase
    .from("verra_project_registrations")
    .select("status")

  // Status badge component for Verra registration
  const VerraStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      internal_review: "bg-blue-100 text-blue-800",
      vvb_appointed: "bg-yellow-100 text-yellow-800",
      under_validation: "bg-orange-100 text-orange-800",
      validated: "bg-green-100 text-green-800",
      submitted_to_verra: "bg-purple-100 text-purple-800",
      registered: "bg-green-100 text-green-800",
      under_monitoring: "bg-blue-100 text-blue-800",
      under_verification: "bg-yellow-100 text-yellow-800",
      verified: "bg-green-100 text-green-800",
      issued: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
      terminated: "bg-gray-100 text-gray-800"
    }

    const icons: Record<string, React.ReactNode> = {
      draft: <AlertCircle className="h-3 w-3" />,
      internal_review: <AlertCircle className="h-3 w-3" />,
      vvb_appointed: <ShieldCheck className="h-3 w-3" />,
      under_validation: <ShieldCheck className="h-3 w-3" />,
      validated: <CheckCircle className="h-3 w-3" />,
      submitted_to_verra: <FileCheck className="h-3 w-3" />,
      registered: <CheckCircle className="h-3 w-3" />,
      under_monitoring: <Target className="h-3 w-3" />,
      under_verification: <ShieldCheck className="h-3 w-3" />,
      verified: <CheckCircle className="h-3 w-3" />,
      issued: <Coins className="h-3 w-3" />,
      suspended: <XCircle className="h-3 w-3" />,
      terminated: <XCircle className="h-3 w-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.draft}`}>
        {icons[status] || icons.draft}
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    )
  }

  // Calculate statistics
  const totalProjects = carbonProjects?.length || 0
  const registeredProjects = carbonProjects?.filter(p => 
    p.verra_project_registrations?.some((v: any) => v.status === 'registered')
  ).length || 0
  const inProgressProjects = carbonProjects?.filter(p => 
    p.verra_project_registrations?.some((v: any) => 
      ['draft', 'internal_review', 'vvb_appointed', 'under_validation', 'submitted_to_verra'].includes(v.status)
    )
  ).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verra Registration</h1>
          <p className="text-muted-foreground">
            Manage Verra VCS project registration, validation, and verification processes
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/carbon-projects/new">
              <FileCheck className="mr-2 h-4 w-4" />
              New Carbon Project
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Carbon projects in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered with Verra</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registeredProjects}</div>
            <p className="text-xs text-muted-foreground">
              Successfully registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressProjects}</div>
            <p className="text-xs text-muted-foreground">
              Under registration process
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verra Registration Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Verra VCS Registration Workflow</CardTitle>
          <CardDescription>
            Step-by-step process for carbon project registration with Verra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-semibold text-blue-800">1</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Project Design Document (PDD)</h3>
                <p className="text-sm text-muted-foreground">
                  Develop PDD according to Verra VCS template. Include all required sections: 
                  A.1 General Description, B.2 Applicability, C.3 Duration, etc.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-sm font-semibold text-yellow-800">2</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">VVB Selection & Validation</h3>
                <p className="text-sm text-muted-foreground">
                  Select accredited Validation & Verification Body (VVB). 
                  Undergo desk review, site visit, and validation assessment.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                  <span className="text-sm font-semibold text-purple-800">3</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Verra Submission</h3>
                <p className="text-sm text-muted-foreground">
                  Submit validated PDD and documents to Verra Registry. 
                  Wait for registration approval (typically 60-90 days).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm font-semibold text-green-800">4</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Monitoring & Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Implement monitoring plan. Annual monitoring reports. 
                  VVB verification for each issuance request.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm font-semibold text-green-800">5</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Issuance & Retirement</h3>
                <p className="text-sm text-muted-foreground">
                  VCU (Verified Carbon Unit) issuance to registry account. 
                  Credit retirement for offsetting or trading.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carbon Projects with Verra Status */}
      <Card>
        <CardHeader>
          <CardTitle>Carbon Projects Verra Status</CardTitle>
          <CardDescription>
            Track Verra registration progress for all carbon projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carbonProjects && carbonProjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Project Code</th>
                    <th className="text-left py-3 px-4 font-medium">Project Name</th>
                    <th className="text-left py-3 px-4 font-medium">Verra Status</th>
                    <th className="text-left py-3 px-4 font-medium">Verra ID</th>
                    <th className="text-left py-3 px-4 font-medium">Registration Date</th>
                    <th className="text-left py-3 px-4 font-medium">Methodology</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {carbonProjects.map((project) => {
                    const verraRegistration = project.verra_project_registrations?.[0]
                    return (
                      <tr key={project.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{project.kode_project}</td>
                        <td className="py-3 px-4">{project.nama_project}</td>
                        <td className="py-3 px-4">
                          {verraRegistration ? (
                            <VerraStatusBadge status={verraRegistration.status} />
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                              <AlertCircle className="h-3 w-3" />
                              NOT STARTED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {verraRegistration?.verra_project_id || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {verraRegistration?.registration_date ? 
                            new Date(verraRegistration.registration_date).toLocaleDateString('id-ID') : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {project.standar_karbon || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/carbon-projects/${project.id}`}>
                                View
                              </Link>
                            </Button>
                            {canManage && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/carbon-projects/${project.id}/verra`}>
                                  Manage Verra
                                </Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No carbon projects</h3>
              <p className="text-muted-foreground mt-2">
                Start by creating a carbon project to begin Verra registration process.
              </p>
              {canManage && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/carbon-projects/new">
                    <FileCheck className="mr-2 h-4 w-4" />
                    Create Carbon Project
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              VVB Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage Validation & Verification Body engagements and contracts.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/vvb-management">
                Go to VVB Management
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Carbon Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Track VCU issuance, retirement, and registry account balances.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/carbon-credits">
                Go to Carbon Credits
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              PDD Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate Verra VCS compliant Project Design Documents.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/pdd-generator">
                Go to PDD Generator
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
