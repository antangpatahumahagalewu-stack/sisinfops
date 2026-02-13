"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Plus, Eye, Edit, Trash2, ArrowUpRight, CheckCircle, XCircle, Link as LinkIcon, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Program {
  id: string
  kode_program: string
  nama_program: string
  jenis_program: string
  kategori_hutan: string | null
  tujuan: string | null
  lokasi_spesifik: string | null
  target: string | null
  risiko: string | null
  carbon_project_id: string | null
  perhutanan_sosial_id: string | null
  status: string
  created_at: string
  carbon_projects: {
    kode_project: string
    nama_project: string
  } | null
  perhutanan_sosial: {
    pemegang_izin: string
    desa: string
  } | null
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("viewer")
  const [canManage, setCanManage] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  // Load user role and permissions
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        
        const role = profile?.role || "viewer"
        setUserRole(role)
        setCanManage(role === "admin" || role === "program_planner")
        setIsAdmin(role === "admin")
      }
    }
    loadUser()
  }, [])

  // Load programs and related data
  useEffect(() => {
    async function loadPrograms() {
      setLoading(true)
      try {
        // First, fetch programs
        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("*")
          .order("created_at", { ascending: false })

        if (programsError) {
          console.error("Error fetching programs:", programsError)
          toast.error("Gagal memuat program")
          return
        }

        if (!programsData || programsData.length === 0) {
          setPrograms([])
          setLoading(false)
          return
        }

        // Get IDs for related data
        const carbonProjectIds = programsData.map(p => p.carbon_project_id).filter(Boolean) as string[]
        const psIds = programsData.map(p => p.perhutanan_sosial_id).filter(Boolean) as string[]

        // Fetch carbon projects
        let carbonProjectsMap = new Map()
        if (carbonProjectIds.length > 0) {
          const { data: carbonProjects } = await supabase
            .from("carbon_projects")
            .select("id, kode_project, nama_project")
            .in("id", carbonProjectIds)
          
          if (carbonProjects) {
            carbonProjects.forEach(cp => {
              carbonProjectsMap.set(cp.id, cp)
            })
          }
        }

        // Fetch perhutanan sosial
        let psMap = new Map()
        if (psIds.length > 0) {
          const { data: psData } = await supabase
            .from("perhutanan_sosial")
            .select("id, pemegang_izin, desa")
            .in("id", psIds)
          
          if (psData) {
            psData.forEach(ps => {
              psMap.set(ps.id, ps)
            })
          }
        }

        // Attach related data to programs
        const programsWithRelations = programsData.map(program => ({
          ...program,
          carbon_projects: carbonProjectsMap.get(program.carbon_project_id) || null,
          perhutanan_sosial: psMap.get(program.perhutanan_sosial_id) || null
        })) as Program[]

        setPrograms(programsWithRelations)

      } catch (error) {
        console.error("Error loading programs:", error)
        toast.error("Terjadi kesalahan saat memuat program")
      } finally {
        setLoading(false)
      }
    }

    loadPrograms()
  }, [])

  // Delete program function
  const handleDeleteProgram = async (programId: string, programName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus program "${programName}"?`)) {
      return
    }

    setDeletingId(programId)
    try {
      console.log('Attempting to delete program:', programId, 'by user with role:', userRole, 'isAdmin:', isAdmin)
      
      const response = await fetch(`/api/programs/${programId}`, {
        method: "DELETE",
      })

      const result = await response.json()
      console.log('Delete API response:', response.status, result)

      if (!response.ok) {
        const errorMsg = result.error || "Gagal menghapus program"
        console.error('Delete failed:', errorMsg, 'Status:', response.status)
        throw new Error(errorMsg)
      }

      // Remove program from state
      setPrograms(prev => prev.filter(p => p.id !== programId))
      
      toast.success("Program berhasil dihapus", {
        description: `Program "${programName}" telah dihapus.`,
        duration: 5000,
      })

    } catch (error: any) {
      console.error("Error deleting program:", error)
      toast.error("Gagal menghapus program", {
        description: error.message || "Terjadi kesalahan",
        duration: 5000,
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      approved: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-purple-100 text-purple-800",
      cancelled: "bg-red-100 text-red-800"
    }

    const icons: Record<string, React.ReactNode> = {
      draft: <span className="h-2 w-2 rounded-full bg-gray-400" />,
      approved: <CheckCircle className="h-3 w-3" />,
      active: <CheckCircle className="h-3 w-3" />,
      completed: <CheckCircle className="h-3 w-3" />,
      cancelled: <XCircle className="h-3 w-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.draft}`}>
        {icons[status] || icons.draft}
        {status.toUpperCase()}
      </span>
    )
  }

  // Program type badge
  const ProgramTypeBadge = ({ type }: { type: string }) => {
    const typeColors: Record<string, string> = {
      KARBON: "bg-green-100 text-green-800",
      PEMBERDAYAAN_EKONOMI: "bg-blue-100 text-blue-800",
      KAPASITAS: "bg-yellow-100 text-yellow-800",
      LAINNYA: "bg-gray-100 text-gray-800"
    }

    const typeLabels: Record<string, string> = {
      KARBON: "Karbon",
      PEMBERDAYAAN_EKONOMI: "Pemberdayaan Ekonomi",
      KAPASITAS: "Kapasitas",
      LAINNYA: "Lainnya"
    }

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${typeColors[type] || typeColors.LAINNYA}`}>
        {typeLabels[type] || type}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Memuat data program...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Program Management</h1>
          <p className="text-muted-foreground">
            Kelola program dalam proyek karbon: Karbon, Pemberdayaan Ekonomi PS, Kapasitas
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/programs/new">
            <Plus className="mr-2 h-4 w-4" />
            Program Baru
          </Link>
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Program</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {programs?.filter(p => p.status === 'active').length || 0} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jenis Program</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(programs?.map(p => p.jenis_program).filter(Boolean))).length}
            </div>
            <p className="text-xs text-muted-foreground">Kategori berbeda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbon Projects</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(programs?.map(p => p.carbon_project_id).filter(Boolean))).length}
            </div>
            <p className="text-xs text-muted-foreground">Project terhubung</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PS Terlibat</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(programs?.map(p => p.perhutanan_sosial_id).filter(Boolean))).length}
            </div>
            <p className="text-xs text-muted-foreground">Perhutanan Sosial</p>
          </CardContent>
        </Card>
      </div>

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Program</CardTitle>
          <CardDescription>
            Semua program yang terdaftar dalam sistem, terhubung ke Carbon Project dan PS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {programs && programs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Kode Program</th>
                    <th className="text-left py-3 px-4 font-medium">Nama Program</th>
                    <th className="text-left py-3 px-4 font-medium">Jenis</th>
                    <th className="text-left py-3 px-4 font-medium">Carbon Project</th>
                    <th className="text-left py-3 px-4 font-medium">PS</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr key={program.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{program.kode_program}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{program.nama_program}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {program.tujuan?.substring(0, 60)}...
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <ProgramTypeBadge type={program.jenis_program} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{program.carbon_projects?.nama_project}</span>
                          <span className="text-xs text-muted-foreground">
                            ({program.carbon_projects?.kode_project})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {program.perhutanan_sosial?.pemegang_izin}
                          <div className="text-xs text-muted-foreground">
                            {program.perhutanan_sosial?.desa}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={program.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/programs/${program.id}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                          {canManage && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/programs/${program.id}/edit`}>
                                <Edit className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                          {isAdmin && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeleteProgram(program.id, program.nama_program)}
                              disabled={deletingId === program.id}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              {deletingId === program.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Belum ada Program</h3>
              <p className="text-muted-foreground mt-2">
                Mulai dengan membuat program pertama Anda dalam carbon project.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/programs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Buat Program
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Output Program Management
          </CardTitle>
          <CardDescription className="text-green-700">
            Setiap program menghasilkan input untuk DRAM dan PDD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-green-800 mb-2">Input untuk DRAM:</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Tujuan dan sasaran program</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Lokasi spesifik dan target</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Analisis risiko</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Logical Framework</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-800 mb-2">Input untuk PDD:</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Program Activities section</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Community Benefit data</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Stakeholder mapping</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Leakage control evidence</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Hubungkan ke Carbon Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Program harus terhubung ke Carbon Project untuk konsistensi data.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/carbon-projects">
                Lihat Carbon Projects
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pilih Perhutanan Sosial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Tentukan PS yang akan terlibat dalam program.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/data">
                Lihat Data PS
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Lanjut ke DRAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Setelah program dibuat, lanjutkan dengan membuat DRAM.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/dram">
                Buat DRAM
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}