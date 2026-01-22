"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MoreVertical, Eye, Edit, Trash2, CheckCircle, XCircle, FileText, ArrowUpDown } from "lucide-react"
import { Kabupaten } from "@/lib/types/pks"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale } from 'next-intl'
import { EditPSForm } from "./edit-ps-form"
import { toast } from "sonner"

interface DataTableProps {
  data: any[]
  kabupatenOptions: Kabupaten[]
  userRole: 'admin' | 'monev' | 'viewer'
  enablePromote?: boolean
}

export default function DataTable({ data, kabupatenOptions, userRole, enablePromote = false }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKabupaten, setSelectedKabupaten] = useState<string>("all")
  const [selectedSkema, setSelectedSkema] = useState<string>("all")
  const [selectedJenisHutan, setSelectedJenisHutan] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const dropdownRefs = useRef<Record<string, HTMLDivElement>>({})
  const router = useRouter()
  const locale = useLocale()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && 
          dropdownRefs.current[openDropdown] && 
          !dropdownRefs.current[openDropdown]?.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openDropdown])

  // Filter data
  let filteredData = data.filter(item => {
    const matchesSearch = 
      item.pemegang_izin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kecamatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nomor_sk?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesKabupaten = 
      selectedKabupaten === "all" || 
      item.kabupaten_nama === selectedKabupaten

    const matchesSkema = 
      selectedSkema === "all" || 
      item.skema === selectedSkema

    const matchesJenisHutan = 
      selectedJenisHutan === "all" || 
      item.jenis_hutan === selectedJenisHutan

    return matchesSearch && matchesKabupaten && matchesSkema && matchesJenisHutan
  })

  // Sorting logic
  if (sortColumn) {
    filteredData = [...filteredData].sort((a, b) => {
      let aValue = a[sortColumn]
      let bValue = b[sortColumn]

      // Handle null/undefined values
      if (aValue == null) aValue = ''
      if (bValue == null) bValue = ''

      // Special handling for status columns
      if (sortColumn === 'rkps_status' || sortColumn === 'peta_status') {
        // 'ada' should come before 'belum'
        const statusOrder = { 'ada': 1, 'belum': 2 }
        aValue = statusOrder[aValue as keyof typeof statusOrder] || 3
        bValue = statusOrder[bValue as keyof typeof statusOrder] || 3
      }

      // Special handling for numeric columns
      if (sortColumn === 'luas_ha') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      // String comparison for text columns
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      let comparison = 0
      if (aValue < bValue) comparison = -1
      if (aValue > bValue) comparison = 1

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  // Get unique skema options
  const skemaOptions = Array.from(new Set(data.map(item => item.skema).filter(Boolean)))
  
  // Get unique jenis hutan options
  const jenisHutanOptions = Array.from(new Set(data.map(item => item.jenis_hutan).filter(Boolean)))

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'ada') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ada
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Belum
      </span>
    )
  }

  // Jenis Hutan badge component
  const JenisHutanBadge = ({ jenis }: { jenis: string }) => {
    if (!jenis) {
      return (
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">
          N/A
        </span>
      )
    }
    
    const jenisLower = jenis.toLowerCase()
    if (jenisLower === 'mineral') {
      return (
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 border-blue-200">
          {jenis}
        </span>
      )
    } else if (jenisLower === 'gambut') {
      return (
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800 border-orange-200">
          {jenis}
        </span>
      )
    } else if (jenisLower.includes('mineral') && jenisLower.includes('gambut')) {
      return (
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 border-green-200">
          {jenis}
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
        {jenis}
      </span>
    )
  }

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  // Handle actions
  const handleView = (id: string) => {
    router.push(`/${locale}/ps/${id}`)
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setOpenDropdown(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      return
    }

    setDeletingId(id)
    setOpenDropdown(null)

    try {
      const response = await fetch(`/api/ps/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus data')
      }

      toast.success("Data berhasil dihapus", {
        description: "Data Perhutanan Sosial telah dihapus dari sistem",
        duration: 5000,
      })

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error: any) {
      toast.error("Gagal menghapus data", {
        description: error.message || "Terjadi kesalahan saat menghapus data",
        duration: 5000,
      })
      console.error('Error deleting data:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handlePromote = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menaikkan status data potensi ini menjadi Perhutanan Sosial?\n\nData akan dipindahkan dari tabel potensi ke tabel perhutanan_sosial.")) {
      return
    }

    setPromotingId(id)
    setOpenDropdown(null)

    try {
      const response = await fetch(`/api/potensi/${id}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        alert(`Berhasil mempromosikan data potensi menjadi Perhutanan Sosial!\n\nID PS baru: ${result.psId}`)
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        alert(`Gagal mempromosikan data: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error promoting data:', error)
      alert('Terjadi kesalahan saat mempromosikan data. Silakan coba lagi.')
    } finally {
      setPromotingId(null)
    }
  }

  // Get PS data for editing
  const getPsDataForEdit = (id: string) => {
    return filteredData.find(item => item.id === id)
  }

  const handleEditSuccess = () => {
    setEditingId(null)
    // Refresh the page to show updated data
    window.location.reload()
  }

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id)
  }

  // Format luas
  const formatLuas = (luas: number) => {
    return new Intl.NumberFormat('id-ID').format(luas)
  }

  // Helper to render sortable header
  const SortableHeader = ({ 
    columnKey, 
    label, 
    className = "" 
  }: { 
    columnKey: string, 
    label: string, 
    className?: string 
  }) => {
    const isSorted = sortColumn === columnKey
    return (
      <th 
        className={`py-3 px-4 font-medium text-left cursor-pointer hover:bg-muted/70 transition-colors ${className}`}
        onClick={() => handleSort(columnKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isSorted ? (
            <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </div>
      </th>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari pemegang izin, desa, kecamatan, atau nomor SK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={selectedKabupaten} 
            onChange={(e) => setSelectedKabupaten(e.target.value)}
            className="w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">Semua Kabupaten</option>
            {kabupatenOptions.map(kab => (
              <option key={kab.id} value={kab.nama}>
                {kab.nama.replace('KABUPATEN ', '')}
              </option>
            ))}
          </select>

          <select 
            value={selectedSkema} 
            onChange={(e) => setSelectedSkema(e.target.value)}
            className="w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">Semua Skema</option>
            {skemaOptions.map(skema => (
              <option key={skema} value={skema}>
                {skema}
              </option>
            ))}
          </select>

          <select 
            value={selectedJenisHutan} 
            onChange={(e) => setSelectedJenisHutan(e.target.value)}
            className="w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">Semua Jenis</option>
            {jenisHutanOptions.map(jenis => (
              <option key={jenis} value={jenis}>
                {jenis}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium w-[60px]">No</th>
                <SortableHeader columnKey="pemegang_izin" label="Pemegang Izin" className="w-[250px]" />
                <SortableHeader columnKey="kabupaten_nama" label="Kabupaten" />
                <SortableHeader columnKey="skema" label="Skema" />
                <SortableHeader columnKey="jenis_hutan" label="Jenis Hutan" />
                <SortableHeader columnKey="luas_ha" label="Luas (Ha)" />
                <SortableHeader columnKey="rkps_status" label="RKPS" />
                <SortableHeader columnKey="peta_status" label="Peta" />
                <th className="text-right py-3 px-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Tidak ada data yang ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <Link href={`/${locale}/ps/${item.id}`} className="font-semibold hover:text-blue-600 hover:underline">
                          {item.pemegang_izin}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {item.desa}, {item.kecamatan}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {item.kabupaten_nama?.replace('KABUPATEN ', '')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                        {item.skema}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <JenisHutanBadge jenis={item.jenis_hutan} />
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {formatLuas(item.luas_ha || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.rkps_status} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.peta_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="relative inline-block" ref={el => {
                        if (el) {
                          dropdownRefs.current[item.id] = el
                        } else {
                          delete dropdownRefs.current[item.id]
                        }
                      }}>
                        <button 
                          onClick={() => toggleDropdown(item.id)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openDropdown === item.id && (
                          <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border min-w-[160px] z-50">
                            <div className="py-1">
                              <button 
                                onClick={() => handleView(item.id)}
                                className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Lihat Detail
                              </button>
                              
                              {(item.can_edit || userRole === 'admin') && (
                                <>
                                  <button 
                                    onClick={() => handleEdit(item.id)}
                                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </button>
                                  <div className="border-t my-1"></div>
                                </>
                              )}

                              {enablePromote && (userRole === 'admin' || userRole === 'monev') && (
                                <button 
                                  onClick={() => handlePromote(item.id)}
                                  disabled={promotingId === item.id}
                                  className="flex items-center w-full px-3 py-2 text-sm text-green-600 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {promotingId === item.id ? (
                                    <>
                                      <div className="mr-2 h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                      Memproses...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                                      </svg>
                                      Naikkan ke PS
                                    </>
                                  )}
                                </button>
                              )}

                              {item.can_delete && userRole === 'admin' && (
                                <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-muted"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Menampilkan <span className="font-medium">{filteredData.length}</span> dari{" "}
          <span className="font-medium">{data.length}</span> data
        </div>
        <div className="flex items-center gap-4">
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3" 
            disabled={filteredData.length === 0}>
            <FileText className="mr-2 h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Edit Dialog */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Data Perhutanan Sosial</h2>
                <button 
                  onClick={() => setEditingId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <EditPSForm 
                psData={getPsDataForEdit(editingId)}
                kabupatenOptions={kabupatenOptions}
                userRole={userRole}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditingId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
