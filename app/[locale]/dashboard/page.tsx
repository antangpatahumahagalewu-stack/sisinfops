import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Database, Map, CheckCircle, XCircle, FileSpreadsheet, Users, TreePine, Globe } from "lucide-react"
import Link from "next/link"
import { ClimatePartnerComplianceCard } from "@/components/dashboard/climatepartner-compliance-card"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get dashboard statistics from new schema
  const { data: psData } = await supabase
    .from("perhutanan_sosial")
    .select("id, kabupaten_id, luas_ha, rkps_status, peta_status, jumlah_kk, skema")

  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama")

  // Calculate statistics from perhutanan_sosial table only
  const totalPS = psData?.length || 0
  const totalLuas = psData?.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0) || 0
  const totalRKPSAda = psData?.filter(ps => ps.rkps_status === 'ada').length || 0
  const totalPetaAda = psData?.filter(ps => ps.peta_status === 'ada').length || 0
  const totalKK = psData?.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0) || 0
  
  // Calculate skema distribution
  const skemaCounts: Record<string, number> = {}
  psData?.forEach(ps => {
    const skema = ps.skema || 'Unknown'
    skemaCounts[skema] = (skemaCounts[skema] || 0) + 1
  })
  
  const topSkema = Object.entries(skemaCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }))

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
          Ringkasan data Perhutanan Sosial & PKS 5 Kabupaten
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Row 1 */}
        <Card className="flex flex-col bg-blue-50/50 border-blue-100 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PS</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-blue-700">{totalPS}</div>
            <p className="text-xs text-blue-600">Unit Perhutanan Sosial</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-green-50/50 border-green-100 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Luas</CardTitle>
            <Map className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-green-700">{totalLuas.toLocaleString('id-ID')}</div>
            <p className="text-xs text-green-600">Hektar</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-orange-50/50 border-orange-100 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KK</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-orange-700">{totalKK.toLocaleString('id-ID')}</div>
            <p className="text-xs text-orange-600">Kepala Keluarga</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-teal-50/50 border-teal-100 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Skema</CardTitle>
            <TreePine className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-2xl font-bold text-teal-700">
              {topSkema.length > 0 ? topSkema[0].name : 'N/A'}
            </div>
            <p className="text-xs text-teal-600">
              {topSkema.length > 0 ? `${topSkema[0].count} unit` : 'No data'}
            </p>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card className="flex flex-col bg-yellow-50/50 border-yellow-100 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RKPS Tersedia</CardTitle>
            <CheckCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-yellow-700">{totalRKPSAda}</div>
            <p className="text-xs text-yellow-600">
              {totalPS > 0 ? `${Math.round((totalRKPSAda / totalPS) * 100)}% complete` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-purple-50/50 border-purple-100 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peta Tersedia</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-purple-700">{totalPetaAda}</div>
            <p className="text-xs text-purple-600">
              {totalPS > 0 ? `${Math.round((totalPetaAda / totalPS) * 100)}% complete` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-indigo-50/50 border-indigo-100 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RKPS Coverage</CardTitle>
            <Globe className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-indigo-700">
              {totalPS > 0 ? Math.round((totalRKPSAda / totalPS) * 100) : 0}%
            </div>
            <p className="text-xs text-indigo-600">
              <span className="font-medium">{totalRKPSAda}</span> of {totalPS} PS units
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-gradient-to-br from-green-50/80 to-blue-50/80 border-green-200 py-4 gap-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg KK per PS</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-green-700">
              {totalPS > 0 ? Math.round(totalKK / totalPS) : '0'}
            </div>
            <p className="text-xs text-green-600">Rata-rata Kepala Keluarga</p>
          </CardContent>
        </Card>
      </div>

      {/* ClimateBaseline Protocol Compliance Card */}
      <ClimatePartnerComplianceCard />

      {/* Action Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Upload Data Excel</CardTitle>
                <CardDescription>
                  Import data dari file Excel
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground mb-4">
              Tools untuk memastikan compliance dengan standar ClimateBaseline Protocol.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/upload">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Upload Excel
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Map className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Data per Kabupaten</CardTitle>
                <CardDescription>
                  Lihat detail data kabupaten
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground mb-4">
              Tinjau data Perhutanan Sosial berdasarkan kabupaten.
            </p>
            <div className="space-y-3">
              {kabupatenStats.map((kab) => (
                <div key={kab.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{kab.nama.replace('KABUPATEN ', '')}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{kab.jumlah_ps} PS</span>
                      <span>•</span>
                      <span>{kab.luas_ha.toLocaleString('id-ID')} ha</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/dashboard/kabupaten/${kab.id}`}>
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>ClimateBaseline Protocol Tools</CardTitle>
                <CardDescription>
                  Kelola compliance & proyek karbon
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-4">
                Tools untuk memastikan compliance dengan standar ClimateBaseline Protocol.
              </p>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link href="/dashboard/carbon-projects">
                  <TreePine className="mr-3 h-4 w-4" />
                  Carbon Projects Management
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/compliance-check">
                  <Globe className="mr-3 h-4 w-4" />
                  Compliance Check Tool
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link href="/dashboard/data">
                  <Database className="mr-3 h-4 w-4" />
                  Data PS Management
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kabupaten Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik per Kabupaten</CardTitle>
          <CardDescription>
            Ringkasan data Perhutanan Sosial untuk 5 kabupaten
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
