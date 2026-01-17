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

interface DeforestationDriver {
  id: string
  perhutanan_sosial_id: string
  driver_type: string
  driver_description: string
  historical_trend: string | null
  intervention_activity: string
  intervention_rationale: string | null
  expected_impact: string | null
  data_source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface DeforestationDriversFormProps {
  psId: string
  initialData?: DeforestationDriver | null
  onSuccess?: () => void
  onCancel?: () => void
}

const DRIVER_TYPE_OPTIONS = [
  { value: "AGRICULTURAL_EXPANSION", label: "Ekspansi Pertanian" },
  { value: "LOGGING", label: "Penebangan Liar" },
  { value: "INFRASTRUCTURE", label: "Pembangunan Infrastruktur" },
  { value: "MINING", label: "Pertambangan" },
  { value: "FIRE", label: "Kebakaran" },
  { value: "OTHER", label: "Lainnya" }
]

const HISTORICAL_TREND_OPTIONS = [
  { value: "INCREASING", label: "Meningkat" },
  { value: "DECREASING", label: "Menurun" },
  { value: "STABLE", label: "Stabil" },
  { value: "FLUCTUATING", label: "Fluktuatif" }
]

export function DeforestationDriversForm({ psId, initialData, onSuccess, onCancel }: DeforestationDriversFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    driver_type: initialData?.driver_type || "AGRICULTURAL_EXPANSION",
    driver_description: initialData?.driver_description || "",
    historical_trend: initialData?.historical_trend || "",
    intervention_activity: initialData?.intervention_activity || "",
    intervention_rationale: initialData?.intervention_rationale || "",
    expected_impact: initialData?.expected_impact || "",
    data_source: initialData?.data_source || "",
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
        alert("Akses ditolak. Hanya admin dan carbon specialist yang dapat mengedit data penyebab deforestasi.")
        setIsSubmitting(false)
        return
      }

      const submitData = {
        perhutanan_sosial_id: psId,
        driver_type: formData.driver_type,
        driver_description: formData.driver_description,
        historical_trend: formData.historical_trend || null,
        intervention_activity: formData.intervention_activity,
        intervention_rationale: formData.intervention_rationale || null,
        expected_impact: formData.expected_impact || null,
        data_source: formData.data_source || null,
        notes: formData.notes || null
      }

      let result
      if (initialData) {
        // Update existing record
        result = await supabase
          .from("deforestation_drivers")
          .update(submitData)
          .eq("id", initialData.id)
          .select()
          .single()
      } else {
        // Insert new record
        result = await supabase
          .from("deforestation_drivers")
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

      alert("Data penyebab deforestasi berhasil disimpan!")
    } catch (error: any) {
      console.error("Error saving deforestation driver data:", error)
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
              {initialData ? "Edit Analisis Penyebab Perubahan" : "Tambah Analisis Penyebab Perubahan"}
            </CardTitle>
            <CardDescription>
              Isi analisis penyebab degradasi/deforestasi dan rencana intervensi
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
            {/* Tipe Penyebab */}
            <div className="space-y-2">
              <Label htmlFor="driver_type">Tipe Penyebab *</Label>
              <Select
                value={formData.driver_type}
                onValueChange={(value) => handleSelectChange("driver_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe penyebab" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tren Historis */}
            <div className="space-y-2">
              <Label htmlFor="historical_trend">Tren Historis</Label>
              <Select
                value={formData.historical_trend}
                onValueChange={(value) => handleSelectChange("historical_trend", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tren historis" />
                </SelectTrigger>
                <SelectContent>
                  {HISTORICAL_TREND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sumber Data */}
            <div className="space-y-2">
              <Label htmlFor="data_source">Sumber Data</Label>
              <Input
                id="data_source"
                name="data_source"
                value={formData.data_source}
                onChange={handleChange}
                placeholder="Contoh: Data satelit, laporan pemerintah, studi lapangan"
              />
            </div>
          </div>

          {/* Deskripsi Penyebab */}
          <div className="space-y-2">
            <Label htmlFor="driver_description">Deskripsi Penyebab *</Label>
            <Textarea
              id="driver_description"
              name="driver_description"
              value={formData.driver_description}
              onChange={handleChange}
              placeholder="Jelaskan secara rinci penyebab degradasi/deforestasi"
              rows={3}
            />
          </div>

          {/* Aktivitas Intervensi */}
          <div className="space-y-2">
            <Label htmlFor="intervention_activity">Aktivitas Intervensi *</Label>
            <Textarea
              id="intervention_activity"
              name="intervention_activity"
              value={formData.intervention_activity}
              onChange={handleChange}
              placeholder="Jelaskan aktivitas yang akan dilakukan untuk mengatasi penyebab ini"
              rows={3}
            />
          </div>

          {/* Alasan Intervensi */}
          <div className="space-y-2">
            <Label htmlFor="intervention_rationale">Alasan Intervensi</Label>
            <Textarea
              id="intervention_rationale"
              name="intervention_rationale"
              value={formData.intervention_rationale}
              onChange={handleChange}
              placeholder="Jelaskan alasan teknis mengapa intervensi ini relevan"
              rows={3}
            />
          </div>

          {/* Dampak yang Diharapkan */}
          <div className="space-y-2">
            <Label htmlFor="expected_impact">Dampak yang Diharapkan</Label>
            <Textarea
              id="expected_impact"
              name="expected_impact"
              value={formData.expected_impact}
              onChange={handleChange}
              placeholder="Jelaskan dampak yang diharapkan dari intervensi ini"
              rows={3}
            />
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Catatan tambahan terkait analisis ini"
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
                  Simpan Analisis
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
