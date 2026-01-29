import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Filter, Download, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('financialControls.title', { defaultValue: "Kontrol & Kepatuhan" }),
    description: t('financialControls.description', { defaultValue: "Monitor kontrol internal dan kepatuhan keuangan" }),
  }
}

export default async function FinancialControlsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/controls`)
  }

  // Check if user has permission to view financial controls
  const canView = await hasPermission("FINANCIAL_AUDIT_VIEW", session.user.id)
  if (!canView) {
    redirect(`/${locale}/dashboard?error=unauthorized`)
  }

  const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id)

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Kontrol & Kepatuhan
            </h1>
            <p className="text-muted-foreground">
              Monitor kontrol internal dan kepatuhan keuangan sesuai standar
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Kontrol Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">Dalam implementasi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Peringatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Perlu perhatian</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">Menunggu persetujuan</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-500" />
                Compliance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">SAK & internal</p>
            </CardContent>
          </Card>
        </div>

        {/* Control Categories */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Kontrol Internal</CardTitle>
              <CardDescription>
                Segregation of duties, authorization limits, audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Segregation of Duties</div>
                    <div className="text-sm text-muted-foreground">Transaction creation vs approval</div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Authorization Limits</div>
                    <div className="text-sm text-muted-foreground">Multi-level approval thresholds</div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Audit Trail</div>
                    <div className="text-sm text-muted-foreground">Complete transaction history</div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SAK Compliance</CardTitle>
              <CardDescription>
                Standar Akuntansi Keuangan compliance checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Double-Entry Accounting</div>
                    <div className="text-sm text-muted-foreground">All transactions validated</div>
                  </div>
                  <Badge variant="default">100%</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Documentation</div>
                    <div className="text-sm text-muted-foreground">Supporting docs attached</div>
                  </div>
                  <Badge variant="warning">85%</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Period Closing</div>
                    <div className="text-sm text-muted-foreground">Monthly close compliance</div>
                  </div>
                  <Badge variant="default">95%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Monitoring & Alerts</CardTitle>
            <CardDescription>
              System alerts and compliance monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">Halaman Kontrol & Kepatuhan</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Halaman ini sedang dalam pengembangan. Fitur lengkap untuk monitoring kontrol internal dan kepatuhan akan segera tersedia.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link href={`/${locale}/dashboard/finance/controls/alerts`}>
                    Lihat Alert
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/${locale}/dashboard/finance`}>
                    Kembali ke Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Tentang Kontrol & Kepatuhan</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Sistem kontrol dan kepatuhan memastikan keuangan dikelola sesuai standar internal dan eksternal.
                  Termasuk monitoring SAK compliance, internal controls, dan audit trail.
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Segregation of duties enforcement</li>
                  <li>• Multi-level authorization workflows</li>
                  <li>• SAK compliance monitoring</li>
                  <li>• Real-time alerts for violations</li>
                  <li>• Audit trail and change tracking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Badge component for status display
function Badge({ variant = "default", children }: { variant?: "default" | "warning" | "destructive", children: React.ReactNode }) {
  const variantClasses = {
    default: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    destructive: "bg-red-100 text-red-800 border-red-200"
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}