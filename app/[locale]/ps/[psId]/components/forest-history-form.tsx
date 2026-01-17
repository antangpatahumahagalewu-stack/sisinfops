"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"

interface ForestStatusHistory {
  id: string
  perhutanan_sosial_id: string
  year: number
  forest_status: string
  definition_used: string
  area_ha: number | null
  data_source: string | null
  verification_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface ForestHistoryFormProps {
  psId: string
  initialData?: ForestStatusHistory | null
  onSuccess?: () => void
  onCancel?: () => void
}

const FOREST_STATUS_OPTIONS = [
  { value: "FOREST", label: "Hutan" },
  { value: "NON_FOREST", label: "Non-Hutan" },
  { value: "DEGRADED_FOREST", label: "Hutan Terdegradasi" },
  { value: "OTHER", label: "Lainnya" }
]

const DEFINITION_OPTIONS = [
  { value: "UNFCCC_DNA", label: "UNFCCC DNA (Definisi Nasional)" },
  { value: "FAO", label: "FAO" },
  { value: "CUSTOM", label: "Definisi Kustom" }
]

const VERIFICATION_METHOD_OPTIONS = [
  { value: "SATELLITE_IMAGERY", label: "Citra Satelit" },
  { value: "GROUND_TRUTHING", label: "Ground Truthing" },
  { value: "EXPERT_ASSESSMENT", label: "Penilaian Ahli" },
  { value: "GOVERNMENT_DATA", label: "Data Pemerintah" },
  { value: "OTHER", label: "Lainnya" }
]

export function ForestHistoryForm({ psId, initialData, onSuccess, onCancel }: ForestHistoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [formData, setFormData] = useState({
    year: initialData?.year?.toString() || new Date().getFullYear().toString(),
    forest_status: initialData?.forest_status || "FOREST",
    definition_used: initialData?.definition_used || "UNFCCC_DNA",
    area_ha: initialData?.area_ha?.toString() || "",
    data_source: initialData?.data_source || "",
    verification_method: initialData?.verification_method || "SATELLITE_IMAGERY",
    notes: initialData?.notes || ""
  })

  useEffect(() => {
    async function fetchAvailableYears() {
      const supabase = createClient()
      const { data } = await supabase
        .from("forest_status_history")
        .select("year")
        .eq("perhutanan_sosial_id", psId)
      
      if (data) {
        setAvailableYears(data.map(item => item.year))
      }
    }
    fetchAvailableYears()
  }, [psId])

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
        alert("Akses ditolak. Hanya admin dan carbon specialist yang dapat mengedit data riwayat hutan.")
        setIsSubmitting(false)
        return
      }

      const submitData = {
        perhutanan_sosial_id: psId,
        year: parseInt(formData.year),
        forest_status: formData.forest_status,
        definition_used: formData.definition_used,
        area_ha: formData.area_ha ? parseFloat(formData.area_ha) : null,
        data_source: formData.data_source || null,
        verification_method: formData.verification_method || null,
        notes: formData.notes || null
      }

      let result
      if (initialData) {
        // Update existing record
        result = await supabase
          .from("forest_status_history")
          .update(submitData)
          .eq("id", initialData.id)
          .select()
          .single()
      } else {
        // Insert new record
        result = await supabase
          .from("forest_status_history")
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

      alert("Data riwayat status hutan berhasil disimpan!")
    } catch (error: any) {
      console.error("Error saving forest history data:", error)
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

  // Generate year options (current year - 9 to current year)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - (9 - i))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {initialData ? "Edit Riwayat Status Hutan" : "Tambah Riwayat Status Hutan"}
            </CardTitle>
            <CardDescription>
              Isi data riwayat status hutan untuk satu tahun tertentu
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
            {/* Tahun */}
            <div className="space-y-2">
              <Label htmlFor="year">Tahun *</Label>
              <Select
                value={formData.year}
                onValueChange={(value) => handleSelectChange("year", value)}
                disabled={!!initialData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem 
                      key={year} 
                      value={year.toString()}
                      disabled={availableYears.includes(year) && !initialData}
                    >
                      {year} {availableYears.includes(year) && !initialData ? "(sudah ada data)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableYears.includes(parseInt(formData.year)) && !initialData && (
                <p className="text-xs text-red-600">
                  Data untuk tahun ini sudah ada. Pilih tahun lain atau edit data yang sudah ada.
                </p>
              )}
            </div>

            {/* Status Hutan */}
            <div className="space-y-2">
              <Label htmlFor="forest_status">Status Hutan *</Label>
              <Select
                value={formData.forest_status}
                onValueChange={(value) => handleSelectChange("forest_status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status hutan" />
                </SelectTrigger>
                <SelectContent>
                  {FOREST_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Definisi yang Digunakan */}
            <div className="space-y-2">
              <Label htmlFor="definition_used">Definisi Hutan yang Digunakan</Label>
              <Select
                value={formData.definition_used}
                onValueChange={(value) => handleSelectChange("definition_used", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih definisi" />
                </SelectTrigger>
                <SelectContent>
                  {DEFINITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Luas (ha) */}
            <div className="space-y-2">
              <Label htmlFor="area_ha">Luas (hektar)</Label>
              <Input
                id="area_ha"
                name="area_ha"
                type="number"
                step="0.01"
                min="0"
                value={formData.area_ha}
                onChange={handleChange}
                placeholder="Contoh: 500.25"
              />
            </div>

            {/* Sumber Data */}
            <div className="space-y-2">
              <Label htmlFor="data_source">Sumber Data</Label>
              <Input
                id="data_source"
                name="data_source"
                value={formData.data_source}
                onChange={handleChange}
                placeholder="Contoh: Landsat 8, Sentinel-2, data BPS"
              />
            </div>

            {/* Metode Verifikasi */}
            <div className="space-y-2">
              <Label htmlFor="verification_method">Metode Verifikasi</Label>
              <Select
                value={formData.verification_method}
                onValueChange={(value) => handleSelectChange("verification_method", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode verifikasi" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFICATION_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Catatan tambahan terkait data riwayat status hutan"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Batal
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || (availableYears.includes(parseInt(formData.year)) && !initialData)}>
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
