"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X, SquarePen } from "lucide-react"

interface Lembaga {
  id: string
  nama: string
  ketua: string | null
  jumlah_anggota: number | null
  kepala_desa: string | null
  created_at: string
  updated_at: string
}

interface EditLembagaFormProps {
  lembaga: Lembaga | null
  psId: string
  skema: string | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditLembagaForm({ lembaga, psId, skema, onSuccess, onCancel }: EditLembagaFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nama: lembaga?.nama || "",
    ketua: lembaga?.ketua || "",
    jumlah_anggota: lembaga?.jumlah_anggota || 0,
    kepala_desa: lembaga?.kepala_desa || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // DEBUG: Fetch user profile to check role before attempting update
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, full_name")
          .eq("id", user.id)
          .single()

        console.log("🔍 DEBUG - User Profile:", {
          userId: user.id,
          userEmail: user.email,
          profile: profile,
          profileError: profileError,
          hasProfile: !!profile,
          userRole: profile?.role || "NO ROLE",
          canEdit: profile?.role === 'admin' || profile?.role === 'monev'
        })

        // Provide helpful error if profile doesn't exist
        if (profileError && profileError.code === 'PGRST116') {
          console.error("❌ Profile not found for user:", user.id)
          alert("Profile tidak ditemukan. Silakan hubungi administrator untuk membuat profile dengan role yang sesuai.")
          setIsSubmitting(false)
          return
        }

        // Check role before attempting update
        if (!profile || (profile.role !== 'admin' && profile.role !== 'monev')) {
          console.warn("⚠️ User does not have permission to edit:", {
            role: profile?.role || 'NO ROLE',
            required: ['admin', 'monev']
          })
          alert(`Akses ditolak. Role Anda: ${profile?.role || 'tidak ada'}. Hanya admin dan monev yang dapat mengedit data.`)
          setIsSubmitting(false)
          return
        }
      } else {
        console.error("❌ No authenticated user found")
        alert("Anda belum login. Silakan login terlebih dahulu.")
        setIsSubmitting(false)
        return
      }

      // Upsert data ke tabel lembaga_pengelola
      const upsertData = {
        perhutanan_sosial_id: psId,
        nama: formData.nama.trim() || null,
        ketua: formData.ketua.trim() || null,
        jumlah_anggota: formData.jumlah_anggota || null,
        kepala_desa: formData.kepala_desa.trim() || null,
      }

      console.log("🔍 DEBUG - Attempting upsert with data:", upsertData)

      const { data, error } = await supabase
        .from("lembaga_pengelola")
        .upsert(upsertData, {
          onConflict: "perhutanan_sosial_id"
        })
        .select()

      console.log("🔍 DEBUG - Upsert result:", { 
        hasData: !!data, 
        hasError: !!error,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : null
      })

      if (error) {
        console.error("❌ Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        throw error
      }

      // Refresh halaman untuk sinkronisasi data
      router.refresh()
      
      // Panggil callback onSuccess jika tersedia
      if (onSuccess) {
        onSuccess()
      }

      alert("Data kelembagaan berhasil diperbarui!")
    } catch (error: any) {
      // Enhanced error logging
      console.error("❌ Error updating lembaga data")
      console.error("Error type:", typeof error)
      console.error("Error constructor:", error?.constructor?.name)
      console.error("Error message:", error?.message)
      console.error("Error details:", error?.details)
      console.error("Error hint:", error?.hint)
      console.error("Error code:", error?.code)
      console.error("Full error object:", error)
      
      // Extract error message more reliably from Supabase error objects
      let errorMessage = "Silakan coba lagi."
      
      if (error) {
        // Check various error message locations
        if (typeof error === 'string') {
          errorMessage = error
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.error_description) {
          errorMessage = error.error_description
        } else if (error.details) {
          errorMessage = error.details
        } else if (error.hint) {
          errorMessage = error.hint
        } else if (error.code) {
          // Supabase sometimes puts error info in code
          errorMessage = `Error code: ${error.code}`
        } else {
          // Try to stringify the error object for debugging
          try {
            const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
            if (errorStr && errorStr !== '{}' && errorStr.length < 500) {
              errorMessage = errorStr
            } else if (errorStr && errorStr.length >= 500) {
              errorMessage = "Terjadi kesalahan saat memperbarui data. Pastikan Anda memiliki izin yang cukup (role: admin atau monev)."
            }
          } catch (stringifyError) {
            // If stringify fails, try to get error properties manually
            console.error("Failed to stringify error:", stringifyError)
            const errorProps = Object.getOwnPropertyNames(error).reduce((acc, key) => {
              try {
                acc[key] = error[key]
              } catch {
                acc[key] = '[unable to access]'
              }
              return acc
            }, {} as Record<string, any>)
            errorMessage = JSON.stringify(errorProps, null, 2) || "Terjadi kesalahan saat memperbarui data."
          }
        }
      }
      
      // Provide more helpful message for RLS errors
      if (errorMessage.includes('row-level security') || errorMessage.includes('RLS') || errorMessage.includes('permission denied') || errorMessage.includes('new row violates')) {
        errorMessage = "Akses ditolak. Pastikan akun Anda memiliki role 'admin' atau 'monev' di tabel profiles."
      }
      
      alert(`Gagal memperbarui data: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : parseFloat(value) || 0) : value
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SquarePen className="h-5 w-5" />
              Edit Data Kelembagaan
            </CardTitle>
            <CardDescription>
              Ubah informasi kelembagaan perhutanan sosial
            </CardDescription>
          </div>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lembaga</Label>
              <Input
                id="nama"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                placeholder="Nama lembaga pengelola"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ketua">Ketua PS</Label>
              <Input
                id="ketua"
                name="ketua"
                value={formData.ketua}
                onChange={handleChange}
                placeholder="Nama ketua"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumlah_anggota">Jumlah Anggota</Label>
              <Input
                id="jumlah_anggota"
                name="jumlah_anggota"
                type="number"
                value={formData.jumlah_anggota}
                onChange={handleChange}
                min="0"
                placeholder="Jumlah anggota"
              />
              <p className="text-xs text-gray-500">Kepala Keluarga</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kepala_desa">Kepala Desa</Label>
              <Input
                id="kepala_desa"
                name="kepala_desa"
                value={formData.kepala_desa}
                onChange={handleChange}
                placeholder="Nama kepala desa"
              />
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
      </CardContent>
    </Card>
  )
}
