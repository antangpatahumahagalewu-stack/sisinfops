import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Wallet } from "lucide-react"
import Link from "next/link"
import { BudgetForm } from "@/components/dashboard/budget-form"
import { locales } from "@/i18n/locales"
import { hasPermission } from "@/lib/auth/rbac"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function NewBudgetPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/budgets/new`)
  }

  // Check if user has permission to manage budgets
  const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id)
  if (!canManage) {
    redirect(`/${locale}/dashboard/finance/budgets?error=unauthorized`)
  }

  // Get user profile for role-based permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header with back button */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/${locale}/dashboard/finance/budgets`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Anggaran
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Buat Anggaran Baru</h1>
            <p className="text-muted-foreground">
              Isi form berikut untuk membuat anggaran keuangan baru. Semua field wajib diisi kecuali yang ditandai opsional.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>Form Anggaran Keuangan</CardTitle>
          <CardDescription>
            Data anggaran akan digunakan untuk perencanaan keuangan, tracking pengeluaran, dan pelaporan keuangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <BudgetForm 
            userRole={profile?.role}
            successRedirectUrl={`/${locale}/dashboard/finance/budgets?success=true`}
            cancelRedirectUrl={`/${locale}/dashboard/finance/budgets`}
            locale={locale}
          />
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6 bg-blue-50/50 border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-800">Panduan Pengisian</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-blue-700">
            <li><span className="font-semibold">Kode Anggaran</span> harus unik dan mengikuti format BGT-YYYY-XXX</li>
            <li><span className="font-semibold">Tipe Anggaran</span> pilih Operasional Kantor, Proyek Karbon, Program Sosial, atau Modal & Investasi</li>
            <li><span className="font-semibold">Tahun Fiskal</span> sesuai dengan tahun anggaran yang berlaku</li>
            <li><span className="font-semibold">Jumlah Total</span> dalam Rupiah (IDR), harus lebih dari 0</li>
            <li><span className="font-semibold">Proyek Karbon Terkait</span> opsional, pilih jika anggaran khusus untuk proyek tertentu</li>
            <li><span className="font-semibold">Deskripsi</span> jelaskan tujuan dan penggunaan anggaran secara detail</li>
            <li>Anggaran yang sudah disimpan dapat diedit melalui halaman detail anggaran</li>
            <li>Status anggaran akan otomatis "Draft" dan dapat diubah menjadi "Aktif" setelah disetujui</li>
          </ul>
        </CardContent>
      </Card>

      {/* SAK Compliance Information */}
      <Card className="mt-6 bg-green-50/50 border-green-100">
        <CardHeader>
          <CardTitle className="text-green-800">Kepatuhan Standar Akuntansi Keuangan (SAK)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-green-700 space-y-2">
            <p>
              Sistem anggaran ini mengikuti prinsip-prinsip SAK untuk memastikan akuntabilitas keuangan:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-semibold">Prinsip Materialitas</span>: Anggaran yang signifikan memerlukan detail yang lebih lengkap</li>
              <li><span className="font-semibold">Prinsip Periodisasi</span>: Anggaran dikaitkan dengan tahun fiskal tertentu</li>
              <li><span className="font-semibold">Prinsip Akrual</span>: Pengeluaran dicatat saat terjadi, bukan saat dibayar</li>
              <li><span className="font-semibold">Prinsip Konsistensi</span>: Format dan metode anggaran konsisten antar periode</li>
              <li><span className="font-semibold">Prinsip Pengungkapan Lengkap</span>: Deskripsi dan catatan yang jelas untuk transparansi</li>
            </ul>
            <p className="pt-2">
              Setiap anggaran akan dikaitkan dengan akun keuangan yang sesuai dalam sistem dual ledger untuk operasional dan proyek.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}