import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins, TrendingUp, DollarSign, Package, Plus, Eye, Download, Filter, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { canManageCarbonProjects } from "@/lib/auth/rbac"

export default async function CarbonCreditsPage() {
  const supabase = await createClient()
  const canManage = await canManageCarbonProjects()

  // Fetch carbon credits with project information
  const { data: carbonCredits, error } = await supabase
    .from("carbon_credits")
    .select(`
      *,
      verra_project_registrations (
        verra_project_id,
        carbon_projects (kode_project, nama_project)
      )
    `)
    .order("issuance_date", { ascending: false })
    .limit(50)

  // Fetch summary statistics
  const { data: summaryStats } = await supabase
    .rpc('get_carbon_credits_summary')

  if (error) {
    console.error("Error fetching carbon credits:", error)
  }

  // Status badge component for carbon credits
  const CreditStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      issued: "bg-green-100 text-green-800",
      retired: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      transferred: "bg-purple-100 text-purple-800",
      pending: "bg-yellow-100 text-yellow-800"
    }

    const icons: Record<string, React.ReactNode> = {
      issued: <CheckCircle className="h-3 w-3" />,
      retired: <Package className="h-3 w-3" />,
      cancelled: <XCircle className="h-3 w-3" />,
      transferred: <TrendingUp className="h-3 w-3" />,
      pending: <AlertCircle className="h-3 w-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.issued}`}>
        {icons[status] || icons.issued}
        {status.toUpperCase()}
      </span>
    )
  }

  // Calculate statistics from data if RPC fails
  const calculateStats = () => {
    if (!carbonCredits) return { total: 0, issued: 0, retired: 0, value: 0 }
    
    const total = carbonCredits.reduce((sum, credit) => sum + (credit.quantity || 0), 0)
    const issued = carbonCredits.filter(c => c.status === 'issued').reduce((sum, credit) => sum + (credit.quantity || 0), 0)
    const retired = carbonCredits.filter(c => c.status === 'retired').reduce((sum, credit) => sum + (credit.quantity || 0), 0)
    
    // Assuming average price of $10 per ton for display purposes
    const value = total * 10
    
    return { total, issued, retired, value }
  }

  const stats = summaryStats || calculateStats()

  // Group by vintage year for chart data
  const vintageData = carbonCredits?.reduce((acc, credit) => {
    const year = credit.vintage_year
    if (!acc[year]) acc[year] = 0
    acc[year] += credit.quantity || 0
    return acc
  }, {} as Record<number, number>) || {}

  const vintageYears = Object.keys(vintageData).sort((a, b) => Number(b) - Number(a)).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carbon Credits</h1>
          <p className="text-muted-foreground">
            Track Verified Carbon Units (VCUs) issuance, retirement, and registry balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canManage && (
            <Button asChild size="sm">
              <Link href="/dashboard/carbon-credits/new">
                <Plus className="mr-2 h-4 w-4" />
                New Credit Batch
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VCUs</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              Verified Carbon Units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issued</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.issued.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              Available in registry
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retired</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.retired.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              Offset emissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on market price
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Carbon Credits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Carbon Credits Registry</CardTitle>
          <CardDescription>
            All Verified Carbon Units (VCUs) tracked in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carbonCredits && carbonCredits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Serial Number</th>
                    <th className="text-left py-3 px-4 font-medium">Project</th>
                    <th className="text-left py-3 px-4 font-medium">Vintage Year</th>
                    <th className="text-left py-3 px-4 font-medium">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium">Issuance Date</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Retirement Date</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {carbonCredits.slice(0, 20).map((credit) => {
                    const project = credit.verra_project_registrations?.[0]?.carbon_projects
                    return (
                      <tr key={credit.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm">
                          {credit.serial_number || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {project ? (
                            <div>
                              <div className="font-medium">{project.kode_project}</div>
                              <div className="text-xs text-muted-foreground">{project.nama_project}</div>
                            </div>
                          ) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {credit.vintage_year}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {credit.quantity?.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4">
                          {credit.issuance_date ? 
                            new Date(credit.issuance_date).toLocaleDateString('id-ID') : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <CreditStatusBadge status={credit.status} />
                        </td>
                        <td className="py-3 px-4">
                          {credit.retirement_date ? 
                            new Date(credit.retirement_date).toLocaleDateString('id-ID') : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/carbon-credits/${credit.id}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {carbonCredits.length > 20 && (
                <div className="mt-4 text-center">
                  <Button variant="outline">
                    Load More ({carbonCredits.length - 20} more credits)
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Coins className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No carbon credits found</h3>
              <p className="text-muted-foreground mt-2">
                Carbon credits will appear here once projects are registered with Verra and VCUs are issued.
              </p>
              {canManage && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/verra-registration">
                    Go to Verra Registration
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vintage Year Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vintage Year Distribution</CardTitle>
            <CardDescription>
              Carbon credits by vintage year
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vintageYears.length > 0 ? (
              <div className="space-y-4">
                {vintageYears.map(year => (
                  <div key={year} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{vintageData[Number(year)].toLocaleString('id-ID')}</span>
                      <span className="text-sm text-muted-foreground">VCUs</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">No vintage data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Coins className="h-5 w-5" />
              About Carbon Credits
            </CardTitle>
            <CardDescription className="text-green-700">
              Verified Carbon Units (VCUs) represent certified emission reductions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span><strong>1 VCU = 1 metric ton of CO2e</strong> removed or reduced</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Issued by Verra after project verification</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Can be retired to offset emissions or traded on carbon markets</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Each VCU has a unique serial number for tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Vintage year indicates the year emission reductions occurred</span>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-xs text-green-700">
                <strong>Note:</strong> Carbon credits must be retired to claim emission reductions. 
                Retirement permanently removes credits from circulation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
