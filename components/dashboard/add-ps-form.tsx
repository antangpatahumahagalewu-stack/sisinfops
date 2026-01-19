"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface AddPSFormProps {
  kabupatenOptions: Array<{ id: string; nama: string }>
  userRole?: string
}

const skemaOptions = [
  { value: "HD", label: "HD (Hutan Desa)" },
  { value: "HTR", label: "HTR (Hutan Tanaman Rakyat)" },
  { value: "HKM", label: "HKM (Hutan Kemasyarakatan)" },
  { value: "HA", label: "HA (Hutan Adat)" },
  { value: "IUPHHK", label: "IUPHHK (Izin Usaha Pemanfaatan Hasil Hutan Kayu)" },
  { value: "IUPHKm", label: "IUPHKm (Izin Usaha Pemanfaatan Hasil Hutan Bukan Kayu)" },
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
