import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PSForm } from "@/components/dashboard/ps-form"
import { locales } from "@/i18n/locales"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function AddPSPage({
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

  // Get user profile for role-based permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  // Get kabupaten for filter
  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama, created_at")
    .order("nama")

  // Only admin and monev can create
  const canCreate = profile?.role === "admin" || profile?.role === "monev"
  if (!canCreate) {
    redirect(`/${locale}/dashboard/data`)
  }

  // Remove the function definitions and pass redirect URLs as strings instead

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header with back button */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/${locale}/dashboard/data`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Data Perhutanan Sosial
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Data Perhutanan Sosial</h1>
        <p className="text-muted-foreground">
          Isi form berikut berdasarkan template import data. Semua field wajib diisi kecuali yang ditandai opsional.
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>Form Tambah Data Baru</CardTitle>
          <CardDescription>
            Pastikan data yang dimasukkan sesuai dengan dokumen resmi. Data akan langsung tersimpan ke database setelah dikirim.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PSForm 
            kabupatenOptions={kabupatenData || []}
            userRole={profile?.role}
            successRedirectUrl={`/${locale}/dashboard/data?success=true`}
            cancelRedirectUrl={`/${locale}/dashboard/data`}
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
            <li>Field dengan tanda <span className="font-semibold">*</span> wajib diisi</li>
            <li>Pastikan nama kabupaten sesuai dengan data yang tersedia</li>
            <li>Data yang sudah disimpan dapat diedit melalui halaman Data Perhutanan Sosial</li>
            <li>Jika terdapat kesalahan, hubungi administrator untuk perubahan data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
