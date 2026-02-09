"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MapPin, Trees, Calendar, Users, Hash, Building } from "lucide-react"

// Fungsi untuk menentukan nama lembaga berdasarkan skema PS
function getNamaLembaga(skema: string): string {
  const skemaLower = skema.toLowerCase()
  
  if (skemaLower.includes("desa") || skemaLower.includes("lphd")) {
    return "LPHD"
  } else if (skemaLower.includes("tanaman")) {
    return "HTR"
  } else if (skemaLower.includes("adat")) {
    return "HA"
  } else if (skemaLower.includes("kemasyarakatan")) {
    return "KUPS"
  } else if (skemaLower.includes("kemitraan")) {
    return "Kemitraan"
  } else {
    return "Lembaga Pengelola"
  }
}

interface PsHeaderProps {
  ps: {
    id: string
    namaPs: string
    desa: string
    kecamatan: string
    kabupaten: string
    skema: string
    luasHa: number
    tahunSk: number
    status: "SEHAT" | "PERLU_PENDAMPINGAN" | "RISIKO"
    fasilitator?: string | null
    namaPendamping?: string | null
    lembaga?: {
      nama: string
      ketua: string
      jumlahAnggota: number
    }
  }
}

export function PsHeader({ ps }: PsHeaderProps) {
  const namaLembaga = getNamaLembaga(ps.skema)
  const statusConfig = {
    SEHAT: { 
      label: "SEHAT", 
      color: "bg-green-600 text-white",
      description: "Semua dokumen lengkap, operasional baik"
    },
    PERLU_PENDAMPINGAN: { 
      label: "PERLU PENDAMPINGAN", 
      color: "bg-yellow-500 text-white",
      description: "Perlu pendampingan teknis/administrasi"
    },
    RISIKO: { 
      label: "RISIKO", 
      color: "bg-red-600 text-white",
      description: "Memerlukan intervensi segera"
    },
  }[ps.status]

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num)
  }

  return (
    <Card className="overflow-hidden border shadow-lg">
      {/* Header dengan background gradient */}
      <div className="bg-gradient-to-r from-green-700 to-green-900 text-white p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Building className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{ps.namaPs}</h1>
                <p className="text-green-100 text-lg">
                  {ps.skema}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-100">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{ps.desa}, {ps.kecamatan}, {ps.kabupaten}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <Badge className={`${statusConfig.color} px-4 py-2 text-base font-bold border-0`}>
              {statusConfig.label}
            </Badge>
            <p className="text-green-100 text-sm text-right max-w-xs">
              {statusConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Informasi detail */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Statistik Luas */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trees className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Luas Area</p>
                <p className="text-2xl font-bold">{formatNumber(ps.luasHa)} ha</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Luas izin dalam SK</p>
          </div>

          {/* Tahun SK */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tahun SK</p>
                <p className="text-2xl font-bold">{ps.tahunSk}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Tahun penerbitan SK</p>
          </div>

          {/* Skema */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Hash className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Skema</p>
                <p className="text-2xl font-bold">{ps.skema}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Jenis perhutanan sosial</p>
          </div>

          {/* Info Lembaga */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Anggota {namaLembaga}</p>
                <p className="text-2xl font-bold">{formatNumber(ps.lembaga?.jumlahAnggota || 0)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {ps.lembaga?.nama || namaLembaga} • Ketua: {ps.lembaga?.ketua || "-"}
            </p>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Status: <strong>{ps.status.replace("_", " ")}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Skema: <strong>{ps.skema}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Lokasi: <strong>{ps.kabupaten}</strong></span>
            </div>
            {ps.fasilitator && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Fasilitator: <strong>{ps.fasilitator}</strong></span>
              </div>
            )}
            {ps.namaPendamping && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-600">Pendamping: <strong>{ps.namaPendamping}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
