"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Banknote,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Filter,
  User,
  Building,
  Shield,
  Eye,
  EyeOff,
  Upload,
  Download,
  Search
} from "lucide-react"
import { hasPermission } from "@/lib/auth/rbac"
import { toast } from "sonner"

interface BankAccount {
  id: string
  account_number: string
  account_name: string
  bank_name: string
  bank_code: string | null
  account_type: 'VENDOR' | 'STAFF' | 'COMMUNITY' | 'DONOR' | 'GOVERNMENT' | 'OTHER' | null
  beneficiary_type: 'INDIVIDUAL' | 'COMPANY' | 'ORGANIZATION' | 'GOVERNMENT' | null
  beneficiary_id: string | null
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  verified_by: string | null
  verified_at: string | null
  verification_docs: string[] | null
  is_active: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface BankInfo {
  code: string
  name: string
}

export function BankAccountsWhitelist() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<BankAccount[]>([])
  const [canManageAccounts, setCanManageAccounts] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<BankAccount>>({})
  const [newAccount, setNewAccount] = useState<Partial<BankAccount>>({
    account_type: 'VENDOR',
    beneficiary_type: 'COMPANY',
    verification_status: 'PENDING',
    is_active: true
  })
  const [showNewForm, setShowNewForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterType, setFilterType] = useState("ALL")

  const bankList: BankInfo[] = [
    { code: 'BCA', name: 'Bank Central Asia (BCA)' },
    { code: 'MANDIRI', name: 'Bank Mandiri' },
    { code: 'BNI', name: 'Bank Negara Indonesia (BNI)' },
    { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)' },
    { code: 'BTN', name: 'Bank Tabungan Negara (BTN)' },
    { code: 'DANAMON', name: 'Bank Danamon' },
    { code: 'CIMB', name: 'CIMB Niaga' },
    { code: 'PERMATA', name: 'Bank Permata' },
    { code: 'OCBC', name: 'OCBC NISP' },
    { code: 'PANIN', name: 'Bank Panin' }
  ]

  const accountTypes = [
    { value: 'VENDOR', label: 'Vendor/Supplier', icon: Building },
    { value: 'STAFF', label: 'Staff/Karyawan', icon: User },
    { value: 'COMMUNITY', label: 'Komunitas/Kelompok', icon: User },
    { value: 'DONOR', label: 'Donor', icon: Building },
    { value: 'GOVERNMENT', label: 'Pemerintah', icon: Building },
    { value: 'OTHER', label: 'Lainnya', icon: Building }
  ]

  const beneficiaryTypes = [
    { value: 'INDIVIDUAL', label: 'Individu' },
    { value: 'COMPANY', label: 'Perusahaan' },
    { value: 'ORGANIZATION', label: 'Organisasi' },
    { value: 'GOVERNMENT', label: 'Pemerintah' }
  ]

  const verificationStatuses = [
    { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'VERIFIED', label: 'Terverifikasi', color: 'bg-green-100 text-green-800' },
    { value: 'REJECTED', label: 'Ditolak', color: 'bg-red-100 text-red-800' },
    { value: 'SUSPENDED', label: 'Ditangguhkan', color: 'bg-orange-100 text-orange-800' }
  ]

  useEffect(() => {
    checkPermissions()
    fetchBankAccounts()
  }, [])

  useEffect(() => {
    filterAccounts()
  }, [accounts, activeTab, searchQuery, filterStatus, filterType])

  async function checkPermissions() {
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE") || await hasPermission("FINANCIAL_TRANSACTION_APPROVE")
    setCanManageAccounts(canManage)
  }

  async function fetchBankAccounts() {
    setLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("bank_accounts_whitelist")
        .select("*")
        .order("account_name", { ascending: true })

      if (error) throw error

      if (data) {
        setAccounts(data)
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error)
      toast.error("Gagal memuat data bank accounts")
    } finally {
      setLoading(false)
    }
  }

  function filterAccounts() {
    let filtered = [...accounts]

    // Filter by tab
    if (activeTab === "verified") {
      filtered = filtered.filter(acc => acc.verification_status === 'VERIFIED')
    } else if (activeTab === "pending") {
      filtered = filtered.filter(acc => acc.verification_status === 'PENDING')
    } else if (activeTab === "rejected") {
      filtered = filtered.filter(acc => acc.verification_status === 'REJECTED')
    } else if (activeTab === "suspended") {
      filtered = filtered.filter(acc => acc.verification_status === 'SUSPENDED')
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(acc => 
        acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.account_number.includes(searchQuery) ||
        acc.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(acc => acc.verification_status === filterStatus)
    }

    // Filter by type
    if (filterType !== "ALL") {
      filtered = filtered.filter(acc => acc.account_type === filterType)
    }

    setFilteredAccounts(filtered)
  }

  async function handleSaveAccount(accountId: string) {
    if (!canManageAccounts) {
      toast.error("Anda tidak memiliki izin untuk mengelola bank accounts")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("bank_accounts_whitelist")
        .update(editForm)
        .eq("id", accountId)

      if (error) throw error

      toast.success("Bank account berhasil diperbarui")
      setEditingId(null)
      fetchBankAccounts()
    } catch (error) {
      console.error("Error updating bank account:", error)
      toast.error("Gagal memperbarui bank account")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount() {
    if (!canManageAccounts) {
      toast.error("Anda tidak memiliki izin untuk membuat bank accounts")
      return
    }

    if (!newAccount.account_number || !newAccount.account_name || !newAccount.bank_name) {
      toast.error("Harap lengkapi semua field yang diperlukan")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("bank_accounts_whitelist")
        .insert([{
          ...newAccount,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])

      if (error) throw error

      toast.success("Bank account berhasil ditambahkan ke whitelist")
      setShowNewForm(false)
      setNewAccount({
        account_type: 'VENDOR',
        beneficiary_type: 'COMPANY',
        verification_status: 'PENDING',
        is_active: true
      })
      fetchBankAccounts()
    } catch (error) {
      console.error("Error creating bank account:", error)
      toast.error("Gagal membuat bank account")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(accountId: string, newStatus: BankAccount['verification_status']) {
    if (!canManageAccounts) {
      toast.error("Anda tidak memiliki izin untuk mengubah status bank accounts")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("bank_accounts_whitelist")
        .update({ 
          verification_status: newStatus,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString()
        })
        .eq("id", accountId)

      if (error) throw error

      toast.success(`Status bank account berhasil diubah menjadi ${verificationStatuses.find(s => s.value === newStatus)?.label}`)
      fetchBankAccounts()
    } catch (error) {
      console.error("Error updating bank account status:", error)
      toast.error("Gagal mengubah status bank account")
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(accountId: string, currentStatus: boolean) {
    if (!canManageAccounts) {
      toast.error("Anda tidak memiliki izin untuk mengelola bank accounts")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("bank_accounts_whitelist")
        .update({ is_active: !currentStatus })
        .eq("id", accountId)

      if (error) throw error

      toast.success(`Bank account ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`)
      fetchBankAccounts()
    } catch (error) {
      console.error("Error toggling bank account:", error)
      toast.error("Gagal mengubah status bank account")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount(accountId: string) {
    if (!canManageAccounts) {
      toast.error("Anda tidak memiliki izin untuk menghapus bank accounts")
      return
    }

    if (!confirm("Apakah Anda yakin ingin menghapus bank account ini dari whitelist?")) {
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("bank_accounts_whitelist")
        .delete()
        .eq("id", accountId)

      if (error) throw error

      toast.success("Bank account berhasil dihapus dari whitelist")
      fetchBankAccounts()
    } catch (error) {
      console.error("Error deleting bank account:", error)
      toast.error("Gagal menghapus bank account")
    } finally {
      setLoading(false)
    }
  }

  function getBankDisplayName(bankCode: string) {
    const bank = bankList.find(b => b.code === bankCode)
    return bank ? bank.name : bankCode
  }

  function getAccountTypeDisplay(type: string | null) {
    if (!type) return "Tidak ditentukan"
    const accountType = accountTypes.find(t => t.value === type)
    return accountType ? accountType.label : type
  }

  function getBeneficiaryTypeDisplay(type: string | null) {
    if (!type) return "Tidak ditentukan"
    const beneficiaryType = beneficiaryTypes.find(t => t.value === type)
    return beneficiaryType ? beneficiaryType.label : type
  }

  function getStatusDisplay(status: string) {
    const statusObj = verificationStatuses.find(s => s.value === status)
    return statusObj ? statusObj.label : status
  }

  function getStatusColor(status: string) {
    const statusObj = verificationStatuses.find(s => s.value === status)
    return statusObj ? statusObj.color : 'bg-gray-100 text-gray-800'
  }

  if (loading && accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts Whitelist</CardTitle>
          <CardDescription>Loading bank accounts data...</CardDescription>
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
            <Banknote className="h-6 w-6 text-green-600" />
            Bank Accounts Whitelist
          </h2>
          <p className="text-muted-foreground">
            Kelola daftar rekening bank terverifikasi untuk kebijakan cashless
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchBankAccounts} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManageAccounts && (
            <Button onClick={() => setShowNewForm(!showNewForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Rekening
            </Button>
          )}
        </div>
      </div>

      {/* New Account Form */}
      {showNewForm && canManageAccounts && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="text-lg">Tambah Rekening Bank ke Whitelist</CardTitle>
            <CardDescription>
              Tambah rekening bank baru untuk verifikasi dan penggunaan dalam transaksi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-account-number">Nomor Rekening</Label>
                <Input
                  id="new-account-number"
                  placeholder="Contoh: 1234567890"
                  value={newAccount.account_number || ''}
                  onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-account-name">Nama Pemilik Rekening</Label>
                <Input
                  id="new-account-name"
                  placeholder="Contoh: PT Supplier Bibit Unggul"
                  value={newAccount.account_name || ''}
                  onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-bank">Bank</Label>
                <Select 
                  value={newAccount.bank_name || ''} 
                  onValueChange={(value) => setNewAccount({...newAccount, bank_name: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankList.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-account-type">Tipe Rekening</Label>
                <Select 
                  value={newAccount.account_type || 'VENDOR'} 
                  onValueChange={(value: any) => setNewAccount({...newAccount, account_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-beneficiary-type">Tipe Beneficiary</Label>
                <Select 
                  value={newAccount.beneficiary_type || 'COMPANY'} 
                  onValueChange={(value: any) => setNewAccount({...newAccount, beneficiary_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe beneficiary" />
                  </SelectTrigger>
                  <SelectContent>
                    {beneficiaryTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-status">Status Verifikasi</Label>
                <Select 
                  value={newAccount.verification_status || 'PENDING'} 
                  onValueChange={(value: any) => setNewAccount({...newAccount, verification_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {verificationStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-bank-code">Kode Bank (Opsional)</Label>
                <Input
                  id="new-bank-code"
                  placeholder="Contoh: 014 (BCA)"
                  value={newAccount.bank_code || ''}
                  onChange={(e) => setNewAccount({...newAccount, bank_code: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-notes">Catatan (Opsional)</Label>
                <Input
                  id="new-notes"
                  placeholder="Contoh: Rekening vendor untuk pembayaran bibit"
                  value={newAccount.notes || ''}
                  onChange={(e) => setNewAccount({...newAccount, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreateAccount} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Tambah ke Whitelist
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rekening</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Rekening dalam whitelist</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terverifikasi</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {accounts.filter(acc => acc.verification_status === 'VERIFIED').length}
            </div>
            <p className="text-xs text-muted-foreground">Sudah diverifikasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {accounts.filter(acc => acc.verification_status === 'PENDING').length}
            </div>
            <p className="text-xs text-muted-foreground">Menunggu verifikasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bank Berbeda</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(accounts.map(acc => acc.bank_name))).length}
            </div>
            <p className="text-xs text-muted-foreground">Bank berbeda</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Bank Accounts Whitelist</CardTitle>
              <CardDescription>
                Daftar rekening bank terverifikasi untuk transaksi cashless
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Input
                  placeholder="Cari rekening, nama, atau bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  {verificationStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tipe</SelectItem>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="all">Semua ({accounts.length})</TabsTrigger>
              <TabsTrigger value="verified">Terverifikasi ({accounts.filter(acc => acc.verification_status === 'VERIFIED').length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({accounts.filter(acc => acc.verification_status === 'PENDING').length})</TabsTrigger>
              <TabsTrigger value="rejected">Ditolak ({accounts.filter(acc => acc.verification_status === 'REJECTED').length})</TabsTrigger>
              <TabsTrigger value="suspended">Ditangguhkan ({accounts.filter(acc => acc.verification_status === 'SUSPENDED').length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Banknote className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">Tidak ada bank accounts</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery || filterStatus !== "ALL" || filterType !== "ALL"
                      ? "Tidak ada hasil untuk filter yang dipilih" 
                      : "Belum ada bank accounts dalam whitelist"}
                  </p>
                  {canManageAccounts && (
                    <Button onClick={() => setShowNewForm(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah Rekening Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAccounts.map((account) => (
                    <Card key={account.id} className={`${!account.is_active ? 'opacity-70' : ''}`}>
                      <CardContent className="pt-6">
                        {editingId === account.id ? (
                          // Edit Form
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Nomor Rekening</Label>
                                <Input
                                  value={editForm.account_number ?? account.account_number}
                                  onChange={(e) => setEditForm({...editForm, account_number: e.target.value})}
                                  disabled={!canManageAccounts}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Nama Pemilik Rekening</Label>
                                <Input
                                  value={editForm.account_name ?? account.account_name}
                                  onChange={(e) => setEditForm({...editForm, account_name: e.target.value})}
                                  disabled={!canManageAccounts}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Bank</Label>
                                <Select 
                                  value={editForm.bank_name ?? account.bank_name}
                                  onValueChange={(value) => setEditForm({...editForm, bank_name: value})}
                                  disabled={!canManageAccounts}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bankList.map((bank) => (
                                      <SelectItem key={bank.code} value={bank.code}>
                                        {bank.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Tipe Rekening</Label>
                                <Select 
                                  value={editForm.account_type ?? account.account_type ?? 'VENDOR'}
                                  onValueChange={(value: any) => setEditForm({...editForm, account_type: value})}
                                  disabled={!canManageAccounts}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {accountTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Status Verifikasi</Label>
                                <Select 
                                  value={editForm.verification_status ?? account.verification_status}
                                  onValueChange={(value: any) => setEditForm({...editForm, verification_status: value})}
                                  disabled={!canManageAccounts}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {verificationStatuses.map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Status Aktif</Label>
                                <Select 
                                  value={editForm.is_active !== undefined ? (editForm.is_active ? 'active' : 'inactive') : (account.is_active ? 'active' : 'inactive')}
                                  onValueChange={(value) => setEditForm({...editForm, is_active: value === 'active'})}
                                  disabled={!canManageAccounts}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="inactive">Nonaktif</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Catatan</Label>
                              <Input
                                value={editForm.notes ?? account.notes ?? ''}
                                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                                disabled={!canManageAccounts}
                              />
                            </div>

                            <div className="flex gap-3 pt-2">
                              <Button size="sm" onClick={() => handleSaveAccount(account.id)} disabled={loading}>
                                <Save className="mr-2 h-4 w-4" />
                                Simpan Perubahan
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                Batal
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Display Mode
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Badge className={getStatusColor(account.verification_status)}>
                                  {getStatusDisplay(account.verification_status)}
                                </Badge>
                                <Badge variant={account.is_active ? "default" : "secondary"}>
                                  {account.is_active ? "AKTIF" : "NONAKTIF"}
                                </Badge>
                                <Badge variant="outline">
                                  {getAccountTypeDisplay(account.account_type)}
                                </Badge>
                                <Badge variant="outline">
                                  {getBeneficiaryTypeDisplay(account.beneficiary_type)}
                                </Badge>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground">Rekening Bank</div>
                                  <div className="flex items-center gap-3">
                                    <Banknote className="h-5 w-5 text-green-600" />
                                    <div>
                                      <div className="text-lg font-bold">{account.account_number}</div>
                                      <div className="text-sm">{account.account_name}</div>
                                      <div className="text-sm text-muted-foreground">{getBankDisplayName(account.bank_name)}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {account.notes && (
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground">Catatan</div>
                                    <p className="text-sm">{account.notes}</p>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-muted-foreground">Dibuat</div>
                                    <div>{new Date(account.created_at).toLocaleDateString('id-ID')}</div>
                                  </div>
                                  {account.verified_at && (
                                    <div>
                                      <div className="text-muted-foreground">Diverifikasi</div>
                                      <div>{new Date(account.verified_at).toLocaleDateString('id-ID')}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {canManageAccounts && (
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingId(account.id)
                                      setEditForm({
                                        account_number: account.account_number,
                                        account_name: account.account_name,
                                        bank_name: account.bank_name,
                                        bank_code: account.bank_code,
                                        account_type: account.account_type,
                                        beneficiary_type: account.beneficiary_type,
                                        verification_status: account.verification_status,
                                        is_active: account.is_active,
                                        notes: account.notes
                                      })
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleActive(account.id, account.is_active)}
                                  >
                                    {account.is_active ? (
                                      <EyeOff className="h-4 w-4 text-yellow-600" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-green-600" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteAccount(account.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  {account.verification_status !== 'VERIFIED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={() => handleUpdateStatus(account.id, 'VERIFIED')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Verifikasi
                                    </Button>
                                  )}
                                  {account.verification_status !== 'REJECTED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleUpdateStatus(account.id, 'REJECTED')}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Tolak
                                    </Button>
                                  )}
                                  {account.verification_status !== 'SUSPENDED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                      onClick={() => handleUpdateStatus(account.id, 'SUSPENDED')}
                                    >
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Tangguhkan
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <Shield className="h-12 w-12 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Kebijakan Cashless & Anti-Fraud</h3>
              <p className="text-muted-foreground mt-2">
                Sistem whitelist bank account memastikan transaksi &gt; 1 juta hanya ke rekening yang sudah diverifikasi.
                Ini mencegah fraud dan kesalahan transfer ke rekening yang salah.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Proses Verifikasi:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <span><strong>Pending:</strong> Rekening baru, menunggu verifikasi dokumen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-1.5"></div>
                      <span><strong>Verified:</strong> Sudah diverifikasi, bisa digunakan untuk transaksi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full mt-1.5"></div>
                      <span><strong>Rejected:</strong> Ditolak karena data tidak valid atau mencurigakan</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Dokumen yang Diperlukan:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span><strong>Perusahaan:</strong> NPWP, SIUP, dokumen perusahaan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span><strong>Individu:</strong> KTP, bukti kepemilikan rekening</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span><strong>Organisasi:</strong> Akta notaris, surat keterangan domisili</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}