"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, X } from "lucide-react"
import { useRouter } from "next/navigation"
import PemberdayaanFilterChips from "./PemberdayaanFilterChips"

interface Kabupaten {
  id: string
  nama: string
}

interface PemberdayaanFilterProps {
  kabupatenList: Kabupaten[]
  uniqueYears: number[]
  selectedKabupaten?: string
  selectedTahun?: string
  selectedJenisUsaha?: string
  selectedStatus?: string
}

export default function PemberdayaanFilter({
  kabupatenList,
  uniqueYears,
  selectedKabupaten,
  selectedTahun,
  selectedJenisUsaha,
  selectedStatus,
}: PemberdayaanFilterProps) {
  const router = useRouter()
  const [filters, setFilters] = useState({
    kabupaten: selectedKabupaten || "all",
    tahun: selectedTahun || "all",
    jenis_usaha: selectedJenisUsaha || "",
    status: selectedStatus || "all",
  })

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (filters.kabupaten && filters.kabupaten !== "all") params.set("kabupaten", filters.kabupaten)
    if (filters.tahun && filters.tahun !== "all") params.set("tahun", filters.tahun)
    if (filters.jenis_usaha) params.set("jenis_usaha", filters.jenis_usaha)
    if (filters.status && filters.status !== "all") params.set("status", filters.status)

    router.push(`/dashboard/pemberdayaan-ekonomi?${params.toString()}`)
  }

  const clearFilters = () => {
    setFilters({
      kabupaten: "all",
      tahun: "all",
      jenis_usaha: "",
      status: "all",
    })
    router.push("/dashboard/pemberdayaan-ekonomi")
  }

  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...filters }
    if (key === "kabupaten") newFilters.kabupaten = "all"
    if (key === "tahun") newFilters.tahun = "all"
    if (key === "jenis_usaha") newFilters.jenis_usaha = ""
    if (key === "status") newFilters.status = "all"
    
    setFilters(newFilters)
    
    // Apply the new filters immediately
    const params = new URLSearchParams()
    if (newFilters.kabupaten && newFilters.kabupaten !== "all") params.set("kabupaten", newFilters.kabupaten)
    if (newFilters.tahun && newFilters.tahun !== "all") params.set("tahun", newFilters.tahun)
    if (newFilters.jenis_usaha) params.set("jenis_usaha", newFilters.jenis_usaha)
    if (newFilters.status && newFilters.status !== "all") params.set("status", newFilters.status)
    
    router.push(`/dashboard/pemberdayaan-ekonomi?${params.toString()}`)
  }

  const hasActiveFilters = 
    (filters.kabupaten && filters.kabupaten !== "all") ||
    (filters.tahun && filters.tahun !== "all") ||
    filters.jenis_usaha ||
    (filters.status && filters.status !== "all")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Filter Data</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
            <X className="mr-2 h-4 w-4" />
            Hapus Filter
          </Button>
        )}
      </div>

      {/* Filter Chips */}
      <PemberdayaanFilterChips
        filters={filters}
        kabupatenList={kabupatenList}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={clearFilters}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="kabupaten">Kabupaten</Label>
          <Select
            value={filters.kabupaten}
            onValueChange={(value) => handleFilterChange("kabupaten", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Kabupaten" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kabupaten</SelectItem>
              {kabupatenList.map((kab) => (
                <SelectItem key={kab.id} value={kab.id}>
                  {kab.nama.replace("KABUPATEN ", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tahun">Tahun</Label>
          <Select
            value={filters.tahun}
            onValueChange={(value) => handleFilterChange("tahun", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {uniqueYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jenis_usaha">Jenis Usaha</Label>
          <Input
            id="jenis_usaha"
            placeholder="Cari jenis usaha..."
            value={filters.jenis_usaha}
            onChange={(e) => handleFilterChange("jenis_usaha", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={applyFilters}>
          Terapkan Filter
        </Button>
      </div>
    </div>
  )
}