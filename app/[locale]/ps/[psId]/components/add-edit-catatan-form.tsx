"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X, FileText } from "lucide-react"

interface Catatan {
  id: string
  judul: string
  isi: string
  kategori: string
  tanggal_catatan: string
  created_at: string
}

interface AddEditCatatanFormProps {
  catatan: Catatan | null
  psId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddEditCatatanForm({ catatan, psId, onSuccess, onCancel }: AddEditCatatanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    judul: catatan?.judul || "",
    isi: catatan?.isi || "",
    kategori: catatan?.kategori || "MONITORING",
    tanggal_catatan: catatan?.tanggal_catatan || new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

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

      // Prepare data
      const catatanData = {
        perhutanan_sosial_id: psId,
        judul: formData.judul.trim(),
        isi: formData.isi.trim(),
        kategori: formData.kategori,
        tanggal_catatan: formData.tanggal_catatan,
        created_by: user.id,
      }

      if (catatan) {
        // Update existing
        const { error } = await supabase
          .from("ps_catatan")
          .update(catatanData)
          .eq("id", catatan.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from("ps_catatan")
          .insert(catatanData)

        if (error) throw error
      }

      if (onSuccess) {
        onSuccess()
      }

      alert(catatan ? "Catatan berhasil diperbarui!" : "Catatan berhasil ditambahkan!")
    } catch (error: any) {
      console.error("Error saving catatan:", error)
      alert(`Gagal menyimpan catatan: ${error.message || "Silakan coba lagi."}`)
    } finally {
      setIsSubmitting(false)
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
              {catatan ? "Edit Catatan" : "Tambah Catatan"}
            </CardTitle>
            <CardDescription>
              {catatan ? "Ubah catatan lapangan" : "Tambahkan catatan lapangan baru untuk PS ini"}
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
            <Label htmlFor="judul">Judul Catatan *</Label>
            <Input
              id="judul"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
              required
              placeholder="Contoh: Monitoring Bulan Januari"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kategori">Kategori *</Label>
              <Select
                value={formData.kategori}
                onValueChange={(value) => handleSelectChange("kategori", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONITORING">MONITORING</SelectItem>
                  <SelectItem value="EVALUASI">EVALUASI</SelectItem>
                  <SelectItem value="MASALAH">MASALAH</SelectItem>
                  <SelectItem value="PENCAPAIAN">PENCAPAIAN</SelectItem>
                  <SelectItem value="LAINNYA">LAINNYA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_catatan">Tanggal Catatan *</Label>
              <Input
                id="tanggal_catatan"
                name="tanggal_catatan"
                type="date"
                value={formData.tanggal_catatan}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="isi">Isi Catatan *</Label>
            <textarea
              id="isi"
              name="isi"
              value={formData.isi}
              onChange={handleChange}
              required
              rows={8}
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tuliskan catatan lapangan di sini..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Batal
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {catatan ? "Simpan Perubahan" : "Tambah Catatan"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

