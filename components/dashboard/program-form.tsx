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

interface PriceListItem {
  id: string
  item_code: string
  item_name: string
  item_description: string | null
  unit: string
  unit_price: number
  currency: string
  category: string
  is_active: boolean
}

interface BudgetItem {
  price_list_id: string
  item_code: string
  item_name: string
  quantity: number
  unit: string
  unit_price: number
  total_amount: number
  category?: string
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
    total_budget: 0,
    budget_status: "draft",
    budget_notes: "",
  })

  // Price list and budget items state
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([])
  const [selectedBudgetItems, setSelectedBudgetItems] = useState<BudgetItem[]>([])
  const [selectedPriceItem, setSelectedPriceItem] = useState<PriceListItem | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [loadingPriceList, setLoadingPriceList] = useState(false)

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

        // Load price list items
        await loadPriceListItems()

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

  // Load price list items from API
  const loadPriceListItems = async () => {
    try {
      setLoadingPriceList(true)
      const response = await fetch("/api/price-list?is_active=true&limit=100")
      if (!response.ok) {
        throw new Error("Failed to load price list")
      }
      const data = await response.json()
      setPriceListItems(data.data || [])
    } catch (error: any) {
      console.error("Error loading price list:", error)
      toast.error("Gagal memuat daftar harga", {
        description: error.message || "Silakan coba lagi nanti",
      })
    } finally {
      setLoadingPriceList(false)
    }
  }

  // Add budget item from selected price item
  const addBudgetItem = () => {
    if (!selectedPriceItem || quantity <= 0) {
      toast.error("Pilih item dan masukkan jumlah yang valid")
      return
    }

    const totalAmount = selectedPriceItem.unit_price * quantity
    
    const newItem: BudgetItem = {
      price_list_id: selectedPriceItem.id,
      item_code: selectedPriceItem.item_code,
      item_name: selectedPriceItem.item_name,
      quantity: quantity,
      unit: selectedPriceItem.unit,
      unit_price: selectedPriceItem.unit_price,
      total_amount: totalAmount,
      category: selectedPriceItem.category,
    }

    // Check if item already exists
    const existingIndex = selectedBudgetItems.findIndex(
      item => item.price_list_id === selectedPriceItem.id
    )

    if (existingIndex >= 0) {
      // Update quantity if item already exists
      const updatedItems = [...selectedBudgetItems]
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantity,
        total_amount: updatedItems[existingIndex].total_amount + totalAmount
      }
      setSelectedBudgetItems(updatedItems)
    } else {
      // Add new item
      setSelectedBudgetItems([...selectedBudgetItems, newItem])
    }

    // Update total budget
    const newTotalBudget = selectedBudgetItems.reduce((sum, item) => sum + item.total_amount, 0) + totalAmount
    setFormData(prev => ({ ...prev, total_budget: newTotalBudget }))

    // Reset selection
    setSelectedPriceItem(null)
    setQuantity(1)
    toast.success("Item berhasil ditambahkan ke anggaran")
  }

  // Remove budget item
  const removeBudgetItem = (index: number) => {
    const itemToRemove = selectedBudgetItems[index]
    const newItems = selectedBudgetItems.filter((_, i) => i !== index)
    setSelectedBudgetItems(newItems)
    
    // Update total budget
    const newTotalBudget = Math.max(0, formData.total_budget - itemToRemove.total_amount)
    setFormData(prev => ({ ...prev, total_budget: newTotalBudget }))
    
    toast.success("Item dihapus dari anggaran")
  }

  // Update quantity of existing budget item
  const updateBudgetItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeBudgetItem(index)
      return
    }

    const updatedItems = [...selectedBudgetItems]
    const item = updatedItems[index]
    const oldTotal = item.total_amount
    item.quantity = newQuantity
    item.total_amount = item.unit_price * newQuantity
    updatedItems[index] = item
    
    setSelectedBudgetItems(updatedItems)
    
    // Update total budget
    const newTotalBudget = formData.total_budget - oldTotal + item.total_amount
    setFormData(prev => ({ ...prev, total_budget: newTotalBudget }))
  }

  const handleChange = (field: string, value: string | string[] | number[] | number) => {
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

      // Create program budget and items if there are budget items
      const programId = programResult.data?.id || programResult.id
      if (selectedBudgetItems.length > 0 && programId) {
        try {
          // Create program budget
          const budgetResponse = await fetch("/api/program-budgets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              program_id: programId,
              budget_code: `BUD-${formData.kode_program}-${Date.now().toString().slice(-4)}`,
              budget_name: `Anggaran ${formData.nama_program}`,
              fiscal_year: new Date().getFullYear(),
              total_amount: formData.total_budget,
              currency: "IDR",
              status: formData.budget_status,
              notes: formData.budget_notes || null,
            }),
          })

          if (!budgetResponse.ok) {
            console.error("Failed to create program budget")
            toast.warning("Anggaran program dibuat tanpa rincian item", {
              description: "Gagal membuat anggaran terstruktur, tetapi program berhasil dibuat.",
            })
          } else {
            const budgetResult = await budgetResponse.json()
            const budgetId = budgetResult.data?.id || budgetResult.id
            
            // Create budget items
            if (budgetId) {
              for (const item of selectedBudgetItems) {
                const itemResponse = await fetch("/api/program-budgets", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    program_budget_id: budgetId,
                    price_list_id: item.price_list_id,
                    item_code: item.item_code,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unit_price,
                    category: item.category,
                  }),
                })
                
                if (!itemResponse.ok) {
                  console.error(`Failed to create budget item: ${item.item_code}`)
                }
              }
              
              toast.success("Program dengan anggaran terstruktur berhasil dibuat!", {
                description: `Program "${formData.nama_program}" dengan ${selectedBudgetItems.length} item anggaran telah disimpan.`,
                duration: 5000,
              })
            }
          }
        } catch (budgetError: any) {
          console.error("Error creating budget:", budgetError)
          toast.warning("Program berhasil dibuat tetapi anggaran belum terstruktur", {
            description: "Program tersimpan, namun terjadi kesalahan dalam pembuatan rincian anggaran.",
          })
        }
      } else {
        // Show toast notification for program without budget items
        toast.success("Program berhasil dibuat!", {
          description: `Program "${formData.nama_program}" telah disimpan.`,
          duration: 5000,
        })
      }

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
        total_budget: 0,
        budget_status: "draft",
        budget_notes: "",
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
    <div className="space-y-4">
      {/* Success/Error Messages */}
      {success && (
        <Alert className="bg-green-50 border-green-200 mb-3 p-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            {success}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-3 p-2">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <div className="space-y-3 border-b pb-4">
          <h3 className="text-base font-medium">Informasi Dasar Program</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="kode_program" className="text-sm">Kode Program *</Label>
              <Input
                id="kode_program"
                value={formData.kode_program}
                onChange={(e) => handleChange("kode_program", e.target.value)}
                placeholder="PRG-001"
                required
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Harus unik</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nama_program" className="text-sm">Nama Program *</Label>
              <Input
                id="nama_program"
                value={formData.nama_program}
                onChange={(e) => handleChange("nama_program", e.target.value)}
                placeholder="Program Perlindungan Hutan Desa"
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="jenis_program" className="text-sm">Jenis Program *</Label>
              <Select value={formData.jenis_program} onValueChange={(value) => handleSelectChange("jenis_program", value)}>
                <SelectTrigger className="h-9">
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
              <div className="space-y-1">
                <Label htmlFor="kategori_hutan" className="text-sm">Kategori Hutan *</Label>
                <Select value={formData.kategori_hutan} onValueChange={(value) => handleSelectChange("kategori_hutan", value)}>
                  <SelectTrigger className="h-9">
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

          <div className="space-y-1">
            <Label htmlFor="tujuan" className="text-sm">Tujuan Program</Label>
            <Textarea
              id="tujuan"
              value={formData.tujuan}
              onChange={(e) => handleChange("tujuan", e.target.value)}
              placeholder="Deskripsikan tujuan utama program..."
              rows={2}
              className="min-h-[60px]"
            />
          </div>
        </div>

        {/* Program Details */}
        <div className="space-y-3 border-b pb-4">
          <h3 className="text-base font-medium">Detail Program</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lokasi_spesifik" className="text-sm">Lokasi Spesifik</Label>
              <Textarea
                id="lokasi_spesifik"
                value={formData.lokasi_spesifik}
                onChange={(e) => handleChange("lokasi_spesifik", e.target.value)}
                placeholder="Deskripsi lokasi spesifik program..."
                rows={2}
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="target" className="text-sm">Target Program</Label>
              <Textarea
                id="target"
                value={formData.target}
                onChange={(e) => handleChange("target", e.target.value)}
                placeholder="Target yang ingin dicapai..."
                rows={2}
                className="min-h-[60px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="risiko" className="text-sm">Analisis Risiko</Label>
            <Textarea
              id="risiko"
              value={formData.risiko}
              onChange={(e) => handleChange("risiko", e.target.value)}
              placeholder="Identifikasi risiko yang mungkin dihadapi..."
              rows={2}
              className="min-h-[60px]"
            />
          </div>
        </div>

        {/* Aksi Mitigasi Selection */}
        <div className="space-y-3 border-b pb-4">
          <h3 className="text-base font-medium">Aksi Mitigasi</h3>
          <Alert className="bg-blue-50 border-blue-200 mb-3 p-2">
            <AlertCircle className="h-3 w-3 text-blue-600" />
            <AlertDescription className="text-blue-800 text-xs">
              Pilih satu atau lebih aksi mitigasi dari daftar berikut. Aksi mitigasi ini akan menjadi dasar untuk pembuatan DRAM nanti.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            {Object.entries(aksiByKelompok).map(([kelompok, aksiList]) => (
              <div key={kelompok} className="space-y-2">
                <h4 className="font-medium text-sm">{kelompokLabels[kelompok] || kelompok}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {aksiList.map(aksi => (
                    <div key={aksi.id} className="flex items-start space-x-2 p-2 border rounded hover:bg-muted/30">
                      <input
                        type="checkbox"
                        id={`aksi-${aksi.id}`}
                        checked={formData.aksi_mitigasi_ids.includes(aksi.id)}
                        onChange={(e) => handleAksiMitigasiChange(aksi.id, e.target.checked)}
                        className="mt-1"
                      />
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor={`aksi-${aksi.id}`} className="font-medium cursor-pointer text-sm">
                          {aksi.kode} - {aksi.nama_aksi}
                        </Label>
                        <p className="text-xs text-muted-foreground line-clamp-1">
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
        <div className="space-y-3 border-b pb-4">
          <h3 className="text-base font-medium">Hubungan dengan Proyek & PS</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="carbon_project_id" className="text-sm">Carbon Project (Opsional)</Label>
              <Select value={formData.carbon_project_id} onValueChange={(value) => handleSelectChange("carbon_project_id", value)}>
                <SelectTrigger className="h-9">
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

            <div className="space-y-1">
              <Label htmlFor="perhutanan_sosial_id" className="text-sm">Perhutanan Sosial *</Label>
              <Select 
                value={formData.perhutanan_sosial_id} 
                onValueChange={(value) => handleSelectChange("perhutanan_sosial_id", value)}
                required
              >
                <SelectTrigger className="h-9">
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

        {/* Budget Section */}
        <div className="space-y-3 border-b pb-4">
          <h3 className="text-base font-medium">Informasi Anggaran</h3>
          
          <Alert className="bg-amber-50 border-amber-200 mb-3 p-2">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs">
              Anggaran program akan diajukan ke departemen keuangan untuk persetujuan setelah program dibuat.
            </AlertDescription>
          </Alert>

          {/* Add Budget Items from Price List */}
          <div className="space-y-3 border rounded p-3 bg-muted/20">
            <h4 className="font-medium text-sm">Rincian Item Anggaran</h4>
            <Alert className="bg-blue-50 border-blue-200 mb-2 p-2">
              <AlertCircle className="h-3 w-3 text-blue-600" />
              <AlertDescription className="text-blue-800 text-xs">
                Pilih item dari daftar harga (price list) untuk membuat rincian anggaran program.
              </AlertDescription>
            </Alert>

            {/* Add Item Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="price_item" className="text-sm">Item dari Price List</Label>
                <Select 
                  value={selectedPriceItem?.id || ""} 
                  onValueChange={(value) => {
                    const item = priceListItems.find(p => p.id === value)
                    setSelectedPriceItem(item || null)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pilih item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPriceList ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Memuat daftar harga...
                        </div>
                      </SelectItem>
                    ) : priceListItems.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Tidak ada item tersedia
                      </SelectItem>
                    ) : (
                      priceListItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item_code} - {item.item_name} (Rp {item.unit_price.toLocaleString('id-ID')}/{item.unit})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="quantity" className="text-sm">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                  placeholder="0"
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Harga Satuan</Label>
                <div className="h-9 px-3 py-2 rounded-md border bg-background flex items-center">
                  {selectedPriceItem ? (
                    <span className="text-xs">Rp {selectedPriceItem.unit_price.toLocaleString('id-ID')}/{selectedPriceItem.unit}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              <div className="space-y-1 flex items-end">
                <Button 
                  type="button" 
                  onClick={addBudgetItem}
                  disabled={!selectedPriceItem || quantity <= 0}
                  className="w-full h-9"
                  size="sm"
                >
                  Tambah Item
                </Button>
              </div>
            </div>

            {/* Budget Items List */}
            {selectedBudgetItems.length > 0 && (
              <div className="space-y-2 mt-3">
                <Label className="text-sm">Daftar Item Anggaran</Label>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-1.5 text-left">Kode</th>
                        <th className="p-1.5 text-left">Nama</th>
                        <th className="p-1.5 text-left">Jumlah</th>
                        <th className="p-1.5 text-left">Harga</th>
                        <th className="p-1.5 text-left">Total</th>
                        <th className="p-1.5 text-left">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBudgetItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-1.5">{item.item_code}</td>
                          <td className="p-1.5 truncate max-w-[120px]" title={item.item_name}>{item.item_name}</td>
                          <td className="p-1.5">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateBudgetItemQuantity(index, parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">{item.unit}</span>
                            </div>
                          </td>
                          <td className="p-1.5 text-xs">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                          <td className="p-1.5 font-medium text-xs">Rp {item.total_amount.toLocaleString('id-ID')}</td>
                          <td className="p-1.5">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeBudgetItem(index)}
                              className="h-7 text-xs px-2"
                            >
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-semibold">
                      <tr>
                        <td colSpan={4} className="p-1.5 text-right text-xs">Total Anggaran:</td>
                        <td className="p-1.5 font-bold text-xs">Rp {formData.total_budget.toLocaleString('id-ID')}</td>
                        <td className="p-1.5"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {selectedBudgetItems.length} item • Jumlah anggaran otomatis
                </p>
              </div>
            )}

            {selectedBudgetItems.length === 0 && (
              <div className="text-center py-4 border rounded bg-muted/10">
                <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-muted-foreground text-sm">Belum ada item anggaran. Tambahkan item dari price list di atas.</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="total_budget" className="text-sm">Total Anggaran (IDR) *</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  Rp
                </div>
                <Input
                  id="total_budget"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.total_budget || ""}
                  onChange={(e) => handleChange("total_budget", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-10 h-9"
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground">Jumlah total anggaran program (auto dari item)</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="budget_status" className="text-sm">Status Anggaran</Label>
              <Select value={formData.budget_status} onValueChange={(value) => handleSelectChange("budget_status", value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih Status Anggaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Perencanaan)</SelectItem>
                  <SelectItem value="submitted_for_review">Diajukan untuk Review</SelectItem>
                  <SelectItem value="under_review">Dalam Review</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                  <SelectItem value="needs_revision">Perlu Revisi</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Draft</span> untuk anggaran yang masih dalam perencanaan
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="budget_notes" className="text-sm">Catatan Anggaran (Opsional)</Label>
            <Textarea
              id="budget_notes"
              value={formData.budget_notes}
              onChange={(e) => handleChange("budget_notes", e.target.value)}
              placeholder="Catatan atau penjelasan tambahan mengenai anggaran..."
              rows={2}
              className="min-h-[60px]"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3 border-b pb-4">
          <h3 className="text-base font-medium">Status Program</h3>
          
          <div className="space-y-1">
            <Label htmlFor="status" className="text-sm">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
              <SelectTrigger className="h-9">
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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => {
            if (cancelRedirectUrl) {
              router.push(cancelRedirectUrl)
            } else {
              router.push("/dashboard/programs")
            }
          }} disabled={loading} className="h-9">
            Batal
          </Button>
          <Button type="submit" disabled={loading} className="h-9">
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