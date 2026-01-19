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

interface CarbonProjectFormProps {
  userRole?: string
  successRedirectUrl?: string
  cancelRedirectUrl?: string
}

const carbonStandardOptions = [
  { value: "VERRA", label: "VERRA" },
  { value: "GOLD_STANDARD", label: "Gold Standard" },
  { value: "INDONESIA", label: "Standar Indonesia" },
  { value: "OTHER", label: "Lainnya" },
]

const statusOptions = [
  { value: "draft", label: "Draft (Perencanaan)" },
  { value: "approved", label: "Disetujui" },
  { value: "active", label: "Aktif" },
  { value: "suspended", label: "Ditangguhkan" },
  { value: "completed", label: "Selesai" },
  { value: "archived", label: "Diarsipkan" },
]

export function CarbonProjectForm({ userRole, successRedirectUrl, cancelRedirectUrl }: CarbonProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    kode_project: "",
    nama_project: "",
    standar_karbon: "VERRA",
    metodologi: "",
    luas_total_ha: 0,
    estimasi_penyimpanan_karbon: 0,
    tanggal_mulai: "",
    tanggal_selesai: "",
    status: "draft",
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
    handleChange(field, value)
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
    if (!formData.kode_project.trim()) {
      setError("Kode Project wajib diisi")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Kode Project wajib diisi",
        duration: 5000,
      })
      return
    }

    if (!formData.nama_project.trim()) {
      setError("Nama Project wajib diisi")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Nama Project wajib diisi",
        duration: 5000,
      })
      return
    }

    if (formData.tanggal_mulai && formData.tanggal_selesai && formData.tanggal_mulai > formData.tanggal_selesai) {
      setError("Tanggal Mulai harus sebelum Tanggal Selesai")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Tanggal Mulai harus sebelum Tanggal Selesai",
        duration: 5000,
      })
      return
    }

    try {
      const response = await fetch("/api/carbon-projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          luas_total_ha: Number(formData.luas_total_ha) || 0,
          estimasi_penyimpanan_karbon: Number(formData.estimasi_penyimpanan_karbon) || 0,
          metodologi: formData.metodologi || null,
          tanggal_mulai: formData.tanggal_mulai || null,
          tanggal_selesai: formData.tanggal_selesai || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Format validation errors for better display
        let errorMessage = result.error || "Gagal membuat proyek karbon"
        if (result.details) {
          const formattedErrors = formatZodErrors(result.details)
          errorMessage = `Validasi gagal: ${formattedErrors}`
        }
        throw new Error(errorMessage)
      }

      // Show toast notification
      toast.success("Proyek karbon berhasil dibuat!", {
        description: `Proyek "${formData.nama_project}" telah disimpan.`,
        duration: 5000,
      })

      // Reset form
      setFormData({
        kode_project: "",
        nama_project: "",
        standar_karbon: "VERRA",
        metodologi: "",
        luas_total_ha: 0,
        estimasi_penyimpanan_karbon: 0,
        tanggal_mulai: "",
        tanggal_selesai: "",
        status: "draft",
      })

      // Trigger refresh and redirect after a short delay
      router.refresh()
      
      // Wait for toast to show, then redirect
      setTimeout(() => {
        if (successRedirectUrl) {
          router.push(successRedirectUrl)
        } else {
          // Default redirect to carbon projects page
          router.push("/dashboard/carbon-projects")
        }
      }, 2000)

    } catch (error: any) {
      const errorMessage = error.message || "Gagal membuat proyek karbon"
      setError(errorMessage)
      toast.error("Gagal membuat proyek karbon", {
        description: errorMessage,
        duration: 5000,
      })
      console.error("Error creating carbon project:", error)
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

  // Check if user can manage carbon projects (admin or carbon_specialist)
  // This should match the backend RBAC check
  const canManage = userRole === "admin" || userRole === "carbon_specialist"

  if (!canManage) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Anda tidak memiliki izin untuk membuat proyek karbon. Hanya admin dan carbon specialist yang dapat membuat proyek karbon baru.
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
          <h3 className="text-lg font-medium">Informasi Dasar Proyek</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kode_project">Kode Project *</Label>
              <Input
                id="kode_project"
                value={formData.kode_project}
                onChange={(e) => handleChange("kode_project", e.target.value)}
                placeholder="Contoh: CP-001-REDD"
                required
              />
              <p className="text-xs text-muted-foreground">Harus unik, format CP-XXX-YYY</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama_project">Nama Project *</Label>
              <Input
                id="nama_project"
                value={formData.nama_project}
                onChange={(e) => handleChange("nama_project", e.target.value)}
                placeholder="Contoh: REDD+ Hutan Lindung Kapuas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="standar_karbon">Standar Karbon *</Label>
              <Select value={formData.standar_karbon} onValueChange={(value) => handleSelectChange("standar_karbon", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Standar" />
                </SelectTrigger>
                <SelectContent>
                  {carbonStandardOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodologi">Metodologi</Label>
              <Input
                id="metodologi"
                value={formData.metodologi}
                onChange={(e) => handleChange("metodologi", e.target.value)}
                placeholder="Contoh: VM0007 REDD+ Methodology"
              />
            </div>
          </div>
        </div>

        {/* Project Metrics */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Metrik Proyek</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="luas_total_ha">Luas Total (Hektar)</Label>
              <Input
                id="luas_total_ha"
                type="number"
                min="0"
                step="0.01"
                value={formData.luas_total_ha || ""}
                onChange={(e) => handleChange("luas_total_ha", e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Luas area proyek dalam hektar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimasi_penyimpanan_karbon">Estimasi Penyimpanan Karbon (ton CO₂e)</Label>
              <Input
                id="estimasi_penyimpanan_karbon"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimasi_penyimpanan_karbon || ""}
                onChange={(e) => handleChange("estimasi_penyimpanan_karbon", e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Estimasi total penyimpanan karbon</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Timeline Proyek (Opsional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
              <Input
                id="tanggal_mulai"
                type="date"
                value={formData.tanggal_mulai}
                onChange={(e) => handleChange("tanggal_mulai", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
              <Input
                id="tanggal_selesai"
                type="date"
                value={formData.tanggal_selesai}
                onChange={(e) => handleChange("tanggal_selesai", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Status Proyek</h3>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
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
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Draft</span> untuk proyek dalam perencanaan, <span className="font-semibold">Active</span> untuk proyek berjalan
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => {
            if (cancelRedirectUrl) {
              router.push(cancelRedirectUrl)
            } else {
              // Default cancel behavior
              router.push("/dashboard/carbon-projects")
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
              "Simpan Proyek"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
