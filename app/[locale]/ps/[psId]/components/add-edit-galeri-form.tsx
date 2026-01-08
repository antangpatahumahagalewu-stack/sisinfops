"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X, Image as ImageIcon } from "lucide-react"

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

interface AddEditGaleriFormProps {
  galeri: Galeri | null
  psId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddEditGaleriForm({ galeri, psId, onSuccess, onCancel }: AddEditGaleriFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(galeri?.foto_url || null)
  const [formData, setFormData] = useState({
    judul: galeri?.judul || "",
    deskripsi: galeri?.deskripsi || "",
    tanggal_foto: galeri?.tanggal_foto || "",
    lokasi: galeri?.lokasi || "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type (images only)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setFileError("Format file tidak didukung. Gunakan JPG, PNG, atau WEBP")
        setFile(null)
        setPreview(null)
        return
      }

      // Validate file size (max 5MB for images)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setFileError("Ukuran file maksimal 5MB")
        setFile(null)
        setPreview(null)
        return
      }

      setFile(selectedFile)
      setFileError(null)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
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

      let fotoUrl = galeri?.foto_url || null
      let fotoThumbnailUrl = galeri?.foto_thumbnail_url || null

      // Upload file if new file is selected
      if (file) {
        setUploading(true)
        const fileExt = file.name.split('.').pop()
        const fileNameNew = `${psId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ps-galeri')
          .upload(fileNameNew, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw new Error(`Gagal mengupload foto: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('ps-galeri')
          .getPublicUrl(fileNameNew)

        fotoUrl = urlData.publicUrl
        // For now, use the same URL as thumbnail. Can be improved later with image resizing
        fotoThumbnailUrl = urlData.publicUrl

        // Delete old file if editing
        if (galeri?.foto_url) {
          const oldFileName = galeri.foto_url.split('/').pop()
          if (oldFileName) {
            await supabase.storage
              .from('ps-galeri')
              .remove([`${psId}/${oldFileName}`])
          }
        }

        setUploading(false)
      }

      if (!fotoUrl) {
        throw new Error("Foto harus diupload")
      }

      // Insert or update galeri
      const galeriData = {
        perhutanan_sosial_id: psId,
        judul: formData.judul.trim() || null,
        deskripsi: formData.deskripsi.trim() || null,
        foto_url: fotoUrl,
        foto_thumbnail_url: fotoThumbnailUrl,
        tanggal_foto: formData.tanggal_foto || null,
        lokasi: formData.lokasi.trim() || null,
        created_by: user.id,
      }

      if (galeri) {
        // Update existing
        const { error } = await supabase
          .from("ps_galeri")
          .update(galeriData)
          .eq("id", galeri.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from("ps_galeri")
          .insert(galeriData)

        if (error) throw error
      }

      if (onSuccess) {
        onSuccess()
      }

      alert(galeri ? "Foto berhasil diperbarui!" : "Foto berhasil ditambahkan!")
    } catch (error: any) {
      console.error("Error saving galeri:", error)
      alert(`Gagal menyimpan foto: ${error.message || "Silakan coba lagi."}`)
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
              <ImageIcon className="h-5 w-5" />
              {galeri ? "Edit Foto" : "Tambah Foto"}
            </CardTitle>
            <CardDescription>
              {galeri ? "Ubah informasi foto" : "Tambahkan foto dokumentasi untuk PS ini"}
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
            <Label htmlFor="file">Foto *</Label>
            <div className="space-y-2">
              <Input
                id="file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {fileError && (
                <p className="text-sm text-red-600">{fileError}</p>
              )}
              {!galeri && !file && (
                <p className="text-sm text-gray-500">
                  Pilih foto untuk diupload (JPG, PNG, WEBP - maks 5MB)
                </p>
              )}
            </div>
            {preview && (
              <div className="mt-2">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full h-48 object-cover rounded-md border"
                />
              </div>
            )}
            {galeri?.foto_url && !file && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-2">Foto saat ini:</p>
                <img
                  src={galeri.foto_url}
                  alt={galeri.judul || "Foto"}
                  className="max-w-full h-48 object-cover rounded-md border"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="judul">Judul</Label>
            <Input
              id="judul"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
              placeholder="Contoh: Dokumentasi Penanaman"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal_foto">Tanggal Foto</Label>
              <Input
                id="tanggal_foto"
                name="tanggal_foto"
                type="date"
                value={formData.tanggal_foto}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lokasi">Lokasi</Label>
              <Input
                id="lokasi"
                name="lokasi"
                value={formData.lokasi}
                onChange={handleChange}
                placeholder="Contoh: Blok A, Desa X"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <textarea
              id="deskripsi"
              name="deskripsi"
              value={formData.deskripsi}
              onChange={handleChange}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Deskripsi foto..."
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
                  {galeri ? "Simpan Perubahan" : "Tambah Foto"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

