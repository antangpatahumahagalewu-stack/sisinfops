import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Database, 
  Map, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  PieChart,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Layers
} from "lucide-react"
import { locales } from "@/i18n/locales"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function StatisticsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const supabase = await createClient()

  // Get all PS data with related information
  const { data: psData } = await supabase
    .from("perhutanan_sosial")
    .select(`
      *,
      jumlah_kk,
      kabupaten:kabupaten_id (id, nama)
    `)

  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama")
    .order("nama")

  if (!psData || !kabupatenData) {
    return <div>Error loading data</div>
  }

  // === OVERALL STATISTICS ===
  const totalPS = psData.length
  const totalLuas = psData.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
  const totalRKPSAda = psData.filter(ps => ps.rkps_status === 'ada').length
  const totalPetaAda = psData.filter(ps => ps.peta_status === 'ada').length
  const totalJumlahKK = psData.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0)
  const psWithJumlahKK = psData.filter(ps => ps.jumlah_kk !== null && ps.jumlah_kk !== undefined && ps.jumlah_kk > 0).length
  const rkpsCompletionRate = totalPS > 0 ? Math.round((totalRKPSAda / totalPS) * 100) : 0
  const petaCompletionRate = totalPS > 0 ? Math.round((totalPetaAda / totalPS) * 100) : 0

  // === STATISTICS BY KABUPATEN ===
  const kabupatenStats = kabupatenData.map(kab => {
    const psInKab = psData.filter(ps => ps.kabupaten_id === kab.id)
    return {
      ...kab,
      jumlah_ps: psInKab.length,
      luas_ha: psInKab.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0),
      rkps_ada: psInKab.filter(ps => ps.rkps_status === 'ada').length,
      peta_ada: psInKab.filter(ps => ps.peta_status === 'ada').length,
      jumlah_kk: psInKab.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0),
      completion_rate: psInKab.length > 0 
        ? Math.round(((psInKab.filter(ps => ps.rkps_status === 'ada').length + 
                       psInKab.filter(ps => ps.peta_status === 'ada').length) / 
                       (psInKab.length * 2)) * 100)
        : 0
    }
  })

  // === STATISTICS BY SCHEMA (SKEMA) ===
  const skemaStats = psData.reduce((acc: Record<string, { count: number; luas: number }>, ps) => {
    const skema = ps.skema || 'Tidak Diketahui'
    if (!acc[skema]) {
      acc[skema] = { count: 0, luas: 0 }
    }
    acc[skema].count += 1
    acc[skema].luas += ps.luas_ha || 0
    return acc
  }, {})

  // === STATISTICS BY JENIS HUTAN ===
  const jenisHutanStats = psData.reduce((acc: Record<string, { count: number; luas: number }>, ps) => {
    const jenis = ps.jenis_hutan || 'Tidak Diketahui'
    if (!acc[jenis]) {
      acc[jenis] = { count: 0, luas: 0 }
    }
    acc[jenis].count += 1
    acc[jenis].luas += ps.luas_ha || 0
    return acc
  }, {})

  // === STATISTICS BY JENIS HUTAN PER KABUPATEN ===
  const jenisHutanByKabupaten = kabupatenData.map(kab => {
    const psInKab = psData.filter(ps => ps.kabupaten_id === kab.id)
    const mineralPS = psInKab.filter(ps => ps.jenis_hutan === 'Mineral')
    const mineralGambutPS = psInKab.filter(ps => ps.jenis_hutan === 'Mineral/Gambut')
    const gambutPS = psInKab.filter(ps => ps.jenis_hutan === 'Gambut')
    
    return {
      kabupaten: kab.nama,
      kabupatenId: kab.id,
      mineral: {
        count: mineralPS.length,
        luas: mineralPS.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
      },
      mineralGambut: {
        count: mineralGambutPS.length,
        luas: mineralGambutPS.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
      },
      gambut: {
        count: gambutPS.length,
        luas: gambutPS.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
      },
      total: {
        count: psInKab.length,
        luas: psInKab.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
      }
    }
  })

  // === STATISTICS BY STATUS KAWASAN ===
  const statusKawasanStats = psData.reduce((acc: Record<string, { count: number; luas: number }>, ps) => {
    const status = ps.status_kawasan || 'Tidak Diketahui'
    if (!acc[status]) {
      acc[status] = { count: 0, luas: 0 }
    }
    acc[status].count += 1
    acc[status].luas += ps.luas_ha || 0
    return acc
  }, {})

  // === STATISTICS BY KECAMATAN ===
  const kecamatanStats = psData.reduce((acc: Record<string, { count: number; luas: number; kabupaten: string }>, ps) => {
    const kecamatan = ps.kecamatan || 'Tidak Diketahui'
    const kabupatenNama = (ps.kabupaten as any)?.nama || 'Tidak Diketahui'
    if (!acc[kecamatan]) {
      acc[kecamatan] = { count: 0, luas: 0, kabupaten: kabupatenNama }
    }
    acc[kecamatan].count += 1
    acc[kecamatan].luas += ps.luas_ha || 0
    return acc
  }, {})

  // Sort kecamatan by count
  const sortedKecamatan = Object.entries(kecamatanStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10) // Top 10

  // === STATISTICS BY YEAR (from tanggal_sk) ===
  const yearStats = psData.reduce((acc: Record<string, number>, ps) => {
    if (ps.tanggal_sk) {
      const year = new Date(ps.tanggal_sk).getFullYear().toString()
      acc[year] = (acc[year] || 0) + 1
    }
    return acc
  }, {})

  const sortedYears = Object.entries(yearStats)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))

  // === TOP 10 DESA BY LUAS ===
  const desaStats = psData.reduce((acc: Record<string, { luas: number; kabupaten: string; kecamatan: string }>, ps) => {
    const desa = ps.desa || 'Tidak Diketahui'
    const kabupatenNama = (ps.kabupaten as any)?.nama || 'Tidak Diketahui'
    if (!acc[desa]) {
      acc[desa] = { luas: 0, kabupaten: kabupatenNama, kecamatan: ps.kecamatan || '' }
    }
    acc[desa].luas += ps.luas_ha || 0
    return acc
  }, {})

  const topDesa = Object.entries(desaStats)
    .sort(([, a], [, b]) => b.luas - a.luas)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistik Perhutanan Sosial</h1>
        <p className="text-muted-foreground">
          Analisis komprehensif data Perhutanan Sosial & PKS 4 Kabupaten
        </p>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <div className="text-2xl font-bold">
              {totalJumlahKK > 0 ? totalJumlahKK.toLocaleString('id-ID') : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalJumlahKK > 0 
                ? `Kepala Keluarga (${psWithJumlahKK}/${totalPS} PS memiliki data)` 
                : 'Data belum tersedia'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((rkpsCompletionRate + petaCompletionRate) / 2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              RKPS: {rkpsCompletionRate}% | Peta: {petaCompletionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics by Kabupaten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Statistik per Kabupaten
          </CardTitle>
          <CardDescription>
            Distribusi data Perhutanan Sosial berdasarkan kabupaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kabupatenStats.map((kab) => {
              const percentage = totalLuas > 0 ? (kab.luas_ha / totalLuas) * 100 : 0
              return (
                <div key={kab.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{kab.nama.replace('KABUPATEN ', '')}</p>
                      <p className="text-sm text-muted-foreground">
                        {kab.jumlah_ps} PS • {kab.luas_ha.toLocaleString('id-ID')} Ha • {kab.jumlah_kk > 0 ? `${kab.jumlah_kk.toLocaleString('id-ID')} KK` : 'KK: -'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{percentage.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">
                        Completion: {kab.completion_rate}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      RKPS: {kab.rkps_ada}/{kab.jumlah_ps}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      Peta: {kab.peta_ada}/{kab.jumlah_ps}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Statistics by Skema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Distribusi berdasarkan Skema
            </CardTitle>
            <CardDescription>
              Jumlah dan luas area per skema Perhutanan Sosial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(skemaStats)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([skema, stats]) => {
                  const percentage = totalPS > 0 ? (stats.count / totalPS) * 100 : 0
                  return (
                    <div key={skema} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{skema}</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.count} unit • {stats.luas.toLocaleString('id-ID')} Ha
                          </p>
                        </div>
                        <p className="font-medium">{percentage.toFixed(1)}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Statistics by Jenis Hutan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribusi berdasarkan Jenis Hutan
            </CardTitle>
            <CardDescription>
              Jumlah dan luas area per jenis hutan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(jenisHutanStats)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([jenis, stats]) => {
                  const percentage = totalPS > 0 ? (stats.count / totalPS) * 100 : 0
                  return (
                    <div key={jenis} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{jenis}</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.count} unit • {stats.luas.toLocaleString('id-ID')} Ha
                          </p>
                        </div>
                        <p className="font-medium">{percentage.toFixed(1)}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribusi Sebaran Jenis Hutan per Kabupaten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Distribusi Sebaran Jenis Hutan per Kabupaten
          </CardTitle>
          <CardDescription>
            Sebaran wilayah berdasarkan jenis hutan (Mineral, Mineral/Gambut, Gambut) di setiap kabupaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Kabupaten</th>
                  <th className="text-center py-3 px-4 font-medium">Mineral</th>
                  <th className="text-center py-3 px-4 font-medium">Mineral/Gambut</th>
                  <th className="text-center py-3 px-4 font-medium">Gambut</th>
                  <th className="text-center py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {jenisHutanByKabupaten.map((kab) => {
                  const mineralPercentage = kab.total.count > 0 
                    ? ((kab.mineral.count / kab.total.count) * 100).toFixed(1) 
                    : '0.0'
                  const mineralGambutPercentage = kab.total.count > 0 
                    ? ((kab.mineralGambut.count / kab.total.count) * 100).toFixed(1) 
                    : '0.0'
                  const gambutPercentage = kab.total.count > 0 
                    ? ((kab.gambut.count / kab.total.count) * 100).toFixed(1) 
                    : '0.0'
                  
                  return (
                    <tr key={kab.kabupatenId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">
                        {kab.kabupaten.replace('KABUPATEN ', '')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-blue-600">{kab.mineral.count}</span>
                          <span className="text-xs text-muted-foreground">
                            {kab.mineral.luas.toLocaleString('id-ID')} Ha
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({mineralPercentage}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-green-600">{kab.mineralGambut.count}</span>
                          <span className="text-xs text-muted-foreground">
                            {kab.mineralGambut.luas.toLocaleString('id-ID')} Ha
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({mineralGambutPercentage}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-orange-600">{kab.gambut.count}</span>
                          <span className="text-xs text-muted-foreground">
                            {kab.gambut.luas.toLocaleString('id-ID')} Ha
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({gambutPercentage}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{kab.total.count}</span>
                          <span className="text-xs text-muted-foreground">
                            {kab.total.luas.toLocaleString('id-ID')} Ha
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 font-medium bg-muted/30">
                  <td className="py-3 px-4">TOTAL</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-blue-600">
                        {jenisHutanByKabupaten.reduce((sum, kab) => sum + kab.mineral.count, 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {jenisHutanByKabupaten.reduce((sum, kab) => sum + kab.mineral.luas, 0).toLocaleString('id-ID')} Ha
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-green-600">
                        {jenisHutanByKabupaten.reduce((sum, kab) => sum + kab.mineralGambut.count, 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {jenisHutanByKabupaten.reduce((sum, kab) => sum + kab.mineralGambut.luas, 0).toLocaleString('id-ID')} Ha
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-orange-600">
                        {jenisHutanByKabupaten.reduce((sum, kab) => sum + kab.gambut.count, 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {jenisHutanByKabupaten.reduce((sum, kab) => sum + kab.gambut.luas, 0).toLocaleString('id-ID')} Ha
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span>{totalPS}</span>
                      <span className="text-xs text-muted-foreground">
                        {totalLuas.toLocaleString('id-ID')} Ha
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Statistics by Status Kawasan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribusi berdasarkan Status Kawasan
            </CardTitle>
            <CardDescription>
              Jumlah dan luas area per status kawasan hutan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(statusKawasanStats)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([status, stats]) => {
                  const percentage = totalPS > 0 ? (stats.count / totalPS) * 100 : 0
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{status}</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.count} unit • {stats.luas.toLocaleString('id-ID')} Ha
                          </p>
                        </div>
                        <p className="font-medium">{percentage.toFixed(1)}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Kecamatan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Top 10 Kecamatan
            </CardTitle>
            <CardDescription>
              Kecamatan dengan jumlah PS terbanyak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedKecamatan.map(([kecamatan, stats], index) => (
                <div key={kecamatan} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{kecamatan}</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.kabupaten} • {stats.luas.toLocaleString('id-ID')} Ha
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{stats.count}</p>
                    <p className="text-xs text-muted-foreground">unit</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Desa by Luas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Top 10 Desa berdasarkan Luas Area
          </CardTitle>
          <CardDescription>
            Desa dengan luas area Perhutanan Sosial terbesar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">No</th>
                  <th className="text-left py-3 px-4 font-medium">Desa</th>
                  <th className="text-left py-3 px-4 font-medium">Kecamatan</th>
                  <th className="text-left py-3 px-4 font-medium">Kabupaten</th>
                  <th className="text-right py-3 px-4 font-medium">Luas (Ha)</th>
                </tr>
              </thead>
              <tbody>
                {topDesa.map(([desa, stats], index) => (
                  <tr key={desa} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">{desa}</td>
                    <td className="py-3 px-4">{stats.kecamatan}</td>
                    <td className="py-3 px-4">{stats.kabupaten.replace('KABUPATEN ', '')}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {stats.luas.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Statistics by Year */}
      {sortedYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Distribusi berdasarkan Tahun SK
            </CardTitle>
            <CardDescription>
              Jumlah PS berdasarkan tahun penerbitan SK
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedYears.map(([year, count]) => {
                const percentage = totalPS > 0 ? (count / totalPS) * 100 : 0
                return (
                  <div key={year} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Tahun {year}</p>
                        <p className="text-sm text-muted-foreground">
                          {count} unit PS
                        </p>
                      </div>
                      <p className="font-medium">{percentage.toFixed(1)}%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Status Kelengkapan Dokumen
          </CardTitle>
          <CardDescription>
            Ringkasan status RKPS dan Peta untuk semua PS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">RKPS Tersedia</span>
                <span className="text-sm font-bold text-green-600">
                  {totalRKPSAda} / {totalPS}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${rkpsCompletionRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {rkpsCompletionRate}% completion rate
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Peta Tersedia</span>
                <span className="text-sm font-bold text-blue-600">
                  {totalPetaAda} / {totalPS}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${petaCompletionRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {petaCompletionRate}% completion rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
