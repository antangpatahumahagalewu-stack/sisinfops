import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Database, Map, CheckCircle, BarChart3, Users } from "lucide-react"
import Link from "next/link"

export default async function KabupatenListPage() {
  const supabase = await createClient()

  // Get dashboard statistics for all kabupaten
  const { data: psData } = await supabase
    .from("perhutanan_sosial")
    .select("id, kabupaten_id, luas_ha, rkps_status, peta_status, skema, jenis_hutan")

  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama")
    .order("nama")

  // Calculate statistics by kabupaten
  const kabupatenStats = kabupatenData?.map(kab => {
    const psInKab = psData?.filter(ps => ps.kabupaten_id === kab.id) || []
    const skemaCounts = psInKab.reduce((acc, ps) => {
      acc[ps.skema] = (acc[ps.skema] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const jenisHutanCounts = psInKab.reduce((acc, ps) => {
      acc[ps.jenis_hutan] = (acc[ps.jenis_hutan] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      ...kab,
      jumlah_ps: psInKab.length,
      luas_ha: psInKab.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0),
      rkps_ada: psInKab.filter(ps => ps.rkps_status === 'ada').length,
      peta_ada: psInKab.filter(ps => ps.peta_status === 'ada').length,
      skema_distribution: skemaCounts,
      jenis_hutan_distribution: jenisHutanCounts,
      completion_rate: psInKab.length > 0 
        ? Math.round(((psInKab.filter(ps => ps.rkps_status === 'ada').length + 
                       psInKab.filter(ps => ps.peta_status === 'ada').length) / 
                       (psInKab.length * 2)) * 100)
        : 0
    }
  }) || []

  // Overall statistics
  const totalPS = kabupatenStats.reduce((sum, kab) => sum + kab.jumlah_ps, 0)
  const totalLuas = kabupatenStats.reduce((sum, kab) => sum + kab.luas_ha, 0)
  const totalRKPSAda = kabupatenStats.reduce((sum, kab) => sum + kab.rkps_ada, 0)
  const totalPetaAda = kabupatenStats.reduce((sum, kab) => sum + kab.peta_ada, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data per Kabupaten</h1>
        <p className="text-muted-foreground">
          Ringkasan dan analisis data Perhutanan Sosial & PKS berdasarkan kabupaten
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kabupaten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kabupatenStats.length}</div>
            <p className="text-xs text-muted-foreground">Wilayah kerja</p>
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Progress Dokumen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPS > 0 ? `${Math.round(((totalRKPSAda + totalPetaAda) / (totalPS * 2)) * 100)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              RKPS & Peta tersedia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kabupaten Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {kabupatenStats.map((kab) => (
          <Card key={kab.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {kab.nama.replace('KABUPATEN ', '')}
                  </CardTitle>
                  <CardDescription>
                    {kab.jumlah_ps} Unit PS • {kab.luas_ha.toLocaleString('id-ID')} Ha
                  </CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/dashboard/kabupaten/${kab.id}`}>
                    Detail
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>RKPS Tersedia</span>
                  <span className="font-medium">{kab.rkps_ada}/{kab.jumlah_ps}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${kab.jumlah_ps > 0 ? (kab.rkps_ada / kab.jumlah_ps) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Peta Tersedia</span>
                  <span className="font-medium">{kab.peta_ada}/{kab.jumlah_ps}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${kab.jumlah_ps > 0 ? (kab.peta_ada / kab.jumlah_ps) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Skema Distribution */}
              <div>
                <h4 className="text-sm font-medium mb-2">Distribusi Skema</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(kab.skema_distribution).map(([skema, count]) => (
                    <div key={skema} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                      <span>{skema}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completion Badge */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Progress keseluruhan
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  kab.completion_rate >= 80 ? 'bg-green-100 text-green-800' :
                  kab.completion_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {kab.completion_rate}% selesai
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Perbandingan Antar Kabupaten</CardTitle>
          <CardDescription>
            Analisis komparatif data Perhutanan Sosial di 4 kabupaten
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
                  <th className="text-left py-3 px-4 font-medium">RKPS Ada</th>
                  <th className="text-left py-3 px-4 font-medium">Peta Ada</th>
                  <th className="text-left py-3 px-4 font-medium">Rata-rata Luas/PS</th>
                  <th className="text-left py-3 px-4 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {kabupatenStats.map((kab) => (
                  <tr key={kab.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">
                      {kab.nama.replace('KABUPATEN ', '')}
                    </td>
                    <td className="py-3 px-4">{kab.jumlah_ps}</td>
                    <td className="py-3 px-4">{kab.luas_ha.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {kab.rkps_ada}/{kab.jumlah_ps}
                        {kab.jumlah_ps > 0 && kab.rkps_ada === kab.jumlah_ps ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">•</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {kab.peta_ada}/{kab.jumlah_ps}
                        {kab.jumlah_ps > 0 && kab.peta_ada === kab.jumlah_ps ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">•</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {kab.jumlah_ps > 0 
                        ? (kab.luas_ha / kab.jumlah_ps).toLocaleString('id-ID', { maximumFractionDigits: 1 })
                        : 0
                      } Ha
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${kab.completion_rate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{kab.completion_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="font-medium bg-muted/50">
                  <td className="py-3 px-4">TOTAL / RATA-RATA</td>
                  <td className="py-3 px-4">{totalPS}</td>
                  <td className="py-3 px-4">{totalLuas.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">{totalRKPSAda}/{totalPS}</td>
                  <td className="py-3 px-4">{totalPetaAda}/{totalPS}</td>
                  <td className="py-3 px-4">
                    {totalPS > 0 
                      ? (totalLuas / totalPS).toLocaleString('id-ID', { maximumFractionDigits: 1 })
                      : 0
                    } Ha
                  </td>
                  <td className="py-3 px-4">
                    {totalPS > 0 
                      ? `${Math.round(((totalRKPSAda + totalPetaAda) / (totalPS * 2)) * 100)}%`
                      : '0%'
                    }
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
