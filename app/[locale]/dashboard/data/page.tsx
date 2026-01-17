import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DataTable from "@/components/dashboard/data-table"
import { AddPSForm } from "@/components/dashboard/add-ps-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Filter, Download } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { locales } from "@/i18n/locales"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function DataPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
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

  // Get all PS data with kabupaten info
  const { data: psData } = await supabase
    .from("perhutanan_sosial")
    .select(`
      *,
      kabupaten:kabupaten_id (
        nama
      )
    `)
    .order("created_at", { ascending: false })

  // Refresh function for after form submission
  const refreshData = async () => {
    // This function will be passed to AddPSForm to trigger data refresh
    // In a real implementation, you might want to use revalidatePath or revalidateTag
    // For now, we'll rely on router.refresh() in the client component
  }

  // Transform data for table
  const tableData = psData?.map(item => ({
    id: item.id,
    kabupaten_nama: item.kabupaten?.nama || 'Unknown',
    skema: item.skema,
    pemegang_izin: item.pemegang_izin,
    desa: item.desa,
    kecamatan: item.kecamatan,
    nomor_sk: item.nomor_sk,
    luas_ha: item.luas_ha,
    jenis_hutan: item.jenis_hutan,
    rkps_status: item.rkps_status,
    peta_status: item.peta_status,
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

  // Get statistics
  const totalData = tableData.length
  const totalLuas = tableData.reduce((sum, item) => sum + (item.luas_ha || 0), 0)
  const rkpsCompleted = tableData.filter(item => item.rkps_status === 'ada').length
  const petaCompleted = tableData.filter(item => item.peta_status === 'ada').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Perhutanan Sosial</h1>
          <p className="text-muted-foreground">
            Kelola data Perhutanan Sosial yang telah ber-PKS di 4 kabupaten
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
            <AddPSForm 
              kabupatenOptions={kabupatenData || []}
              userRole={profile?.role}
              onSuccess={refreshData}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalData}</div>
            <p className="text-xs text-muted-foreground">Data PS</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Luas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLuas.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Hektar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RKPS Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rkpsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {totalData > 0 ? `${Math.round((rkpsCompleted / totalData) * 100)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peta Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{petaCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {totalData > 0 ? `${Math.round((petaCompleted / totalData) * 100)}%` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Semua Data</TabsTrigger>
          <TabsTrigger value="rkps">Perlu RKPS</TabsTrigger>
          <TabsTrigger value="peta">Perlu Peta</TabsTrigger>
          <TabsTrigger value="Gunung Mas">Gunung Mas</TabsTrigger>
          <TabsTrigger value="kapuas">Kapuas</TabsTrigger>
          <TabsTrigger value="katingan">Katingan</TabsTrigger>
          <TabsTrigger value="Pulang Pisau">Pulang Pisau</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Perhutanan Sosial</CardTitle>
              <CardDescription>
                Tabel lengkap data PS dengan filter dan pencarian
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

        <TabsContent value="rkps">
          <Card>
            <CardHeader>
              <CardTitle>Data Perlu RKPS</CardTitle>
              <CardDescription>
                Data yang membutuhkan RKPS (status: belum)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={tableData.filter(item => item.rkps_status === 'belum')} 
                kabupatenOptions={kabupatenData || []}
                userRole={profile?.role || 'viewer'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peta">
          <Card>
            <CardHeader>
              <CardTitle>Data Perlu Peta</CardTitle>
              <CardDescription>
                Data yang membutuhkan Peta (status: belum)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={tableData.filter(item => item.peta_status === 'belum')} 
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
              <CardTitle>Data Gunung Mas</CardTitle>
              <CardDescription>
                Data Perhutanan Sosial untuk Kabupaten Gunung Mas
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
              <CardTitle>Data Kapuas</CardTitle>
              <CardDescription>
                Data Perhutanan Sosial untuk Kabupaten Kapuas
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
              <CardTitle>Data Katingan</CardTitle>
              <CardDescription>
                Data Perhutanan Sosial untuk Kabupaten Katingan
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
              <CardTitle>Data Pulang Pisau</CardTitle>
              <CardDescription>
                Data Perhutanan Sosial untuk Kabupaten Pulang Pisau
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

      {/* Quick Actions */}
      {(profile?.role === 'admin' || profile?.role === 'monev') && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Aksi cepat untuk manajemen data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                Update Status RKPS
              </Button>
              <Button variant="outline" size="sm">
                Update Status Peta
              </Button>
              <Button variant="outline" size="sm">
                Bulk Edit
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
