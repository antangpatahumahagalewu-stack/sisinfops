"use client"

import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface FilterChip {
  key: string
  label: string
  value: string
  displayValue: string
}

interface PemberdayaanFilterChipsProps {
  filters: {
    kabupaten: string
    tahun: string
    jenis_usaha: string
    status: string
  }
  kabupatenList: Array<{ id: string; nama: string }>
  onRemoveFilter: (key: string) => void
  onClearAll: () => void
}

export default function PemberdayaanFilterChips({
  filters,
  kabupatenList,
  onRemoveFilter,
  onClearAll
}: PemberdayaanFilterChipsProps) {
  // Create filter chips from active filters
  const filterChips: FilterChip[] = []

  // Kabupaten filter
  if (filters.kabupaten && filters.kabupaten !== "all") {
    const kabupaten = kabupatenList.find(k => k.id === filters.kabupaten)
    filterChips.push({
      key: "kabupaten",
      label: "Kabupaten",
      value: filters.kabupaten,
      displayValue: kabupaten?.nama?.replace("KABUPATEN ", "") || filters.kabupaten
    })
  }

  // Tahun filter
  if (filters.tahun && filters.tahun !== "all") {
    filterChips.push({
      key: "tahun",
      label: "Tahun",
      value: filters.tahun,
      displayValue: filters.tahun
    })
  }

  // Jenis usaha filter
  if (filters.jenis_usaha && filters.jenis_usaha.trim() !== "") {
    filterChips.push({
      key: "jenis_usaha",
      label: "Jenis Usaha",
      value: filters.jenis_usaha,
      displayValue: filters.jenis_usaha
    })
  }

  // Status filter
  if (filters.status && filters.status !== "all") {
    const statusLabels: Record<string, string> = {
      draft: "Draft",
      submitted: "Submitted",
      verified: "Verified",
      rejected: "Rejected",
      archived: "Archived"
    }
    
    filterChips.push({
      key: "status",
      label: "Status",
      value: filters.status,
      displayValue: statusLabels[filters.status] || filters.status
    })
  }

  if (filterChips.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Filter Aktif</div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearAll}
          className="h-7 text-xs"
        >
          Hapus Semua
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <Badge
            key={`${chip.key}-${chip.value}`}
            variant="secondary"
            className="pl-3 pr-1 py-1 h-7 flex items-center gap-1"
          >
            <span className="text-xs">
              <span className="font-medium">{chip.label}:</span> {chip.displayValue}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onRemoveFilter(chip.key)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  )
}