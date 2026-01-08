import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Database, Map, CheckCircle, XCircle, FileSpreadsheet, Users } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get dashboard statistics
  const { data: psData } = await supabase
    .from("perhutanan_sosial")
    .select("id, kabupaten_id, luas_ha, rkps_status, peta_status, jumlah_kk")

  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama")

  // Calculate statistics
  const totalPS = psData?.length || 0
  const totalLuas = psData?.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0) || 0
  const totalRKPSAda = psData?.filter(ps => ps.rkps_status === 'ada').length || 0
  const totalPetaAda = psData?.filter(ps => ps.peta_status === 'ada').length || 0
  const totalKK = psData?.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0) || 0

  // Calculate by kabupaten
  const kabupatenStats = kabupatenData?.map(kab => {
    const psInKab = psData?.filter(ps => ps.kabupaten_id === kab.id) || []
    return {
      ...kab,
      jumlah_ps: psInKab.length,
      luas_ha: psInKab.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0),
      rkps_ada: psInKab.filter(ps => ps.rkps_status === 'ada').length,
      peta_ada: psInKab.filter(ps => ps.peta_status === 'ada').length,
      jumlah_kk: psInKab.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0),
    }
  }) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Nasional</h1>
        <p className="text-muted-foreground">
          Ringkasan data Perhutanan Sosial & PKS 4 Kabupaten
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PS</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPS}</div>
            <p className="text-xs text-muted-foreground">Unit Perhutanan Sosial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Luas</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLuas.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Hektar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KK</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKK.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Kepala Keluarga</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RKPS Tersedia</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRKPSAda}</div>
            <p className="text-xs text-muted-foreground">
              {totalPS > 0 ? `${Math.round((totalRKPSAda / totalPS) * 100)}% selesai` : '0% selesai'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peta Tersedia</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPetaAda}</div>
            <p className="text-xs text-muted-foreground">
              {totalPS > 0 ? `${Math.round((totalPetaAda / totalPS) * 100)}% selesai` : '0% selesai'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Data Excel</CardTitle>
            <CardDescription>
              Import data dari file Excel ke database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload file Excel dengan format yang sesuai untuk mengisi data Perhutanan Sosial.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard/upload">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Upload Excel
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data per Kabupaten</CardTitle>
            <CardDescription>
              Lihat detail data untuk setiap kabupaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tinjau data Perhutanan Sosial berdasarkan kabupaten.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {kabupatenStats.map((kab) => (
                  <Card key={kab.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{kab.nama.replace('KABUPATEN ', '')}</p>
                        <p className="text-xs text-muted-foreground">{kab.jumlah_ps} PS</p>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/kabupaten/${kab.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kabupaten Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik per Kabupaten</CardTitle>
          <CardDescription>
            Ringkasan data Perhutanan Sosial untuk 4 kabupaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Kabupaten</th>
                  <th className="text-left py-3 px-4 font-medium">Jumlah PS</th>
                  <th className="text-left py-3 px-4 font-medium">Luas (Ha)</th>
                  <th className="text-left py-3 px-4 font-medium">Jumlah KK</th>
                  <th className="text-left py-3 px-4 font-medium">RKPS Ada</th>
                  <th className="text-left py-3 px-4 font-medium">Peta Ada</th>
                </tr>
              </thead>
              <tbody>
                {kabupatenStats.map((kab) => (
                  <tr key={kab.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{kab.nama}</td>
                    <td className="py-3 px-4">{kab.jumlah_ps}</td>
                    <td className="py-3 px-4">{kab.luas_ha.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4">{kab.jumlah_kk.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {kab.rkps_ada}/{kab.jumlah_ps}
                        {kab.jumlah_ps > 0 && kab.rkps_ada === kab.jumlah_ps ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {kab.peta_ada}/{kab.jumlah_ps}
                        {kab.jumlah_ps > 0 && kab.peta_ada === kab.jumlah_ps ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-3 px-4">TOTAL</td>
                  <td className="py-3 px-4">{totalPS}</td>
                  <td className="py-3 px-4">{totalLuas.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">{totalKK.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">
                    {totalRKPSAda}/{totalPS}
                  </td>
                  <td className="py-3 px-4">
                    {totalPetaAda}/{totalPS}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
