"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Filter,
  RefreshCw,
  Users,
  TreePine,
  Calendar,
  DollarSign,
  Target,
  ArrowRight,
  Loader2
} from "lucide-react"
import { hasPermission } from "@/lib/auth/rbac"
import { toast } from "sonner"

interface ProgramForReview {
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
  total_budget: number | null
  budget_status: string | null
  budget_notes: string | null
  logical_framework: any | null
  created_at: string
  submitted_at: string | null
  submitted_by: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  
  // Joined data
  carbon_projects: {
    kode_project: string
    nama_project: string
  } | null
  perhutanan_sosial: {
    pemegang_izin: string
    desa: string
    kecamatan: string
    kabupaten: string
  } | null
  submitter_profile: {
    full_name: string
    role: string
  } | null
}

export function ProgramApprovalManager() {
  const [loading, setLoading] = useState(true)
  const [programs, setPrograms] = useState<ProgramForReview[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramForReview[]>([])
  const [canApprove, setCanApprove] = useState(false)
  const [activeTab, setActiveTab] = useState("needs_review")
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [stats, setStats] = useState({
    needs_review: 0,
    under_review: 0,
    needs_revision: 0,
    total: 0
  })

  const supabase = createClient()

  useEffect(() => {
    checkPermissions()
    fetchPrograms()
  }, [])

  useEffect(() => {
    filterPrograms()
  }, [programs, activeTab])

  async function checkPermissions() {
    const hasApprovePermission = await hasPermission("FINANCIAL_BUDGET_MANAGE")
    setCanApprove(hasApprovePermission)
  }

  async function fetchPrograms() {
    setLoading(true)
    try {
      // Use the view created in migration: programs_needing_review
      // Or we can query programs with specific statuses
      const { data, error } = await supabase
        .from("programs")
        .select(`
          *,
          carbon_projects(kode_project, nama_project),
          perhutanan_sosial(pemegang_izin, desa, kecamatan, kabupaten),
          submitter_profile:submitted_by(full_name, role)
        `)
        .in("status", ["submitted_for_review", "under_review", "needs_revision"])
        .order("submitted_at", { ascending: false })

      if (error) throw error

      setPrograms(data || [])

      // Calculate stats
      if (data) {
        const needs_review = data.filter(p => p.status === "submitted_for_review").length
        const under_review = data.filter(p => p.status === "under_review").length
        const needs_revision = data.filter(p => p.status === "needs_revision").length
        
        setStats({
          needs_review,
          under_review,
          needs_revision,
          total: data.length
        })
      }

    } catch (error) {
      console.error("Error fetching programs for review:", error)
      toast.error("Gagal memuat program yang perlu review")
    } finally {
      setLoading(false)
    }
  }

  function filterPrograms() {
    let filtered = [...programs]

    if (activeTab === "needs_review") {
      filtered = filtered.filter(p => p.status === "submitted_for_review")
    } else if (activeTab === "under_review") {
      filtered = filtered.filter(p => p.status === "under_review")
    } else if (activeTab === "needs_revision") {
      filtered = filtered.filter(p => p.status === "needs_revision")
    }

    setFilteredPrograms(filtered)
  }

  async function handleApprove(programId: string, action: "approved" | "rejected" | "needs_revision") {
    if (!canApprove) {
      toast.error("Anda tidak memiliki izin untuk menyetujui program")
      return
    }

    setProcessing(programId)
    try {
      const response = await fetch(`/api/programs/${programId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: action,
          review_notes: reviewNotes[programId] || ""
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Gagal memproses approval")
      }

      toast.success(result.message || "Program berhasil diproses")

      // Refresh data
      fetchPrograms()
      setReviewNotes(prev => ({ ...prev, [programId]: "" }))

    } catch (error: any) {
      console.error("Error approving program:", error)
      toast.error(error.message || "Gagal memproses program")
    } finally {
      setProcessing(null)
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { color: string, label: string, icon: React.ReactNode }> = {
      draft: { color: "bg-gray-100 text-gray-800", label: "DRAFT", icon: <FileText className="h-3 w-3" /> },
      submitted_for_review: { color: "bg-blue-100 text-blue-800", label: "SUBMITTED", icon: <Clock className="h-3 w-3" /> },
      under_review: { color: "bg-yellow-100 text-yellow-800", label: "UNDER REVIEW", icon: <Eye className="h-3 w-3" /> },
      needs_revision: { color: "bg-orange-100 text-orange-800", label: "NEEDS REVISION", icon: <AlertCircle className="h-3 w-3" /> },
      approved: { color: "bg-green-100 text-green-800", label: "APPROVED", icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { color: "bg-red-100 text-red-800", label: "REJECTED", icon: <XCircle className="h-3 w-3" /> },
      active: { color: "bg-green-100 text-green-800", label: "ACTIVE", icon: <CheckCircle className="h-3 w-3" /> },
      completed: { color: "bg-purple-100 text-purple-800", label: "COMPLETED", icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { color: "bg-gray-100 text-gray-800", label: "CANCELLED", icon: <XCircle className="h-3 w-3" /> }
    }

    const config = statusConfig[status] || statusConfig.draft

    return (
      <Badge className={config.color}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    )
  }

  function getProgramTypeDisplay(type: string) {
    const types: Record<string, string> = {
      KARBON: "Proyek Karbon",
      PEMBERDAYAAN_EKONOMI: "Pemberdayaan Ekonomi",
      KAPASITAS: "Peningkatan Kapasitas",
      LAINNYA: "Program Lainnya"
    }
    return types[type] || type
  }

  function formatCurrency(amount: number | null) {
    if (!amount) return "Rp 0"
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading && programs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Approval Management</CardTitle>
          <CardDescription>Loading program data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Program Approval Management
          </h2>
          <p className="text-muted-foreground">
            Review dan approve program sebelum dapat digunakan di Carbon Projects dan Investor Dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchPrograms} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.needs_review}</div>
            <p className="text-xs text-muted-foreground">Baru dikirim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sedang Direview</CardTitle>
            <Eye className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.under_review}</div>
            <p className="text-xs text-muted-foreground">Dalam proses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Butuh Revisi</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needs_revision}</div>
            <p className="text-xs text-muted-foreground">Perlu perbaikan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Program perlu review</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Program Review Queue</CardTitle>
              <CardDescription>
                Program yang memerlukan review dan approval dari Finance Team
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={activeTab === "needs_review" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("needs_review")}
              >
                <Clock className="mr-2 h-3 w-3" />
                Needs Review ({stats.needs_review})
              </Button>
              <Button 
                variant={activeTab === "under_review" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("under_review")}
              >
                <Eye className="mr-2 h-3 w-3" />
                Under Review ({stats.under_review})
              </Button>
              <Button 
                variant={activeTab === "needs_revision" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveTab("needs_revision")}
              >
                <AlertCircle className="mr-2 h-3 w-3" />
                Needs Revision ({stats.needs_revision})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPrograms.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">Tidak ada program yang perlu review</h3>
              <p className="text-muted-foreground mt-2">
                Semua program sudah diproses atau belum ada yang dikirim untuk review.
              </p>
              <Button onClick={fetchPrograms} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPrograms.map((program) => (
                <Card key={program.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Program Header */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {getStatusBadge(program.status)}
                            <Badge variant="outline">
                              {getProgramTypeDisplay(program.jenis_program)}
                            </Badge>
                            {program.kategori_hutan && (
                              <Badge variant="outline">
                                <TreePine className="mr-1 h-3 w-3" />
                                {program.kategori_hutan}
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-xl font-bold mb-2">{program.nama_program}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>Kode: {program.kode_program}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Dikirim: {formatDate(program.submitted_at)}</span>
                            </div>
                            {program.submitter_profile && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>Oleh: {program.submitter_profile.full_name}</span>
                              </div>
                            )}
                          </div>

                          {/* Program Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-medium mb-2">Carbon Project</h4>
                              {program.carbon_projects ? (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                  <TreePine className="h-4 w-4 text-green-600" />
                                  <div>
                                    <div className="font-medium">{program.carbon_projects.nama_project}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {program.carbon_projects.kode_project}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">Tidak terhubung ke Carbon Project</div>
                              )}
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Perhutanan Sosial</h4>
                              {program.perhutanan_sosial ? (
                                <div className="p-2 bg-gray-50 rounded-md">
                                  <div className="font-medium">{program.perhutanan_sosial.pemegang_izin}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {program.perhutanan_sosial.desa}, {program.perhutanan_sosial.kecamatan}, {program.perhutanan_sosial.kabupaten}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">PS belum dipilih</div>
                              )}
                            </div>

                            {program.total_budget && program.total_budget > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Anggaran Program</h4>
                                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <div className="font-bold text-green-700">
                                    {formatCurrency(program.total_budget)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {program.tujuan && (
                              <div>
                                <h4 className="font-medium mb-2">Tujuan</h4>
                                <p className="text-sm">{program.tujuan}</p>
                              </div>
                            )}
                          </div>

                          {program.target && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-1">Target</h4>
                              <p className="text-sm text-muted-foreground">{program.target}</p>
                            </div>
                          )}

                          {program.risiko && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-1">Risiko yang Diidentifikasi</h4>
                              <p className="text-sm text-muted-foreground">{program.risiko}</p>
                            </div>
                          )}
                        </div>

                        {/* Review Actions */}
                        {canApprove && program.status !== "needs_revision" && (
                          <div className="md:w-1/3">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium mb-3">Review Actions</h4>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Catatan Review</label>
                                  <Textarea
                                    placeholder="Berikan catatan review atau permintaan revisi..."
                                    value={reviewNotes[program.id] || ""}
                                    onChange={(e) => setReviewNotes(prev => ({ ...prev, [program.id]: e.target.value }))}
                                    className="min-h-[80px]"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(program.id, "approved")}
                                    disabled={processing === program.id}
                                  >
                                    {processing === program.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Approve Program
                                  </Button>

                                  <Button
                                    variant="outline"
                                    className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                                    onClick={() => handleApprove(program.id, "needs_revision")}
                                    disabled={processing === program.id}
                                  >
                                    {processing === program.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Request Revision
                                  </Button>

                                  <Button
                                    variant="outline"
                                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => handleApprove(program.id, "rejected")}
                                    disabled={processing === program.id}
                                  >
                                    {processing === program.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Reject Program
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {program.status === "needs_revision" && (
                          <div className="md:w-1/3">
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                              <h4 className="font-medium mb-2 text-orange-800">Perlu Revisi</h4>
                              {program.review_notes && (
                                <div className="mb-3">
                                  <label className="text-sm font-medium text-orange-700 mb-1 block">Catatan Reviewer:</label>
                                  <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded">
                                    {program.review_notes}
                                  </p>
                                </div>
                              )}
                              <p className="text-sm text-orange-700 mb-3">
                                Program ini memerlukan revisi dari tim program sebelum dapat diapprove.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border-t my-4" />

                      {/* Additional Info */}
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>
                          Created: {formatDate(program.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Status: {program.status}</span>
                          {program.reviewed_at && (
                            <span>• Reviewed: {formatDate(program.reviewed_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <Target className="h-12 w-12 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Program Approval Workflow</h3>
              <p className="text-muted-foreground mt-2">
                Semua program harus melalui proses approval sebelum dapat digunakan di Carbon Projects dan Investor Dashboard.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <h4 className="font-medium mb-3">Workflow Steps:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <div className="font-medium">Draft Program</div>
                        <div className="text-sm text-muted-foreground">Program planner membuat draft program</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <div className="font-medium">Submit for Review</div>
                        <div className="text-sm text-muted-foreground">Program planner mengirim program untuk review finance team</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <div className="font-medium">Finance Review</div>
                        <div className="text-sm text-muted-foreground">Finance team review program dan anggaran</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <div className="font-medium">Approval/Rejection</div>
                        <div className="text-sm text-muted-foreground">Program diapprove atau ditolak dengan catatan</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Impact After Approval:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <ArrowRight className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Tampil di Carbon Projects</div>
                        <div className="text-sm text-muted-foreground">Program yang approved akan muncul di carbon projects</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ArrowRight className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Tampil di Investor Dashboard</div>
                        <div className="text-sm text-muted-foreground">Investor dapat melihat program yang sudah diapprove</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ArrowRight className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Dapat Diimplementasikan</div>
                        <div className="text-sm text-muted-foreground">Program implementer dapat mulai eksekusi</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ArrowRight className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Anggaran Aktif</div>
                        <div className="text-sm text-muted-foreground">Anggaran program dapat digunakan untuk transaksi</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">Important:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Hanya program dengan status <strong>"approved"</strong> yang akan tampil di Carbon Projects dan Investor Dashboard</li>
                  <li>• Program dengan status <strong>"draft"</strong> hanya dapat dilihat oleh program planner</li>
                  <li>• Program <strong>"needs_revision"</strong> akan dikembalikan ke program planner untuk perbaikan</li>
                  <li>• Program <strong>"rejected"</strong> tidak dapat diajukan kembali tanpa membuat program baru</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}