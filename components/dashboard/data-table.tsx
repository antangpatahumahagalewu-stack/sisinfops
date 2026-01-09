"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MoreVertical, Eye, Edit, Trash2, CheckCircle, XCircle, FileText } from "lucide-react"
import { Kabupaten } from "@/lib/types/pks"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale } from 'next-intl'

interface DataTableProps {
  data: any[]
  kabupatenOptions: Kabupaten[]
  userRole: 'admin' | 'monev' | 'viewer'
}

export default function DataTable({ data, kabupatenOptions, userRole }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKabupaten, setSelectedKabupaten] = useState<string>("all")
  const [selectedSkema, setSelectedSkema] = useState<string>("all")
  const [selectedJenisHutan, setSelectedJenisHutan] = useState<string>("all")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
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
  const filteredData = data.filter(item => {
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

  // Handle actions
  const handleView = (id: string) => {
    router.push(`/${locale}/ps/${id}`)
  }

  const handleEdit = (id: string) => {
    console.log("Edit item:", id)
    setOpenDropdown(null)
    // Open edit dialog
  }

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      console.log("Delete item:", id)
      setOpenDropdown(null)
      // Call delete API
    }
  }

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id)
  }

  // Format luas
  const formatLuas = (luas: number) => {
    return new Intl.NumberFormat('id-ID').format(luas)
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
                <th className="text-left py-3 px-4 font-medium w-[250px]">Pemegang Izin</th>
                <th className="text-left py-3 px-4 font-medium">Kabupaten</th>
                <th className="text-left py-3 px-4 font-medium">Skema</th>
                <th className="text-left py-3 px-4 font-medium">Jenis Hutan</th>
                <th className="text-left py-3 px-4 font-medium">Luas (Ha)</th>
                <th className="text-left py-3 px-4 font-medium">RKPS</th>
                <th className="text-left py-3 px-4 font-medium">Peta</th>
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
    </div>
  )
}
