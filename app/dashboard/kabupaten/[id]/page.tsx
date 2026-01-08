import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database, Map, CheckCircle, BarChart3, Users, FileText, Calendar, Trees } from "lucide-react"
import Link from "next/link"
import DataTable from "@/components/dashboard/data-table"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function KabupatenDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params

  // Get kabupaten details
  const { data: kabupaten } = await supabase
    .from("kabupaten")
    .select("id, nama, created_at")
    .eq("id", id)
    .single()

  if (!kabupaten) {
    notFound()
  }

  // Get all PS data for this kabupaten
  const { data: psData } = await supabase
    .from("perhutanan_sosial")
    .select("*, kabupaten:kabupaten_id (nama)")
    .eq("kabupaten_id", id)

  // Get kabupaten list for filter (used in DataTable)
  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama, created_at")

  // Calculate detailed statistics
  const totalPS = psData?.length || 0
  const totalLuas = psData?.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0) || 0
  const totalRKPSAda = psData?.filter(ps => ps.rkps_status === 'ada').length || 0
  const totalPetaAda = psData?.filter(ps => ps.peta_status === 'ada').length || 0

  // Group by skema
  const skemaStats = psData?.reduce((acc: Record<string, number>, ps) => {
    acc[ps.skema] = (acc[ps.skema] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Group by jenis hutan
  const jenisHutanStats = psData?.reduce((acc: Record<string, number>, ps) => {
    acc[ps.jenis_hutan] = (acc[ps.jenis_hutan] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Group by status kawasan
  const statusKawasanStats = psData?.reduce((acc: Record<string, number>, ps) => {
    acc[ps.status_kawasan] = (acc[ps.status_kawasan] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Group by kecamatan
  const kecamatanStats = psData?.reduce((acc: Record<string, number>, ps) => {
    if (ps.kecamatan) {
      acc[ps.kecamatan] = (acc[ps.kecamatan] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>) || {}

  // Calculate completion rates
  const rkpsCompletion = totalPS > 0 ? Math.round((totalRKPSAda / totalPS) * 100) : 0
  const petaCompletion = totalPS > 0 ? Math.round((totalPetaAda / totalPS) * 100) : 0
  const overallCompletion = Math.round((rkpsCompletion + petaCompletion) / 2)

  // Prepare data for DataTable
  const tableData = psData?.map(item => ({
    ...item,
    kabupaten_nama: item.kabupaten?.nama || 'Unknown',
    can_edit: true, // Adjust based on user role if needed
    can_delete: false
  })) || []

  // Find top kecamatan by PS count
  const topKecamatan = Object.entries(kecamatanStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([name, count]) => ({ name, count: count as number }))

  // Find dominant skema
  const dominantSkema = Object.entries(skemaStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([name, count]) => ({ name, count: count as number }))
    .slice(0, 1)[0] || { name: 'N/A', count: 0 }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/dashboard/kabupaten">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Daftar Kabupaten
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {kabupaten.nama.replace('KABUPATEN ', '')}
          </h1>
          <p className="text-muted-foreground">
            Detail data Perhutanan Sosial & PKS di kabupaten ini
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/data?kabupaten=${kabupaten.nama}`}>
            <FileText className="mr-2 h-4 w-4" />
            Lihat di Data Lengkap
          </Link>
        </Button>
      </div>

      {/* Key Stats */}
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
            <CardTitle className="text-sm font-medium">RKPS Tersedia</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRKPSAda}</div>
            <p className="text-xs text-muted-foreground">
              {rkpsCompletion}% selesai
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
              {petaCompletion}% selesai
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Skema Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribusi Skema</CardTitle>
            <CardDescription>Jumlah PS per skema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(skemaStats).map(([skema, count]) => {
                const countNum = count as number
                const percentage = totalPS > 0 ? Math.round((countNum / totalPS) * 100) : 0
                return (
                  <div key={skema} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{skema}</span>
                      <span className="font-medium">{countNum} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Jenis Hutan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Jenis Hutan</CardTitle>
            <CardDescription>Distribusi berdasarkan jenis hutan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(jenisHutanStats).map(([jenis, count]) => {
                const countNum = count as number
                const percentage = totalPS > 0 ? Math.round((countNum / totalPS) * 100) : 0
                return (
                  <div key={jenis} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trees className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{jenis}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{countNum}</div>
                      <div className="text-xs text-muted-foreground">{percentage}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progress Dokumen</CardTitle>
            <CardDescription>Status kelengkapan dokumen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>RKPS</span>
                  <span className="font-medium">{rkpsCompletion}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${rkpsCompletion}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Peta</span>
                  <span className="font-medium">{petaCompletion}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${petaCompletion}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress Keseluruhan</span>
                  <span className={`font-bold ${
                    overallCompletion >= 80 ? 'text-green-600' :
                    overallCompletion >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {overallCompletion}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Kecamatan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kecamatan dengan PS Terbanyak</CardTitle>
            <CardDescription>3 kecamatan teratas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topKecamatan.map((kec, index) => (
                <div key={kec.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      <span className="font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{kec.name}</p>
                  <p className="text-xs text-muted-foreground">{kec.count} PS</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {totalPS > 0 ? Math.round((kec.count / totalPS) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Facts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fakta Cepat</CardTitle>
            <CardDescription>Statistik penting lainnya</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Skema Dominan</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{dominantSkema.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {dominantSkema.count} PS ({totalPS > 0 ? Math.round((dominantSkema.count / totalPS) * 100) : 0}%)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Luas Rata-rata per PS</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {totalPS > 0 ? (totalLuas / totalPS).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Hektar</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Jumlah Kecamatan</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{Object.keys(kecamatanStats).length}</div>
                  <div className="text-xs text-muted-foreground">Kecamatan</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Perhutanan Sosial di {kabupaten.nama.replace('KABUPATEN ', '')}</CardTitle>
          <CardDescription>
            {totalPS} unit PS dengan total luas {totalLuas.toLocaleString('id-ID')} Ha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={tableData}
            kabupatenOptions={(kabupatenData || []).map(k => ({
              id: k.id,
              nama: k.nama,
              created_at: k.created_at
            }))}
            userRole="admin" // This should come from session, but using admin for now
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/upload?kabupaten=${kabupaten.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            Upload Data untuk Kabupaten Ini
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/data?export=kabupaten&id=${kabupaten.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            Export Data
          </Link>
        </Button>
      </div>
    </div>
  )
}
