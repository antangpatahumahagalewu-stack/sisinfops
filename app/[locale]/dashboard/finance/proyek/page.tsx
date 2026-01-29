import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TreePine, DollarSign, FileText, TrendingUp, Users, Target, Coins, Globe } from "lucide-react"
import Link from "next/link"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('proyekProgram.title', { defaultValue: "Proyek & Program" }),
    description: t('proyekProgram.description', { defaultValue: "Kelola keuangan proyek karbon dan program sosial" }),
  }
}

export default async function ProyekProgramPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/proyek`)
  }

  // Check if user has permission to view project finance
  const canView = await hasPermission("FINANCIAL_VIEW", session.user.id)
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
              <TreePine className="h-8 w-8 text-green-600" />
              Proyek & Program
            </h1>
            <p className="text-muted-foreground">
              Kelola keuangan proyek karbon dan program sosial - Dana investor terpisah
            </p>
          </div>
          {canManage && (
            <Button asChild>
              <Link href={`/${locale}/dashboard/finance/transactions/new?ledger_type=PROJECT`}>
                <DollarSign className="mr-2 h-4 w-4" />
                Transaksi Proyek
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                Total Dana Proyek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 2.5 M</div>
              <p className="text-xs text-muted-foreground">Dana investor & donor</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Pengeluaran Proyek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 1.2 M</div>
              <p className="text-xs text-muted-foreground">48% dari total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Proyek Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Karbon & sosial</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                Investor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Aktif mendanai</p>
            </CardContent>
          </Card>
        </div>

        {/* Project Categories */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-green-600" />
                Proyek Karbon
              </CardTitle>
              <CardDescription>
                Keuangan khusus untuk proyek penyerapan karbon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Anggaran</span>
                  <span className="font-bold">Rp 1.8 M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Terkeluarkan</span>
                  <span className="font-bold">Rp 850 Jt</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '47%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>47% digunakan</span>
                  <span>Rp 950 Jt tersisa</span>
                </div>
                <Button asChild className="w-full mt-2" variant="outline">
                  <Link href={`/${locale}/dashboard/finance/budgets?ledger_code=LEDGER-PRJ-CARBON`}>
                    Kelola Anggaran Karbon
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Program Sosial
              </CardTitle>
              <CardDescription>
                Keuangan untuk program pemberdayaan masyarakat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Anggaran</span>
                  <span className="font-bold">Rp 700 Jt</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Terkeluarkan</span>
                  <span className="font-bold">Rp 350 Jt</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50% digunakan</span>
                  <span>Rp 350 Jt tersisa</span>
                </div>
                <Button asChild className="w-full mt-2" variant="outline">
                  <Link href={`/${locale}/dashboard/finance/budgets?ledger_code=LEDGER-PRJ-SOCIAL`}>
                    Kelola Anggaran Sosial
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Akses cepat ke fitur keuangan proyek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button asChild className="justify-start h-auto py-4">
                <Link href={`/${locale}/dashboard/finance/transactions?ledger_type=PROJECT`}>
                  <div className="text-left">
                    <div className="font-medium">Transaksi Proyek</div>
                    <div className="text-sm text-muted-foreground">Lihat semua transaksi</div>
                  </div>
                </Link>
              </Button>
              <Button asChild className="justify-start h-auto py-4" variant="outline">
                <Link href={`/${locale}/dashboard/finance/grants`}>
                  <div className="text-left">
                    <div className="font-medium">Manajemen Grant</div>
                    <div className="text-sm text-muted-foreground">Kelola grant & donor</div>
                  </div>
                </Link>
              </Button>
              <Button asChild className="justify-start h-auto py-4" variant="outline">
                <Link href={`/${locale}/dashboard/finance/budgets?ledger_type=PROJECT`}>
                  <div className="text-left">
                    <div className="font-medium">Anggaran Proyek</div>
                    <div className="text-sm text-muted-foreground">Kelola anggaran</div>
                  </div>
                </Link>
              </Button>
              <Button asChild className="justify-start h-auto py-4" variant="outline">
                <Link href={`/${locale}/dashboard/finance/reports?ledger_type=PROJECT`}>
                  <div className="text-left">
                    <div className="font-medium">Laporan Proyek</div>
                    <div className="text-sm text-muted-foreground">Generate laporan</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <TreePine className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Keuangan Proyek & Program</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Bagian ini khusus untuk mengelola keuangan proyek karbon dan program sosial. 
                  Dana investor dan donor dikelola terpisah dari dana operasional kantor untuk 
                  memastikan transparansi dan akuntabilitas.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Proyek Karbon</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Penanaman pohon & reforestasi</li>
                      <li>• Pemeliharaan hutan</li>
                      <li>• Monitoring karbon</li>
                      <li>• Sertifikasi Verra</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Program Sosial</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Pemberdayaan ekonomi</li>
                      <li>• Pelatihan masyarakat</li>
                      <li>• Infrastruktur sosial</li>
                      <li>• Bantuan langsung</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}