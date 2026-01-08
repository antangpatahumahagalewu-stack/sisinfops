"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Map, Upload, Download, MapPin, Edit } from "lucide-react"
import { AddEditPetaForm } from "./add-edit-peta-form"

interface Peta {
  id: string
  geojson_data: any | null
  file_url: string | null
  file_name: string | null
  koordinat_centroid: { lat: number; lng: number } | null
  luas_terukur: number | null
  keterangan: string | null
  created_at: string
}

export function TabPeta({ psId }: { psId: string }) {
  const [peta, setPeta] = useState<Peta | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
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

      // Fetch peta
      const { data, error } = await supabase
        .from("ps_peta")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .single()

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Error fetching peta:", error)
        }
        setPeta(null)
      } else {
        setPeta(data)
      }
      setLoading(false)
    }

    fetchData()
  }, [psId])

  const handleEditSuccess = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("ps_peta")
      .select("*")
      .eq("perhutanan_sosial_id", psId)
      .single()

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Error fetching peta:", error)
      }
      setPeta(null)
    } else {
      setPeta(data)
    }
    
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat peta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isEditing ? (
        <AddEditPetaForm
          peta={peta}
          psId={psId}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Peta</h3>
              <p className="text-sm text-muted-foreground">
                Peta wilayah Perhutanan Sosial
              </p>
            </div>
            {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {peta ? "Update Peta" : "Upload Peta"}
              </Button>
            )}
          </div>

      {!peta ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Belum ada peta</p>
            <p className="text-sm text-gray-500 mt-2">
              Upload peta wilayah untuk PS ini
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Map Preview Placeholder */}
                <div className="w-full h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  {peta.geojson_data ? (
                    <div className="text-center">
                      <Map className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">
                        Peta GeoJSON Tersedia
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Integrasikan dengan peta interaktif (Leaflet/Mapbox)
                      </p>
                    </div>
                  ) : peta.file_url ? (
                    <div className="text-center">
                      <Map className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">
                        File Peta Tersedia
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.open(peta.file_url!, "_blank")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Lihat File
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Map className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Peta belum diupload</p>
                    </div>
                  )}
                </div>

                {/* Peta Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  {peta.file_name && (
                    <div>
                      <span className="text-sm text-gray-600">File:</span>
                      <p className="font-medium">{peta.file_name}</p>
                    </div>
                  )}
                  {peta.luas_terukur && (
                    <div>
                      <span className="text-sm text-gray-600">
                        Luas Terukur:
                      </span>
                      <p className="font-medium">
                        {peta.luas_terukur.toLocaleString("id-ID")} ha
                      </p>
                    </div>
                  )}
                  {peta.koordinat_centroid && (
                    <div>
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Koordinat Centroid:
                      </span>
                      <p className="font-medium">
                        {peta.koordinat_centroid.lat.toFixed(6)},{" "}
                        {peta.koordinat_centroid.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                  {peta.keterangan && (
                    <div className="md:col-span-2">
                      <span className="text-sm text-gray-600">Keterangan:</span>
                      <p className="text-sm text-gray-700 mt-1">
                        {peta.keterangan}
                      </p>
                    </div>
                  )}
                </div>
                {(userRole === 'admin' || userRole === 'monev' || userRole === null) && (
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Peta
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  )
}
