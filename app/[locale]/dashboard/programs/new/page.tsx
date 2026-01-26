"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ProgramForm } from "@/components/dashboard/program-form"
import { Loader2 } from "lucide-react"

export default function NewProgramPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("viewer")
  const [canManage, setCanManage] = useState(false)

  // Extract optional pre-filled parameters
  const carbonProjectId = searchParams?.get("carbon_project_id") || undefined
  const perhutananSosialId = searchParams?.get("perhutanan_sosial_id") || undefined

  useEffect(() => {
    async function checkAuthAndRole() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Not authenticated, redirect to login
          router.push("/login")
          return
        }

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        
        const role = profile?.role || "viewer"
        setUserRole(role)
        
        // Check if user can manage programs (admin or program_planner)
        const canManagePrograms = role === "admin" || role === "program_planner"
        setCanManage(canManagePrograms)
        
        if (!canManagePrograms) {
          // Not authorized, redirect to programs list
          router.push("/dashboard/programs")
          return
        }
        
      } catch (error) {
        console.error("Error checking auth:", error)
        router.push("/dashboard/programs")
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndRole()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Memeriksa izin akses...</p>
        </div>
      </div>
    )
  }

  if (!canManage) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buat Program Baru</h1>
          <p className="text-muted-foreground">
            Tambahkan program baru untuk carbon project. Program dapat berupa Karbon, Pemberdayaan Ekonomi, Kapasitas, atau lainnya.
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <ProgramForm
            userRole={userRole}
            successRedirectUrl="/dashboard/programs"
            cancelRedirectUrl="/dashboard/programs"
            carbonProjectId={carbonProjectId}
            perhutananSosialId={perhutananSosialId}
          />
        </div>

        {/* Help information */}
        <div className="bg-muted/50 rounded-lg border p-6">
          <h3 className="font-medium text-lg mb-2">Informasi Penting</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-foreground font-medium">•</span>
              <span>Program <strong>Karbon</strong> wajib memilih Kategori Hutan (Mineral/Gambut) dan Aksi Mitigasi.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground font-medium">•</span>
              <span>Program <strong>Pemberdayaan Ekonomi</strong> dan <strong>Kapasitas</strong> tidak memerlukan Kategori Hutan.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground font-medium">•</span>
              <span>Aksi Mitigasi yang dipilih akan menjadi dasar untuk pembuatan DRAM nantinya.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground font-medium">•</span>
              <span>Pastikan Kode Program unik dan tidak duplikat dengan program lain.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground font-medium">•</span>
              <span>Program dapat dikaitkan dengan Carbon Project (opsional) dan wajib memilih Perhutanan Sosial.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
