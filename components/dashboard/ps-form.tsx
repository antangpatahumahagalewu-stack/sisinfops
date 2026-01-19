"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

interface PSFormProps {
  kabupatenOptions: Array<{ id: string; nama: string }>
  userRole?: string
  successRedirectUrl?: string
  cancelRedirectUrl?: string
}

const skemaOptions = [
  { value: "HD", label: "HD (Hutan Desa)" },
  { value: "HTR", label: "HTR (Hutan Tanaman Rakyat)" },
  { value: "HKM", label: "HKM (Hutan Kemasyarakatan)" },
  { value: "HA", label: "HA (Hutan Adat)" },
  { value: "IUPHHK", label: "IUPHHK (Izin Usaha Pemanfaatan Hasil Hutan Kayu)" },
  { value: "IUPHKm", label: "IUPHKm (Izin Usaha Pemanfaatan Hasil Hutan Bukan Kayu)" },
]

const statusOptions = [
  { value: "ada", label: "Ada" },
  { value: "belum", label: "Belum" },
]

const jenisHutanOptions = [
  { value: "Mineral", label: "Mineral" },
  { value: "Gambut", label: "Gambut" },
]

export function PSForm({ kabupatenOptions, userRole, successRedirectUrl, cancelRedirectUrl }: PSFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    skema: "HD",
    pemegang_izin: "",
    desa: "",
    kecamatan: "",
    kabupaten_id: "",
    nama_kabupaten: "",
    jumlah_kk: 0,
    luas_ha: 0,
    jenis_hutan: "Mineral",
    rkps_status: "belum",
    peta_status: "belum",
    nomor_sk: "",
    tanggal_sk: "",
    masa_berlaku: "",
    tanggal_berakhir_izin: "",
    nomor_pks: "",
    status_kawasan: "",
    keterangan: "",
    fasilitator: "",
  })

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

    try {
      const response = await fetch("/api/ps", {
        method: "POST",
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
        let errorMessage = result.error || "Failed to create data"
        if (result.details) {
          const formattedErrors = formatZodErrors(result.details)
          errorMessage = `Validasi gagal: ${formattedErrors}`
        }
        throw new Error(errorMessage)
      }

      // Show toast notification
      toast.success("Data berhasil ditambahkan!", {
        description: `Data Perhutanan Sosial baru telah disimpan dengan ID: ${result.id}`,
        duration: 5000,
      })

      // Reset form
      setFormData({
        skema: "HD",
        pemegang_izin: "",
        desa: "",
        kecamatan: "",
        kabupaten_id: "",
        nama_kabupaten: "",
        jumlah_kk: 0,
        luas_ha: 0,
        jenis_hutan: "Mineral",
        rkps_status: "belum",
        peta_status: "belum",
        nomor_sk: "",
        tanggal_sk: "",
        masa_berlaku: "",
        tanggal_berakhir_izin: "",
        nomor_pks: "",
        status_kawasan: "",
        keterangan: "",
        fasilitator: "",
      })

      // Trigger refresh and redirect after a short delay
      router.refresh()
      
      // Wait for toast to show, then redirect
      setTimeout(() => {
        if (successRedirectUrl) {
          router.push(successRedirectUrl)
        } else {
          // Default redirect to data page
          router.push("/dashboard/data")
        }
      }, 2000)

    } catch (error: any) {
      const errorMessage = error.message || "Gagal menambahkan data"
      setError(errorMessage)
      toast.error("Gagal menambahkan data", {
        description: errorMessage,
        duration: 5000,
      })
      console.error("Error creating PS data:", error)
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

  // Only admin and monev can create
  const canCreate = userRole === "admin" || userRole === "monev"

  if (!canCreate) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Anda tidak memiliki izin untuk menambahkan data. Hanya admin dan monev yang dapat membuat data baru.
        </AlertDescription>
      </Alert>
    )
  }

  return (
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
          <Button type="button" variant="outline" onClick={() => {
            if (cancelRedirectUrl) {
              router.push(cancelRedirectUrl)
            } else {
              // Default cancel behavior
              router.push("/dashboard/data")
            }
          }} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Data"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
