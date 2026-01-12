import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Eye, Edit, Trash2, ArrowUpRight, CheckCircle, XCircle, Target, Calendar } from "lucide-react"
import Link from "next/link"
import { canManageDRAM } from "@/lib/auth/rbac"

export default async function DramPage() {
  const supabase = await createClient()
  const canManage = await canManageDRAM()

  // Fetch DRAM with related program and carbon project data
  const { data: dramList, error } = await supabase
    .from("dram")
    .select(`
      *,
      programs (
        kode_program,
        nama_program,
        carbon_projects (
          kode_project,
          nama_project
        )
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching DRAM:", error)
  }

  // Fetch programs for stats
  const { data: programs } = await supabase
    .from("programs")
    .select("id, status")

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      approved: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      evaluated: "bg-purple-100 text-purple-800",
      closed: "bg-gray-100 text-gray-800"
    }

    const icons: Record<string, React.ReactNode> = {
      draft: <span className="h-2 w-2 rounded-full bg-gray-400" />,
      approved: <CheckCircle className="h-3 w-3" />,
      active: <CheckCircle className="h-3 w-3" />,
      evaluated: <CheckCircle className="h-3 w-3" />,
      closed: <XCircle className="h-3 w-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.draft}`}>
        {icons[status] || icons.draft}
        {status.toUpperCase()}
      </span>
    )
  }

  // Calculate statistics
  const totalDram = dramList?.length || 0
  const activeDram = dramList?.filter(d => d.status === 'active').length || 0
  const draftDram = dramList?.filter(d => d.status === 'draft').length || 0
  const programsWithDram = Array.from(new Set(dramList?.map(d => d.program_id).filter(Boolean))).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DRAM Management</h1>
          <p className="text-muted-foreground">
            Dokumen Rencana Aksi Mitigasi - Core module untuk perencanaan program
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/dram/new">
              <Plus className="mr-2 h-4 w-4" />
              DRAM Baru
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total DRAM</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDram}</div>
            <p className="text-xs text-muted-foreground">
              {activeDram} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status DRAM</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDram}</div>
            <p className="text-xs text-muted-foreground">
              {draftDram} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Program dengan DRAM</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programsWithDram}</div>
            <p className="text-xs text-muted-foreground">
              dari {programs?.length || 0} program
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anggaran Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dramList?.reduce((sum, d) => sum + (d.anggaran_total || 0), 0).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">Rupiah</p>
          </CardContent>
        </Card>
      </div>

      {/* DRAM Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar DRAM</CardTitle>
          <CardDescription>
            Semua Dokumen Rencana Aksi Mitigasi dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dramList && dramList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Program</th>
                    <th className="text-left py-3 px-4 font-medium">Carbon Project</th>
                    <th className="text-left py-3 px-4 font-medium">Versi</th>
                    <th className="text-left py-3 px-4 font-medium">Tujuan Mitigasi</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Timeline</th>
                    <th className="text-left py-3 px-4 font-medium">Anggaran</th>
                    <th className="text-left py-3 px-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dramList.map((dram) => (
                    <tr key={dram.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{dram.programs?.nama_program}</div>
                          <div className="text-xs text-muted-foreground">
                            {dram.programs?.kode_program}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-sm">{dram.programs?.carbon_projects?.nama_project}</div>
                          <div className="text-xs text-muted-foreground">
                            {dram.programs?.carbon_projects?.kode_project}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">v{dram.versi}</td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs truncate">
                          {dram.tujuan_mitigasi?.substring(0, 80)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={dram.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {dram.timeline_start ? new Date(dram.timeline_start).toLocaleDateString('id-ID') : '-'}
                          {' → '}
                          {dram.timeline_end ? new Date(dram.timeline_end).toLocaleDateString('id-ID') : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {dram.anggaran_total ? `Rp ${dram.anggaran_total.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/dram/${dram.id}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                          {canManage && (
                            <>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/dram/${dram.id}/edit`}>
                                  <Edit className="h-3 w-3" />
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" disabled>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
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
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Belum ada DRAM</h3>
              <p className="text-muted-foreground mt-2">
                Mulai dengan membuat DRAM pertama Anda untuk program karbon.
              </p>
              {canManage && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/dram/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Buat DRAM
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Output DRAM Management
          </CardTitle>
          <CardDescription className="text-blue-700">
            DRAM berbentuk data aktif (bukan file statis) dengan fitur lengkap
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Fitur DRAM:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Tujuan Mitigasi yang terukur</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Aksi Mitigasi dengan target & indikator</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Timeline dan anggaran terperinci</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Penanggung jawab (PIC) untuk setiap aksi</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Status DRAM:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400 mt-1.5"></span>
                  <span><strong>draft</strong> - Masih dalam draft</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                  <span><strong>approved</strong> - Sudah disetujui</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>active</strong> - Sedang aktif</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />
                  <span><strong>evaluated</strong> - Sudah dievaluasi</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-500" />
                  <span><strong>closed</strong> - Sudah ditutup</span>
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
              <Target className="h-5 w-5" />
              Hubungkan ke Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              DRAM harus terhubung ke Program yang sudah ada.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/programs">
                Lihat Program
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aksi Mitigasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Setelah DRAM dibuat, tambahkan aksi mitigasi.
            </p>
            <Button asChild variant="outline" className="w-full" disabled>
              <Link href="#">
                Tambah Aksi
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lanjut ke Implementasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Setelah DRAM disetujui, lanjutkan dengan implementasi.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/implementasi">
                Implementasi Program
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
