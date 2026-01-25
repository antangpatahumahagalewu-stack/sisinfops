import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Filter, 
  PlusCircle, 
  Building2, 
  Users, 
  TrendingUp, 
  MapPin, 
  Calendar,
  Download,
  Eye
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { locales } from "@/i18n/locales"
import { Badge } from "@/components/ui/badge"
import PemberdayaanFilter from "./components/PemberdayaanFilter"
import PemberdayaanTable from "./components/PemberdayaanTable"
import PemberdayaanStats from "./components/PemberdayaanStats"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function PemberdayaanEkonomiPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ 
    kabupaten?: string 
    tahun?: string 
    jenis_usaha?: string 
    status?: string 
  }>
}) {
  const { locale } = await params
  const searchParamsObj = await searchParams
  const supabase = await createClient()

  // Get current user profile to check permissions
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single()

  const isProgramPlanner = profile?.role === "program_planner" || profile?.role === "admin"

  // Get kabupaten list for filter
  const { data: kabupatenList } = await supabase
    .from("kabupaten")
    .select("id, nama")
    .order("nama")

  // Get pemberdayaan ekonomi data with filters
  let query = supabase
    .from("pemberdayaan_ekonomi_detail")
    .select("*")
    .order("tahun", { ascending: false })

  // Apply filters if provided
  if (searchParamsObj?.kabupaten) {
    query = query.eq("kabupaten_id", searchParamsObj.kabupaten)
  }

  if (searchParamsObj?.tahun) {
    query = query.eq("tahun", parseInt(searchParamsObj.tahun))
  }

  if (searchParamsObj?.jenis_usaha) {
    query = query.ilike("jenis_usaha", `%${searchParamsObj.jenis_usaha}%`)
  }

  if (searchParamsObj?.status) {
    query = query.eq("status", searchParamsObj.status)
  }

  const { data: pemberdayaanData } = await query

  // Get statistics using the function we created
  const { data: statsData } = await supabase
    .rpc("get_pemberdayaan_stats_by_kabupaten")

  // Calculate overall statistics
  const totalUsaha = pemberdayaanData?.length || 0
  const totalAnggota = pemberdayaanData?.reduce((sum, item) => sum + (item.jumlah_anggota || 0), 0) || 0
  const totalPendapatan = pemberdayaanData?.reduce((sum, item) => sum + (item.pendapatan_per_bulan || 0), 0) || 0
  const uniqueKabupaten = [...new Set(pemberdayaanData?.map(item => item.kabupaten_nama).filter(Boolean))].length
  const uniqueJenisUsaha = [...new Set(pemberdayaanData?.map(item => item.jenis_usaha).filter(Boolean))].length

  // Get unique years for filter
  const uniqueYears = [...new Set(pemberdayaanData?.map(item => item.tahun).filter(Boolean) as number[])]
    .sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pemberdayaan Ekonomi</h1>
          <p className="text-muted-foreground">
            Manajemen data usaha dan program pemberdayaan ekonomi masyarakat sekitar hutan
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/pemberdayaan-ekonomi?export=true">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Link>
          </Button>
          
          {isProgramPlanner && (
            <Button asChild>
              <Link href="/dashboard/pemberdayaan-ekonomi/tambah">
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Data Usaha
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <PemberdayaanFilter 
        kabupatenList={kabupatenList || []}
        uniqueYears={uniqueYears}
        selectedKabupaten={searchParamsObj?.kabupaten}
        selectedTahun={searchParamsObj?.tahun}
        selectedJenisUsaha={searchParamsObj?.jenis_usaha}
        selectedStatus={searchParamsObj?.status}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usaha</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsaha}</div>
            <p className="text-xs text-muted-foreground">
              {uniqueJenisUsaha} jenis usaha berbeda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anggota</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnggota.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">
              Rata-rata {totalUsaha > 0 ? Math.round(totalAnggota / totalUsaha) : 0} orang per usaha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalPendapatan.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              Per bulan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kabupaten</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueKabupaten}</div>
            <p className="text-xs text-muted-foreground">
              Kabupaten terlibat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics by Kabupaten */}
      {statsData && statsData.length > 0 && (
        <PemberdayaanStats statsData={statsData} />
      )}

      {/* Data Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Data Usaha Pemberdayaan Ekonomi</CardTitle>
              <CardDescription>
                {searchParamsObj?.kabupaten 
                  ? `Data untuk kabupaten ${kabupatenList?.find(k => k.id === searchParamsObj.kabupaten)?.nama.replace('KABUPATEN ', '')}`
                  : "Semua data usaha pemberdayaan ekonomi"
                }
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {totalUsaha} data ditemukan
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PemberdayaanTable 
            data={pemberdayaanData || []} 
            isProgramPlanner={isProgramPlanner}
          />
        </CardContent>
      </Card>

      {/* Action Cards for Program Planner */}
      {isProgramPlanner && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-dashed border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Program Pemberdayaan Baru
              </CardTitle>
              <CardDescription>
                Buat program pemberdayaan ekonomi baru untuk kabupaten tertentu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Program pemberdayaan dapat mencakup beberapa jenis usaha dan PS dalam satu kabupaten.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard/pemberdayaan-ekonomi/program/baru">
                  Buat Program
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Monitoring Program
              </CardTitle>
              <CardDescription>
                Pantau perkembangan program pemberdayaan yang sedang berjalan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Lihat progress, evaluasi dampak, dan buat laporan untuk program yang sedang berjalan.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard/pemberdayaan-ekonomi/program">
                  Lihat Program
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}