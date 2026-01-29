import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, DollarSign, FileText, TrendingUp, Users, Wallet } from "lucide-react"
import Link from "next/link"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('operasionalKantor.title', { defaultValue: "Operasional Kantor" }),
    description: t('operasionalKantor.description', { defaultValue: "Kelola keuangan operasional kantor" }),
  }
}

export default async function OperasionalKantorPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/operasional`)
  }

  // Check if user has permission to view operational finance
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
              <Building className="h-8 w-8 text-blue-600" />
              Operasional Kantor
            </h1>
            <p className="text-muted-foreground">
              Kelola keuangan operasional kantor dan biaya administratif
            </p>
          </div>
          {canManage && (
            <Button asChild>
              <Link href={`/${locale}/dashboard/finance/transactions/new?ledger_type=OPERATIONAL`}>
                <DollarSign className="mr-2 h-4 w-4" />
                Transaksi Baru
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                Saldo Operasional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 125.000.000</div>
              <p className="text-xs text-muted-foreground">Saldo terkini</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Pengeluaran Bulan Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 45.000.000</div>
              <p className="text-xs text-muted-foreground">+12% dari bulan lalu</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-yellow-500" />
                Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">Transaksi bulan ini</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">Vendor aktif</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Akses cepat ke fitur operasional kantor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button asChild className="justify-start h-auto py-4">
                <Link href={`/${locale}/dashboard/finance/transactions?ledger_type=OPERATIONAL`}>
                  <div className="text-left">
                    <div className="font-medium">Transaksi Operasional</div>
                    <div className="text-sm text-muted-foreground">Lihat semua transaksi</div>
                  </div>
                </Link>
              </Button>
              <Button asChild className="justify-start h-auto py-4" variant="outline">
                <Link href={`/${locale}/dashboard/finance/budgets?ledger_type=OPERATIONAL`}>
                  <div className="text-left">
                    <div className="font-medium">Anggaran Kantor</div>
                    <div className="text-sm text-muted-foreground">Kelola anggaran</div>
                  </div>
                </Link>
              </Button>
              <Button asChild className="justify-start h-auto py-4" variant="outline">
                <Link href={`/${locale}/dashboard/finance/reports?ledger_type=OPERATIONAL`}>
                  <div className="text-left">
                    <div className="font-medium">Laporan Operasional</div>
                    <div className="text-sm text-muted-foreground">Generate laporan</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Tentang Keuangan Operasional Kantor</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Bagian ini khusus untuk mengelola keuangan operasional kantor seperti gaji, utilitas, sewa, 
                  peralatan kantor, dan biaya administratif lainnya. Dana operasional terpisah dari dana proyek 
                  untuk memastikan akuntabilitas.
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Gaji dan tunjangan karyawan</li>
                  <li>• Biaya listrik, air, internet</li>
                  <li>• Sewa kantor dan maintenance</li>
                  <li>• Peralatan dan perlengkapan kantor</li>
                  <li>• Biaya rapat dan perjalanan dinas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}