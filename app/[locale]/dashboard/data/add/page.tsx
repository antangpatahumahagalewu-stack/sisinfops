import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PSForm } from "@/components/dashboard/ps-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { locales } from "@/i18n/locales"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function AddDataPage({
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

  // Only admin and monev can create
  const canCreate = profile?.role === 'admin' || profile?.role === 'monev'
  if (!canCreate) {
    redirect(`/${locale}/dashboard/data`)
  }

  // Get kabupaten for dropdown
  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama, created_at")
    .order("nama")

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Link 
          href={`/${locale}/dashboard/data`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Data Perhutanan Sosial
        </Link>
        
        <h1 className="text-3xl font-bold tracking-tight">Tambah Data Perhutanan Sosial Baru</h1>
        <p className="text-muted-foreground mt-2">
          Isi formulir di bawah untuk menambahkan data Perhutanan Sosial baru ke sistem
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulir Tambah Data</CardTitle>
          <CardDescription>
            Lengkapi semua informasi yang diperlukan. Field yang ditandai dengan (*) wajib diisi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PSForm 
            kabupatenOptions={kabupatenData || []}
            userRole={profile?.role || 'viewer'}
            successRedirectUrl={`/${locale}/dashboard/data`}
            cancelRedirectUrl={`/${locale}/dashboard/data`}
          />
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        <p className="font-medium mb-2">Catatan:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Data yang sudah ditambahkan akan langsung tersedia di tabel data Perhutanan Sosial</li>
          <li>Pastikan data yang dimasukkan sesuai dengan dokumen resmi (SK, PKS, dll)</li>
          <li>Untuk mengedit data setelah disimpan, gunakan fitur edit di halaman data</li>
          <li>Jika menemui kendala, hubungi administrator sistem</li>
        </ul>
      </div>
    </div>
  )
}
