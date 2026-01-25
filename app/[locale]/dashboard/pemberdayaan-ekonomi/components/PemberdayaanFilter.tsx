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
    kabupaten: selectedKabupaten || "",
    tahun: selectedTahun || "",
    jenis_usaha: selectedJenisUsaha || "",
    status: selectedStatus || "",
  })

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (filters.kabupaten) params.set("kabupaten", filters.kabupaten)
    if (filters.tahun) params.set("tahun", filters.tahun)
    if (filters.jenis_usaha) params.set("jenis_usaha", filters.jenis_usaha)
    if (filters.status) params.set("status", filters.status)

    router.push(`/dashboard/pemberdayaan-ekonomi?${params.toString()}`)
  }

  const clearFilters = () => {
    setFilters({
      kabupaten: "",
      tahun: "",
      jenis_usaha: "",
      status: "",
    })
    router.push("/dashboard/pemberdayaan-ekonomi")
  }

  const hasActiveFilters = filters.kabupaten || filters.tahun || filters.jenis_usaha || filters.status

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
              <SelectItem value="">Semua Kabupaten</SelectItem>
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
              <SelectItem value="">Semua Tahun</SelectItem>
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
              <SelectItem value="">Semua Status</SelectItem>
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