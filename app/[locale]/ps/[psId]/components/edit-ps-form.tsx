"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { PsProfile, PsStatus } from "../types"
import { Pencil, Save, X, Building2, Users, Users2, Briefcase, Home } from "lucide-react"

interface EditPsFormProps {
  ps: PsProfile
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

export function EditPsForm({ ps, onSuccess, onCancel }: EditPsFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    namaPs: ps.namaPs,
    desa: ps.desa,
    kecamatan: ps.kecamatan,
    skema: ps.skema,
    luasHa: ps.luasHa,
    tahunSk: ps.tahunSk,
    status: ps.status,
    fasilitator: ps.fasilitator || "",
    namaPendamping: ps.namaPendamping || "",
    lembagaNama: ps.lembaga.nama || "",
    lembagaKetua: ps.lembaga.ketua,
    lembagaJumlahAnggota: ps.lembaga.jumlahAnggota,
    lembagaKepalaDesa: ps.lembaga.kepalaDesa || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Log data yang akan diupdate untuk debugging
      console.log("Updating PS data:", {
        id: ps.id,
        data: {
          pemegang_izin: formData.namaPs,
          desa: formData.desa,
          kecamatan: formData.kecamatan,
          skema: formData.skema,
          luas_ha: formData.luasHa,
          tanggal_sk: `${formData.tahunSk}-01-01`,
          jumlah_kk: formData.lembagaJumlahAnggota,
        },
        lembaga: {
          nama: formData.lembagaNama,
          ketua: formData.lembagaKetua,
          jumlah_anggota: formData.lembagaJumlahAnggota,
          kepala_desa: formData.lembagaKepalaDesa || null,
        }
      })

      // Check if skema or pemegang_izin changed (these trigger auto-update of nama)
      const skemaChanged = ps.skema !== formData.skema
      const pemegangIzinChanged = ps.namaPs !== formData.namaPs
      const shouldAutoUpdateNama = skemaChanged || pemegangIzinChanged

      // Check if lembaga_pengelola record exists for this PS
      const { data: existingLembaga, error: fetchLembagaError } = await supabase
        .from("lembaga_pengelola")
        .select("id, nama")
        .eq("perhutanan_sosial_id", ps.id)
        .maybeSingle()

      if (fetchLembagaError) {
        console.error("Error fetching lembaga_pengelola:", fetchLembagaError)
        // Continue but assume it doesn't exist
      }
      const lembagaExists = !!existingLembaga

      // Step 1: Update data di tabel perhutanan_sosial
      // This will trigger cascade_ps_to_lembaga_update_trigger which will:
      // - Auto-update nama lembaga if skema or pemegang_izin changed
      // - Sync jumlah_anggota with jumlah_kk
      const { data: psData, error: psError } = await supabase
        .from("perhutanan_sosial")
        .update({
          pemegang_izin: formData.namaPs,
          desa: formData.desa,
          kecamatan: formData.kecamatan,
          skema: formData.skema,
          luas_ha: formData.luasHa,
          tanggal_sk: `${formData.tahunSk}-01-01`, // Format tanggal sederhana
          jumlah_kk: formData.lembagaJumlahAnggota,
          ketua_ps: formData.lembagaKetua, // Tambahkan ketua_ps langsung ke perhutanan_sosial
          kepala_desa: formData.lembagaKepalaDesa || null, // Tambahkan kepala_desa langsung ke perhutanan_sosial
        })
        .eq("id", ps.id)
        .select()

      console.log("Update perhutanan_sosial result:", { data: psData, error: psError })

      if (psError) {
        console.error("Error updating perhutanan_sosial:", psError)
        // Convert error to a more descriptive string
        const errorMessage = psError.message || 
                            (typeof psError === 'object' ? JSON.stringify(psError) : String(psError)) || 
                            "Unknown error"
        throw new Error(`Failed to update perhutanan_sosial: ${errorMessage}`)
      }

      // Step 2: Clean up any duplicate lembaga_pengelola records for this PS
      const { data: allLembaga, error: fetchAllError } = await supabase
        .from('lembaga_pengelola')
        .select('id, created_at')
        .eq('perhutanan_sosial_id', ps.id)
        .order('created_at', { ascending: false })

      if (!fetchAllError && allLembaga && allLembaga.length > 1) {
        // Keep the latest one, delete the rest
        const idsToDelete = allLembaga.slice(1).map(record => record.id)
        const { error: deleteError } = await supabase
          .from('lembaga_pengelola')
          .delete()
          .in('id', idsToDelete)
        
        if (deleteError) {
          console.error('Error deleting duplicate lembaga_pengelola records:', deleteError)
        } else {
          console.log(`Deleted ${idsToDelete.length} duplicate lembaga_pengelola records for PS ${ps.id}`)
        }
      }

      // Step 3: Update lembaga_pengelola for fields not in perhutanan_sosial
      const lembagaUpdateData: any = {
        perhutanan_sosial_id: ps.id,
        ketua: formData.lembagaKetua,
        kepala_desa: formData.lembagaKepalaDesa || null,
      }

      // Logic for including nama in the upsert:
      // 1. If lembaga record doesn't exist, we MUST provide a non-null nama
      // 2. If lembaga exists and skema/pemegang_izin changed, the trigger will update nama
      // 3. If lembaga exists and skema/pemegang_izin didn't change, we use user's input (if provided)
      
      if (!lembagaExists) {
        // For new record, we must provide a non-empty nama
        const newNama = formData.lembagaNama.trim() || `${formData.skema} - ${formData.namaPs}`
        lembagaUpdateData.nama = newNama
        console.log("New lembaga record, setting nama to:", newNama)
      } else {
        // For existing record, we need to check the existing nama value
        const existingNama = existingLembaga?.nama || ""
        const hasExistingNama = existingNama.trim() !== ""
        
        if (!shouldAutoUpdateNama) {
          // User is not changing skema or pemegang_izin
          if (formData.lembagaNama.trim() !== "") {
            // User provided a new nama
            lembagaUpdateData.nama = formData.lembagaNama.trim()
            console.log("Updating existing lembaga nama to:", formData.lembagaNama.trim())
          } else if (!hasExistingNama) {
            // User didn't provide nama and existing nama is empty, provide a default
            lembagaUpdateData.nama = `${formData.skema} - ${formData.namaPs}`
            console.log("Existing nama is empty, setting default:", lembagaUpdateData.nama)
          } else {
            // User didn't provide nama and existing nama is not empty, keep existing
            console.log("User provided empty nama, keeping existing value")
          }
        } else {
          // shouldAutoUpdateNama is true - trigger will update nama
          // But if existing nama is empty, we should set a default to satisfy not-null constraint
          if (!hasExistingNama) {
            lembagaUpdateData.nama = `${formData.skema} - ${formData.namaPs}`
            console.log("Trigger will update nama, but existing is empty, setting default:", lembagaUpdateData.nama)
          } else {
            console.log("Trigger will update nama, existing nama is not empty")
          }
        }
      }

      // jumlah_anggota is synced with jumlah_kk by trigger, but we include it
      // in case the trigger hasn't run yet (shouldn't happen, but for safety)
      lembagaUpdateData.jumlah_anggota = formData.lembagaJumlahAnggota

      console.log("Final lembagaUpdateData:", lembagaUpdateData)

      // Try to update the existing lembaga_pengelola record
      const { data: updatedLembaga, error: updateError } = await supabase
        .from('lembaga_pengelola')
        .update(lembagaUpdateData)
        .eq('perhutanan_sosial_id', ps.id)
        .select()

      console.log("Update lembaga_pengelola result:", { data: updatedLembaga, error: updateError })

      if (updateError) {
        console.error('Error updating lembaga_pengelola:', updateError)
        // If the record doesn't exist, insert it
        const { data: insertedLembaga, error: insertError } = await supabase
          .from('lembaga_pengelola')
          .insert([lembagaUpdateData])
          .select()

        if (insertError) {
          console.error("Error inserting lembaga_pengelola:", insertError)
          const errorMessage = insertError.message || 
                              (typeof insertError === 'object' ? JSON.stringify(insertError) : String(insertError)) || 
                              "Unknown error"
          throw new Error(`Failed to update or insert lembaga_pengelola: ${errorMessage}`)
        }
      }

      // Step 3: Update status fields if status changed
      // Map status back to rkps_status and peta_status if needed
      // Note: Status is derived from rkps_status and peta_status in the UI
      // We don't update it directly, but we could add logic here if needed

      // Refresh halaman untuk memperbarui data
      router.refresh()
      
      if (onSuccess) {
        onSuccess()
      }

      alert("Data berhasil diperbarui! Semua data terkait telah terupdate secara otomatis.")
    } catch (error: any) {
      console.error("Error updating PS data:", error)
      alert(`Gagal memperbarui data: ${error.message || "Silakan coba lagi."}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const statusOptions: { value: PsStatus; label: string }[] = [
    { value: "SEHAT", label: "Sehat" },
    { value: "PERLU_PENDAMPINGAN", label: "Perlu Pendampingan" },
    { value: "RISIKO", label: "Risiko" },
  ]

  const skemaOptions = ["Hutan Desa", "Hutan Kemasyarakatan", "Hutan Tanaman Rakyat", "Hutan Adat", "Kemitraan Kehutanan", "LPHD"]

  const lembagaInfo = getLembagaInfo(formData.skema)

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Data PS
          </h3>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Informasi Dasar */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Informasi Dasar</h4>
            
            <div className="space-y-2">
              <Label htmlFor="namaPs">Nama PS</Label>
              <Input
                id="namaPs"
                name="namaPs"
                value={formData.namaPs}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desa">Desa</Label>
              <Input
                id="desa"
                name="desa"
                value={formData.desa}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kecamatan">Kecamatan</Label>
              <Input
                id="kecamatan"
                name="kecamatan"
                value={formData.kecamatan}
                onChange={handleChange}
              />
            </div>

          </div>

          {/* Informasi Teknis */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Informasi Teknis</h4>
            
            <div className="space-y-2">
              <Label htmlFor="skema">Skema</Label>
              <Select
                value={formData.skema}
                onValueChange={(value) => handleSelectChange("skema", value)}
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
                value={formData.luasHa}
                onChange={handleChange}
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
                value={formData.tahunSk}
                onChange={handleChange}
                min="1900"
                max="2100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value as PsStatus)}
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
                value={formData.fasilitator}
                onChange={handleChange}
                placeholder="Contoh: Yayasan AMAL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="namaPendamping">Nama Pendamping (Person)</Label>
              <Input
                id="namaPendamping"
                name="namaPendamping"
                value={formData.namaPendamping}
                onChange={handleChange}
                placeholder="Nama individu pendamping"
              />
            </div>
          </div>

          {/* Informasi Lembaga */}
          <div className="space-y-4 md:col-span-2">
            <h4 className="font-medium text-gray-700">Informasi {lembagaInfo.singkatan}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lembagaNama">Nama {lembagaInfo.singkatan}</Label>
                <Input
                  id="lembagaNama"
                  name="lembagaNama"
                  value={formData.lembagaNama}
                  onChange={handleChange}
                  placeholder={`Contoh: ${lembagaInfo.singkatan} ...`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lembagaKetua">Ketua PS</Label>
                <Input
                  id="lembagaKetua"
                  name="lembagaKetua"
                  value={formData.lembagaKetua}
                  onChange={handleChange}
                  placeholder="Nama ketua"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lembagaJumlahAnggota">Jumlah Anggota</Label>
                <Input
                  id="lembagaJumlahAnggota"
                  name="lembagaJumlahAnggota"
                  type="number"
                  value={formData.lembagaJumlahAnggota}
                  onChange={handleChange}
                  min="0"
                  placeholder="Jumlah anggota"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lembagaKepalaDesa">Kepala Desa</Label>
                <Input
                  id="lembagaKepalaDesa"
                  name="lembagaKepalaDesa"
                  value={formData.lembagaKepalaDesa}
                  onChange={handleChange}
                  placeholder="Nama kepala desa"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
