"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Download, Plus, Edit, Trash2 } from "lucide-react"
import { AddEditDokumenForm } from "./add-edit-dokumen-form"

interface Dokumen {
  id: string
  nama: string
  jenis: string
  file_url: string | null
  file_name: string | null
  file_size: number | null
  keterangan: string | null
  created_at: string
}

export function TabDokumen({ psId }: { psId: string }) {
  const [dokumen, setDokumen] = useState<Dokumen[]>([])
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

      // Fetch dokumen
      const { data, error } = await supabase
        .from("ps_dokumen")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching dokumen:", error)
      } else {
        setDokumen(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [psId])

  const handleEditSuccess = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("ps_dokumen")
      .select("*")
      .eq("perhutanan_sosial_id", psId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching dokumen:", error)
    } else {
      setDokumen(data || [])
    }
    
    setIsAdding(false)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
      return
    }

    try {
      const supabase = createClient()
      
      // Get dokumen to delete file
      const { data: doc } = await supabase
        .from("ps_dokumen")
        .select("file_url")
        .eq("id", id)
        .single()

      // Delete from database
      const { error } = await supabase
        .from("ps_dokumen")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Delete file from storage
      if (doc?.file_url) {
        const fileName = doc.file_url.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('ps-dokumen')
            .remove([`${psId}/${fileName}`])
        }
      }

      // Refresh list
      handleEditSuccess()
      alert("Dokumen berhasil dihapus!")
    } catch (error: any) {
      console.error("Error deleting dokumen:", error)
      alert(`Gagal menghapus dokumen: ${error.message}`)
    }
  }

  const getJenisBadgeVariant = (jenis: string) => {
    switch (jenis) {
      case "SK":
        return "default"
      case "PETA":
        return "secondary"
      case "RKPS":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dokumen...</p>
        </div>
      </div>
    )
  }

  const editingDokumen = editingId ? dokumen.find(d => d.id === editingId) : null

  return (
    <div className="space-y-4">
      {isAdding || editingDokumen ? (
        <AddEditDokumenForm
          dokumen={editingDokumen || null}
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
              <h3 className="text-lg font-semibold">Dokumen</h3>
              <p className="text-sm text-muted-foreground">
                SK, peta, dan dokumen legal PS
              </p>
            </div>
            {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Dokumen
              </Button>
            )}
          </div>

          {dokumen.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Belum ada dokumen</p>
                <p className="text-sm text-gray-500 mt-2">
                  Tambahkan dokumen untuk PS ini
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dokumen.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{doc.nama}</CardTitle>
                      <Badge variant={getJenisBadgeVariant(doc.jenis)}>
                        {doc.jenis}
                      </Badge>
                    </div>
                    {doc.keterangan && (
                      <CardDescription>{doc.keterangan}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {doc.file_name && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">File:</span>
                          <span className="font-medium">{doc.file_name}</span>
                        </div>
                      )}
                      {doc.file_size && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Ukuran:</span>
                          <span className="font-medium">
                            {formatFileSize(doc.file_size)}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        {doc.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(doc.file_url!, "_blank")}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        )}
                        {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingId(doc.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {userRole === 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
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
