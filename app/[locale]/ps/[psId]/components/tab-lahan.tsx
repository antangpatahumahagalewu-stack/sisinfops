"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  MapPin, 
  TreePine, 
  AlertCircle, 
  Edit, 
  Plus, 
  Trash2,
  Calendar,
  FileText,
  BarChart,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react"
import { LandTenureForm } from "./land-tenure-form"
import { ForestHistoryForm } from "./forest-history-form"
import { DeforestationDriversForm } from "./deforestation-drivers-form"

interface LandTenure {
  id: string
  perhutanan_sosial_id: string
  ownership_status: string
  land_certificate_number: string | null
  certificate_date: string | null
  area_ha: number | null
  challenges: string | null
  government_involvement: string | null
  ministry_engagement: string | null
  conflict_history: string | null
  resolution_status: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface ForestStatusHistory {
  id: string
  perhutanan_sosial_id: string
  year: number
  forest_status: string
  definition_used: string
  area_ha: number | null
  data_source: string | null
  verification_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface DeforestationDriver {
  id: string
  perhutanan_sosial_id: string
  driver_type: string
  driver_description: string
  historical_trend: string | null
  intervention_activity: string
  intervention_rationale: string | null
  expected_impact: string | null
  data_source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function TabLahan({ psId }: { psId: string }) {
  const [activeTab, setActiveTab] = useState("kepemilikan")
  const [landTenure, setLandTenure] = useState<LandTenure | null>(null)
  const [forestHistory, setForestHistory] = useState<ForestStatusHistory[]>([])
  const [deforestationDrivers, setDeforestationDrivers] = useState<DeforestationDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Form states
  const [editingLandTenure, setEditingLandTenure] = useState(false)
  const [editingForestHistory, setEditingForestHistory] = useState<string | null>(null)
  const [editingDeforestationDriver, setEditingDeforestationDriver] = useState<string | null>(null)
  const [addingForestHistory, setAddingForestHistory] = useState(false)
  const [addingDeforestationDriver, setAddingDeforestationDriver] = useState(false)

  useEffect(() => {
    fetchData()
  }, [psId])

  async function fetchData() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Fetch user role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        setUserRole(profile?.role || null)
      }

      // Fetch land tenure
      const { data: landData } = await supabase
        .from("land_tenure")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .single()

      setLandTenure(landData)

      // Fetch forest status history (10 years)
      const currentYear = new Date().getFullYear()
      const startYear = currentYear - 9
      
      const { data: forestData } = await supabase
        .from("forest_status_history")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .gte("year", startYear)
        .lte("year", currentYear)
        .order("year", { ascending: false })

      setForestHistory(forestData || [])

      // Fetch deforestation drivers
      const { data: driversData } = await supabase
        .from("deforestation_drivers")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .order("created_at", { ascending: false })

      setDeforestationDrivers(driversData || [])
    } catch (error) {
      console.error("Error fetching land data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLandTenureSuccess = () => {
    fetchData()
    setEditingLandTenure(false)
  }

  const handleForestHistorySuccess = () => {
    fetchData()
    setEditingForestHistory(null)
    setAddingForestHistory(false)
  }

  const handleDeforestationDriverSuccess = () => {
    fetchData()
    setEditingDeforestationDriver(null)
    setAddingDeforestationDriver(false)
  }

  const handleDeleteForestHistory = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data riwayat hutan ini?")) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("forest_status_history")
        .delete()
        .eq("id", id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error("Error deleting forest history:", error)
      alert("Gagal menghapus data riwayat hutan")
    }
  }

  const handleDeleteDeforestationDriver = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data penyebab deforestasi ini?")) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("deforestation_drivers")
        .delete()
        .eq("id", id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error("Error deleting deforestation driver:", error)
      alert("Gagal menghapus data penyebab deforestasi")
    }
  }

  const getOwnershipStatusLabel = (status: string) => {
    switch (status) {
      case "PRIVATE": return "Privat"
      case "PUBLIC": return "Publik"
      case "COMMUNAL": return "Komunal"
      case "MIXED": return "Campuran"
      default: return status
    }
  }

  const getForestStatusLabel = (status: string) => {
    switch (status) {
      case "FOREST": return "Hutan"
      case "NON_FOREST": return "Non-Hutan"
      case "DEGRADED_FOREST": return "Hutan Terdegradasi"
      case "OTHER": return "Lainnya"
      default: return status
    }
  }

  const getDriverTypeLabel = (type: string) => {
    switch (type) {
      case "AGRICULTURAL_EXPANSION": return "Ekspansi Pertanian"
      case "LOGGING": return "Penebangan Liar"
      case "INFRASTRUCTURE": return "Pembangunan Infrastruktur"
      case "MINING": return "Pertambangan"
      case "FIRE": return "Kebakaran"
      case "OTHER": return "Lainnya"
      default: return type
    }
  }

  const canEdit = userRole === 'admin' || userRole === 'carbon_specialist'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data lahan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Lahan</h3>
          <p className="text-sm text-muted-foreground">
            Informasi kepemilikan, riwayat status, dan analisis perubahan lahan
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="kepemilikan" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Kepemilikan & Tenure</span>
            <span className="sm:hidden">Kepemilikan</span>
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="flex items-center gap-2">
            <TreePine className="h-4 w-4" />
            <span className="hidden sm:inline">Riwayat Status (10 Tahun)</span>
            <span className="sm:hidden">Riwayat</span>
          </TabsTrigger>
          <TabsTrigger value="analisis" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Analisis Perubahan</span>
            <span className="sm:hidden">Analisis</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Kepemilikan & Tenure Lahan */}
        <TabsContent value="kepemilikan">
          {editingLandTenure || !landTenure ? (
            <LandTenureForm
              psId={psId}
              initialData={landTenure}
              onSuccess={handleLandTenureSuccess}
              onCancel={() => setEditingLandTenure(false)}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>Kepemilikan & Tenure Lahan</CardTitle>
                      <CardDescription>
                        Status kepemilikan, sertifikat, dan informasi tenure
                      </CardDescription>
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingLandTenure(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600">Status Kepemilikan</span>
                      <p className="font-semibold text-lg">
                        {getOwnershipStatusLabel(landTenure.ownership_status)}
                      </p>
                    </div>
                    {landTenure.land_certificate_number && (
                      <div>
                        <span className="text-sm text-gray-600">Nomor Sertifikat</span>
                        <p className="font-medium">{landTenure.land_certificate_number}</p>
                        {landTenure.certificate_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            Tanggal: {new Date(landTenure.certificate_date).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    )}
                    {landTenure.area_ha && (
                      <div>
                        <span className="text-sm text-gray-600">Luas Lahan</span>
                        <p className="font-semibold text-xl">
                          {landTenure.area_ha.toLocaleString('id-ID', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} ha
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {landTenure.government_involvement && (
                      <div>
                        <span className="text-sm text-gray-600">Keterlibatan Pemerintah</span>
                        <p className="text-gray-700">{landTenure.government_involvement}</p>
                      </div>
                    )}
                    {landTenure.conflict_history && (
                      <div>
                        <span className="text-sm text-gray-600">Riwayat Konflik</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            landTenure.resolution_status === 'RESOLVED' ? 'default' :
                            landTenure.resolution_status === 'ONGOING' ? 'secondary' :
                            landTenure.resolution_status === 'PENDING' ? 'destructive' : 'outline'
                          }>
                            {landTenure.resolution_status === 'RESOLVED' ? 'Terselesaikan' :
                             landTenure.resolution_status === 'ONGOING' ? 'Berlangsung' :
                             landTenure.resolution_status === 'PENDING' ? 'Menunggu' : 'Tidak Ada'}
                          </Badge>
                        </div>
                        <p className="text-gray-700 mt-2">{landTenure.conflict_history}</p>
                      </div>
                    )}
                    {landTenure.challenges && (
                      <div>
                        <span className="text-sm text-gray-600">Tantangan Kepastian Lahan</span>
                        <p className="text-gray-700">{landTenure.challenges}</p>
                      </div>
                    )}
                  </div>
                </div>
                {landTenure.notes && (
                  <div className="mt-6 pt-6 border-t">
                    <span className="text-sm text-gray-600">Catatan</span>
                    <p className="text-gray-700 mt-1">{landTenure.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Riwayat Status Hutan 10 Tahun */}
        <TabsContent value="riwayat">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                    <TreePine className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Riwayat Status Hutan (10 Tahun)</CardTitle>
                    <CardDescription>
                      Data historis tutupan lahan berdasarkan definisi hutan nasional
                    </CardDescription>
                  </div>
                </div>
                {canEdit && !addingForestHistory && (
                  <Button
                    size="sm"
                    onClick={() => setAddingForestHistory(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Tahun
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {addingForestHistory || editingForestHistory ? (
                <ForestHistoryForm
                  psId={psId}
                  initialData={forestHistory.find(f => f.id === editingForestHistory)}
                  onSuccess={handleForestHistorySuccess}
                  onCancel={() => {
                    setAddingForestHistory(false)
                    setEditingForestHistory(null)
                  }}
                />
              ) : forestHistory.length === 0 ? (
                <div className="text-center py-12">
                  <TreePine className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Belum ada data riwayat status hutan</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Tambahkan data untuk 10 tahun terakhir
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - (9 - i)
                      const data = forestHistory.find(f => f.year === year)
                      
                      return (
                        <Card key={year} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold">{year}</span>
                              {data ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-300" />
                              )}
                            </div>
                            {data ? (
                              <div className="space-y-2">
                                <div className="text-center">
                                  <Badge variant={
                                    data.forest_status === 'FOREST' ? 'default' :
                                    data.forest_status === 'NON_FOREST' ? 'destructive' :
                                    'secondary'
                                  } className="w-full justify-center">
                                    {getForestStatusLabel(data.forest_status)}
                                  </Badge>
                                </div>
                                {data.area_ha && (
                                  <p className="text-sm text-center">
                                    {data.area_ha.toLocaleString('id-ID')} ha
                                  </p>
                                )}
                                <div className="flex justify-center gap-2 pt-2">
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingForestHistory(data.id)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteForestHistory(data.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-sm text-gray-500 mb-3">Data belum diisi</p>
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setAddingForestHistory(true)
                                      // You could pre-fill the year in the form
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Tambah
                                  </Button>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Detailed view for selected year */}
                  {forestHistory.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-4">Detail Riwayat Status</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Tahun</th>
                              <th className="text-left py-2">Status</th>
                              <th className="text-left py-2">Luas (ha)</th>
                              <th className="text-left py-2">Sumber Data</th>
                              <th className="text-left py-2">Catatan</th>
                              {canEdit && <th className="text-left py-2">Aksi</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {forestHistory.map((item) => (
                              <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="py-2">{item.year}</td>
                                <td className="py-2">
                                  <Badge variant={
                                    item.forest_status === 'FOREST' ? 'default' :
                                    item.forest_status === 'NON_FOREST' ? 'destructive' :
                                    'secondary'
                                  }>
                                    {getForestStatusLabel(item.forest_status)}
                                  </Badge>
                                </td>
                                <td className="py-2">
                                  {item.area_ha ? item.area_ha.toLocaleString('id-ID') : '-'}
                                </td>
                                <td className="py-2">{item.data_source || '-'}</td>
                                <td className="py-2">{item.notes || '-'}</td>
                                {canEdit && (
                                  <td className="py-2">
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingForestHistory(item.id)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteForestHistory(item.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Analisis Penyebab Perubahan Lahan */}
        <TabsContent value="analisis">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Analisis Penyebab Perubahan Lahan</CardTitle>
                    <CardDescription>
                      Identifikasi penyebab degradasi dan rencana intervensi proyek
                    </CardDescription>
                  </div>
                </div>
                {canEdit && !addingDeforestationDriver && (
                  <Button
                    size="sm"
                    onClick={() => setAddingDeforestationDriver(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Analisis
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {addingDeforestationDriver || editingDeforestationDriver ? (
                <DeforestationDriversForm
                  psId={psId}
                  initialData={deforestationDrivers.find(d => d.id === editingDeforestationDriver)}
                  onSuccess={handleDeforestationDriverSuccess}
                  onCancel={() => {
                    setAddingDeforestationDriver(false)
                    setEditingDeforestationDriver(null)
                  }}
                />
              ) : deforestationDrivers.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Belum ada data analisis penyebab perubahan lahan</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Tambahkan analisis untuk mengidentifikasi penyebab degradasi/deforestasi
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {deforestationDrivers.map((driver) => (
                    <Card key={driver.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Badge className="text-sm">
                              {getDriverTypeLabel(driver.driver_type)}
                            </Badge>
                            {driver.historical_trend && (
                              <span className="text-sm text-gray-600">
                                Tren: {driver.historical_trend.toLowerCase()}
                              </span>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingDeforestationDriver(driver.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDeforestationDriver(driver.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <span className="text-sm text-gray-600">Deskripsi Penyebab</span>
                              <p className="text-gray-700 mt-1">{driver.driver_description}</p>
                            </div>
                            {driver.data_source && (
                              <div>
                                <span className="text-sm text-gray-600">Sumber Data</span>
                                <p className="text-gray-700 mt-1">{driver.data_source}</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div>
                              <span className="text-sm text-gray-600">Aktivitas Intervensi</span>
                              <p className="text-gray-700 mt-1">{driver.intervention_activity}</p>
                            </div>
                            {driver.intervention_rationale && (
                              <div>
                                <span className="text-sm text-gray-600">Alasan Intervensi</span>
                                <p className="text-gray-700 mt-1">{driver.intervention_rationale}</p>
                              </div>
                            )}
                            {driver.expected_impact && (
                              <div>
                                <span className="text-sm text-gray-600">Dampak yang Diharapkan</span>
                                <p className="text-gray-700 mt-1">{driver.expected_impact}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {driver.notes && (
                          <div className="mt-6 pt-6 border-t">
                            <span className="text-sm text-gray-600">Catatan</span>
                            <p className="text-gray-700 mt-1">{driver.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
