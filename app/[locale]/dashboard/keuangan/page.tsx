import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
  PieChart, 
  BarChart3,
  FileText,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Target,
  Building,
  TreePine,
  Shield,
  CheckCircle
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { FinancialControlsSection } from "@/components/dashboard/financial-controls-section"
import { FinancialReportsSection } from "@/components/dashboard/financial-reports-section"

export default async function FinancialDashboardPage() {
  const supabase = await createClient()

  // Fetch basic financial data (placeholder queries - will be expanded)
  const { data: donorsData } = await supabase
    .from("donors")
    .select("id, nama_donor, status")
    .limit(5)

  const { data: grantsData } = await supabase
    .from("grants")
    .select("id, nomor_grant, jumlah_dana, status, periode_mulai, periode_selesai")
    .limit(5)

  const { data: transactionsData } = await supabase
    .from("financial_transactions")
    .select("id, kode_transaksi, jumlah, jenis_transaksi, tanggal_transaksi, status_rekonsiliasi, ledger_id")
    .order("tanggal_transaksi", { ascending: false })
    .limit(10)

  // Fetch accounting ledgers for dual ledger system
  const { data: ledgersData } = await supabase
    .from("accounting_ledgers")
    .select("id, ledger_code, ledger_name, ledger_type, description, current_balance")
    .eq("is_active", true)
    .order("ledger_type")

  // Calculate basic stats (placeholder - real calculations will be implemented)
  const totalDonors = donorsData?.length || 0
  const totalGrants = grantsData?.length || 0
  const activeGrants = grantsData?.filter(g => g.status === 'active').length || 0
  const totalTransactions = transactionsData?.length || 0
  const pendingReconciliation = transactionsData?.filter(t => t.status_rekonsiliasi === 'pending').length || 0

  // Calculate total amounts (simplified)
  const totalGrantAmount = grantsData?.reduce((sum, grant) => sum + (grant.jumlah_dana || 0), 0) || 0
  const totalIncoming = transactionsData?.filter(t => t.jenis_transaksi === 'PENERIMAAN')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0) || 0
  const totalOutgoing = transactionsData?.filter(t => t.jenis_transaksi === 'PENGELUARAN')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0) || 0
  const netBalance = totalIncoming - totalOutgoing

  // Prepare ledger data
  const operationalLedgers = ledgersData?.filter(l => l.ledger_type === 'OPERATIONAL') || []
  const projectLedgers = ledgersData?.filter(l => l.ledger_type === 'PROJECT') || []
  const carbonLedgers = ledgersData?.filter(l => l.ledger_code === 'LEDGER-PRJ-CARBON') || []
  const socialLedgers = ledgersData?.filter(l => l.ledger_code === 'LEDGER-PRJ-SOCIAL') || []
  const implementationLedgers = ledgersData?.filter(l => l.ledger_code === 'LEDGER-PRJ-IMPLEMENTATION') || []

  // Alerts (placeholder)
  const alerts = [
    { id: 1, type: 'warning', message: '3 grants akan berakhir dalam 30 hari', icon: AlertCircle },
    { id: 2, type: 'info', message: '12 transaksi perlu rekonsiliasi', icon: FileText },
    { id: 3, type: 'success', message: 'Laporan Q1 2025 sudah disubmit', icon: CheckCircle },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Keuangan</h1>
        <p className="text-muted-foreground">
          Monitoring dan analisis keuangan untuk Perhutanan Sosial & Proyek Karbon
        </p>
      </div>

      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className={`border-l-4 ${
            alert.type === 'warning' ? 'border-l-yellow-500' :
            alert.type === 'info' ? 'border-l-blue-500' :
            'border-l-green-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <alert.icon className={`h-4 w-4 ${
                  alert.type === 'warning' ? 'text-yellow-500' :
                  alert.type === 'info' ? 'text-blue-500' :
                  'text-green-500'
                }`} />
                <CardTitle className="text-sm font-medium">
                  {alert.type === 'warning' ? 'Peringatan' : 
                   alert.type === 'info' ? 'Informasi' : 'Sukses'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{alert.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dana Grant</CardTitle>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Proyek & Program
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalGrantAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalGrants} grant ({activeGrants} aktif) • Termasuk dalam pembukuan Proyek
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Netto</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={totalIncoming >= totalOutgoing ? 'text-green-600' : 'text-red-600'}>
                {totalIncoming >= totalOutgoing ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                {' '}{((totalIncoming - totalOutgoing) / totalIncoming * 100 || 0).toFixed(1)}%
              </span>{' '}dari penerimaan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {pendingReconciliation} perlu rekonsiliasi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Donor</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonors}</div>
            <p className="text-xs text-muted-foreground">
              Aktif: {donorsData?.filter(d => d.status === 'active').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dual Ledger Quick Actions - REPOSITIONED FOR VISIBILITY */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Operational Ledger Quick Actions */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Operasional Kantor</CardTitle>
                <CardDescription>
                  Pembukuan untuk biaya operasional kantor
                  {operationalLedgers.length > 0 && (
                    <span className="ml-2">
                      • Saldo: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(operationalLedgers[0].current_balance || 0)}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/dashboard/keuangan/transactions/new?ledger_type=OPERATIONAL">
                  <FileText className="mr-2 h-4 w-4" />
                  Tambah Transaksi Operasional
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/keuangan/budgets?ledger_type=OPERATIONAL">
                  <Target className="mr-2 h-4 w-4" />
                  Kelola Anggaran Kantor
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/keuangan/reports?ledger_type=OPERATIONAL">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Laporan Operasional
                </Link>
              </Button>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <Shield className="inline h-3 w-3 mr-1 text-blue-500" />
                  Dana terpisah: Tidak tercampur dengan dana proyek
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Ledger Quick Actions */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TreePine className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-lg">Proyek & Program</CardTitle>
                <CardDescription>
                  Pembukuan khusus untuk dana investor & donor
                  {projectLedgers.length > 0 && (
                    <span className="ml-2">
                      • Total Saldo: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                        projectLedgers.reduce((sum, ledger) => sum + (ledger.current_balance || 0), 0)
                      )}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start bg-green-600 hover:bg-green-700 text-white">
                <Link href="/dashboard/keuangan/transactions/new?ledger_type=PROJECT">
                  <FileText className="mr-2 h-4 w-4" />
                  Tambah Transaksi Proyek
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className="justify-start" variant="outline" size="sm">
                  <Link href="/dashboard/keuangan/budgets?ledger_code=LEDGER-PRJ-CARBON">
                    Anggaran Karbon
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline" size="sm">
                  <Link href="/dashboard/keuangan/budgets?ledger_code=LEDGER-PRJ-SOCIAL">
                    Anggaran PS
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline" size="sm">
                  <Link href="/dashboard/keuangan/budgets?ledger_code=LEDGER-PRJ-IMPLEMENTATION">
                    Anggaran Implementasi
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline" size="sm">
                  <Link href="/dashboard/keuangan/grants">
                    Kelola Grant
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline" size="sm">
                  <Link href="/dashboard/keuangan/reports?ledger_type=PROJECT">
                    Laporan Proyek
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline" size="sm">
                  <Link href="/dashboard/keuangan/donors">
                    Donor
                  </Link>
                </Button>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <Shield className="inline h-3 w-3 mr-1 text-green-500" />
                  100% dana investor: Tidak digunakan untuk operasional kantor
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Detailed Information */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>
              10 transaksi keuangan terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Kode</th>
                    <th className="text-left py-3 px-4 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-4 font-medium">Jenis</th>
                    <th className="text-left py-3 px-4 font-medium">Jumlah</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsData?.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm">{transaction.kode_transaksi}</td>
                      <td className="py-3 px-4">
                        {new Date(transaction.tanggal_transaksi).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={transaction.jenis_transaksi === 'PENERIMAAN' ? 'default' : 'secondary'}>
                          {transaction.jenis_transaksi}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transaction.jumlah || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          transaction.status_rekonsiliasi === 'reconciled' ? 'default' :
                          transaction.status_rekonsiliasi === 'pending' ? 'outline' : 'destructive'
                        }>
                          {transaction.status_rekonsiliasi}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/keuangan/transactions/${transaction.id}`}>
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(!transactionsData || transactionsData.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada transaksi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline">
                <Link href="/dashboard/keuangan/transactions">Lihat Semua Transaksi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Grants */}
        <Card>
          <CardHeader>
            <CardTitle>Grant Aktif</CardTitle>
            <CardDescription>
              Grant dengan status aktif
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grantsData?.filter(g => g.status === 'active').map((grant) => (
                <div key={grant.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{grant.nomor_grant}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(grant.periode_mulai).toLocaleDateString('id-ID')} - {new Date(grant.periode_selesai).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(grant.jumlah_dana || 0)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      Aktif
                    </Badge>
                  </div>
                </div>
              ))}
              {(!grantsData || grantsData.filter(g => g.status === 'active').length === 0) && (
                <p className="text-center text-muted-foreground py-4">Tidak ada grant aktif</p>
              )}
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/keuangan/grants">Kelola Grant</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cost per Hectare</CardTitle>
            <CardDescription>
              Rata-rata biaya per hektar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 2.500.000</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-3 w-3 text-green-600" /> 5.2% dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cost per Ton Carbon</CardTitle>
            <CardDescription>
              Biaya per ton penyerapan karbon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 150.000</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-red-600" /> 3.1% dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <CardDescription>
              Rasio penggunaan dana grant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              22% dana tersisa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Phase 2 Financial Controls Section */}
      <FinancialControlsSection />

      {/* Phase 3 Reporting & Analytics Section */}
      <FinancialReportsSection />
    </div>
  )
}

