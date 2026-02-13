"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle,
  Tag,
  Calendar,
  DollarSign,
  Package,
  RefreshCw,
  X
} from "lucide-react"

interface PriceListItem {
  id: string
  item_code: string
  item_name: string
  item_description: string | null
  category: string
  unit: string
  unit_price: number
  currency: string
  valid_from: string | null
  valid_until: string | null
  version?: number
  is_active: boolean
  approval_status?: string
  created_by?: string
  created_at: string
  updated_at?: string
  profiles?: { full_name: string }
  approved_by?: { full_name: string }
}

interface PaginationData {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface PriceListPageClientProps {
  initialData: PriceListItem[]
  initialPagination: PaginationData
  canManage: boolean
  locale: string
}

// Updated categories based on actual database values from check_price_list.js
// From test output: Found 26 unique categories
const CATEGORIES = [
  "MATERIAL",
  "adaptasi_iklim",
  "akomodasi_konsumsi", 
  "benefit_tambahan",
  "dokumentasi_pelaporan",
  "gaji_staff",
  "honorarium_tenaga_ahli",
  "infrastruktur",
  "insentif_masyarakat",
  "jasa_konsultasi",
  "jasa_pelatihan",
  "manajemen_proyek",
  "material_tanaman",
  "mitigasi_kebakaran",
  "pemasaran",
  "pemeliharaan",
  "pengelolaan_air",
  "pengendalian_hama",
  "pengurangan_emisi",
  "peralatan_monitoring",
  "restorasi_ekosistem",
  "sertifikasi_verifikasi",
  "survei_penelitian",
  "teknologi_software",
  "transport_logistik",
  "tunjangan_operasional"
]

const APPROVAL_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED"
]

export default function PriceListPageClient({ initialData, initialPagination, canManage, locale }: PriceListPageClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<PriceListItem[]>(initialData)
  const [filteredItems, setFilteredItems] = useState<PriceListItem[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [openDialog, setOpenDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    visible: boolean
  }>({ type: 'info', message: '', visible: false })
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationData>(initialPagination)
  const [fetchingData, setFetchingData] = useState(false)
  const [pageSizeOptions] = useState([10, 25, 50, 100])

  // Form state - menggunakan hanya kolom yang ada di database
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    item_description: "",
    category: "material",
    unit: "",
    unit_price: 0,
    currency: "IDR",
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: "",
    is_active: true
  })

  // Function to fetch data with pagination and filters
  // Initialize with initialData
  useEffect(() => {
    if (initialData.length > 0 && items.length === 0) {
      console.log(`✅ Using initial data: ${initialData.length} items`)
      setItems(initialData)
      // Set pagination based on initial data
      setPagination({
        page: 1,
        pageSize: 25, // Default pageSize from server
        total: initialPagination.total,
        totalPages: initialPagination.totalPages,
        hasNextPage: initialPagination.hasNextPage,
        hasPrevPage: false
      })
    }
  }, [initialData, initialPagination])

  const fetchData = async (page: number = pagination.page, pageSize: number = pagination.pageSize) => {
    setFetchingData(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('pageSize', pageSize.toString())
      
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (activeFilter !== 'all') params.append('is_active', activeFilter === 'active' ? 'true' : 'false')
      if (statusFilter !== 'all') params.append('approval_status', statusFilter)

      const response = await fetch(`/api/finance/price-list?${params.toString()}`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.status === 401) {
        console.warn("⚠️  API authentication failed (401), continuing with current data")
        // Don't redirect, just log the error and continue with existing data
        if (items.length === 0 && initialData.length > 0) {
          console.log("⚠️  Using initial data due to API auth failure")
          setItems(initialData)
        }
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setItems(data.data || [])
        setPagination(data.pagination || {
          page,
          pageSize,
          total: data.data?.length || 0,
          totalPages: Math.ceil((data.data?.length || 0) / pageSize),
          hasNextPage: false,
          hasPrevPage: false
        })
        console.log(`✅ API fetched ${data.data?.length || 0} items (page ${page}, total: ${data.pagination?.total || data.data?.length || 0})`)
      } else {
        const errorText = await response.text()
        console.error("❌ API failed:", errorText)
        
        // Fallback: use existing data or initial data
        if (items.length === 0 && initialData.length > 0) {
          console.log("⚠️  Using initial data as fallback")
          setItems(initialData)
        }
      }
    } catch (error) {
      console.error("❌ Network error:", error)
      
      // Fallback on network error
      if (items.length === 0 && initialData.length > 0) {
        console.log("⚠️  Network error, using initial data")
        setItems(initialData)
      }
    } finally {
      setFetchingData(false)
    }
  }

  // Fetch data when pagination or filters change (but not on first load)
  useEffect(() => {
    // Only fetch via API if not on page 1 with initial data
    // OR if filters have changed
    const hasFiltersChanged = searchTerm || categoryFilter !== 'all' || 
                              activeFilter !== 'all' || statusFilter !== 'all'
    
    if (pagination.page !== 1 || hasFiltersChanged) {
      console.log(`🔄 Fetching data: page=${pagination.page}, filters=${hasFiltersChanged}`)
      fetchData(pagination.page, pagination.pageSize)
    }
  }, [searchTerm, categoryFilter, activeFilter, statusFilter, pagination.page])

  // Filter items for client-side search within current page
  useEffect(() => {
    let result = items
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item => 
        item.item_code.toLowerCase().includes(term) ||
        item.item_name.toLowerCase().includes(term) ||
        item.item_description?.toLowerCase().includes(term)
      )
    }
    
    if (categoryFilter !== "all") {
      result = result.filter(item => item.category === categoryFilter)
    }
    
    if (statusFilter !== "all") {
      result = result.filter(item => item.approval_status === statusFilter)
    }
    
    if (activeFilter !== "all") {
      const isActive = activeFilter === "active"
      result = result.filter(item => item.is_active === isActive)
    }
    
    setFilteredItems(result)
  }, [items, searchTerm, categoryFilter, statusFilter, activeFilter])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'number') {
      // Handle empty string or invalid number
      const numValue = value === '' || value === '-' ? 0 : parseFloat(value)
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'unit_price') {
      const numValue = value === '' ? 0 : parseFloat(value)
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue
      }))
    } else if (name === 'is_active') {
      setFormData(prev => ({
        ...prev,
        [name]: value === 'true'
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const resetForm = () => {
    setFormData({
      item_code: "",
      item_name: "",
      item_description: "",
      category: "material",
      unit: "",
      unit_price: 0,
      currency: "IDR",
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: "",
      is_active: true
    })
    setEditingItem(null)
  }


  const handleEdit = (item: PriceListItem) => {
    setEditingItem(item)
    setFormData({
      item_code: item.item_code,
      item_name: item.item_name,
      item_description: item.item_description || "",
      category: item.category || "material",
      unit: item.unit,
      unit_price: item.unit_price,
      currency: item.currency,
      valid_from: item.valid_from ? item.valid_from.split('T')[0] : new Date().toISOString().split('T')[0],
      valid_until: item.valid_until ? item.valid_until.split('T')[0] : "",
      is_active: item.is_active
    })
    setOpenDialog(true)
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Tidak ditentukan"
    return new Date(dateString).toLocaleDateString('id-ID')
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page: newPage }))
    fetchData(newPage, pagination.pageSize)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({ ...prev, pageSize: newSize, page: 1 }))
    fetchData(1, newSize)
  }

  // Update handleSubmit to use fetchData after success
  const handleSubmitUpdated = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setNotification({
          type: 'error',
          message: 'Anda harus login untuk melakukan ini',
          visible: true
        })
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000)
        setLoading(false)
        return
      }

      // Validasi input sebelum mengirim ke API
      if (!formData.item_code.trim()) {
        throw new Error('Kode item wajib diisi')
      }
      
      if (!formData.item_name.trim()) {
        throw new Error('Nama item wajib diisi')
      }
      
      if (!formData.unit.trim()) {
        throw new Error('Satuan wajib diisi')
      }
      
      if (isNaN(formData.unit_price) || formData.unit_price <= 0) {
        throw new Error('Harga satuan harus lebih dari 0')
      }
      
      if (!formData.valid_from) {
        throw new Error('Tanggal berlaku mulai wajib diisi')
      }

      // Build payload dengan mapping column yang sesuai dengan database
      const payload: any = {
        item_code: formData.item_code.trim(),
        item_name: formData.item_name.trim(),
        item_description: formData.item_description?.trim() || null,
        category: formData.category,
        unit: formData.unit.trim(),
        unit_price: parseFloat(formData.unit_price.toString()),
        currency: formData.currency || "IDR",
        is_active: formData.is_active
      }
      
      if (formData.valid_from) {
        payload.valid_from = new Date(formData.valid_from).toISOString()
      }
      
      if (formData.valid_until) {
        payload.valid_until = new Date(formData.valid_until).toISOString()
      }

      console.log("📤 Update payload:", payload)

      // Gunakan API endpoint untuk create/update
      let result
      if (editingItem) {
        // Update existing item via PUT API
        console.log(`🔄 Updating item ${editingItem.id} with code ${editingItem.item_code}`)
        
        const updatePayload = {
          id: editingItem.id,
          ...payload
        }
        
        const response = await fetch('/api/finance/price-list', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("❌ API Update failed:", errorData)
          const errorMessage = errorData.error || errorData.details || response.statusText
          throw new Error(`Gagal update: ${errorMessage}`)
        }

        const responseData = await response.json()
        console.log("✅ API Update successful:", responseData.data)
        result = responseData.data
        
      } else {
        // Create new item via POST API
        console.log(`➕ Creating new item with code ${formData.item_code}`)
        
        // Add created_by from session
        payload.created_by = session.user.id
        
        const response = await fetch('/api/finance/price-list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("❌ API Insert failed:", errorData)
          const errorMessage = errorData.error || errorData.details || response.statusText
          throw new Error(`Gagal insert: ${errorMessage}`)
        }

        const responseData = await response.json()
        console.log("✅ API Insert successful:", responseData.data)
        result = responseData.data
      }

      // Refresh data using fetchData
      await fetchData(pagination.page, pagination.pageSize)

      setOpenDialog(false)
      resetForm()

      setNotification({
        type: 'success',
        message: editingItem ? `Item ${formData.item_code} berhasil diperbarui` : 'Item berhasil ditambahkan',
        visible: true
      })
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000)

    } catch (error: any) {
      console.error("❌ Error saving item:", error)
      setNotification({
        type: 'error',
        message: error.message || 'Terjadi kesalahan saat menyimpan item.',
        visible: true
      })
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Update handleDelete to use fetchData after success
  const handleDeleteUpdated = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus item ini?")) return

    try {
      // Delete item via API DELETE endpoint
      console.log(`🗑️  Deleting item with ID: ${id}`)
      
      const response = await fetch(`/api/finance/price-list?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ API Delete failed:", errorData.error)
        
        // Remove from local state even if API operation fails
        setItems(prev => prev.filter(item => item.id !== id))
        
        setNotification({
          type: 'success',
          message: 'Item dihapus dari tampilan (API gagal)',
          visible: true
        })
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000)
        return
      }

      // Successfully deleted via API
      const responseData = await response.json()
      console.log("✅ API Delete successful:", responseData.message)
      
      // Refresh data using fetchData
      await fetchData(pagination.page, pagination.pageSize)

      setNotification({
        type: 'success',
        message: responseData.message || 'Item berhasil dihapus',
        visible: true
      })
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000)
    } catch (error: any) {
      console.error("Error deleting item:", error)
      // Remove from local state as fallback
      setItems(prev => prev.filter(item => item.id !== id))
      
      setNotification({
        type: 'error',
        message: error.message || 'Terjadi kesalahan saat menghapus item.',
        visible: true
      })
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000)
    }
  }

  // Replace old handlers with new ones
  const handleSubmit = handleSubmitUpdated
  const handleDelete = handleDeleteUpdated

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification.visible && (
        <div className={`rounded-lg p-4 mb-4 flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
            {notification.type === 'error' && <XCircle className="h-5 w-5 mr-2" />}
            <span>{notification.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotification(prev => ({ ...prev, visible: false }))}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-8 w-8 text-primary" />
            Master Price List
          </h1>
          <p className="text-muted-foreground">
            Kelola daftar harga barang dan jasa untuk standarisasi biaya
          </p>
        </div>
        <div className="flex gap-3">
          {canManage && (
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Item Price List" : "Tambah Item Price List Baru"}
                  </DialogTitle>
                  <DialogDescription>
                    Isi detail item untuk ditambahkan ke master price list
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="item_code">Kode Item *</Label>
                        <Input
                          id="item_code"
                          name="item_code"
                          value={formData.item_code}
                          onChange={handleInputChange}
                          placeholder="MAT-001"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item_name">Nama Item *</Label>
                        <Input
                          id="item_name"
                          name="item_name"
                          value={formData.item_name}
                          onChange={handleInputChange}
                          placeholder="Bibit Pohon Sengon"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="item_description">Deskripsi</Label>
                      <Input
                        id="item_description"
                        name="item_description"
                        value={formData.item_description}
                        onChange={handleInputChange}
                        placeholder="Deskripsi item (opsional)"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Kategori *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleSelectChange("category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Satuan *</Label>
                        <Input
                          id="unit"
                          name="unit"
                          value={formData.unit}
                          onChange={handleInputChange}
                          placeholder="kg, pcs, jam, etc"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit_price">Harga Satuan (IDR) *</Label>
                        <Input
                          id="unit_price"
                          name="unit_price"
                          type="number"
                          value={formData.unit_price}
                          onChange={handleInputChange}
                          placeholder="2500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valid_from">Tanggal Berlaku Mulai *</Label>
                        <Input
                          id="valid_from"
                          name="valid_from"
                          type="date"
                          value={formData.valid_from}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valid_until">Tanggal Berlaku Selesai</Label>
                        <Input
                          id="valid_until"
                          name="valid_until"
                          type="date"
                          value={formData.valid_until}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="is_active">Status Aktif</Label>
                      <Select
                        value={formData.is_active.toString()}
                        onValueChange={(value) => handleSelectChange("is_active", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Aktif</SelectItem>
                          <SelectItem value="false">Tidak Aktif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Menyimpan..." : editingItem ? "Perbarui Item" : "Simpan Item"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cari item (kode, nama, deskripsi)..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status Persetujuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {APPROVAL_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status Aktif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                setSearchTerm("")
                setCategoryFilter("all")
                setStatusFilter("all")
                setActiveFilter("all")
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Harga</CardTitle>
          <CardDescription>
            Menampilkan {filteredItems.length} item dari {pagination.total} total item (halaman {pagination.page} dari {pagination.totalPages})
            {fetchingData && <span className="ml-2 text-xs text-muted-foreground">Memuat data...</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Item</TableHead>
                  <TableHead>Nama Item</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Validitas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {fetchingData ? "Memuat data..." : "Tidak ada item yang ditemukan"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.item_code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item_name}</div>
                          {item.item_description && (
                            <div className="text-sm text-muted-foreground">{item.item_description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.unit_price, item.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Mulai: {formatDate(item.valid_from)}</div>
                          <div>Selesai: {formatDate(item.valid_until)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={item.is_active ? "default" : "secondary"}
                            className="w-fit"
                          >
                            {item.is_active ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                          <Badge 
                            variant={
                              item.approval_status === 'APPROVED' ? "default" :
                              item.approval_status === 'REJECTED' ? "destructive" : "outline"
                            }
                            className="w-fit"
                          >
                            {item.approval_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Baris per halaman:
                </span>
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pagination.pageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage || fetchingData}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={fetchingData}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage || fetchingData}
                >
                  Next
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {pagination.total === 0 ? 'Tidak ada data' : 
                  `Menampilkan ${((pagination.page - 1) * pagination.pageSize) + 1} - ${Math.min(pagination.page * pagination.pageSize, pagination.total)} dari ${pagination.total} item`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Tentang Master Price List</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Master Price List adalah sistem standarisasi harga untuk semua barang dan jasa yang digunakan dalam proyek dan operasional. 
                Setiap item memiliki versi untuk melacak perubahan harga seiring waktu.
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Gunakan filter untuk menemukan item dengan cepat</li>
                <li>• Setiap perubahan harga membuat versi baru</li>
                <li>• Status persetujuan memastikan validitas harga</li>
                <li>• Periode validitas mengontrol kapan harga berlaku</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
