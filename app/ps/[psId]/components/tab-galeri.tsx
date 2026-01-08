"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, Plus, MapPin, Calendar, Edit, Trash2 } from "lucide-react"
import { AddEditGaleriForm } from "./add-edit-galeri-form"

interface Galeri {
  id: string
  judul: string | null
  deskripsi: string | null
  foto_url: string
  foto_thumbnail_url: string | null
  tanggal_foto: string | null
  lokasi: string | null
  created_at: string
}

export function TabGaleri({ psId }: { psId: string }) {
  const [galeri, setGaleri] = useState<Galeri[]>([])
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

      // Fetch galeri
      const { data, error } = await supabase
        .from("ps_galeri")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .order("tanggal_foto", { ascending: false, nullsFirst: false })

      if (error) {
        console.error("Error fetching galeri:", error)
      } else {
        setGaleri(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [psId])

  const handleEditSuccess = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("ps_galeri")
      .select("*")
      .eq("perhutanan_sosial_id", psId)
      .order("tanggal_foto", { ascending: false, nullsFirst: false })

    if (error) {
      console.error("Error fetching galeri:", error)
    } else {
      setGaleri(data || [])
    }
    
    setIsAdding(false)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus foto ini?")) {
      return
    }

    try {
      const supabase = createClient()
      
      // Get foto to delete file
      const { data: foto } = await supabase
        .from("ps_galeri")
        .select("foto_url")
        .eq("id", id)
        .single()

      // Delete from database
      const { error } = await supabase
        .from("ps_galeri")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Delete file from storage
      if (foto?.foto_url) {
        const fileName = foto.foto_url.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('ps-galeri')
            .remove([`${psId}/${fileName}`])
        }
      }

      handleEditSuccess()
      alert("Foto berhasil dihapus!")
    } catch (error: any) {
      console.error("Error deleting foto:", error)
      alert(`Gagal menghapus foto: ${error.message}`)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat galeri...</p>
        </div>
      </div>
    )
  }

  const editingGaleri = editingId ? galeri.find(g => g.id === editingId) : null

  return (
    <div className="space-y-4">
      {isAdding || editingGaleri ? (
        <AddEditGaleriForm
          galeri={editingGaleri || null}
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
              <h3 className="text-lg font-semibold">Galeri</h3>
              <p className="text-sm text-muted-foreground">
                Dokumentasi foto kegiatan PS
              </p>
            </div>
            {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Foto
              </Button>
            )}
          </div>

      {galeri.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Belum ada foto</p>
            <p className="text-sm text-gray-500 mt-2">
              Tambahkan foto dokumentasi untuk PS ini
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {galeri.map((foto) => (
            <Card key={foto.id} className="overflow-hidden">
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={foto.foto_thumbnail_url || foto.foto_url}
                  alt={foto.judul || "Foto"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EGambar tidak tersedia%3C/text%3E%3C/svg%3E"
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => window.open(foto.foto_url, "_blank")}
                  >
                    Lihat Full
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                {foto.judul && (
                  <h4 className="font-semibold text-sm mb-1">{foto.judul}</h4>
                )}
                {foto.deskripsi && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {foto.deskripsi}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  {foto.tanggal_foto && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(foto.tanggal_foto)}
                    </div>
                  )}
                  {foto.lokasi && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {foto.lokasi}
                    </div>
                  )}
                </div>
                {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
                  <div className="flex gap-2 mt-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(foto.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {userRole === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(foto.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                    )}
                  </div>
                )}
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
