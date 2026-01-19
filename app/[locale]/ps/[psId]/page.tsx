// app/ps/[psId]/page.tsx
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import PsProfileContent from "./components/ps-profile-content"
import { PsProfile, PsStatus } from "./types"
import DashboardLayout from "../../dashboard/layout"

// ---- Fetch data from Supabase ----
async function getPsProfile(psId: string): Promise<PsProfile | null> {
  if (!psId) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("perhutanan_sosial")
    .select(`
      *,
      kabupaten:kabupaten_id (
        nama
      )
    `)
    .eq("id", psId)
    .single()

  if (error) {
    // Check if error object has any properties
    if (Object.keys(error).length > 0) {
      console.error(`Error fetching PS profile ${psId}:`, error)
    } else {
      // This is the case when error is an empty object (likely not found)
      console.warn(`PS profile ${psId} not found`)
    }
    return null
  }

  if (!data) {
    console.warn(`PS profile ${psId} has no data`)
    return null
  }

  // Fetch lembaga data separately
  const { data: lembagaData } = await supabase
    .from("lembaga_pengelola")
    .select("nama, ketua, jumlah_anggota, kepala_desa")
    .eq("perhutanan_sosial_id", psId)
    .single()

  // Map database fields to PsProfile type
  // Determine status based on rkps_status and peta_status
  let status: PsStatus = "SEHAT"
  if (data.rkps_status === 'belum' || data.peta_status === 'belum') {
    status = "PERLU_PENDAMPINGAN"
  }
  // Note: There's no 'RISIKO' status in database, we'll default to SEHAT

  // Determine default lembaga name based on skema
  const getDefaultLembagaName = (skema: string, pemegangIzin: string) => {
    const skemaLower = skema.toLowerCase()
    if (skemaLower.includes("desa")) {
      return "LPHD " + pemegangIzin
    } else if (skemaLower.includes("kemasyarakatan")) {
      return "KUPS " + pemegangIzin
    } else if (skemaLower.includes("tanaman")) {
      return "KTH " + pemegangIzin
    } else if (skemaLower.includes("adat")) {
      return "Lembaga Adat " + pemegangIzin
    } else {
      return "Lembaga Pengelola " + pemegangIzin
    }
  }

  // Clean lembaga name if it contains wrong prefix based on skema
  const cleanLembagaName = (nama: string | null, skema: string): string => {
    if (!nama) {
      return getDefaultLembagaName(skema, data.pemegang_izin)
    }
    
    const skemaLower = skema.toLowerCase()
    const namaLower = nama.toLowerCase()
    
    // Remove incorrect prefixes
    if (!skemaLower.includes("desa") && namaLower.startsWith("lphd")) {
      // If skema is not Hutan Desa but nama starts with LPHD, remove it
      nama = nama.replace(/^LPHD\s+/i, "").trim()
    }
    
    // If nama is empty after cleaning, use default
    if (!nama || nama.trim() === "") {
      return getDefaultLembagaName(skema, data.pemegang_izin)
    }
    
    return nama
  }

  const lembagaNama = cleanLembagaName(lembagaData?.nama, data.skema)

  return {
    id: data.id,
    namaPs: data.pemegang_izin,
    desa: data.desa,
    kecamatan: data.kecamatan,
    kabupaten: data.kabupaten?.nama || "",
    skema: data.skema,
    luasHa: data.luas_ha,
    tahunSk: data.tanggal_sk ? new Date(data.tanggal_sk).getFullYear() : 0,
    status: status,
    lembaga: {
      nama: lembagaNama,
      ketua: lembagaData?.ketua || "Ketua",
      jumlahAnggota: lembagaData?.jumlah_anggota || data.jumlah_kk || 0,
      kepalaDesa: lembagaData?.kepala_desa || null,
    },
    rkps_status: data.rkps_status || 'belum',
    peta_status: data.peta_status || 'belum',
  }
}

interface PageProps {
  params: Promise<{ psId: string }>
}

export default async function PsProfilePage({ params }: PageProps) {
  const { psId } = await params

  const ps = await getPsProfile(psId)

  if (!ps) {
    return (
      <DashboardLayout params={Promise.resolve({ locale: "id" })}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Data Tidak Ditemukan</h1>
            <p className="text-gray-600 mt-2">
              Data Perhutanan Sosial tidak ditemukan.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              Mungkin data belum diimport.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/data">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Data
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout params={Promise.resolve({ locale: "id" })}>
      <PsProfileContent ps={ps} psId={psId} />
    </DashboardLayout>
  )
}
