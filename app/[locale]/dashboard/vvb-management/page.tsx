import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Globe, FileText, CheckCircle, XCircle, AlertCircle, Plus, Eye, Edit, Trash2, Calendar, Building2, Users } from "lucide-react"
import Link from "next/link"
import { canManageCarbonProjects } from "@/lib/auth/rbac"

export default async function VVBManagementPage() {
  const supabase = await createClient()
  const canManage = await canManageCarbonProjects()

  // Fetch VVB organizations
  const { data: vvbOrganizations, error } = await supabase
    .from("vvb_organizations")
    .select("*")
    .order("organization_name", { ascending: true })

  // Fetch VVB engagements with projects
  const { data: vvbEngagements, error: engagementsError } = await supabase
    .from("vvb_engagements")
    .select(`
      *,
      verra_project_registrations (
        carbon_project_id,
        carbon_projects (kode_project, nama_project)
      ),
      vvb_organizations (organization_name)
    `)
    .order("contract_date", { ascending: false })

  if (error) {
    console.error("Error fetching VVB organizations:", error)
  }
  if (engagementsError) {
    console.error("Error fetching VVB engagements:", engagementsError)
  }

  // Status badge component for VVB accreditation
  const VVBStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      suspended: "bg-yellow-100 text-yellow-800",
      withdrawn: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800"
    }

    const icons: Record<string, React.ReactNode> = {
      active: <CheckCircle className="h-3 w-3" />,
      suspended: <AlertCircle className="h-3 w-3" />,
      withdrawn: <XCircle className="h-3 w-3" />,
      expired: <Calendar className="h-3 w-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.active}`}>
        {icons[status] || icons.active}
        {status.toUpperCase()}
      </span>
    )
  }

  // Engagement status badge
  const EngagementStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      contract_signed: "bg-blue-100 text-blue-800",
      desk_review: "bg-yellow-100 text-yellow-800",
      site_visit_scheduled: "bg-orange-100 text-orange-800",
      site_visit_completed: "bg-purple-100 text-purple-800",
      assessment_report: "bg-indigo-100 text-indigo-800",
      car_issued: "bg-red-100 text-red-800",
      car_resolved: "bg-green-100 text-green-800",
      statement_issued: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800"
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.draft}`}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    )
  }

  // Calculate statistics
  const totalVVBs = vvbOrganizations?.length || 0
  const activeVVBs = vvbOrganizations?.filter(v => v.accreditation_status === 'active').length || 0
  const totalEngagements = vvbEngagements?.length || 0
  const activeEngagements = vvbEngagements?.filter(e => 
    ['contract_signed', 'desk_review', 'site_visit_scheduled', 'site_visit_completed', 'assessment_report'].includes(e.status)
  ).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VVB Management</h1>
          <p className="text-muted-foreground">
            Manage Validation & Verification Bodies (VVB) for carbon project certification
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/vvb-management/new">
              <Plus className="mr-2 h-4 w-4" />
              Add VVB Organization
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VVBs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVVBs}</div>
            <p className="text-xs text-muted-foreground">
              Accredited organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active VVBs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVVBs}</div>
            <p className="text-xs text-muted-foreground">
              Currently accredited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEngagements}</div>
            <p className="text-xs text-muted-foreground">
              Validation/verification contracts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Engagements</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEngagements}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* VVB Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accredited VVB Organizations</CardTitle>
          <CardDescription>
            Validation & Verification Bodies accredited by Verra for carbon project certification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vvbOrganizations && vvbOrganizations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">VVB Code</th>
                    <th className="text-left py-3 px-4 font-medium">Organization Name</th>
                    <th className="text-left py-3 px-4 font-medium">Accreditation Status</th>
                    <th className="text-left py-3 px-4 font-medium">Countries</th>
                    <th className="text-left py-3 px-4 font-medium">Methodologies</th>
                    <th className="text-left py-3 px-4 font-medium">Expiry Date</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vvbOrganizations.map((vvb) => (
                    <tr key={vvb.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{vvb.vvb_code}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{vvb.organization_name}</div>
                          {vvb.contact_person && (
                            <div className="text-xs text-muted-foreground">
                              Contact: {vvb.contact_person}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <VVBStatusBadge status={vvb.accreditation_status || 'active'} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {vvb.countries_accredited?.slice(0, 3).map((country: string) => (
                            <span key={country} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {country}
                            </span>
                          ))}
                          {vvb.countries_accredited && vvb.countries_accredited.length > 3 && (
                            <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                              +{vvb.countries_accredited.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {vvb.methodologies_accredited?.slice(0, 2).map((methodology: string) => (
                            <span key={methodology} className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                              {methodology}
                            </span>
                          ))}
                          {vvb.methodologies_accredited && vvb.methodologies_accredited.length > 2 && (
                            <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                              +{vvb.methodologies_accredited.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {vvb.accreditation_expiry ? 
                          new Date(vvb.accreditation_expiry).toLocaleDateString('id-ID') : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/vvb-management/${vvb.id}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                          {canManage && (
                            <>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/vvb-management/${vvb.id}/edit`}>
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
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No VVB organizations found</h3>
              <p className="text-muted-foreground mt-2">
                Add accredited VVB organizations to manage validation and verification engagements.
              </p>
              {canManage && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/vvb-management/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add VVB Organization
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Engagements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active VVB Engagements</CardTitle>
          <CardDescription>
            Current validation and verification contracts with VVBs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vvbEngagements && vvbEngagements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Contract Number</th>
                    <th className="text-left py-3 px-4 font-medium">VVB</th>
                    <th className="text-left py-3 px-4 font-medium">Project</th>
                    <th className="text-left py-3 px-4 font-medium">Engagement Type</th>
                    <th className="text-left py-3 px-4 font-medium">Contract Date</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vvbEngagements.slice(0, 10).map((engagement) => {
                    const project = engagement.verra_project_registrations?.[0]?.carbon_projects
                    const vvbName = engagement.vvb_organizations?.organization_name
                    return (
                      <tr key={engagement.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{engagement.contract_number || "-"}</td>
                        <td className="py-3 px-4">{vvbName || "-"}</td>
                        <td className="py-3 px-4">
                          {project ? (
                            <div>
                              <div className="font-medium">{project.kode_project}</div>
                              <div className="text-xs text-muted-foreground">{project.nama_project}</div>
                            </div>
                          ) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                            {engagement.engagement_type || "validation"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {engagement.contract_date ? 
                            new Date(engagement.contract_date).toLocaleDateString('id-ID') : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <EngagementStatusBadge status={engagement.status} />
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/vvb-management/engagements/${engagement.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No active engagements</h3>
              <p className="text-muted-foreground mt-2">
                Create VVB engagements for your carbon projects to start validation and verification processes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            About Validation & Verification Bodies (VVB)
          </CardTitle>
          <CardDescription className="text-blue-700">
            VVBs are independent third-party organizations accredited by Verra to validate and verify carbon projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Validation Process</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Desk review of Project Design Document (PDD)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Site visit and stakeholder interviews</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Assessment against Verra methodology requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Issuance of validation statement</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Verification Process</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Review of monitoring reports and data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Verification of emission reductions/removals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Issuance of verification statement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Recommendation for VCU issuance</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
