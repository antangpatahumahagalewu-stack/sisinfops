import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Filter, Download, Plus, TrendingUp } from "lucide-react"
import Link from "next/link"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('budgets.title', { defaultValue: "Anggaran Keuangan" }),
    description: t('budgets.description', { defaultValue: "Kelola anggaran operasional dan proyek" }),
  }
}

export default async function BudgetsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/budgets`)
  }

  // Check if user has permission to view budgets
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
              <Wallet className="h-8 w-8 text-primary" />
              Anggaran Keuangan
            </h1>
            <p className="text-muted-foreground">
              Kelola anggaran operasional dan proyek dengan sistem dual ledger
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
            {canManage && (
              <Button asChild>
                <Link href={`/${locale}/dashboard/finance/budgets/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Buat Anggaran
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Anggaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 3.2 M</div>
              <p className="text-xs text-muted-foreground">Operasional & proyek</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Anggaran Terpakai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 1.6 M</div>
              <p className="text-xs text-muted-foreground">50% utilization</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Anggaran Tersisa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 1.6 M</div>
              <p className="text-xs text-muted-foreground">Untuk sisa tahun</p>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Anggaran</CardTitle>
            <CardDescription>
              Semua anggaran keuangan akan muncul di sini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">Halaman Anggaran Keuangan</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Halaman ini sedang dalam pengembangan. Fitur lengkap untuk mengelola anggaran keuangan akan segera tersedia.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link href={`/${locale}/dashboard/finance/budgets/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Anggaran Baru
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
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Tentang Anggaran Keuangan</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Sistem anggaran mendukung perencanaan keuangan untuk operasional kantor dan proyek.
                  Setiap anggaran memiliki periode, kategori, dan real-time tracking terhadap penggunaan.
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Dual ledger system: Operasional vs Proyek</li>
                  <li>• Periode anggaran (tahunan, triwulan, bulanan)</li>
                  <li>• Real-time budget utilization tracking</li>
                  <li>• Approval workflow untuk revisi anggaran</li>
                  <li>• Forecasting dan variance analysis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}