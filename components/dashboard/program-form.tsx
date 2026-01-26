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
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ProgramFormProps {
  userRole?: string
  successRedirectUrl?: string
  cancelRedirectUrl?: string
  carbonProjectId?: string
  perhutananSosialId?: string
}

const jenisProgramOptions = [
  { value: "KARBON", label: "Karbon" },
  { value: "PEMBERDAYAAN_EKONOMI", label: "Pemberdayaan Ekonomi" },
  { value: "KAPASITAS", label: "Kapasitas" },
  { value: "LAINNYA", label: "Lainnya" },
]

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Disetujui" },
  { value: "active", label: "Aktif" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
]

const kategoriHutanOptions = [
  { value: "MINERAL", label: "Hutan Mineral" },
  { value: "GAMBUT", label: "Hutan Gambut" },
]

interface MasterAksiMitigasi {
  id: number
  kode: string
  nama_aksi: string
  kelompok: string
  deskripsi: string
}

interface CarbonProject {
  id: string
  kode_project: string
  nama_project: string
}

interface PerhutananSosial {
  id: string
  pemegang_izin: string
  desa: string
}

export function ProgramForm({ 
  userRole, 
  successRedirectUrl, 
  cancelRedirectUrl,
  carbonProjectId,
  perhutananSosialId
}: ProgramFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Data dropdown
  const [aksiMitigasiList, setAksiMitigasiList] = useState<MasterAksiMitigasi[]>([])
  const [carbonProjects, setCarbonProjects] = useState<CarbonProject[]>([])
  const [perhutananSosialList, setPerhutananSosialList] = useState<PerhutananSosial[]>([])

  const [formData, setFormData] = useState({
    kode_program: "",
    nama_program: "",
    jenis_program: "KARBON",
    kategori_hutan: "MINERAL",
    tujuan: "",
    lokasi_spesifik: "",
    target: "",
    risiko: "",
    carbon_project_id: carbonProjectId || "null",
    perhutanan_sosial_id: perhutananSosialId || "",
    status: "draft",
    aksi_mitigasi_ids: [] as number[],
  })

  // Load dropdown data
  useEffect(() => {
    async function loadDropdownData() {
      try {
        setLoadingData(true)
        
        // Load aksi mitigasi
        try {
          const { data: aksiData, error: aksiError } = await supabase
            .from("master_aksi_mitigasi")
            .select("*")
            .order("kode")
          
          if (aksiError) {
            console.error("Error loading master_aksi_mitigasi:", aksiError)
            // If table doesn't exist, set empty array and show warning
            if (aksiError.code === 'PGRST116' || aksiError.message?.includes('does not exist')) {
              setAksiMitigasiList([])
              toast.warning("Tabel aksi mitigasi belum tersedia", {
                description: "Silakan hubungi administrator untuk menjalankan migrasi database.",
                duration: 10000,
              })
            } else {
              setAksiMitigasiList([])
            }
          } else {
            setAksiMitigasiList(aksiData || [])
          }
        } catch (error: any) {
          console.error("Failed to load aksi mitigasi:", error)
          setAksiMitigasiList([])
        }

        // Load carbon projects
        try {
          const { data: carbonData, error: carbonError } = await supabase
            .from("carbon_projects")
            .select("id, kode_project, nama_project")
            .order("nama_project")
          
          if (carbonError) {
            console.error("Error loading carbon projects:", carbonError)
            setCarbonProjects([])
          } else {
            setCarbonProjects(carbonData || [])
          }
        } catch (error) {
          console.error("Failed to load carbon projects:", error)
          setCarbonProjects([])
        }

        // Load perhutanan sosial
        try {
          const { data: psData, error: psError } = await supabase
            .from("perhutanan_sosial")
            .select("id, pemegang_izin, desa")
            .order("pemegang_izin")
          
          if (psError) {
            console.error("Error loading perhutanan sosial:", psError)
            setPerhutananSosialList([])
          } else {
            setPerhutananSosialList(psData || [])
          }
        } catch (error) {
          console.error("Failed to load perhutanan sosial:", error)
          setPerhutananSosialList([])
        }

      } catch (error: any) {
        console.error("Unexpected error in loadDropdownData:", error)
        toast.error("Gagal memuat data", {
          description: error.message || "Terjadi kesalahan tak terduga",
        })
      } finally {
        setLoadingData(false)
      }
    }

    loadDropdownData()
  }, [])

  const handleChange = (field: string, value: string | string[] | number[]) => {
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
  }

  const handleAksiMitigasiChange = (aksiId: number, checked: boolean) => {
    setFormData(prev => {
      const newIds = checked 
        ? [...prev.aksi_mitigasi_ids, aksiId]
        : prev.aksi_mitigasi_ids.filter(id => id !== aksiId)
      return { ...prev, aksi_mitigasi_ids: newIds }
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(null)
    setError(null)

    // Client-side validation
    if (!formData.kode_program.trim()) {
      setError("Kode Program wajib diisi")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Kode Program wajib diisi",
      })
      return
    }

    if (!formData.nama_program.trim()) {
      setError("Nama Program wajib diisi")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Nama Program wajib diisi",
      })
      return
    }

    if (!formData.perhutanan_sosial_id) {
      setError("Perhutanan Sosial wajib dipilih")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Perhutanan Sosial wajib dipilih",
      })
      return
    }

    if (formData.jenis_program === "KARBON" && !formData.kategori_hutan) {
      setError("Kategori Hutan wajib dipilih untuk program Karbon")
      setLoading(false)
      toast.error("Validasi gagal", {
        description: "Kategori Hutan wajib dipilih untuk program Karbon",
      })
      return
    }

      try {
        // Create program
        const programResponse = await fetch("/api/programs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            tujuan: formData.tujuan || null,
            lokasi_spesifik: formData.lokasi_spesifik || null,
            target: formData.target || null,
            risiko: formData.risiko || null,
            carbon_project_id: formData.carbon_project_id === "null" ? null : formData.carbon_project_id,
            logical_framework: null,
          }),
        })

      const programResult = await programResponse.json()

      if (!programResponse.ok) {
        let errorMessage = programResult.error || "Gagal membuat program"
        if (programResult.details) {
          const formattedErrors = formatZodErrors(programResult.details)
          errorMessage = `Validasi gagal: ${formattedErrors}`
        }
        throw new Error(errorMessage)
      }

      // Link aksi mitigasi if any selected
      if (formData.aksi_mitigasi_ids.length > 0) {
        const programId = programResult.data?.id || programResult.id
        
        for (const aksiId of formData.aksi_mitigasi_ids) {
          const linkResponse = await fetch("/api/program-aksi-mitigasi", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              program_id: programId,
              aksi_mitigasi_id: aksiId
            }),
          })

          if (!linkResponse.ok) {
            console.error(`Failed to link aksi mitigasi ${aksiId}`)
          }
        }
      }

      // Show toast notification
      toast.success("Program berhasil dibuat!", {
        description: `Program "${formData.nama_program}" telah disimpan.`,
        duration: 5000,
      })

      // Reset form
      setFormData({
        kode_program: "",
        nama_program: "",
        jenis_program: "KARBON",
        kategori_hutan: "MINERAL",
        tujuan: "",
        lokasi_spesifik: "",
        target: "",
        risiko: "",
        carbon_project_id: carbonProjectId || "null",
        perhutanan_sosial_id: perhutananSosialId || "",
        status: "draft",
        aksi_mitigasi_ids: [],
      })

      // Trigger refresh and redirect
      router.refresh()
      
      setTimeout(() => {
        if (successRedirectUrl) {
          router.push(successRedirectUrl)
        } else {
          router.push("/dashboard/programs")
        }
      }, 2000)

    } catch (error: any) {
      const errorMessage = error.message || "Gagal membuat program"
      setError(errorMessage)
      toast.error("Gagal membuat program", {
        description: errorMessage,
        duration: 5000,
      })
      console.error("Error creating program:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatZodErrors = (details: any): string => {
    const messages: string[] = []
    
    if (details._errors && Array.isArray(details._errors) && details._errors.length > 0) {
      messages.push(...details._errors)
    }
    
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

  // Check if user can manage programs (admin or program_planner)
  const canManage = userRole === "admin" || userRole === "program_planner"

  if (!canManage) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Anda tidak memiliki izin untuk membuat program. Hanya admin dan program planner yang dapat membuat program baru.
        </AlertDescription>
      </Alert>
    )
  }

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Memuat data...</span>
      </div>
    )
  }

  // Group aksi mitigasi by kelompok
  const aksiByKelompok: Record<string, MasterAksiMitigasi[]> = {}
  aksiMitigasiList.forEach(aksi => {
    if (!aksiByKelompok[aksi.kelompok]) {
      aksiByKelompok[aksi.kelompok] = []
    }
    aksiByKelompok[aksi.kelompok].push(aksi)
  })

  const kelompokLabels: Record<string, string> = {
    PERLINDUNGAN_HUTAN: "Perlindungan Hutan (Avoided Emissions)",
    PENINGKATAN_SERAPAN: "Peningkatan Serapan Karbon (Carbon Removal)",
    TATA_KELOLA: "Tata Kelola & Manajemen",
    SOSIAL: "Sosial (Social Safeguard)",
    SERTIFIKASI: "Sertifikasi & Perdagangan Karbon",
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
          <h3 className="text-lg font-medium">Informasi Dasar Program</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kode_program">Kode Program *</Label>
              <Input
                id="kode_program"
                value={formData.kode_program}
                onChange={(e) => handleChange("kode_program", e.target.value)}
                placeholder="Contoh: PRG-001"
                required
              />
              <p className="text-xs text-muted-foreground">Harus unik, format PRG-XXX</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama_program">Nama Program *</Label>
              <Input
                id="nama_program"
                value={formData.nama_program}
                onChange={(e) => handleChange("nama_program", e.target.value)}
                placeholder="Contoh: Program Perlindungan Hutan Desa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jenis_program">Jenis Program *</Label>
              <Select value={formData.jenis_program} onValueChange={(value) => handleSelectChange("jenis_program", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jenis Program" />
                </SelectTrigger>
                <SelectContent>
                  {jenisProgramOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.jenis_program === "KARBON" && (
              <div className="space-y-2">
                <Label htmlFor="kategori_hutan">Kategori Hutan *</Label>
                <Select value={formData.kategori_hutan} onValueChange={(value) => handleSelectChange("kategori_hutan", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori Hutan" />
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriHutanOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tujuan">Tujuan Program</Label>
            <Textarea
              id="tujuan"
              value={formData.tujuan}
              onChange={(e) => handleChange("tujuan", e.target.value)}
              placeholder="Deskripsikan tujuan utama program..."
              rows={3}
            />
          </div>
        </div>

        {/* Program Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Detail Program</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lokasi_spesifik">Lokasi Spesifik</Label>
              <Textarea
                id="lokasi_spesifik"
                value={formData.lokasi_spesifik}
                onChange={(e) => handleChange("lokasi_spesifik", e.target.value)}
                placeholder="Deskripsi lokasi spesifik program..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target Program</Label>
              <Textarea
                id="target"
                value={formData.target}
                onChange={(e) => handleChange("target", e.target.value)}
                placeholder="Target yang ingin dicapai..."
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="risiko">Analisis Risiko</Label>
            <Textarea
              id="risiko"
              value={formData.risiko}
              onChange={(e) => handleChange("risiko", e.target.value)}
              placeholder="Identifikasi risiko yang mungkin dihadapi..."
              rows={3}
            />
          </div>
        </div>

        {/* Aksi Mitigasi Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Aksi Mitigasi</h3>
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Pilih satu atau lebih aksi mitigasi dari daftar berikut. Aksi mitigasi ini akan menjadi dasar untuk pembuatan DRAM nanti.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-6">
            {Object.entries(aksiByKelompok).map(([kelompok, aksiList]) => (
              <div key={kelompok} className="space-y-3">
                <h4 className="font-medium text-base">{kelompokLabels[kelompok] || kelompok}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {aksiList.map(aksi => (
                    <div key={aksi.id} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id={`aksi-${aksi.id}`}
                        checked={formData.aksi_mitigasi_ids.includes(aksi.id)}
                        onChange={(e) => handleAksiMitigasiChange(aksi.id, e.target.checked)}
                        className="mt-1"
                      />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor={`aksi-${aksi.id}`} className="font-medium cursor-pointer">
                          {aksi.kode} - {aksi.nama_aksi}
                        </Label>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {aksi.deskripsi}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project and PS Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Hubungan dengan Proyek & PS</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carbon_project_id">Carbon Project (Opsional)</Label>
              <Select value={formData.carbon_project_id} onValueChange={(value) => handleSelectChange("carbon_project_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Carbon Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">-- Tidak terhubung --</SelectItem>
                  {carbonProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.kode_project} - {project.nama_project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Program dapat dikaitkan dengan carbon project</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perhutanan_sosial_id">Perhutanan Sosial *</Label>
              <Select 
                value={formData.perhutanan_sosial_id} 
                onValueChange={(value) => handleSelectChange("perhutanan_sosial_id", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Perhutanan Sosial" />
                </SelectTrigger>
                <SelectContent>
                  {perhutananSosialList.map(ps => (
                    <SelectItem key={ps.id} value={ps.id}>
                      {ps.pemegang_izin} - {ps.desa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">PS tempat program akan dilaksanakan</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Status Program</h3>
          
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
              <span className="font-semibold">Draft</span> untuk program dalam perencanaan
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => {
            if (cancelRedirectUrl) {
              router.push(cancelRedirectUrl)
            } else {
              router.push("/dashboard/programs")
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
              "Simpan Program"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}