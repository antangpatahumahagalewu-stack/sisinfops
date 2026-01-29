import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Filter, Download, BarChart3, PieChart, TrendingUp } from "lucide-react"
import Link from "next/link"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('financialReports.title', { defaultValue: "Laporan Keuangan" }),
    description: t('financialReports.description', { defaultValue: "Akses dan generate laporan keuangan" }),
  }
}

export default async function FinancialReportsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/reports`)
  }

  // Check if user has permission to view financial reports
  const canView = await hasPermission("FINANCIAL_REPORT_VIEW", session.user.id)
  if (!canView) {
    redirect(`/${locale}/dashboard?error=unauthorized`)
  }

  const canExport = await hasPermission("FINANCIAL_REPORT_EXPORT", session.user.id)

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Laporan Keuangan
            </h1>
            <p className="text-muted-foreground">
              Akses dan generate laporan keuangan operasional dan proyek
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            {canExport && (
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Report Categories */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Balance Sheet
              </CardTitle>
              <CardDescription>
                Neraca keuangan - Aset, Liabilitas, Ekuitas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Laporan posisi keuangan pada periode tertentu.
              </p>
              <Button asChild className="w-full">
                <Link href={`/${locale}/dashboard/finance/reports/balance-sheet`}>
                  Generate
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Cash Flow
              </CardTitle>
              <CardDescription>
                Laporan arus kas - Operasi, Investasi, Pendanaan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Laporan arus kas masuk dan keluar.
              </p>
              <Button asChild className="w-full">
                <Link href={`/${locale}/dashboard/finance/reports/cash-flow`}>
                  Generate
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                Income Statement
              </CardTitle>
              <CardDescription>
                Laporan laba rugi - Pendapatan, Biaya, Laba
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Laporan kinerja keuangan periode berjalan.
              </p>
              <Button asChild className="w-full">
                <Link href={`/${locale}/dashboard/finance/reports/income-statement`}>
                  Generate
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Laporan</CardTitle>
            <CardDescription>
              Semua laporan keuangan akan muncul di sini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">Halaman Laporan Keuangan</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Halaman ini sedang dalam pengembangan. Fitur lengkap untuk mengelola laporan keuangan akan segera tersedia.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link href={`/${locale}/dashboard/finance/reports/balance-sheet`}>
                    Lihat Balance Sheet
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
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Tentang Laporan Keuangan</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Sistem laporan keuangan mendukung SAK compliance dengan dual ledger reporting.
                  Setiap laporan dapat di-generate untuk periode tertentu dan diekspor dalam berbagai format.
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Dual ledger reporting: Operasional vs Proyek</li>
                  <li>• SAK compliant financial statements</li>
                  <li>• Export to PDF, Excel, CSV</li>
                  <li>• Scheduled report generation</li>
                  <li>• Comparative period analysis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}