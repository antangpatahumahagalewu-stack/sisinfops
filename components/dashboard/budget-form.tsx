"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Wallet } from "lucide-react"

interface BudgetFormProps {
  userRole?: string
  successRedirectUrl?: string
  cancelRedirectUrl?: string
  locale?: string
}

interface CarbonProject {
  id: string
  project_name: string
  project_code: string
}

const budgetTypeOptions = [
  { value: "operational", label: "Operasional Kantor" },
  { value: "project", label: "Proyek Karbon" },
  { value: "program", label: "Program Sosial" },
  { value: "capital", label: "Modal & Investasi" },
]

const statusOptions = [
  { value: "draft", label: "Draft (Perencanaan)" },
  { value: "active", label: "Aktif" },
  { value: "closed", label: "Ditutup" },
]

const fiscalYearOptions = Array.from({ length: 11 }, (_, i) => {
  const year = new Date().getFullYear() - 5 + i
  return { value: year.toString(), label: year.toString() }
})

export function BudgetForm({ userRole, successRedirectUrl, cancelRedirectUrl, locale = "id" }: BudgetFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [carbonProjects, setCarbonProjects] = useState<CarbonProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [formData, setFormData] = useState({
    budget_code: "",
    budget_name: "",
    budget_type: "operational" as const,
    project_id: "none",
    fiscal_year: new Date().getFullYear(),
    total_amount: 0,
    description: "",
    notes: "",
  })

  // Fetch carbon projects for dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true)
      try {
        const response = await fetch("/api/carbon-projects?limit=100")
        if (response.ok) {
          const data = await response.json()
          setCarbonProjects(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching carbon projects:", error)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchProjects()
  }, [])

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

  const handleSelectChange = (field: string, value: string | number) => {
    handleChange(field, value)
    // Clear messages when user starts typing
    if (success || error) {
      setSuccess(null)
      setError(null)
    }
  }

  const handleTextareaChange = (field: string, value: string) => {
    handleChange(field, value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(null)
    setError(null)

    // Client-side validation for required fields
    if (!formData.budget_code.trim()) {
      setError("Kode Anggaran wajib diisi")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Kode Anggaran wajib diisi",
        duration: 5000,
      })
      return
    }

    if (!formData.budget_name.trim()) {
      setError("Nama Anggaran wajib diisi")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Nama Anggaran wajib diisi",
        duration: 5000,
      })
      return
    }

    if (formData.total_amount <= 0) {
      setError("Jumlah total anggaran harus lebih dari 0")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Jumlah total anggaran harus lebih dari 0",
        duration: 5000,
      })
      return
    }

    try {
      const response = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          project_id: formData.project_id === "none" ? null : formData.project_id,
          description: formData.description || null,
          notes: formData.notes || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Format validation errors for better display
        let errorMessage = result.error || "Gagal membuat anggaran"
        if (result.details) {
          const formattedErrors = formatZodErrors(result.details)
          errorMessage = `Validasi gagal: ${formattedErrors}`
        }
        throw new Error(errorMessage)
      }

      // Show toast notification
      toast.success("Anggaran berhasil dibuat!", {
        description: `Anggaran "${formData.budget_name}" telah disimpan.`,
        duration: 5000,
      })

      // Reset form
      setFormData({
        budget_code: "",
        budget_name: "",
        budget_type: "operational",
        project_id: "none",
        fiscal_year: new Date().getFullYear(),
        total_amount: 0,
        description: "",
        notes: "",
      })

      // Trigger refresh and redirect after a short delay
      router.refresh()
      
      // Wait for toast to show, then redirect
      setTimeout(() => {
        if (successRedirectUrl) {
          router.push(successRedirectUrl)
        } else {
          // Default redirect to budgets page
          router.push(`/${locale}/dashboard/finance/budgets`)
        }
      }, 2000)

    } catch (error: any) {
      const errorMessage = error.message || "Gagal membuat anggaran"
      setError(errorMessage)
      toast.error("Gagal membuat anggaran", {
        description: errorMessage,
        duration: 5000,
      })
      console.error("Error creating budget:", error)
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

  // Check if user can manage budgets (admin or finance roles)
  // This should match the backend RBAC check
  const canManage = userRole && (
    userRole === "admin" || 
    userRole.startsWith("finance_") || 
    userRole === "finance_manager"
  )

  if (!canManage) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Anda tidak memiliki izin untuk membuat anggaran. Hanya admin dan roles keuangan yang dapat membuat anggaran baru.
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
          <h3 className="text-lg font-medium">Informasi Dasar Anggaran</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_code">Kode Anggaran *</Label>
              <Input
                id="budget_code"
                value={formData.budget_code}
                onChange={(e) => handleChange("budget_code", e.target.value)}
                placeholder="Contoh: BGT-2025-001"
                required
              />
              <p className="text-xs text-muted-foreground">Harus unik, format BGT-YYYY-XXX</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_name">Nama Anggaran *</Label>
              <Input
                id="budget_name"
                value={formData.budget_name}
                onChange={(e) => handleChange("budget_name", e.target.value)}
                placeholder="Contoh: Anggaran Operasional Kantor 2025"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_type">Tipe Anggaran *</Label>
              <Select value={formData.budget_type} onValueChange={(value) => handleSelectChange("budget_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tipe Anggaran" />
                </SelectTrigger>
                <SelectContent>
                  {budgetTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscal_year">Tahun Fiskal *</Label>
              <Select 
                value={formData.fiscal_year.toString()} 
                onValueChange={(value) => handleSelectChange("fiscal_year", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Project Association */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Asosiasi Proyek (Opsional)</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Proyek Karbon Terkait</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={(value) => handleSelectChange("project_id", value)}
                disabled={loadingProjects}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProjects ? "Memuat proyek..." : "Pilih proyek (opsional)"} />
                </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="none">Tidak terkait proyek</SelectItem>
                  {carbonProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_code} - {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pilih proyek karbon jika anggaran ini khusus untuk proyek tertentu
              </p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Jumlah Anggaran</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Jumlah Total (IDR) *</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  Rp
                </div>
                <Input
                  id="total_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.total_amount || ""}
                  onChange={(e) => handleChange("total_amount", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Jumlah total anggaran dalam Rupiah</p>
            </div>
          </div>
        </div>

        {/* Description & Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Deskripsi & Catatan</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi Anggaran</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleTextareaChange("description", e.target.value)}
                placeholder="Deskripsi tujuan dan penggunaan anggaran..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Tambahan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleTextareaChange("notes", e.target.value)}
                placeholder="Catatan internal atau informasi tambahan..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => {
            if (cancelRedirectUrl) {
              router.push(cancelRedirectUrl)
            } else {
              // Default cancel behavior
              router.push(`/${locale}/dashboard/finance/budgets`)
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
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Simpan Anggaran
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}