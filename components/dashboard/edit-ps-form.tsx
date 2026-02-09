"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { Alert, AlertDescription } from "../ui/alert"
import { Loader2, CheckCircle, XCircle, Save, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"

interface EditPSFormProps {
  psData: any
  kabupatenOptions: Array<{ id: string; nama: string }>
  userRole?: string
  onSuccess?: () => void
  onCancel?: () => void
  isDialog?: boolean
}

const skemaOptions = [
  { value: "HKM", label: "HKm (Hutan Kemasyarakatan)" },
  { value: "HTR", label: "HTR (Hutan Tanaman Rakyat)" },
  { value: "HA", label: "HA (Hutan Adat)" },
  { value: "LPHD", label: "LPHD (Lembaga Pengelola Hutan Desa)" },
]

const statusOptions = [
  { value: "ada", label: "Ada" },
  { value: "belum", label: "Belum" },
]

const jenisHutanOptions = [
  { value: "Mineral", label: "Mineral" },
  { value: "Gambut", label: "Gambut" },
]

export function EditPSForm({ psData, kabupatenOptions, userRole, onSuccess, onCancel, isDialog = false }: EditPSFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    skema: psData?.skema || "HKM",
    pemegang_izin: psData?.pemegang_izin || "",
    desa: psData?.desa || "",
    kecamatan: psData?.kecamatan || "",
    kabupaten_id: psData?.kabupaten_id || "",
    nama_kabupaten: psData?.kabupaten_nama || psData?.kabupaten?.nama || "",
    jumlah_kk: psData?.jumlah_kk || 0,
    luas_ha: psData?.luas_ha || 0,
    jenis_hutan: psData?.jenis_hutan || "Mineral",
    rkps_status: psData?.rkps_status || "belum",
    peta_status: psData?.peta_status || "belum",
    nomor_sk: psData?.nomor_sk || "",
    tanggal_sk: psData?.tanggal_sk ? new Date(psData.tanggal_sk).toISOString().split('T')[0] : "",
    masa_berlaku: psData?.masa_berlaku || "",
    tanggal_berakhir_izin: psData?.tanggal_berakhir_izin ? new Date(psData.tanggal_berakhir_izin).toISOString().split('T')[0] : "",
    nomor_pks: psData?.nomor_pks || "",
    status_kawasan: psData?.status_kawasan || "",
    keterangan: psData?.keterangan || "",
    fasilitator: psData?.fasilitator || "",
  })

  useEffect(() => {
    if (psData) {
      setFormData({
        skema: psData?.skema || "HKM",
        pemegang_izin: psData?.pemegang_izin || "",
        desa: psData?.desa || "",
        kecamatan: psData?.kecamatan || "",
        kabupaten_id: psData?.kabupaten_id || "",
        nama_kabupaten: psData?.kabupaten_nama || psData?.kabupaten?.nama || "",
        jumlah_kk: psData?.jumlah_kk || 0,
        luas_ha: psData?.luas_ha || 0,
        jenis_hutan: psData?.jenis_hutan || "Mineral",
        rkps_status: psData?.rkps_status || "belum",
        peta_status: psData?.peta_status || "belum",
        nomor_sk: psData?.nomor_sk || "",
        tanggal_sk: psData?.tanggal_sk ? new Date(psData.tanggal_sk).toISOString().split('T')[0] : "",
        masa_berlaku: psData?.masa_berlaku || "",
        tanggal_berakhir_izin: psData?.tanggal_berakhir_izin ? new Date(psData.tanggal_berakhir_izin).toISOString().split('T')[0] : "",
        nomor_pks: psData?.nomor_pks || "",
        status_kawasan: psData?.status_kawasan || "",
        keterangan: psData?.keterangan || "",
        fasilitator: psData?.fasilitator || "",
      })
    }
  }, [psData])

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear messages when user starts typing
    if (success || error) {
      setSuccess(null)
      setError(null)
    }
  }

  const handleSelectChange = (field: string, value: string) => {
    if (field === "kabupaten_id") {
      const selectedKab = kabupatenOptions.find(k => k.id === value)
      setFormData(prev => ({
        ...prev,
        kabupaten_id: value,
        nama_kabupaten: selectedKab?.nama || ""
      }))
    } else {
      handleChange(field, value)
    }
    // Clear messages when user starts typing
    if (success || error) {
      setSuccess(null)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(null)
    setError(null)

    // Client-side validation for required fields
    if (!formData.kabupaten_id) {
      setError("Kabupaten wajib dipilih")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Kabupaten wajib dipilih",
        duration: 5000,
      })
      return
    }

    if (!formData.pemegang_izin.trim()) {
      setError("Nama pemegang izin wajib diisi")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Nama pemegang izin wajib diisi",
        duration: 5000,
      })
      return
    }

    try {
      const response = await fetch(`/api/ps/${psData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          jumlah_kk: Number(formData.jumlah_kk),
          luas_ha: Number(formData.luas_ha),
          // Convert empty strings to null for nullable fields (as per API schema)
          nomor_sk: formData.nomor_sk || null,
          tanggal_sk: formData.tanggal_sk || null,
          masa_berlaku: formData.masa_berlaku || null,
          tanggal_berakhir_izin: formData.tanggal_berakhir_izin || null,
          nomor_pks: formData.nomor_pks || null,
          status_kawasan: formData.status_kawasan || null,
          keterangan: formData.keterangan || null,
          fasilitator: formData.fasilitator || null,
          desa: formData.desa || null,
          kecamatan: formData.kecamatan || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Format validation errors for better display
        let errorMessage = result.error || "Failed to update data"
        if (result.details) {
          const formattedErrors = formatZodErrors(result.details)
          errorMessage = `Validasi gagal: ${formattedErrors}`
        }
        throw new Error(errorMessage)
      }

      // Show toast notification
      toast.success("Data berhasil diperbarui!", {
        description: `Data Perhutanan Sosial telah diperbarui`,
        duration: 5000,
      })

      // Trigger refresh
      router.refresh()
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }

      setSuccess("Data berhasil diperbarui!")

    } catch (error: any) {
      const errorMessage = error.message || "Gagal memperbarui data"
      setError(errorMessage)
      toast.error("Gagal memperbarui data", {
        description: errorMessage,
        duration: 5000,
      })
      console.error("Error updating PS data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to format Zod validation errors
  const formatZodErrors = (details: any): string => {
    const messages: string[] = []
    
    // Handle root-level errors
    if (details._errors && Array.isArray(details._errors) && details._errors.length > 0) {
      messages.push(...details._errors)
    }
    
    // Handle field-specific errors
    for (const [field, errorObj] of Object.entries(details)) {
      if (field !== '_errors' && errorObj && typeof errorObj === 'object' && '_errors' in errorObj) {
        const fieldErrors = (errorObj as any)._errors
        if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
          const fieldName = field.replace(/_/g, ' ')
          messages.push(`${fieldName}: ${fieldErrors.join(', ')}`)
        }
      }
    }
    
    return messages.join('; ')
  }

  // Only admin and monev can edit
  const canEdit = userRole === "admin" || userRole === "monev"

  if (!canEdit) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Anda tidak memiliki izin untuk mengedit data. Hanya admin dan monev yang dapat mengedit data.
        </AlertDescription>
      </Alert>
    )
  }

  const formContent = (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informasi Dasar</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skema">Skema PS *</Label>
              <Select value={formData.skema} onValueChange={(value) => handleSelectChange("skema", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Skema" />
                </SelectTrigger>
                <SelectContent>
                  {skemaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pemegang_izin">Nama PS / Pemegang Izin *</Label>
              <Input
                id="pemegang_izin"
                value={formData.pemegang_izin}
                onChange={(e) => handleChange("pemegang_izin", e.target.value)}
                placeholder="Contoh: LPHD HAROWU"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desa">Desa/Kelurahan</Label>
              <Input
                id="desa"
                value={formData.desa}
                onChange={(e) => handleChange("desa", e.target.value)}
                placeholder="Contoh: HAROWU"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kecamatan">Kecamatan</Label>
              <Input
                id="kecamatan"
                value={formData.kecamatan}
                onChange={(e) => handleChange("kecamatan", e.target.value)}
                placeholder="Contoh: MIRI MANASA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kabupaten_id">Kabupaten *</Label>
              <Select value={formData.kabupaten_id} onValueChange={(value) => handleSelectChange("kabupaten_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kabupaten" />
                </SelectTrigger>
                <SelectContent>
                  {kabupatenOptions.map((kab) => (
                    <SelectItem key={kab.id} value={kab.id}>
                      {kab.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jenis_hutan">Jenis Hutan</Label>
              <Select value={formData.jenis_hutan} onValueChange={(value) => handleSelectChange("jenis_hutan", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jenis Hutan" />
                </SelectTrigger>
                <SelectContent>
                  {jenisHutanOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Statistik</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jumlah_kk">Jumlah KK</Label>
              <Input
                id="jumlah_kk"
                type="number"
                min="0"
                value={formData.jumlah_kk}
                onChange={(e) => handleChange("jumlah_kk", e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="luas_ha">Luas (Ha)</Label>
              <Input
                id="luas_ha"
                type="number"
                min="0"
                step="0.01"
                value={formData.luas_ha}
                onChange={(e) => handleChange("luas_ha", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Status Dokumen</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rkps_status">RKPS</Label>
              <Select value={formData.rkps_status} onValueChange={(value) => handleSelectChange("rkps_status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="peta_status">Peta</Label>
              <Select value={formData.peta_status} onValueChange={(value) => handleSelectChange("peta_status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* SK Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Detail Surat Keputusan (Opsional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomor_sk">Nomor SK</Label>
              <Input
                id="nomor_sk"
                value={formData.nomor_sk}
                onChange={(e) => handleChange("nomor_sk", e.target.value)}
                placeholder="Nomor Surat Keputusan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_sk">Tanggal SK</Label>
              <Input
                id="tanggal_sk"
                type="date"
                value={formData.tanggal_sk}
                onChange={(e) => handleChange("tanggal_sk", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="masa_berlaku">Masa Berlaku</Label>
              <Input
                id="masa_berlaku"
                value={formData.masa_berlaku}
                onChange={(e) => handleChange("masa_berlaku", e.target.value)}
                placeholder="Contoh: 35 tahun"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_berakhir_izin">Tanggal Berakhir Izin</Label>
              <Input
                id="tanggal_berakhir_izin"
                type="date"
                value={formData.tanggal_berakhir_izin}
                onChange={(e) => handleChange("tanggal_berakhir_izin", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* PKS Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Detail Perjanjian Kerjasama (Opsional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomor_pks">Nomor PKS</Label>
              <Input
                id="nomor_pks"
                value={formData.nomor_pks}
                onChange={(e) => handleChange("nomor_pks", e.target.value)}
                placeholder="Nomor Perjanjian Kerjasama"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_kawasan">Status Kawasan</Label>
              <Input
                id="status_kawasan"
                value={formData.status_kawasan}
                onChange={(e) => handleChange("status_kawasan", e.target.value)}
                placeholder="Status kawasan"
              />
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informasi Tambahan</h3>
          
          <div className="space-y-2">
            <Label htmlFor="fasilitator">Fasilitator</Label>
            <Input
              id="fasilitator"
              value={formData.fasilitator}
              onChange={(e) => handleChange("fasilitator", e.target.value)}
              placeholder="Nama fasilitator"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={formData.keterangan}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("keterangan", e.target.value)}
              placeholder="Keterangan tambahan..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            <X className="mr-2 h-4 w-4" />
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )

  if (isDialog) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Perhutanan Sosial</DialogTitle>
            <DialogDescription>
              Edit informasi data Perhutanan Sosial. Field yang ditandai dengan (*) wajib diisi.
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  return formContent
}
