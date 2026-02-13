import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, Edit, Trash2, Target, MapPin, Calendar, CheckCircle, XCircle,
  Users, DollarSign, FileText, AlertCircle, TreePine, BarChart3
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { canManagePrograms } from "@/lib/auth/rbac"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

// Helper function untuk format currency
function formatCurrency(amount: number): string {
  if (!amount) return "Rp 0"
  if (amount >= 1000000000) {
    return `Rp ${(amount / 1000000000).toFixed(2)} M`
  } else if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(2)} Jt`
  } else {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }
}

// Helper function untuk format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "Tidak tersedia"
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
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
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${colors[status] || colors.draft}`}>
      {icons[status] || icons.draft}
      {status.toUpperCase()}
    </span>
  )
}

// Program type badge
function ProgramTypeBadge({ type }: { type: string }) {
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
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${typeColors[type] || typeColors.LAINNYA}`}>
      {typeLabels[type] || type}
    </span>
  )
}

export default async function ProgramDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  console.log('ProgramDetailPage called with ID:', id)
  const supabase = await createClient()
  const canManage = await canManagePrograms()

  // Fetch program details with related data - simplified query to avoid relation errors
  console.log('Fetching program with ID:', id)
  
  // First try to fetch basic program data
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .single()

  if (programError || !program) {
    console.error('Error fetching program:', programError)
    notFound()
  }

  // Fetch related carbon project if carbon_project_id exists
  let carbonProjectsData = null
  if (program.carbon_project_id) {
    const { data: carbonProject } = await supabase
      .from("carbon_projects")
      .select("kode_project, nama_project")
      .eq("id", program.carbon_project_id)
      .single()
    
    if (carbonProject) {
      carbonProjectsData = carbonProject
    }
  }

  // Fetch perhutanan sosial if perhutanan_sosial_id exists (handle gracefully if relation doesn't exist)
  let perhutananSosialData = null
  if (program.perhutanan_sosial_id) {
    try {
      const { data: psData } = await supabase
        .from("perhutanan_sosial")
        .select("pemegang_izin, desa")
        .eq("id", program.perhutanan_sosial_id)
        .single()
      
      if (psData) {
        perhutananSosialData = psData
      }
    } catch (psError) {
      console.warn('Error fetching perhutanan sosial (relation may not exist):', psError)
      // Continue without perhutanan sosial data
    }
  }

  // Fetch program aksi mitigasi
  let programAksiMitigasiData = []
  try {
    const { data: aksiMitigasi } = await supabase
      .from("program_aksi_mitigasi")
      .select(`
        *,
        master_aksi_mitigasi(kode,nama_aksi,kelompok,deskripsi)
      `)
      .eq("program_id", id)
    
    if (aksiMitigasi) {
      programAksiMitigasiData = aksiMitigasi
    }
  } catch (aksiError) {
    console.warn('Error fetching program aksi mitigasi:', aksiError)
  }

  // Combine all data
  const programWithRelations = {
    ...program,
    carbon_projects: carbonProjectsData,
    perhutanan_sosial: perhutananSosialData,
    program_aksi_mitigasi: programAksiMitigasiData
  }

  // Fetch additional financial data - lebih detail
  const { data: budgetData } = await supabase
    .from("program_budgets")
    .select("*")
    .eq("program_id", id)
    .order("created_at", { ascending: false })

  // Fetch budget items untuk setiap anggaran
  let budgetItemsData: any[] = []
  if (budgetData && budgetData.length > 0) {
    for (const budget of budgetData) {
      const { data: items } = await supabase
        .from("program_budget_items")
        .select(`
          *,
          price_list:price_list_id (item_code, item_name, unit, category)
        `)
        .eq("program_budget_id", budget.id)
        .order("created_at", { ascending: false })
      
      if (items) {
        budgetItemsData.push(...items.map(item => ({
          ...item,
          program_budget_id: budget.id,
          budget_name: budget.budget_name,
          budget_code: budget.budget_code
        })))
      }
    }
  }

  // Fetch financial transactions terkait program ini
  const { data: financialTransactions } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("program_id", id)
    .order("transaction_date", { ascending: false })
    .limit(10)

  // Check if user is admin for delete permissions
  const { data: { session } } = await supabase.auth.getSession()
  let isAdmin = false
  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100 rounded-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild className="flex-shrink-0">
              <Link href="/dashboard/programs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{program.nama_program}</h1>
                <StatusBadge status={program.status} />
                <ProgramTypeBadge type={program.jenis_program} />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                  <span className="font-medium">Kode Program:</span> {program.kode_program}
                </span>
                <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                  <Calendar className="h-3 w-3" />
                  <span>Dibuat: {formatDate(program.created_at)}</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md">
                  <span className="font-medium">Terakhir diupdate:</span> {formatDate(program.updated_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href={`/dashboard/programs/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Program
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/dashboard/programs">
                Kembali ke Daftar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Program Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Program Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informasi Program
              </CardTitle>
              <CardDescription>
                Detail lengkap program termasuk tujuan, target, dan lokasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Tujuan Program</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {program.tujuan || "Tidak ada tujuan yang ditentukan"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Lokasi Spesifik
                  </h4>
                  <p className="text-gray-600">{program.lokasi_spesifik || "Tidak tersedia"}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Program
                  </h4>
                  <p className="text-gray-600">{program.target || "Tidak tersedia"}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Analisis Risiko
                </h4>
                <p className="text-gray-600 bg-red-50 p-3 rounded-lg">
                  {program.risiko || "Tidak ada analisis risiko yang ditentukan"}
                </p>
              </div>

              {program.kategori_hutan && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <TreePine className="h-4 w-4" />
                    Kategori Hutan
                  </h4>
                  <Badge variant={program.kategori_hutan === "MINERAL" ? "default" : "secondary"}>
                    {program.kategori_hutan === "MINERAL" ? "Hutan Mineral" : "Hutan Gambut"}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Data Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Carbon Project Card */}
            {program.carbon_project_id && program.carbon_projects && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Carbon Project Terkait
                  </CardTitle>
                  <CardDescription>
                    Carbon project yang menjadi induk program ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-700">Nama Project</h4>
                      <p className="text-gray-900 font-semibold">{program.carbon_projects.nama_project}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700">Kode Project</h4>
                      <p className="text-gray-600">{program.carbon_projects.kode_project}</p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/dashboard/carbon-projects/${program.carbon_project_id}`}>
                        Lihat Detail Carbon Project
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Perhutanan Sosial Card */}
            {program.perhutanan_sosial_id && program.perhutanan_sosial && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Perhutanan Sosial Terkait
                  </CardTitle>
                  <CardDescription>
                    Kelompok perhutanan sosial yang terlibat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-700">Pemegang Izin</h4>
                      <p className="text-gray-900 font-semibold">{program.perhutanan_sosial.pemegang_izin}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700">Desa</h4>
                      <p className="text-gray-600">{program.perhutanan_sosial.desa}</p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/dashboard/data`}>
                        Lihat Data Perhutanan Sosial
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Aksi Program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage && (
                <Button asChild className="w-full">
                  <Link href={`/dashboard/programs/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Program
                  </Link>
                </Button>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/dram?program_id=${id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Buat DRAM
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/programs/${id}/budget`}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Kelola Anggaran
                </Link>
              </Button>

              {isAdmin && (
                <div className="p-3 border border-red-200 bg-red-50 rounded-md">
                  <p className="text-sm text-red-700 mb-2">Hapus Program</p>
                  <p className="text-xs text-red-600 mb-3">
                    Untuk menghapus program, gunakan tombol hapus pada halaman daftar program.
                  </p>
                  <Button 
                    asChild
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-800 hover:bg-red-100"
                  >
                    <Link href="/dashboard/programs">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Ke Daftar Program
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status & Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Status Program</h4>
                <StatusBadge status={program.status} />
              </div>

              <div className="border-t my-4" />

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Jenis Program</h4>
                <ProgramTypeBadge type={program.jenis_program} />
              </div>

              <div className="border-t my-4" />

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Timestamps</h4>
                <div className="text-sm text-gray-600">
                  <p>Dibuat: {formatDate(program.created_at)}</p>
                  <p>Diupdate: {formatDate(program.updated_at)}</p>
                </div>
              </div>

              {program.total_budget && (
                <>
                  <div className="border-t my-4" />
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Total Anggaran
                    </h4>
                    <p className="text-lg font-bold text-green-700">
                      {formatCurrency(program.total_budget)}
                    </p>
                    <p className="text-xs text-gray-500">Status: {program.budget_status || "draft"}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Links Card */}
          <Card>
            <CardHeader>
              <CardTitle>Tautan Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/dashboard/programs">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Semua Program
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/dashboard/dram">
                  <FileText className="mr-2 h-4 w-4" />
                  DRAM Terkait
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/dashboard/finance/budgets">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Anggaran Program
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Aksi Mitigasi Section */}
      {program.program_aksi_mitigasi && program.program_aksi_mitigasi.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aksi Mitigasi Terkait</CardTitle>
            <CardDescription>
              Daftar aksi mitigasi yang telah ditetapkan untuk program ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Kode Aksi</th>
                    <th className="text-left py-3 px-4 font-medium">Nama Aksi</th>
                    <th className="text-left py-3 px-4 font-medium">Kelompok</th>
                    <th className="text-left py-3 px-4 font-medium">Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
                  {program.program_aksi_mitigasi.map((aksi: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">
                        {aksi.master_aksi_mitigasi?.kode || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        {aksi.master_aksi_mitigasi?.nama_aksi || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {aksi.master_aksi_mitigasi?.kelompok || "N/A"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {aksi.master_aksi_mitigasi?.deskripsi || "Tidak ada deskripsi"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Overview (if available) */}
      {budgetData && budgetData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Ringkasan Anggaran
            </CardTitle>
            <CardDescription>
              Data anggaran untuk program ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {budgetData.map((budget, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{budget.nama_budget || "Anggaran"}</h4>
                      <Badge variant={budget.status === 'approved' ? 'default' : 'secondary'}>
                        {budget.status}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(budget.total_amount || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Periode: {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {budget.notes || "Tidak ada catatan"}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Items Detail */}
      {budgetItemsData && budgetItemsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detail Item Anggaran
            </CardTitle>
            <CardDescription>
              Rincian item-item dalam anggaran program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Kode Anggaran</th>
                    <th className="text-left py-3 px-4 font-medium">Nama Item</th>
                    <th className="text-left py-3 px-4 font-medium">Kategori</th>
                    <th className="text-left py-3 px-4 font-medium">Kuantitas</th>
                    <th className="text-left py-3 px-4 font-medium">Harga Satuan</th>
                    <th className="text-left py-3 px-4 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetItemsData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{item.budget_code}</span>
                        <p className="text-xs text-gray-500">{item.budget_name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {item.category || item.price_list?.category || "N/A"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{item.quantity}</span>
                        <span className="text-xs text-gray-500 ml-1">{item.unit || item.price_list?.unit || ""}</span>
                      </td>
                      <td className="py-3 px-4">
                        {formatCurrency(item.unit_price || 0)}
                      </td>
                      <td className="py-3 px-4 font-bold text-green-700">
                        {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td colSpan={5} className="py-3 px-4 font-medium text-right">
                      Total Item Anggaran:
                    </td>
                    <td className="py-3 px-4 font-bold text-lg text-green-700">
                      {formatCurrency(budgetItemsData.reduce((sum, item) => 
                        sum + ((item.unit_price || 0) * (item.quantity || 1)), 0
                      ))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Transactions */}
      {financialTransactions && financialTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Transaksi Keuangan Terbaru
            </CardTitle>
            <CardDescription>
              10 transaksi keuangan terakhir untuk program ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-4 font-medium">Kode Transaksi</th>
                    <th className="text-left py-3 px-4 font-medium">Deskripsi</th>
                    <th className="text-left py-3 px-4 font-medium">Jenis</th>
                    <th className="text-left py-3 px-4 font-medium">Jumlah</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {financialTransactions.map((transaction, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {transaction.transaction_code}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{transaction.description}</p>
                        {transaction.notes && (
                          <p className="text-xs text-gray-600 mt-1">{transaction.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={transaction.transaction_type === 'income' ? 'default' : 'secondary'}>
                          {transaction.transaction_type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </Badge>
                      </td>
                      <td className={`py-3 px-4 font-bold ${
                        transaction.transaction_type === 'income' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={transaction.status === 'approved' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <Button asChild variant="outline">
                <Link href={`/dashboard/finance/transactions?program_id=${id}`}>
                  Lihat Semua Transaksi
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informational Footer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Catatan Penting</CardTitle>
          <CardDescription className="text-blue-700">
            Informasi tambahan tentang program ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Program ini terhubung dengan sistem DRAM dan PDD Generator</p>
            <p>• Data program digunakan untuk pelaporan dan monitoring</p>
            <p>• Perubahan status program memerlukan persetujuan sesuai workflow</p>
            <p>• Anggaran program dapat dikelola melalui menu Keuangan</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}