"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X, Map } from "lucide-react"

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

interface AddEditPetaFormProps {
  peta: Peta | null
  psId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddEditPetaForm({ peta, psId, onSuccess, onCancel }: AddEditPetaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    koordinat_lat: peta?.koordinat_centroid?.lat?.toString() || "",
    koordinat_lng: peta?.koordinat_centroid?.lng?.toString() || "",
    luas_terukur: peta?.luas_terukur?.toString() || "",
    keterangan: peta?.keterangan || "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      // For SHP files, we might get multiple files (.shp, .shx, .dbf, .prj, .cpg)
      // We'll handle the main .shp file and note that it's a shapefile
      const allowedTypes = [
        'application/json',
        'application/geo+json',
        'application/vnd.google-earth.kml+xml',
        'application/vnd.google-earth.kmz',
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/octet-stream', // For SHP files
        'application/zip', // For zipped SHP files
        'application/x-zip-compressed'
      ]
      
      const allowedExts = ['json', 'geojson', 'kml', 'kmz', 'jpg', 'jpeg', 'png', 'pdf', 'shp', 'shx', 'dbf', 'prj', 'cpg', 'zip']
      
      // Check all selected files
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        
        if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt || '')) {
          setFileError(`Format file tidak didukung: ${file.name}. Gunakan GeoJSON, KML, KMZ, SHP, JPG, PNG, PDF, atau ZIP`)
          setFile(null)
          return
        }

        // Validate file size (max 50MB for map files)
        if (file.size > 50 * 1024 * 1024) {
          setFileError(`Ukuran file ${file.name} terlalu besar (maks 50MB)`)
          setFile(null)
          return
        }
      }

      // For now, just take the first file (main .shp file if shapefile)
      // In a production system, you would handle uploading all SHP components
      const mainFile = selectedFiles[0]
      setFile(mainFile)
      setFileError(null)

      const fileExt = mainFile.name.split('.').pop()?.toLowerCase()
      
      // If it's a GeoJSON file, try to parse it
      if (fileExt === 'json' || fileExt === 'geojson') {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target?.result as string)
            // Try to extract centroid from GeoJSON
            if (json.type === 'FeatureCollection' && json.features && json.features.length > 0) {
              // Simple centroid calculation (can be improved)
              const firstFeature = json.features[0]
              if (firstFeature.geometry && firstFeature.geometry.coordinates) {
                console.log("GeoJSON loaded, can extract coordinates")
              }
            }
          } catch (err) {
            console.warn("Could not parse GeoJSON:", err)
          }
        }
        reader.readAsText(mainFile)
      }
      
      // If it's a SHP file, note that additional files might be needed
      if (fileExt === 'shp') {
        console.log("SHP file selected - note: make sure to upload all components (.shx, .dbf, .prj, .cpg) separately if needed")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFileError(null)

    try {
      const supabase = createClient()

      // Check user role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Anda belum login. Silakan login terlebih dahulu.")
        setIsSubmitting(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'monev')) {
        alert(`Akses ditolak. Role Anda: ${profile?.role || 'tidak ada'}. Hanya admin dan monev yang dapat mengedit data.`)
        setIsSubmitting(false)
        return
      }

      let fileUrl = peta?.file_url || null
      let fileName = peta?.file_name || null
      let geojsonData = peta?.geojson_data || null

      // Upload file if new file is selected
      if (file) {
        setUploading(true)
        const fileExt = file.name.split('.').pop()
        const fileNameNew = `${psId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ps-peta')
          .upload(fileNameNew, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw new Error(`Gagal mengupload file: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('ps-peta')
          .getPublicUrl(fileNameNew)

        fileUrl = urlData.publicUrl
        fileName = file.name

        // If it's a GeoJSON file, try to parse and store it
        if (fileExt === 'json' || fileExt === 'geojson') {
          try {
            const text = await file.text()
            geojsonData = JSON.parse(text)
          } catch (err) {
            console.warn("Could not parse GeoJSON:", err)
          }
        }

        // Delete old file if editing
        if (peta?.file_url) {
          const oldFileName = peta.file_url.split('/').pop()
          if (oldFileName) {
            await supabase.storage
              .from('ps-peta')
              .remove([`${psId}/${oldFileName}`])
          }
        }

        setUploading(false)
      }

      // Prepare koordinat centroid
      let koordinatCentroid = null
      if (formData.koordinat_lat && formData.koordinat_lng) {
        const lat = parseFloat(formData.koordinat_lat)
        const lng = parseFloat(formData.koordinat_lng)
        if (!isNaN(lat) && !isNaN(lng)) {
          koordinatCentroid = { lat, lng }
        }
      }

      // Insert or update peta (upsert because it's 1:1 relationship)
      const petaData = {
        perhutanan_sosial_id: psId,
        geojson_data: geojsonData,
        file_url: fileUrl,
        file_name: fileName,
        koordinat_centroid: koordinatCentroid,
        luas_terukur: formData.luas_terukur ? parseFloat(formData.luas_terukur) : null,
        keterangan: formData.keterangan.trim() || null,
        created_by: user.id,
      }

      if (peta) {
        // Update existing
        const { error } = await supabase
          .from("ps_peta")
          .update(petaData)
          .eq("id", peta.id)

        if (error) throw error
      } else {
        // Insert new (upsert to handle 1:1 relationship)
        const { error } = await supabase
          .from("ps_peta")
          .upsert(petaData, {
            onConflict: "perhutanan_sosial_id"
          })

        if (error) throw error
      }

      // Update peta_status in perhutanan_sosial table to 'ada'
      const { error: updateStatusError } = await supabase
        .from("perhutanan_sosial")
        .update({ peta_status: 'ada' })
        .eq("id", psId)

      if (updateStatusError) {
        console.error("Error updating peta_status:", updateStatusError)
        // Don't throw, just log. The peta upload succeeded.
      }

      if (onSuccess) {
        onSuccess()
      }

      alert(peta ? "Peta berhasil diperbarui!" : "Peta berhasil ditambahkan!")
    } catch (error: any) {
      console.error("Error saving peta:", error)
      alert(`Gagal menyimpan peta: ${error.message || "Silakan coba lagi."}`)
    } finally {
      setIsSubmitting(false)
      setUploading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              {peta ? "Edit Peta" : "Upload Peta"}
            </CardTitle>
            <CardDescription>
              {peta ? "Ubah informasi peta" : "Upload peta wilayah untuk PS ini"}
            </CardDescription>
          </div>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File Peta</Label>
            <div className="space-y-2">
              <Input
                id="file"
                type="file"
                accept=".json,.geojson,.kml,.kmz,.jpg,.jpeg,.png,.pdf,.shp,.shx,.dbf,.prj,.cpg,.zip"
                onChange={handleFileChange}
                className="cursor-pointer"
                multiple
              />
              {fileError && (
                <p className="text-sm text-red-600">{fileError}</p>
              )}
              {peta?.file_name && !file && (
                <p className="text-sm text-gray-500">
                  File saat ini: {peta.file_name}
                </p>
              )}
              {!peta && !file && (
                <p className="text-sm text-gray-500">
                  Pilih file peta untuk diupload (GeoJSON, KML, KMZ, SHP, JPG, PNG, PDF, ZIP - maks 50MB)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="koordinat_lat">Koordinat Latitude</Label>
              <Input
                id="koordinat_lat"
                name="koordinat_lat"
                type="number"
                step="any"
                value={formData.koordinat_lat}
                onChange={handleChange}
                placeholder="-2.123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="koordinat_lng">Koordinat Longitude</Label>
              <Input
                id="koordinat_lng"
                name="koordinat_lng"
                type="number"
                step="any"
                value={formData.koordinat_lng}
                onChange={handleChange}
                placeholder="113.123456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="luas_terukur">Luas Terukur (Ha)</Label>
            <Input
              id="luas_terukur"
              name="luas_terukur"
              type="number"
              step="0.01"
              min="0"
              value={formData.luas_terukur}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <textarea
              id="keterangan"
              name="keterangan"
              value={formData.keterangan}
              onChange={handleChange}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Keterangan tentang peta..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Batal
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting || uploading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  {uploading ? "Mengupload..." : "Menyimpan..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {peta ? "Simpan Perubahan" : "Upload Peta"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
