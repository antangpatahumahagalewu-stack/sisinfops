"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface AddPSFormProps {
  kabupatenOptions: Array<{ id: string; nama: string }>
  userRole?: string
}

const skemaOptions = [
  { value: "HKM", label: "HKm (Hutan Kemasyarakatan)" },
  { value: "HTR", label: "HTR (Hutan Tanaman Rakyat)" },
  { value: "HA", label: "HA (Hutan Adat)" },
  { value: "LPHD", label: "LPHD (Lembaga Pengelola Hutan Desa)" },
]

const statusOptions = [
  { value: "ada", label: "Ada" },
  { value: "belum", label: "Belum" },
]

const jenisHutanOptions = [
  { value: "Mineral", label: "Mineral" },
  { value: "Gambut", label: "Gambut" },
]

export function AddPSForm({ kabupatenOptions, userRole }: AddPSFormProps) {
  const router = useRouter()
  
  // Only admin and monev can create
  const canCreate = userRole === "admin" || userRole === "monev"

  const handleClick = () => {
    router.push("/dashboard/data/add")
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={!canCreate}>
      <Plus className="mr-2 h-4 w-4" />
      Tambah Data
    </Button>
  )
}
