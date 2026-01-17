"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Calendar, Edit, Trash2 } from "lucide-react"
import { AddEditCatatanForm } from "./add-edit-catatan-form"

interface Catatan {
  id: string
  judul: string
  isi: string
  kategori: string
  tanggal_catatan: string
  created_at: string
}

export function TabCatatan({ psId }: { psId: string }) {
  const [catatan, setCatatan] = useState<Catatan[]>([])
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

      // Fetch catatan
      const { data, error } = await supabase
        .from("ps_catatan")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .order("tanggal_catatan", { ascending: false })

      if (error) {
        console.error("Error fetching catatan:", error)
      } else {
        setCatatan(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [psId])

  const handleEditSuccess = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("ps_catatan")
      .select("*")
      .eq("perhutanan_sosial_id", psId)
      .order("tanggal_catatan", { ascending: false })

    if (error) {
      console.error("Error fetching catatan:", error)
    } else {
      setCatatan(data || [])
    }
    
    setIsAdding(false)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan ini?")) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("ps_catatan")
        .delete()
        .eq("id", id)

      if (error) throw error

      handleEditSuccess()
      alert("Catatan berhasil dihapus!")
    } catch (error: any) {
      console.error("Error deleting catatan:", error)
      alert(`Gagal menghapus catatan: ${error.message}`)
    }
  }

  const getKategoriBadgeVariant = (kategori: string) => {
    switch (kategori) {
      case "MONITORING":
        return "default"
      case "EVALUASI":
        return "secondary"
      case "MASALAH":
        return "destructive"
      case "PENCAPAIAN":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat catatan...</p>
        </div>
      </div>
    )
  }

  const editingCatatan = editingId ? catatan.find(c => c.id === editingId) : null

  return (
    <div className="space-y-4">
      {isAdding || editingCatatan ? (
        <AddEditCatatanForm
          catatan={editingCatatan || null}
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
              <h3 className="text-lg font-semibold">Catatan Lapangan</h3>
              <p className="text-sm text-muted-foreground">
                Catatan internal & hasil monitoring PS
              </p>
            </div>
            {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Catatan
              </Button>
            )}
          </div>

      {catatan.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Belum ada catatan</p>
            <p className="text-sm text-gray-500 mt-2">
              Tambahkan catatan lapangan untuk PS ini
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {catatan.map((cat) => (
            <Card key={cat.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{cat.judul}</CardTitle>
                  <Badge variant={getKategoriBadgeVariant(cat.kategori)}>
                    {cat.kategori}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(cat.tanggal_catatan)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {cat.isi}
                </p>
                {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(cat.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {userRole === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cat.id)}
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
