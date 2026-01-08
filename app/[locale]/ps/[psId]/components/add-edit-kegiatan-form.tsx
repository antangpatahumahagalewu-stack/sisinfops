"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X, Calendar } from "lucide-react"

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

interface AddEditKegiatanFormProps {
  kegiatan: Kegiatan | null
  psId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddEditKegiatanForm({ kegiatan, psId, onSuccess, onCancel }: AddEditKegiatanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nama_kegiatan: kegiatan?.nama_kegiatan || "",
    jenis_kegiatan: kegiatan?.jenis_kegiatan || "",
    tanggal_mulai: kegiatan?.tanggal_mulai || "",
    tanggal_selesai: kegiatan?.tanggal_selesai || "",
    lokasi: kegiatan?.lokasi || "",
    deskripsi: kegiatan?.deskripsi || "",
    status: kegiatan?.status || "RENCANA",
    anggaran: kegiatan?.anggaran?.toString() || "",
    latitude: kegiatan?.latitude?.toString() || "",
    longitude: kegiatan?.longitude?.toString() || "",
  })
  const [dateError, setDateError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setDateError(null)

    try {
      // Validate dates
      if (formData.tanggal_mulai && formData.tanggal_selesai) {
        const mulai = new Date(formData.tanggal_mulai)
        const selesai = new Date(formData.tanggal_selesai)
        if (selesai < mulai) {
          setDateError("Tanggal selesai harus setelah atau sama dengan tanggal mulai")
          setIsSubmitting(false)
          return
        }
      }

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
      const kegiatanData = {
        perhutanan_sosial_id: psId,
        nama_kegiatan: formData.nama_kegiatan.trim(),
        jenis_kegiatan: formData.jenis_kegiatan.trim() || null,
        tanggal_mulai: formData.tanggal_mulai || null,
        tanggal_selesai: formData.tanggal_selesai || null,
        lokasi: formData.lokasi.trim() || null,
        deskripsi: formData.deskripsi.trim() || null,
        status: formData.status,
        anggaran: formData.anggaran ? parseFloat(formData.anggaran) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        created_by: user.id,
      }

      if (kegiatan) {
        // Update existing
        const { error } = await supabase
          .from("ps_kegiatan")
          .update(kegiatanData)
          .eq("id", kegiatan.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from("ps_kegiatan")
          .insert(kegiatanData)

        if (error) throw error
      }

      if (onSuccess) {
        onSuccess()
      }

      alert(kegiatan ? "Kegiatan berhasil diperbarui!" : "Kegiatan berhasil ditambahkan!")
    } catch (error: any) {
      console.error("Error saving kegiatan:", error)
      alert(`Gagal menyimpan kegiatan: ${error.message || "Silakan coba lagi."}`)
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
    // Clear date error when dates change
    if (name === 'tanggal_mulai' || name === 'tanggal_selesai') {
      setDateError(null)
    }
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
              <Calendar className="h-5 w-5" />
              {kegiatan ? "Edit Kegiatan" : "Tambah Kegiatan"}
            </CardTitle>
            <CardDescription>
              {kegiatan ? "Ubah informasi kegiatan" : "Tambahkan kegiatan baru untuk PS ini"}
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
            <Label htmlFor="nama_kegiatan">Nama Kegiatan *</Label>
            <Input
              id="nama_kegiatan"
              name="nama_kegiatan"
              value={formData.nama_kegiatan}
              onChange={handleChange}
              required
              placeholder="Contoh: Penanaman Bibit"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jenis_kegiatan">Jenis Kegiatan</Label>
              <Input
                id="jenis_kegiatan"
                name="jenis_kegiatan"
                value={formData.jenis_kegiatan}
                onChange={handleChange}
                placeholder="Contoh: Rehabilitasi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RENCANA">RENCANA</SelectItem>
                  <SelectItem value="BERLANGSUNG">BERLANGSUNG</SelectItem>
                  <SelectItem value="SELESAI">SELESAI</SelectItem>
                  <SelectItem value="DITUNDA">DITUNDA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
              <Input
                id="tanggal_mulai"
                name="tanggal_mulai"
                type="date"
                value={formData.tanggal_mulai}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
              <Input
                id="tanggal_selesai"
                name="tanggal_selesai"
                type="date"
                value={formData.tanggal_selesai}
                onChange={handleChange}
                min={formData.tanggal_mulai || undefined}
              />
              {dateError && (
                <p className="text-sm text-red-600">{dateError}</p>
              )}
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="0.00000001"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="Contoh: -6.12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="0.00000001"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="Contoh: 106.12345678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anggaran">Anggaran (Rp)</Label>
            <Input
              id="anggaran"
              name="anggaran"
              type="number"
              value={formData.anggaran}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <textarea
              id="deskripsi"
              name="deskripsi"
              value={formData.deskripsi}
              onChange={handleChange}
              rows={4}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Deskripsi kegiatan..."
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
                  {kegiatan ? "Simpan Perubahan" : "Tambah Kegiatan"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

