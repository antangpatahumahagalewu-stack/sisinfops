import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CarbonProjectForm } from "@/components/dashboard/carbon-project-form"
import { locales } from "@/i18n/locales"
import { canManageCarbonProjects } from "@/lib/auth/rbac"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function NewCarbonProjectPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  // Check if user can manage carbon projects
  const canManage = await canManageCarbonProjects()
  if (!canManage) {
    redirect(`/${locale}/dashboard/carbon-projects`)
  }

  // Get user profile for role-based permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header with back button */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/${locale}/dashboard/carbon-projects`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Proyek Karbon
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Buat Proyek Karbon Baru</h1>
        <p className="text-muted-foreground">
          Isi form berikut untuk membuat proyek karbon baru. Semua field wajib diisi kecuali yang ditandai opsional.
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>Form Proyek Karbon</CardTitle>
          <CardDescription>
            Data proyek karbon akan digunakan untuk perencanaan, monitoring, dan pelaporan kredit karbon.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CarbonProjectForm 
            userRole={profile?.role}
            successRedirectUrl={`/${locale}/dashboard/carbon-projects?success=true`}
            cancelRedirectUrl={`/${locale}/dashboard/carbon-projects`}
          />
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6 bg-green-50/50 border-green-100">
        <CardHeader>
          <CardTitle className="text-green-800">Panduan Pengisian</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-green-700">
            <li><span className="font-semibold">Kode Project</span> harus unik dan mengikuti format CP-XXX-YYY</li>
            <li><span className="font-semibold">Standar Karbon</span> pilih VERRA, Gold Standard, Indonesia, atau Other</li>
            <li><span className="font-semibold">Luas Total</span> dalam hektar (ha), gunakan angka desimal jika perlu</li>
            <li><span className="font-semibold">Estimasi Penyimpanan Karbon</span> dalam ton CO₂e</li>
            <li><span className="font-semibold">Tanggal Mulai</span> harus sebelum Tanggal Selesai</li>
            <li>Status <span className="font-semibold">Draft</span> untuk proyek yang masih dalam perencanaan</li>
            <li>Data yang sudah disimpan dapat diedit melalui halaman detail proyek</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
