"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  PieChart,
  FileText,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  PlusCircle,
  Eye,
  EyeOff,
  Banknote,
  CreditCard,
  Users,
  TreePine
} from "lucide-react"
import Link from "next/link"
import { hasPermission } from "@/lib/auth/rbac"

interface FinancialTransaction {
  id: string
  transaction_date: string
  transaction_number: string
  jenis_transaksi: "PENERIMAAN" | "PENGELUARAN" | "TRANSFER"
  jumlah_idr: number
  description: string
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID" | "RECONCILED"
  ledger_name: string
  created_by_name: string
}

interface LedgerBalance {
  ledger_code: string
  ledger_name: string
  opening_balance: number
  total_receipts: number
  total_payments: number
  closing_balance: number
}

interface BudgetStatus {
  budget_name: string
  total_amount: number
  utilized_amount: number
  remaining_amount: number
  utilization_percentage: number
}

export function FinancialDashboard() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [ledgerBalances, setLedgerBalances] = useState<LedgerBalance[]>([])
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([])
  const [canCreateTransaction, setCanCreateTransaction] = useState(false)
  const [canApproveTransaction, setCanApproveTransaction] = useState(false)
  const [canManageBudget, setCanManageBudget] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState("month")

  useEffect(() => {
    checkPermissions()
    fetchFinancialData()
  }, [dateRange])

  async function checkPermissions() {
    const canCreate = await hasPermission("FINANCIAL_TRANSACTION_CREATE")
    const canApprove = await hasPermission("FINANCIAL_TRANSACTION_APPROVE")
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE")
    
    setCanCreateTransaction(canCreate)
    setCanApproveTransaction(canApprove)
    setCanManageBudget(canManage)
  }

  async function fetchFinancialData() {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          transaction_date,
          transaction_number,
          jenis_transaksi,
          jumlah_idr,
          description,
          status,
          accounting_ledgers!inner(ledger_name),
          profiles!financial_transactions_created_by_fkey(full_name)
        `)
        .order("transaction_date", { ascending: false })
        .limit(10)

      if (transactionsError) throw transactionsError

      if (transactionsData) {
        const formattedTransactions: FinancialTransaction[] = transactionsData.map(tx => ({
          id: tx.id,
          transaction_date: tx.transaction_date,
          transaction_number: tx.transaction_number,
          jenis_transaksi: tx.jenis_transaksi,
          jumlah_idr: tx.jumlah_idr,
          description: tx.description,
          status: tx.status,
          ledger_name: tx.accounting_ledgers?.[0]?.ledger_name || "N/A",
          created_by_name: tx.profiles?.[0]?.full_name || "Unknown"
        }))
        setTransactions(formattedTransactions)
      }

      // Fetch ledger balances (simulated data for now)
      const mockLedgerBalances: LedgerBalance[] = [
        {
          ledger_code: "LEDGER-OPR",
          ledger_name: "Operasional Kantor",
          opening_balance: 100000000,
          total_receipts: 25000000,
          total_payments: 15000000,
          closing_balance: 110000000
        },
        {
          ledger_code: "LEDGER-PRJ-CARBON",
          ledger_name: "Proyek Karbon",
          opening_balance: 0,
          total_receipts: 500000000,
          total_payments: 300000000,
          closing_balance: 200000000
        },
        {
          ledger_code: "LEDGER-PRJ-SOSIAL",
          ledger_name: "Program Sosial",
          opening_balance: 50000000,
          total_receipts: 100000000,
          total_payments: 75000000,
          closing_balance: 75000000
        }
      ]
      setLedgerBalances(mockLedgerBalances)

      // Fetch budget status (simulated data for now)
      const mockBudgetStatus: BudgetStatus[] = [
        {
          budget_name: "Anggaran Operasional 2026",
          total_amount: 500000000,
          utilized_amount: 150000000,
          remaining_amount: 350000000,
          utilization_percentage: 30
        },
        {
          budget_name: "Anggaran Proyek Karbon 2026",
          total_amount: 1000000000,
          utilized_amount: 300000000,
          remaining_amount: 700000000,
          utilization_percentage: 30
        },
        {
          budget_name: "Anggaran Program Sosial 2026",
          total_amount: 300000000,
          utilized_amount: 75000000,
          remaining_amount: 225000000,
          utilization_percentage: 25
        }
      ]
      setBudgetStatus(mockBudgetStatus)

    } catch (error) {
      console.error("Error fetching financial data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary metrics
  const totalBalance = ledgerBalances.reduce((sum, ledger) => sum + ledger.closing_balance, 0)
  const totalReceipts = ledgerBalances.reduce((sum, ledger) => sum + ledger.total_receipts, 0)
  const totalPayments = ledgerBalances.reduce((sum, ledger) => sum + ledger.total_payments, 0)
  const netCashFlow = totalReceipts - totalPayments

  const pendingApprovals = transactions.filter(tx => 
    tx.status === "SUBMITTED" || tx.status === "DRAFT"
  ).length

  const budgetUtilization = budgetStatus.length > 0 
    ? budgetStatus.reduce((sum, budget) => sum + budget.utilization_percentage, 0) / budgetStatus.length
    : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Dashboard</CardTitle>
          <CardDescription>Loading financial data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
            <DollarSign className="h-6 w-6 text-green-600" />
            Financial Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time financial monitoring with SAK compliance - Dual Ledger System
          </p>
        </div>
        <div className="flex gap-3">
          {canCreateTransaction && (
            <Button asChild>
              <Link href="/dashboard/finance/transactions/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Transaction
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard/finance/reports">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              Rp {totalBalance.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-green-600">Across all ledgers</p>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              <span className="text-green-600">Rp {netCashFlow.toLocaleString('id-ID')} net flow</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netCashFlow >= 0 ? '+' : ''}Rp {Math.abs(netCashFlow).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-blue-600">This month</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="text-green-600">
                <div className="font-medium">Rp {totalReceipts.toLocaleString('id-ID')}</div>
                <div className="text-muted-foreground">Receipts</div>
              </div>
              <div className="text-red-600">
                <div className="font-medium">Rp {totalPayments.toLocaleString('id-ID')}</div>
                <div className="text-muted-foreground">Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{pendingApprovals}</div>
            <p className="text-xs text-yellow-600">Require action</p>
            {pendingApprovals > 0 && canApproveTransaction && (
              <Button size="sm" className="mt-2" asChild>
                <Link href="/dashboard/finance/approvals">
                  Review Now
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <PieChart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{budgetUtilization.toFixed(1)}%</div>
            <p className="text-xs text-purple-600">Average across budgets</p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">{budgetStatus.length} active budgets</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="ledgers">Ledgers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ledger Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Ledger Balances
                </CardTitle>
                <CardDescription>
                  Dual ledger system - Operational vs Project accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ledgerBalances.map((ledger) => (
                    <div key={ledger.ledger_code} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ledger.ledger_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {ledger.ledger_code}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Balance: Rp {ledger.closing_balance.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${ledger.total_receipts - ledger.total_payments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {ledger.total_receipts - ledger.total_payments >= 0 ? '+' : ''}
                          Rp {Math.abs(ledger.total_receipts - ledger.total_payments).toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-muted-foreground">Net flow</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Budget Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Budget Status
                </CardTitle>
                <CardDescription>
                  Budget utilization across programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetStatus.map((budget) => (
                    <div key={budget.budget_name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{budget.budget_name}</span>
                        <span>{budget.utilization_percentage}% utilized</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            budget.utilization_percentage < 50 ? 'bg-green-500' :
                            budget.utilization_percentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                          } transition-all duration-300`}
                          style={{ width: `${Math.min(budget.utilization_percentage, 100)}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total</div>
                          <div className="font-medium">Rp {budget.total_amount.toLocaleString('id-ID')}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Used</div>
                          <div className="font-medium">Rp {budget.utilized_amount.toLocaleString('id-ID')}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Remaining</div>
                          <div className="font-medium">Rp {budget.remaining_amount.toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {canManageBudget && (
                    <Button className="w-full mt-4" asChild>
                      <Link href="/dashboard/finance/budgets">
                        Manage Budgets
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                SAK Compliance Status
              </CardTitle>
              <CardDescription>
                Standar Akuntansi Indonesia compliance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm font-medium mt-1">Double-Entry</div>
                  <div className="text-xs text-muted-foreground">All transactions recorded</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">85%</div>
                  <div className="text-sm font-medium mt-1">Documentation</div>
                  <div className="text-xs text-muted-foreground">Supporting docs attached</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">95%</div>
                  <div className="text-sm font-medium mt-1">Audit Trail</div>
                  <div className="text-xs text-muted-foreground">Complete audit logs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    Latest financial transactions across all ledgers
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.transaction_number}</span>
                          <Badge variant={
                            transaction.status === "PAID" ? "default" :
                            transaction.status === "APPROVED" ? "secondary" :
                            transaction.status === "DRAFT" ? "outline" : "destructive"
                          } className="text-xs">
                            {transaction.status}
                          </Badge>
                          <Badge variant={
                            transaction.jenis_transaksi === "PENERIMAAN" ? "default" :
                            transaction.jenis_transaksi === "PENGELUARAN" ? "destructive" : "outline"
                          } className="text-xs">
                            {transaction.jenis_transaksi}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{transaction.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(transaction.transaction_date).toLocaleDateString('id-ID')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {transaction.ledger_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {transaction.created_by_name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          transaction.jenis_transaksi === "PENERIMAAN" ? "text-green-600" : "text-red-600"
                        }`}>
                          {transaction.jenis_transaksi === "PENERIMAAN" ? "+" : "-"}Rp {transaction.jumlah_idr.toLocaleString('id-ID')}
                        </div>
                        <Button size="sm" variant="ghost" asChild className="mt-2">
                          <Link href={`/dashboard/finance/transactions/${transaction.id}`}>
                            Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">No transactions yet</h3>
                  <p className="text-muted-foreground mt-2">
                    Start by creating your first financial transaction
                  </p>
                  {canCreateTransaction && (
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/finance/transactions/new">
                        Create Transaction
                      </Link>
                    </Button>
                  )}
                </div>
              )}
              {transactions.length > 0 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/finance/transactions">
                      View All Transactions
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledgers Tab */}
        <TabsContent value="ledgers" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ledger Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Ledger Summary</CardTitle>
                <CardDescription>
                  Detailed ledger balances and activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ledgerBalances.map((ledger) => (
                    <Card key={ledger.ledger_code} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{ledger.ledger_name}</h4>
                          <p className="text-sm text-muted-foreground">{ledger.ledger_code}</p>
                        </div>
                        <Badge variant={
                          ledger.closing_balance >= 100000000 ? "default" :
                          ledger.closing_balance >= 50000000 ? "secondary" : "outline"
                        }>
                          Rp {ledger.closing_balance.toLocaleString('id-ID')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Opening</div>
                          <div className="font-medium">Rp {ledger.opening_balance.toLocaleString('id-ID')}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Change</div>
                          <div className={`font-medium ${ledger.total_receipts - ledger.total_payments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ledger.total_receipts - ledger.total_payments >= 0 ? '+' : ''}
                            Rp {Math.abs(ledger.total_receipts - ledger.total_payments).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-xs">
                        <div className="text-green-600">
                          <div className="font-medium">Receipts</div>
                          <div>Rp {ledger.total_receipts.toLocaleString('id-ID')}</div>
                        </div>
                        <div className="text-red-600">
                          <div className="font-medium">Payments</div>
                          <div>Rp {ledger.total_payments.toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ledger Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Ledger Type Distribution</CardTitle>
                <CardDescription>
                  Operational vs Project ledger breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Operational Ledgers</span>
                      <span className="text-green-600">
                        Rp {ledgerBalances
                          .filter(l => l.ledger_code.includes('OPR'))
                          .reduce((sum, l) => sum + l.closing_balance, 0)
                          .toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: '40%' }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Project Ledgers (Carbon)</span>
                      <span className="text-blue-600">
                        Rp {ledgerBalances
                          .filter(l => l.ledger_code.includes('PRJ-CARBON'))
                          .reduce((sum, l) => sum + l.closing_balance, 0)
                          .toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: '35%' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Project Ledgers (Social)</span>
                      <span className="text-purple-600">
                        Rp {ledgerBalances
                          .filter(l => l.ledger_code.includes('PRJ-SOSIAL'))
                          .reduce((sum, l) => sum + l.closing_balance, 0)
                          .toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500"
                        style={{ width: '25%' }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Ledger Management</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create and manage ledgers for different funding sources and programs
                    </p>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/finance/ledgers">
                        Manage Ledgers
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Quick Actions</h3>
              <p className="text-muted-foreground">
                Common financial operations and reports
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/finance/reports/balance-sheet">
                  <FileText className="mr-2 h-4 w-4" />
                  Balance Sheet
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/finance/reports/cash-flow">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Cash Flow
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/finance/approvals">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approvals ({pendingApprovals})
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/finance/analytics">
                  <PieChart className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}