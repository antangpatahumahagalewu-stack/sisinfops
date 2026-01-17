"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Users, User, Edit, Users2, Briefcase, Home, UserCircle, SquarePen } from "lucide-react"
import { EditLembagaForm } from "./edit-lembaga-form"

interface Lembaga {
  id: string
  nama: string
  ketua: string | null
  jumlah_anggota: number | null
  kepala_desa: string | null
  created_at: string
  updated_at: string
}

// Fungsi untuk menentukan nama lembaga berdasarkan skema PS
function getLembagaInfo(skema: string | null) {
  const skemaLower = skema?.toLowerCase() || ""
  
  if (skemaLower.includes("desa") || skemaLower.includes("lphd")) {
    return {
      nama: "LPHD (Lembaga Pengelola Hutan Desa)",
      singkatan: "LPHD",
      icon: Building2,
      warna: "blue" as const
    }
  } else if (skemaLower.includes("kemasyarakatan")) {
    return {
      nama: "KUPS (Kelompok Usaha Perhutanan Sosial)",
      singkatan: "KUPS",
      icon: Users2,
      warna: "green" as const
    }
  } else if (skemaLower.includes("tanaman")) {
    return {
      nama: "HTR (Hutan Tanaman Rakyat)",
      singkatan: "HTR",
      icon: Briefcase,
      warna: "amber" as const
    }
  } else if (skemaLower.includes("adat")) {
    return {
      nama: "HA (Hutan Adat)",
      singkatan: "HA",
      icon: Home,
      warna: "purple" as const
    }
  } else if (skemaLower.includes("kemitraan")) {
    return {
      nama: "Kemitraan Kehutanan",
      singkatan: "Kemitraan",
      icon: Users,
      warna: "indigo" as const
    }
  } else {
    return {
      nama: "Lembaga Pengelola",
      singkatan: "Lembaga",
      icon: Building2,
      warna: "gray" as const
    }
  }
}

// Fungsi untuk membersihkan nama lembaga dari prefix skema yang tidak seharusnya
// LPHD dan HTR adalah skema PS, bukan bagian dari nama lembaga
function cleanLembagaName(nama: string | null, skema: string | null): string {
  if (!nama) return ""
  
  const skemaLower = skema?.toLowerCase() || ""
  let cleanedName = nama.trim()
  
  // Hapus prefix LPHD jika skema bukan Hutan Desa
  // Karena LPHD hanya untuk skema Hutan Desa
  if (!skemaLower.includes("desa") && !skemaLower.includes("lphd")) {
    cleanedName = cleanedName.replace(/^LPHD\s+/i, "").trim()
  }
  
  // Hapus kombinasi prefix yang salah (misalnya "LPHD HTR" atau "LPHD HTR BUKOI...")
  // Karena LPHD dan HTR adalah skema yang berbeda, tidak boleh ada di nama lembaga bersamaan
  cleanedName = cleanedName.replace(/^LPHD\s+HTR\s+/i, "HTR ").trim()
  cleanedName = cleanedName.replace(/^HTR\s+LPHD\s+/i, "HTR ").trim()
  
  return cleanedName
}

export function TabKelembagaan({ psId }: { psId: string }) {
  const [lembaga, setLembaga] = useState<Lembaga | null>(null)
  const [skema, setSkema] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      try {
        // Fetch user role for role-based UI
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error("Error getting user:", userError)
        }
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
          
          if (profileError) {
            console.error("Error fetching profile:", profileError)
            // If profile doesn't exist, set to null (will show as viewer)
            setUserRole(null)
          } else {
            console.log("User role fetched:", profile?.role)
            setUserRole(profile?.role || null)
          }
        } else {
          console.warn("No authenticated user found")
          setUserRole(null)
        }

        // Fetch skema dari perhutanan_sosial
        const { data: psData, error: psError } = await supabase
          .from("perhutanan_sosial")
          .select("skema")
          .eq("id", psId)
          .single()

        if (psError) {
          if (psError.code !== "PGRST116") {
            // Hanya log error jika bukan error "no rows" dan ada pesan
            const errorMessage = psError.message || String(psError).trim()
            if (errorMessage && errorMessage !== "{}" && errorMessage !== "[object Object]") {
              console.error("Error fetching skema:", errorMessage)
            }
          }
          setSkema(null)
        } else {
          setSkema(psData?.skema || null)
        }

        // Fetch data lembaga dari tabel lembaga_pengelola
        const { data: lembagaData, error: lembagaError } = await supabase
          .from("lembaga_pengelola")
          .select("*")
          .eq("perhutanan_sosial_id", psId)
          .single()

        if (lembagaError) {
          // PGRST116 = no rows returned - ini normal, tidak perlu log sebagai error
          if (lembagaError.code !== "PGRST116") {
            // Hanya log error jika ada pesan error yang bermakna
            const errorMessage = lembagaError.message || String(lembagaError).trim()
            if (errorMessage && errorMessage !== "{}" && errorMessage !== "[object Object]") {
              console.error("Error fetching lembaga:", errorMessage)
            }
          }
          setLembaga(null)
        } else {
          setLembaga(lembagaData)
        }
      } catch (error: any) {
        // Tangani error tak terduga
        const errorMessage = error?.message || String(error).trim()
        if (errorMessage && errorMessage !== "{}" && errorMessage !== "[object Object]") {
          console.error("Unexpected error in fetchData:", errorMessage)
        }
        setLembaga(null)
        setSkema(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [psId])

  const handleEditSuccess = async () => {
    // Refresh data setelah update berhasil
    const supabase = createClient()
    
    try {
      // Fetch ulang data lembaga
      const { data: lembagaData, error: lembagaError } = await supabase
        .from("lembaga_pengelola")
        .select("*")
        .eq("perhutanan_sosial_id", psId)
        .single()

      if (lembagaError) {
        if (lembagaError.code !== "PGRST116") {
          const errorMessage = lembagaError.message || String(lembagaError).trim()
          if (errorMessage && errorMessage !== "{}" && errorMessage !== "[object Object]") {
            console.error("Error fetching lembaga:", errorMessage)
          }
        }
        setLembaga(null)
      } else {
        setLembaga(lembagaData)
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error).trim()
      if (errorMessage && errorMessage !== "{}" && errorMessage !== "[object Object]") {
        console.error("Unexpected error in handleEditSuccess:", errorMessage)
      }
    }
    
    // Kembali ke view mode
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data kelembagaan...</p>
        </div>
      </div>
    )
  }

  const lembagaInfo = getLembagaInfo(skema)
  const Icon = lembagaInfo.icon
  const warnaKelas = {
    blue: "bg-green-100 text-green-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
    indigo: "bg-indigo-100 text-indigo-600",
    gray: "bg-gray-100 text-gray-600"
  }[lembagaInfo.warna]

  const iconTextColor = {
    blue: "text-green-400",
    green: "text-green-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
    indigo: "text-indigo-400",
    gray: "text-gray-400"
  }[lembagaInfo.warna]

  // Bersihkan nama lembaga dari prefix skema yang tidak seharusnya
  const cleanedLembagaName = lembaga ? cleanLembagaName(lembaga.nama, skema) : ""

  return (
    <div className="space-y-4">
      {isEditing ? (
        <EditLembagaForm
          lembaga={lembaga}
          psId={psId}
          skema={skema}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Kelembagaan</h3>
              <p className="text-sm text-muted-foreground">
                Informasi {lembagaInfo.singkatan} Perhutanan Sosial
              </p>
            </div>
            {lembaga && (
              <>
                {/* Show Edit button for admin/monev, or if role is still loading */}
                {/* If role is viewer, button will be blocked by RLS anyway */}
                {(userRole === 'admin' || userRole === 'monev' || userRole === null) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <SquarePen className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : userRole === 'viewer' ? (
                  <div className="text-xs text-muted-foreground">
                    Hanya admin dan monev yang dapat mengedit
                  </div>
                ) : null}
              </>
            )}
          </div>

          {!lembaga ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Icon className={`h-12 w-12 mx-auto mb-4 ${iconTextColor}`} />
                <p className="text-gray-600">Data kelembagaan belum tersedia</p>
                <p className="text-sm text-gray-500 mt-2">
                  Data {lembagaInfo.singkatan} akan muncul di sini
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 ${warnaKelas} rounded-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{cleanedLembagaName || lembaga.nama}</CardTitle>
                    <CardDescription>{lembagaInfo.nama}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {lembaga.ketua && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Ketua PS</p>
                        <p className="font-semibold">{lembaga.ketua}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Jumlah Anggota</p>
                      <p className="font-semibold text-2xl">
                        {lembaga.jumlah_anggota
                          ? lembaga.jumlah_anggota.toLocaleString("id-ID")
                          : "-"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Kepala Keluarga</p>
                    </div>
                  </div>
                  {lembaga.kepala_desa && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <UserCircle className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Kepala Desa</p>
                        <p className="font-semibold">{lembaga.kepala_desa}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
