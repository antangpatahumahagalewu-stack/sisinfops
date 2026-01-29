import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Receipt, Filter, Download, Plus, Search } from "lucide-react"
import Link from "next/link"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('transactions.title', { defaultValue: "Transaksi Keuangan" }),
    description: t('transactions.description', { defaultValue: "Kelola semua transaksi keuangan" }),
  }
}

export default async function TransactionsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/transactions`)
  }

  // Check if user has permission to view transactions
  const canView = await hasPermission("FINANCIAL_VIEW", session.user.id)
  if (!canView) {
    redirect(`/${locale}/dashboard?error=unauthorized`)
  }

  const canManage = await hasPermission("FINANCIAL_TRANSACTION_CREATE", session.user.id)

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-8 w-8 text-primary" />
              Transaksi Keuangan
            </h1>
            <p className="text-muted-foreground">
              Kelola semua transaksi keuangan operasional dan proyek
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
                <Link href={`/${locale}/dashboard/finance/transactions/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Transaksi Baru
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="search"
                placeholder="Cari transaksi (nomor, deskripsi, jumlah)..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Transaksi</CardTitle>
            <CardDescription>
              Semua transaksi keuangan akan muncul di sini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">Halaman Transaksi Keuangan</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Halaman ini sedang dalam pengembangan. Fitur lengkap untuk mengelola transaksi keuangan akan segera tersedia.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link href={`/${locale}/dashboard/finance/transactions/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Transaksi Baru
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
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Tentang Transaksi Keuangan</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Sistem transaksi keuangan mendukung dual ledger (operasional vs proyek) dengan validasi SAK.
                  Setiap transaksi akan tercatat dalam buku besar yang sesuai dan dapat dilacak audit trail-nya.
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Dual ledger system: Operasional vs Proyek</li>
                  <li>• Validasi berdasarkan Standar Akuntansi Keuangan</li>
                  <li>• Approval workflow untuk transaksi besar</li>
                  <li>• Integrasi dengan bank untuk rekonsiliasi</li>
                  <li>• Support untuk multi-mata uang</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}