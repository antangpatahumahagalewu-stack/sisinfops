"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X, Upload, FileText } from "lucide-react"

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

interface AddEditDokumenFormProps {
  dokumen: Dokumen | null
  psId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddEditDokumenForm({ dokumen, psId, onSuccess, onCancel }: AddEditDokumenFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    nama: dokumen?.nama || "",
    jenis: dokumen?.jenis || "SK",
    keterangan: dokumen?.keterangan || "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setFileError("Format file tidak didukung. Gunakan PDF, DOC, DOCX, XLS, XLSX, JPG, atau PNG")
        setFile(null)
        return
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setFileError("Ukuran file maksimal 10MB")
        setFile(null)
        return
      }

      setFile(selectedFile)
      setFileError(null)
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

      let fileUrl = dokumen?.file_url || null
      let fileName = dokumen?.file_name || null
      let fileSize = dokumen?.file_size || null

      // Upload file if new file is selected
      if (file) {
        setUploading(true)
        const fileExt = file.name.split('.').pop()
        const fileNameNew = `${psId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ps-dokumen')
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
          .from('ps-dokumen')
          .getPublicUrl(fileNameNew)

        fileUrl = urlData.publicUrl
        fileName = file.name
        fileSize = file.size

        // Delete old file if editing
        if (dokumen?.file_url) {
          const oldFileName = dokumen.file_url.split('/').pop()
          if (oldFileName) {
            await supabase.storage
              .from('ps-dokumen')
              .remove([`${psId}/${oldFileName}`])
          }
        }

        setUploading(false)
      }

      // Insert or update dokumen
      const dokumenData = {
        perhutanan_sosial_id: psId,
        nama: formData.nama.trim(),
        jenis: formData.jenis,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        keterangan: formData.keterangan.trim() || null,
        created_by: user.id,
      }

      if (dokumen) {
        // Update existing
        const { error } = await supabase
          .from("ps_dokumen")
          .update(dokumenData)
          .eq("id", dokumen.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from("ps_dokumen")
          .insert(dokumenData)

        if (error) throw error
      }

      if (onSuccess) {
        onSuccess()
      }

      alert(dokumen ? "Dokumen berhasil diperbarui!" : "Dokumen berhasil ditambahkan!")
    } catch (error: any) {
      console.error("Error saving dokumen:", error)
      alert(`Gagal menyimpan dokumen: ${error.message || "Silakan coba lagi."}`)
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

  const handleSelectChange = (name: string, value: string) => {
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
              <FileText className="h-5 w-5" />
              {dokumen ? "Edit Dokumen" : "Tambah Dokumen"}
            </CardTitle>
            <CardDescription>
              {dokumen ? "Ubah informasi dokumen" : "Tambahkan dokumen baru untuk PS ini"}
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
            <Label htmlFor="nama">Nama Dokumen</Label>
            <Input
              id="nama"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              placeholder="Contoh: SK Perhutanan Sosial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jenis">Jenis Dokumen</Label>
            <Select
              value={formData.jenis}
              onValueChange={(value) => handleSelectChange("jenis", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis dokumen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SK">SK</SelectItem>
                <SelectItem value="PETA">PETA</SelectItem>
                <SelectItem value="RKPS">RKPS</SelectItem>
                <SelectItem value="PKS">PKS</SelectItem>
                <SelectItem value="LAINNYA">LAINNYA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File Dokumen {!dokumen && "*"}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="cursor-pointer"
              />
              {file && (
                <span className="text-sm text-gray-600">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </span>
              )}
            </div>
            {fileError && (
              <p className="text-sm text-red-600">{fileError}</p>
            )}
            {dokumen?.file_name && !file && (
              <p className="text-sm text-gray-500">
                File saat ini: {dokumen.file_name}
              </p>
            )}
            {!dokumen && !file && (
              <p className="text-sm text-gray-500">
                Pilih file untuk diupload (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG - maks 10MB)
              </p>
            )}
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
              placeholder="Tambahkan keterangan tentang dokumen ini"
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
                  {dokumen ? "Simpan Perubahan" : "Tambah Dokumen"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

