import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import DataTable from "../../../components/dashboard/data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Plus, Filter, Download, Trees, BarChart, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"

export default async function PotensiPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get user profile for role-based permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  // Get kabupaten for filter
  const { data: kabupatenData } = await supabase
    .from("kabupaten")
    .select("id, nama, created_at")
    .order("nama")

  // Get data from potensi table with kabupaten info
  const { data: potensiData } = await supabase
    .from("potensi")
    .select(`
      *,
      kabupaten:kabupaten_id (
        nama
      )
    `)
    .order("created_at", { ascending: false })

  // Transform data for table
  const tableData = potensiData?.map(item => ({
    id: item.id,
    kabupaten_nama: item.kabupaten?.nama || 'Unknown',
    skema: item.skema,
    pemegang_izin: item.pemegang_izin,
    nama_area: item.nama_area,
    desa: item.desa,
    kecamatan: item.kecamatan,
    nomor_sk: item.nomor_sk,
    luas_ha: item.luas_potensi_ha,
    luas_izin_ha: item.luas_izin_sk_ha,
    jenis_hutan: item.jenis_hutan,
    status_kawasan: item.status_kawasan,
    status_pengembangan: item.status_pengembangan,
    keterangan: item.keterangan,
    created_at: new Date(item.created_at).toLocaleDateString('id-ID'),
    can_edit: profile?.role === 'admin' || profile?.role === 'monev',
    can_delete: profile?.role === 'admin'
  })) || []

  // Helper function to normalize kabupaten name for filtering
  const normalizeKabupatenName = (name: string): string => {
    if (!name) return ''
    // Remove "KABUPATEN " prefix and convert to lowercase for comparison
    return name.toLowerCase().replace('kabupaten ', '').trim()
  }

  // Get statistics for potensi data
  const totalData = tableData.length
  const totalLuas = tableData.reduce((sum, item) => sum + (item.luas_ha || 0), 0)
  
  // Group by kabupaten for statistics
  const kabupatenStats: Record<string, { count: number, luas: number }> = {}
  tableData.forEach(item => {
    const kab = item.kabupaten_nama
    if (!kabupatenStats[kab]) {
      kabupatenStats[kab] = { count: 0, luas: 0 }
    }
    kabupatenStats[kab].count++
    kabupatenStats[kab].luas += item.luas_ha || 0
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Potensi Perhutanan Sosial</h1>
          <p className="text-muted-foreground">
            Kelola data potensi dan calon lokasi Perhutanan Sosial di 4 kabupaten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {(profile?.role === 'admin' || profile?.role === 'monev') && (
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Potensi
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Potensi</CardTitle>
            <Trees className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalData}</div>
            <p className="text-xs text-muted-foreground">Lokasi Potensi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Luas Potensi</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLuas.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Hektar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Luas</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalData > 0 ? (totalLuas / totalData).toLocaleString('id-ID', { maximumFractionDigits: 0 }) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Hektar per lokasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kabupaten Terbanyak</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(kabupatenStats).length > 0 
                ? Object.entries(kabupatenStats).sort((a, b) => b[1].count - a[1].count)[0][0].replace('KABUPATEN ', '')
                : '-'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(kabupatenStats).length > 0 
                ? `${Object.entries(kabupatenStats).sort((a, b) => b[1].count - a[1].count)[0][1].count} lokasi`
                : '0 lokasi'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Semua Potensi</TabsTrigger>
          <TabsTrigger value="Gunung Mas">Gunung Mas</TabsTrigger>
          <TabsTrigger value="kapuas">Kapuas</TabsTrigger>
          <TabsTrigger value="katingan">Katingan</TabsTrigger>
          <TabsTrigger value="Pulang Pisau">Pulang Pisau</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Potensi Perhutanan Sosial</CardTitle>
              <CardDescription>
                Tabel lengkap data potensi dengan filter dan pencarian. Data ini menunjukkan calon lokasi yang berpotensi untuk dikembangkan menjadi Perhutanan Sosial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={tableData} 
                kabupatenOptions={kabupatenData || []}
                userRole={profile?.role || 'viewer'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tabs for Kabupaten */}
        <TabsContent value="Gunung Mas">
          <Card>
            <CardHeader>
              <CardTitle>Potensi Gunung Mas</CardTitle>
              <CardDescription>
                Data potensi Perhutanan Sosial untuk Kabupaten Gunung Mas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={tableData.filter(item => 
                  normalizeKabupatenName(item.kabupaten_nama) === 'gunung mas'
                )} 
                kabupatenOptions={kabupatenData || []}
                userRole={profile?.role || 'viewer'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kapuas">
          <Card>
            <CardHeader>
              <CardTitle>Potensi Kapuas</CardTitle>
              <CardDescription>
                Data potensi Perhutanan Sosial untuk Kabupaten Kapuas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={tableData.filter(item => 
                  normalizeKabupatenName(item.kabupaten_nama) === 'kapuas'
                )} 
                kabupatenOptions={kabupatenData || []}
                userRole={profile?.role || 'viewer'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="katingan">
          <Card>
            <CardHeader>
              <CardTitle>Potensi Katingan</CardTitle>
              <CardDescription>
                Data potensi Perhutanan Sosial untuk Kabupaten Katingan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={tableData.filter(item => 
                  normalizeKabupatenName(item.kabupaten_nama) === 'katingan'
                )} 
                kabupatenOptions={kabupatenData || []}
                userRole={profile?.role || 'viewer'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Pulang Pisau">
          <Card>
            <CardHeader>
              <CardTitle>Potensi Pulang Pisau</CardTitle>
              <CardDescription>
                Data potensi Perhutanan Sosial untuk Kabupaten Pulang Pisau
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={tableData.filter(item => 
                  normalizeKabupatenName(item.kabupaten_nama) === 'pulang pisau'
                )} 
                kabupatenOptions={kabupatenData || []}
                userRole={profile?.role || 'viewer'}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Data Potensi</CardTitle>
          <CardDescription>
            Keterangan dan status pengembangan potensi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Status Potensi</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                    <span>Proses Pembentukan PS: {tableData.filter(item => item.keterangan?.includes('Proses Pembentukan')).length} lokasi</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></div>
                    <span>Proses Penjajakan: {tableData.filter(item => item.keterangan?.includes('penjajakan')).length} lokasi</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                    <span>Siap Dikembangkan: {tableData.filter(item => item.keterangan?.includes('Siap') || item.keterangan?.includes('siap')).length} lokasi</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Jenis Hutan</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-amber-700 mr-2"></div>
                    <span>Gambut: {tableData.filter(item => item.jenis_hutan?.includes('Gambut')).length} lokasi</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-stone-700 mr-2"></div>
                    <span>Mineral: {tableData.filter(item => item.jenis_hutan?.includes('Mineral')).length} lokasi</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-green-700 mr-2"></div>
                    <span>Mangrove: {tableData.filter(item => item.jenis_hutan?.includes('Mangrove')).length} lokasi</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {(profile?.role === 'admin' || profile?.role === 'monev') && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    Update Status Potensi
                  </Button>
                  <Button variant="outline" size="sm">
                    Tambah Catatan
                  </Button>
                  <Button variant="outline" size="sm">
                    Assign Fasilitator
                  </Button>
                  <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
                    Tandai sebagai Siap
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
