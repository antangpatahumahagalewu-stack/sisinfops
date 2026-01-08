"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Plus, DollarSign, Edit, Trash2 } from "lucide-react"
import { AddEditKegiatanForm } from "./add-edit-kegiatan-form"

interface Kegiatan {
  id: string
  nama_kegiatan: string
  jenis_kegiatan: string | null
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  lokasi: string | null
  deskripsi: string | null
  status: string
  anggaran: number | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export function TabKegiatan({ psId }: { psId: string }) {
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
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

      // Fetch kegiatan
      const { data, error } = await supabase
        .from("ps_kegiatan")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .order("tanggal_mulai", { ascending: false, nullsFirst: false })

      if (error) {
        console.error("Error fetching kegiatan:", error)
      } else {
        setKegiatan(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [psId])

  const handleEditSuccess = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("ps_kegiatan")
      .select("*")
      .eq("perhutanan_sosial_id", psId)
      .order("tanggal_mulai", { ascending: false, nullsFirst: false })

    if (error) {
      console.error("Error fetching kegiatan:", error)
    } else {
      setKegiatan(data || [])
    }
    
    setIsAdding(false)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kegiatan ini?")) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("ps_kegiatan")
        .delete()
        .eq("id", id)

      if (error) throw error

      handleEditSuccess()
      alert("Kegiatan berhasil dihapus!")
    } catch (error: any) {
      console.error("Error deleting kegiatan:", error)
      alert(`Gagal menghapus kegiatan: ${error.message}`)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "SELESAI":
        return "default"
      case "BERLANGSUNG":
        return "secondary"
      case "RENCANA":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-"
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat kegiatan...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat kegiatan...</p>
        </div>
      </div>
    )
  }

  const editingKegiatan = editingId ? kegiatan.find(k => k.id === editingId) : null

  return (
    <div className="space-y-4">
      {isAdding || editingKegiatan ? (
        <AddEditKegiatanForm
          kegiatan={editingKegiatan || null}
          psId={psId}
          onSuccess={handleEditSuccess}
          onCancel={() => {
            setIsAdding(false)
            setEditingId(null)
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Kegiatan</h3>
              <p className="text-sm text-muted-foreground">
                Daftar kegiatan Perhutanan Sosial
              </p>
            </div>
            {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kegiatan
              </Button>
            )}
          </div>

      {kegiatan.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Belum ada kegiatan</p>
            <p className="text-sm text-gray-500 mt-2">
              Tambahkan kegiatan untuk PS ini
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {kegiatan.map((keg) => (
            <Card key={keg.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{keg.nama_kegiatan}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(keg.status)}>
                    {keg.status}
                  </Badge>
                </div>
                {keg.jenis_kegiatan && (
                  <CardDescription>{keg.jenis_kegiatan}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {keg.deskripsi && (
                    <p className="text-sm text-gray-700">{keg.deskripsi}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {keg.tanggal_mulai && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-gray-600">Mulai: </span>
                          <span className="font-medium">
                            {formatDate(keg.tanggal_mulai)}
                          </span>
                        </div>
                      </div>
                    )}
                    {keg.tanggal_selesai && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-gray-600">Selesai: </span>
                          <span className="font-medium">
                            {formatDate(keg.tanggal_selesai)}
                          </span>
                        </div>
                      </div>
                    )}
                    {keg.lokasi && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">{keg.lokasi}</span>
                      </div>
                    )}
                    {keg.latitude && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">Lat: {keg.latitude}</span>
                      </div>
                    )}
                    {keg.longitude && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">Lng: {keg.longitude}</span>
                      </div>
                    )}
                    {keg.anggaran && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">
                          {formatCurrency(keg.anggaran)}
                        </span>
                      </div>
                    )}
                  </div>
                  {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(keg.id)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      {userRole === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(keg.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  )
}
