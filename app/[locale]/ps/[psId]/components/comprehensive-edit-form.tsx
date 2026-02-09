"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { PsProfile, PsStatus } from "../types"
import { Save, X, Building2, Users2, Briefcase, Home, Users, User, UserCircle } from "lucide-react"

interface ComprehensiveEditFormProps {
  ps: PsProfile
  psId: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Fungsi untuk menentukan nama lembaga berdasarkan skema PS
function getLembagaInfo(skema: string | null) {
  const skemaLower = skema?.toLowerCase() || ""
  
  if (skemaLower.includes("desa") || skemaLower.includes("lphd")) {
    return {
      nama: "LPHD (Lembaga Pengelola Hutan Desa)",
      singkatan: "LPHD",
      icon: Building2,
      warna: "green" as const
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

const OWNERSHIP_STATUS_OPTIONS = [
  { value: "PRIVATE", label: "Privat" },
  { value: "PUBLIC", label: "Publik" },
  { value: "COMMUNAL", label: "Komunal" },
  { value: "MIXED", label: "Campuran" }
]

const RESOLUTION_STATUS_OPTIONS = [
  { value: "NONE", label: "Tidak Ada" },
  { value: "RESOLVED", label: "Terselesaikan" },
  { value: "ONGOING", label: "Berlangsung" },
  { value: "PENDING", label: "Menunggu" }
]

export function ComprehensiveEditForm({ ps, psId, onSuccess, onCancel }: ComprehensiveEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // State untuk data PS (dari EditPsForm)
  const [psFormData, setPsFormData] = useState({
    namaPs: ps.namaPs,
    desa: ps.desa,
    kecamatan: ps.kecamatan,
    skema: ps.skema,
    luasHa: ps.luasHa,
    tahunSk: ps.tahunSk,
    status: ps.status,
    fasilitator: ps.fasilitator || "", // yayasan/organisasi
    namaPendamping: ps.namaPendamping || "", // individu person
  })
  
  // State untuk data kelembagaan (dari EditLembagaForm)
  const [lembagaFormData, setLembagaFormData] = useState({
    lembagaNama: ps.lembaga.nama || "",
    lembagaKetua: ps.lembaga.ketua,
    lembagaJumlahAnggota: ps.lembaga.jumlahAnggota,
    lembagaKepalaDesa: ps.lembaga.kepalaDesa || "",
    lembagaTeleponKetua: ps.lembaga.teleponKetua || "",
    lembagaTeleponKepalaDesa: ps.lembaga.teleponKepalaDesa || "",
  })
  
  // State untuk data kepemilikan lahan (dari LandTenureForm)
  const [landFormData, setLandFormData] = useState({
    ownership_status: "COMMUNAL", // default, akan di-fetch dari API
    land_certificate_number: "",
    certificate_date: "",
    area_ha: "",
    challenges: "",
    government_involvement: "",
    ministry_engagement: "",
    conflict_history: "",
    resolution_status: "NONE",
    notes: ""
  })
  
  // State untuk loading data existing
  const [loadingExistingData, setLoadingExistingData] = useState(true)

  // Fetch existing land tenure data on component mount
  useState(() => {
    async function fetchExistingData() {
      const supabase = createClient()
      try {
        // Fetch land tenure data
        const { data: landData } = await supabase
          .from("land_tenure")
          .select("*")
          .eq("perhutanan_sosial_id", psId)
          .single()

        if (landData) {
          setLandFormData({
            ownership_status: landData.ownership_status || "COMMUNAL",
            land_certificate_number: landData.land_certificate_number || "",
            certificate_date: landData.certificate_date ? new Date(landData.certificate_date).toISOString().split('T')[0] : "",
            area_ha: landData.area_ha?.toString() || "",
            challenges: landData.challenges || "",
            government_involvement: landData.government_involvement || "",
            ministry_engagement: landData.ministry_engagement || "",
            conflict_history: landData.conflict_history || "",
            resolution_status: landData.resolution_status || "NONE",
            notes: landData.notes || ""
          })
        }
      } catch (error) {
        console.error("Error fetching existing data:", error)
      } finally {
        setLoadingExistingData(false)
      }
    }
    
    fetchExistingData()
  })

  const handlePsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setPsFormData(prev => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value
    }))
  }

  const handlePsSelectChange = (name: string, value: string) => {
    setPsFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLembagaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setLembagaFormData(prev => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : parseFloat(value) || 0) : value
    }))
  }

  const handleLandChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setLandFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLandSelectChange = (name: string, value: string) => {
    setLandFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Check user permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Anda belum login. Silakan login terlebih dahulu.")
        setIsSubmitting(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      const isAdmin = profile?.role === "admin"
      const isCarbonSpecialist = profile?.role === "carbon_specialist"
      const isMonev = profile?.role === "monev"
      
      if (!profile || (!isAdmin && !isCarbonSpecialist && !isMonev)) {
        alert("Akses ditolak. Hanya admin, carbon specialist, dan monev yang dapat mengedit data.")
        setIsSubmitting(false)
        return
      }

      // Step 1: Update perhutanan_sosial table (requires admin or carbon_specialist)
      if (isAdmin || isCarbonSpecialist) {
        const { error: psError } = await supabase
          .from("perhutanan_sosial")
          .update({
            pemegang_izin: psFormData.namaPs,
            desa: psFormData.desa,
            kecamatan: psFormData.kecamatan,
            skema: psFormData.skema,
            luas_ha: psFormData.luasHa,
            tanggal_sk: `${psFormData.tahunSk}-01-01`,
            jumlah_kk: lembagaFormData.lembagaJumlahAnggota,
            ketua_ps: lembagaFormData.lembagaKetua,
            kepala_desa: lembagaFormData.lembagaKepalaDesa || null,
            telepon_ketua_ps: lembagaFormData.lembagaTeleponKetua.trim() || null,
            telepon_kepala_desa: lembagaFormData.lembagaTeleponKepalaDesa.trim() || null,
          })
          .eq("id", psId)

        if (psError) {
          console.error("Error updating perhutanan_sosial:", psError)
          throw new Error(`Gagal update data PS: ${psError.message}`)
        }
      }

      // Step 2: Update lembaga_pengelola table (requires admin or monev)
      if (isAdmin || isMonev) {
        const lembagaUpsertData = {
          perhutanan_sosial_id: psId,
          nama: lembagaFormData.lembagaNama.trim() || null,
          ketua: lembagaFormData.lembagaKetua,
          jumlah_anggota: lembagaFormData.lembagaJumlahAnggota,
          kepala_desa: lembagaFormData.lembagaKepalaDesa.trim() || null,
        }

        const { error: lembagaError } = await supabase
          .from("lembaga_pengelola")
          .upsert(lembagaUpsertData, {
            onConflict: "perhutanan_sosial_id"
          })

        if (lembagaError) {
          console.error("Error updating lembaga_pengelola:", lembagaError)
          throw new Error(`Gagal update data lembaga: ${lembagaError.message}`)
        }
      }

      // Step 3: Update land_tenure table (requires admin or carbon_specialist)
      if (isAdmin || isCarbonSpecialist) {
        const landUpsertData = {
          perhutanan_sosial_id: psId,
          ownership_status: landFormData.ownership_status,
          land_certificate_number: landFormData.land_certificate_number || null,
          certificate_date: landFormData.certificate_date || null,
          area_ha: landFormData.area_ha ? parseFloat(landFormData.area_ha) : null,
          challenges: landFormData.challenges || null,
          government_involvement: landFormData.government_involvement || null,
          ministry_engagement: landFormData.ministry_engagement || null,
          conflict_history: landFormData.conflict_history || null,
          resolution_status: landFormData.resolution_status,
          notes: landFormData.notes || null
        }

        const { error: landError } = await supabase
          .from("land_tenure")
          .upsert(landUpsertData, {
            onConflict: "perhutanan_sosial_id"
          })

        if (landError) {
          console.error("Error updating land_tenure:", landError)
          throw new Error(`Gagal update data lahan: ${landError.message}`)
        }
      }

      // Refresh halaman untuk sinkronisasi data
      router.refresh()
      
      if (onSuccess) {
        onSuccess()
      }

      alert("Semua data berhasil diperbarui!")
    } catch (error: any) {
      console.error("Error updating data:", error)
      alert(`Gagal memperbarui data: ${error.message || "Silakan coba lagi."}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const skemaOptions = ["Hutan Desa", "Hutan Kemasyarakatan", "Hutan Tanaman Rakyat", "Hutan Adat", "Kemitraan Kehutanan", "LPHD"]
  const statusOptions: { value: PsStatus; label: string }[] = [
    { value: "SEHAT", label: "Sehat" },
    { value: "PERLU_PENDAMPINGAN", label: "Perlu Pendampingan" },
    { value: "RISIKO", label: "Risiko" },
  ]

  const lembagaInfo = getLembagaInfo(psFormData.skema)

  if (loadingExistingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data yang ada...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Data Komprehensif PS</h3>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Section 1: Informasi Dasar PS */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b pb-2">Informasi Dasar Perhutanan Sosial</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="namaPs">Nama PS</Label>
              <Input
                id="namaPs"
                name="namaPs"
                value={psFormData.namaPs}
                onChange={handlePsChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desa">Desa</Label>
              <Input
                id="desa"
                name="desa"
                value={psFormData.desa}
                onChange={handlePsChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kecamatan">Kecamatan</Label>
              <Input
                id="kecamatan"
                name="kecamatan"
                value={psFormData.kecamatan}
                onChange={handlePsChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skema">Skema</Label>
              <Select
                value={psFormData.skema}
                onValueChange={(value) => handlePsSelectChange("skema", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih skema" />
                </SelectTrigger>
                <SelectContent>
                  {skemaOptions.map((skema) => (
                    <SelectItem key={skema} value={skema}>
                      {skema}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="luasHa">Luas (Ha)</Label>
              <Input
                id="luasHa"
                name="luasHa"
                type="number"
                value={psFormData.luasHa}
                onChange={handlePsChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tahunSk">Tahun SK</Label>
              <Input
                id="tahunSk"
                name="tahunSk"
                type="number"
                value={psFormData.tahunSk}
                onChange={handlePsChange}
                min="1900"
                max="2100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={psFormData.status}
                onValueChange={(value) => handlePsSelectChange("status", value as PsStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fasilitator">Fasilitator (Yayasan/Organisasi)</Label>
              <Input
                id="fasilitator"
                name="fasilitator"
                value={psFormData.fasilitator}
                onChange={handlePsChange}
                placeholder="Contoh: Yayasan AMAL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="namaPendamping">Nama Pendamping (Person)</Label>
              <Input
                id="namaPendamping"
                name="namaPendamping"
                value={psFormData.namaPendamping}
                onChange={handlePsChange}
                placeholder="Nama individu pendamping"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Informasi Kelembagaan */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b pb-2">
            Informasi {lembagaInfo.singkatan}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lembagaNama">Nama {lembagaInfo.singkatan}</Label>
              <Input
                id="lembagaNama"
                name="lembagaNama"
                value={lembagaFormData.lembagaNama}
                onChange={handleLembagaChange}
                placeholder={`Contoh: ${lembagaInfo.singkatan} ...`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lembagaKetua">Ketua PS</Label>
              <Input
                id="lembagaKetua"
                name="lembagaKetua"
                value={lembagaFormData.lembagaKetua}
                onChange={handleLembagaChange}
                placeholder="Nama ketua"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lembagaJumlahAnggota">Jumlah Anggota</Label>
              <Input
                id="lembagaJumlahAnggota"
                name="lembagaJumlahAnggota"
                type="number"
                value={lembagaFormData.lembagaJumlahAnggota}
                onChange={handleLembagaChange}
                min="0"
                placeholder="Jumlah anggota"
              />
              <p className="text-xs text-gray-500">Kepala Keluarga</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lembagaKepalaDesa">Kepala Desa</Label>
              <Input
                id="lembagaKepalaDesa"
                name="lembagaKepalaDesa"
                value={lembagaFormData.lembagaKepalaDesa}
                onChange={handleLembagaChange}
                placeholder="Nama kepala desa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lembagaTeleponKetua">No. Handphone Ketua PS</Label>
              <Input
                id="lembagaTeleponKetua"
                name="lembagaTeleponKetua"
                value={lembagaFormData.lembagaTeleponKetua}
                onChange={handleLembagaChange}
                placeholder="Contoh: 081234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lembagaTeleponKepalaDesa">No. Handphone Kepala Desa</Label>
              <Input
                id="lembagaTeleponKepalaDesa"
                name="lembagaTeleponKepalaDesa"
                value={lembagaFormData.lembagaTeleponKepalaDesa}
                onChange={handleLembagaChange}
                placeholder="Contoh: 081234567890"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Informasi Kepemilikan Lahan */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b pb-2">Informasi Kepemilikan Lahan</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownership_status">Status Kepemilikan</Label>
              <Select
                value={landFormData.ownership_status}
                onValueChange={(value) => handleLandSelectChange("ownership_status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status kepemilikan" />
                </SelectTrigger>
                <SelectContent>
                  {OWNERSHIP_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_ha">Luas Lahan (hektar)</Label>
              <Input
                id="area_ha"
                name="area_ha"
                type="number"
                step="0.01"
                min="0"
                value={landFormData.area_ha}
                onChange={handleLandChange}
                placeholder="Contoh: 100.50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="land_certificate_number">Nomor Sertifikat</Label>
              <Input
                id="land_certificate_number"
                name="land_certificate_number"
                value={landFormData.land_certificate_number}
                onChange={handleLandChange}
                placeholder="Nomor sertifikat tanah"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate_date">Tanggal Sertifikat</Label>
              <Input
                id="certificate_date"
                name="certificate_date"
                type="date"
                value={landFormData.certificate_date}
                onChange={handleLandChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="government_involvement">Keterlibatan Pemerintah</Label>
              <Textarea
                id="government_involvement"
                name="government_involvement"
                value={landFormData.government_involvement}
                onChange={handleLandChange}
                placeholder="Deskripsi keterlibatan pemerintah dalam kepemilikan lahan"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ministry_engagement">Keterlibatan Kementerian</Label>
              <Textarea
                id="ministry_engagement"
                name="ministry_engagement"
                value={landFormData.ministry_engagement}
                onChange={handleLandChange}
                placeholder="Deskripsi keterlibatan kementerian terkait"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenges">Tantangan Kepastian Lahan</Label>
            <Textarea
              id="challenges"
              name="challenges"
              value={landFormData.challenges}
              onChange={handleLandChange}
              placeholder="Jelaskan tantangan terkait kepastian lahan"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conflict_history">Riwayat Konflik</Label>
            <Textarea
              id="conflict_history"
              name="conflict_history"
              value={landFormData.conflict_history}
              onChange={handleLandChange}
              placeholder="Jelaskan riwayat konflik lahan jika ada"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution_status">Status Resolusi Konflik</Label>
            <Select
              value={landFormData.resolution_status}
              onValueChange={(value) => handleLandSelectChange("resolution_status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih status resolusi" />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan Tambahan</Label>
            <Textarea
              id="notes"
              name="notes"
              value={landFormData.notes}
              onChange={handleLandChange}
              placeholder="Catatan lain terkait kepemilikan lahan"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Menyimpan Semua Data...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Semua Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}