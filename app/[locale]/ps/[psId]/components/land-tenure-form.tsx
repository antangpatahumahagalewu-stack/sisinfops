"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"

interface LandTenure {
  id: string
  perhutanan_sosial_id: string
  ownership_status: string
  land_certificate_number: string | null
  certificate_date: string | null
  area_ha: number | null
  challenges: string | null
  government_involvement: string | null
  ministry_engagement: string | null
  conflict_history: string | null
  resolution_status: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface LandTenureFormProps {
  psId: string
  initialData: LandTenure | null
  onSuccess?: () => void
  onCancel?: () => void
}

const OWNERSHIP_STATUS_OPTIONS = [
  { value: "PRIVATE", label: "Privat" },
  { value: "PUBLIC", label: "Publik" },
  { value: "COMMUNAL", label: "Komunal" },
  { value: "MIXED", label: "Campuran" }
]

const RESOLUTION_STATUS_OPTIONS = [
  { value: "NONE", label: "Tidak Ada" },
  { value: "RESOLVED", label: "Terselesaikan" },
  { value: "ONGOING", label: "Berlangsung" },
  { value: "PENDING", label: "Menunggu" }
]

export function LandTenureForm({ psId, initialData, onSuccess, onCancel }: LandTenureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    ownership_status: initialData?.ownership_status || "COMMUNAL",
    land_certificate_number: initialData?.land_certificate_number || "",
    certificate_date: initialData?.certificate_date ? new Date(initialData.certificate_date).toISOString().split('T')[0] : "",
    area_ha: initialData?.area_ha?.toString() || "",
    challenges: initialData?.challenges || "",
    government_involvement: initialData?.government_involvement || "",
    ministry_engagement: initialData?.ministry_engagement || "",
    conflict_history: initialData?.conflict_history || "",
    resolution_status: initialData?.resolution_status || "NONE",
    notes: initialData?.notes || ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Check user role - allow admin and carbon_specialist
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

      if (!profile || (profile.role !== "admin" && profile.role !== "carbon_specialist")) {
        alert("Akses ditolak. Hanya admin dan carbon specialist yang dapat mengedit data lahan.")
        setIsSubmitting(false)
        return
      }

      const submitData = {
        perhutanan_sosial_id: psId,
        ownership_status: formData.ownership_status,
        land_certificate_number: formData.land_certificate_number || null,
        certificate_date: formData.certificate_date || null,
        area_ha: formData.area_ha ? parseFloat(formData.area_ha) : null,
        challenges: formData.challenges || null,
        government_involvement: formData.government_involvement || null,
        ministry_engagement: formData.ministry_engagement || null,
        conflict_history: formData.conflict_history || null,
        resolution_status: formData.resolution_status,
        notes: formData.notes || null
      }

      let result
      if (initialData) {
        // Update existing record
        result = await supabase
          .from("land_tenure")
          .update(submitData)
          .eq("id", initialData.id)
          .select()
          .single()
      } else {
        // Insert new record
        result = await supabase
          .from("land_tenure")
          .insert(submitData)
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      if (onSuccess) {
        onSuccess()
      }

      alert("Data kepemilikan lahan berhasil disimpan!")
    } catch (error: any) {
      console.error("Error saving land tenure data:", error)
      alert(`Gagal menyimpan data: ${error.message}`)
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
            <CardTitle>
              {initialData ? "Edit Kepemilikan Lahan" : "Tambah Kepemilikan Lahan"}
            </CardTitle>
            <CardDescription>
              Isi informasi kepemilikan dan tenure lahan proyek
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Kepemilikan */}
            <div className="space-y-2">
              <Label htmlFor="ownership_status">Status Kepemilikan *</Label>
              <Select
                value={formData.ownership_status}
                onValueChange={(value) => handleSelectChange("ownership_status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status kepemilikan" />
                </SelectTrigger>
                <SelectContent>
                  {OWNERSHIP_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Luas Lahan */}
            <div className="space-y-2">
              <Label htmlFor="area_ha">Luas Lahan (hektar)</Label>
              <Input
                id="area_ha"
                name="area_ha"
                type="number"
                step="0.01"
                min="0"
                value={formData.area_ha}
                onChange={handleChange}
                placeholder="Contoh: 100.50"
              />
            </div>

            {/* Nomor Sertifikat */}
            <div className="space-y-2">
              <Label htmlFor="land_certificate_number">Nomor Sertifikat</Label>
              <Input
                id="land_certificate_number"
                name="land_certificate_number"
                value={formData.land_certificate_number}
                onChange={handleChange}
                placeholder="Nomor sertifikat tanah"
              />
            </div>

            {/* Tanggal Sertifikat */}
            <div className="space-y-2">
              <Label htmlFor="certificate_date">Tanggal Sertifikat</Label>
              <Input
                id="certificate_date"
                name="certificate_date"
                type="date"
                value={formData.certificate_date}
                onChange={handleChange}
              />
            </div>

            {/* Keterlibatan Pemerintah */}
            <div className="space-y-2">
              <Label htmlFor="government_involvement">Keterlibatan Pemerintah</Label>
              <Textarea
                id="government_involvement"
                name="government_involvement"
                value={formData.government_involvement}
                onChange={handleChange}
                placeholder="Deskripsi keterlibatan pemerintah dalam kepemilikan lahan"
                rows={3}
              />
            </div>

            {/* Keterlibatan Kementerian */}
            <div className="space-y-2">
              <Label htmlFor="ministry_engagement">Keterlibatan Kementerian</Label>
              <Textarea
                id="ministry_engagement"
                name="ministry_engagement"
                value={formData.ministry_engagement}
                onChange={handleChange}
                placeholder="Deskripsi keterlibatan kementerian terkait"
                rows={3}
              />
            </div>
          </div>

          {/* Tantangan Kepastian Lahan */}
          <div className="space-y-2">
            <Label htmlFor="challenges">Tantangan Kepastian Lahan</Label>
            <Textarea
              id="challenges"
              name="challenges"
              value={formData.challenges}
              onChange={handleChange}
              placeholder="Jelaskan tantangan terkait kepastian lahan"
              rows={3}
            />
          </div>

          {/* Riwayat Konflik */}
          <div className="space-y-2">
            <Label htmlFor="conflict_history">Riwayat Konflik</Label>
            <Textarea
              id="conflict_history"
              name="conflict_history"
              value={formData.conflict_history}
              onChange={handleChange}
              placeholder="Jelaskan riwayat konflik lahan jika ada"
              rows={3}
            />
          </div>

          {/* Status Resolusi Konflik */}
          <div className="space-y-2">
            <Label htmlFor="resolution_status">Status Resolusi Konflik</Label>
            <Select
              value={formData.resolution_status}
              onValueChange={(value) => handleSelectChange("resolution_status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih status resolusi" />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan Tambahan</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Catatan lain terkait kepemilikan lahan"
              rows={3}
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
                  Simpan Data
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
