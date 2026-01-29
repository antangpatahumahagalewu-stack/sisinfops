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
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Users, 
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Filter
} from "lucide-react"
import { hasPermission } from "@/lib/auth/rbac"
import { toast } from "sonner"

interface SpendingLimit {
  id: string
  role_name: string
  limit_type: 'DAILY' | 'MONTHLY' | 'PER_TRANSACTION' | 'ANNUAL'
  limit_amount: number
  currency: string
  ledger_type: 'OPERASIONAL' | 'PROYEK' | 'ALL' | null
  is_active: boolean
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface RoleInfo {
  role_name: string
  display_name: string
  description: string
}

export function SpendingLimitsManager() {
  const [loading, setLoading] = useState(true)
  const [limits, setLimits] = useState<SpendingLimit[]>([])
  const [filteredLimits, setFilteredLimits] = useState<SpendingLimit[]>([])
  const [canManageLimits, setCanManageLimits] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<SpendingLimit>>({})
  const [newLimit, setNewLimit] = useState<Partial<SpendingLimit>>({
    limit_type: 'PER_TRANSACTION',
    currency: 'IDR',
    ledger_type: 'ALL',
    is_active: true
  })
  const [showNewForm, setShowNewForm] = useState(false)
  const [searchRole, setSearchRole] = useState("")
  const [filterType, setFilterType] = useState("ALL")

  const roles: RoleInfo[] = [
    { role_name: 'finance_manager', display_name: 'Finance Manager', description: 'Manajer keuangan - akses penuh' },
    { role_name: 'finance_operational', display_name: 'Finance Operational', description: 'Spesialis keuangan operasional' },
    { role_name: 'finance_project_carbon', display_name: 'Finance Project Carbon', description: 'Spesialis keuangan proyek karbon' },
    { role_name: 'finance_project_implementation', display_name: 'Finance Project Implementation', description: 'Spesialis keuangan implementasi' },
    { role_name: 'finance_project_social', display_name: 'Finance Project Social', description: 'Spesialis keuangan sosial' },
    { role_name: 'admin', display_name: 'Administrator', description: 'Administrator sistem' },
    { role_name: 'program_planner', display_name: 'Program Planner', description: 'Perencana program' },
    { role_name: 'carbon_specialist', display_name: 'Carbon Specialist', description: 'Spesialis karbon' }
  ]

  const limitTypes = [
    { value: 'PER_TRANSACTION', label: 'Per Transaksi', description: 'Limit per transaksi individu' },
    { value: 'DAILY', label: 'Harian', description: 'Limit kumulatif per hari' },
    { value: 'MONTHLY', label: 'Bulanan', description: 'Limit kumulatif per bulan' },
    { value: 'ANNUAL', label: 'Tahunan', description: 'Limit kumulatif per tahun' }
  ]

  const ledgerTypes = [
    { value: 'ALL', label: 'Semua Ledger', description: 'Berlaku untuk semua jenis ledger' },
    { value: 'OPERASIONAL', label: 'Operasional', description: 'Hanya untuk ledger operasional' },
    { value: 'PROYEK', label: 'Proyek', description: 'Hanya untuk ledger proyek' }
  ]

  useEffect(() => {
    checkPermissions()
    fetchSpendingLimits()
  }, [])

  useEffect(() => {
    filterLimits()
  }, [limits, activeTab, searchRole, filterType])

  async function checkPermissions() {
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE") || await hasPermission("FINANCIAL_TRANSACTION_APPROVE")
    setCanManageLimits(canManage)
  }

  async function fetchSpendingLimits() {
    setLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("spending_limits")
        .select("*")
        .order("role_name", { ascending: true })
        .order("limit_type", { ascending: true })
        .order("ledger_type", { ascending: true })

      if (error) throw error

      if (data) {
        setLimits(data)
      }
    } catch (error) {
      console.error("Error fetching spending limits:", error)
      toast.error("Gagal memuat data spending limits")
    } finally {
      setLoading(false)
    }
  }

  function filterLimits() {
    let filtered = [...limits]

    // Filter by tab
    if (activeTab === "active") {
      filtered = filtered.filter(limit => limit.is_active)
    } else if (activeTab === "inactive") {
      filtered = filtered.filter(limit => !limit.is_active)
    }

    // Filter by role search
    if (searchRole) {
      filtered = filtered.filter(limit => 
        limit.role_name.toLowerCase().includes(searchRole.toLowerCase()) ||
        roles.find(r => r.role_name === limit.role_name)?.display_name.toLowerCase().includes(searchRole.toLowerCase())
      )
    }

    // Filter by type
    if (filterType !== "ALL") {
      filtered = filtered.filter(limit => limit.limit_type === filterType)
    }

    setFilteredLimits(filtered)
  }

  async function handleSaveLimit(limitId: string) {
    if (!canManageLimits) {
      toast.error("Anda tidak memiliki izin untuk mengelola spending limits")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("spending_limits")
        .update(editForm)
        .eq("id", limitId)

      if (error) throw error

      toast.success("Spending limit berhasil diperbarui")
      setEditingId(null)
      fetchSpendingLimits()
    } catch (error) {
      console.error("Error updating spending limit:", error)
      toast.error("Gagal memperbarui spending limit")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLimit() {
    if (!canManageLimits) {
      toast.error("Anda tidak memiliki izin untuk membuat spending limits")
      return
    }

    if (!newLimit.role_name || !newLimit.limit_amount) {
      toast.error("Harap lengkapi semua field yang diperlukan")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("spending_limits")
        .insert([{
          ...newLimit,
          limit_amount: parseFloat(newLimit.limit_amount as any),
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])

      if (error) throw error

      toast.success("Spending limit berhasil dibuat")
      setShowNewForm(false)
      setNewLimit({
        limit_type: 'PER_TRANSACTION',
        currency: 'IDR',
        ledger_type: 'ALL',
        is_active: true
      })
      fetchSpendingLimits()
    } catch (error) {
      console.error("Error creating spending limit:", error)
      toast.error("Gagal membuat spending limit")
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(limitId: string, currentStatus: boolean) {
    if (!canManageLimits) {
      toast.error("Anda tidak memiliki izin untuk mengelola spending limits")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("spending_limits")
        .update({ is_active: !currentStatus })
        .eq("id", limitId)

      if (error) throw error

      toast.success(`Spending limit ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`)
      fetchSpendingLimits()
    } catch (error) {
      console.error("Error toggling spending limit:", error)
      toast.error("Gagal mengubah status spending limit")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteLimit(limitId: string) {
    if (!canManageLimits) {
      toast.error("Anda tidak memiliki izin untuk menghapus spending limits")
      return
    }

    if (!confirm("Apakah Anda yakin ingin menghapus spending limit ini?")) {
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("spending_limits")
        .delete()
        .eq("id", limitId)

      if (error) throw error

      toast.success("Spending limit berhasil dihapus")
      fetchSpendingLimits()
    } catch (error) {
      console.error("Error deleting spending limit:", error)
      toast.error("Gagal menghapus spending limit")
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function getRoleDisplayName(roleName: string) {
    const role = roles.find(r => r.role_name === roleName)
    return role ? role.display_name : roleName
  }

  function getLimitTypeDisplay(type: string) {
    const limitType = limitTypes.find(t => t.value === type)
    return limitType ? limitType.label : type
  }

  function getLedgerTypeDisplay(type: string | null) {
    if (!type) return "Semua"
    const ledgerType = ledgerTypes.find(t => t.value === type)
    return ledgerType ? ledgerType.label : type
  }

  if (loading && limits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Limits Management</CardTitle>
          <CardDescription>Loading spending limits data...</CardDescription>
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
            <Shield className="h-6 w-6 text-blue-600" />
            Spending Limits Management
          </h2>
          <p className="text-muted-foreground">
            Kelola batas pengeluaran berdasarkan role untuk kontrol anti-fraud
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchSpendingLimits} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManageLimits && (
            <Button onClick={() => setShowNewForm(!showNewForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Limit Baru
            </Button>
          )}
        </div>
      </div>

      {/* New Limit Form */}
      {showNewForm && canManageLimits && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-lg">Tambah Spending Limit Baru</CardTitle>
            <CardDescription>
              Buat batas pengeluaran baru untuk role tertentu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="new-role">Role</Label>
                <Select 
                  value={newLimit.role_name} 
                  onValueChange={(value) => setNewLimit({...newLimit, role_name: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.role_name} value={role.role_name}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-type">Jenis Limit</Label>
                <Select 
                  value={newLimit.limit_type} 
                  onValueChange={(value: any) => setNewLimit({...newLimit, limit_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {limitTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-ledger">Jenis Ledger</Label>
                <Select 
                  value={newLimit.ledger_type || 'ALL'} 
                  onValueChange={(value: any) => setNewLimit({...newLimit, ledger_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-amount">Jumlah Limit (IDR)</Label>
                <Input
                  id="new-amount"
                  type="number"
                  placeholder="Contoh: 5000000"
                  value={newLimit.limit_amount || ''}
                  onChange={(e) => setNewLimit({...newLimit, limit_amount: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-description">Deskripsi (Opsional)</Label>
                <Input
                  id="new-description"
                  placeholder="Contoh: Max 5 juta per transaksi operasional"
                  value={newLimit.description ?? ''}
                  onChange={(e) => setNewLimit({...newLimit, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-active">Status</Label>
                <Select 
                  value={newLimit.is_active ? 'active' : 'inactive'} 
                  onValueChange={(value) => setNewLimit({...newLimit, is_active: value === 'active'})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreateLimit} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Simpan Limit Baru
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
            <CardTitle className="text-sm font-medium">Total Limits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{limits.length}</div>
            <p className="text-xs text-muted-foreground">Aturan batas pengeluaran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Limits</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {limits.filter(l => l.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Sedang berlaku</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Roles</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(limits.map(l => l.role_name))).length}
            </div>
            <p className="text-xs text-muted-foreground">Role dengan limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highest Limit</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {limits.length > 0 ? formatCurrency(Math.max(...limits.map(l => l.limit_amount))) : 'Rp 0'}
            </div>
            <p className="text-xs text-muted-foreground">Limit tertinggi</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Spending Limits</CardTitle>
              <CardDescription>
                Daftar batas pengeluaran berdasarkan role dan jenis transaksi
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Input
                  placeholder="Cari berdasarkan role..."
                  value={searchRole}
                  onChange={(e) => setSearchRole(e.target.value)}
                  className="pl-10"
                />
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Jenis</SelectItem>
                  {limitTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Semua ({limits.length})</TabsTrigger>
              <TabsTrigger value="active">Aktif ({limits.filter(l => l.is_active).length})</TabsTrigger>
              <TabsTrigger value="inactive">Nonaktif ({limits.filter(l => !l.is_active).length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredLimits.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">Tidak ada spending limits</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchRole || filterType !== "ALL" 
                      ? "Tidak ada hasil untuk filter yang dipilih" 
                      : "Belum ada spending limits yang dibuat"}
                  </p>
                  {canManageLimits && (
                    <Button onClick={() => setShowNewForm(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Buat Spending Limit Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLimits.map((limit) => (
                    <Card key={limit.id} className={`${!limit.is_active ? 'opacity-70' : ''}`}>
                      <CardContent className="pt-6">
                        {editingId === limit.id ? (
                          // Edit Form
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select 
                                  value={editForm.role_name || limit.role_name}
                                  onValueChange={(value) => setEditForm({...editForm, role_name: value})}
                                  disabled={!canManageLimits}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((role) => (
                                      <SelectItem key={role.role_name} value={role.role_name}>
                                        {role.display_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Jenis Limit</Label>
                                <Select 
                                  value={editForm.limit_type || limit.limit_type}
                                  onValueChange={(value: any) => setEditForm({...editForm, limit_type: value})}
                                  disabled={!canManageLimits}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {limitTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Jumlah Limit (IDR)</Label>
                                <Input
                                  type="number"
                                  value={editForm.limit_amount || limit.limit_amount}
                                  onChange={(e) => setEditForm({...editForm, limit_amount: parseFloat(e.target.value)})}
                                  disabled={!canManageLimits}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Status</Label>
                                <Select 
                                  value={editForm.is_active !== undefined ? (editForm.is_active ? 'active' : 'inactive') : (limit.is_active ? 'active' : 'inactive')}
                                  onValueChange={(value) => setEditForm({...editForm, is_active: value === 'active'})}
                                  disabled={!canManageLimits}
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
                              <Label>Deskripsi</Label>
                              <Input
                                value={editForm.description ?? limit.description ?? ''}
                                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                disabled={!canManageLimits}
                              />
                            </div>

                            <div className="flex gap-3 pt-2">
                              <Button size="sm" onClick={() => handleSaveLimit(limit.id)} disabled={loading}>
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
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant={limit.is_active ? "default" : "secondary"}>
                                  {limit.is_active ? "AKTIF" : "NONAKTIF"}
                                </Badge>
                                <Badge variant="outline" className="font-mono">
                                  {getRoleDisplayName(limit.role_name)}
                                </Badge>
                                <Badge variant="outline">
                                  {getLimitTypeDisplay(limit.limit_type)}
                                </Badge>
                                <Badge variant="outline">
                                  {getLedgerTypeDisplay(limit.ledger_type)}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span className="text-xl font-bold">
                                    {formatCurrency(limit.limit_amount)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    ({limit.currency})
                                  </span>
                                </div>
                                
                                {limit.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {limit.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Dibuat: {new Date(limit.created_at).toLocaleDateString('id-ID')}</span>
                                  <span>Diupdate: {new Date(limit.updated_at).toLocaleDateString('id-ID')}</span>
                                </div>
                              </div>
                            </div>
                            
                            {canManageLimits && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingId(limit.id)
                                    setEditForm({
                                      role_name: limit.role_name,
                                      limit_type: limit.limit_type,
                                      limit_amount: limit.limit_amount,
                                      ledger_type: limit.ledger_type,
                                      is_active: limit.is_active,
                                      description: limit.description
                                    })
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleActive(limit.id, limit.is_active)}
                                >
                                  {limit.is_active ? (
                                    <EyeOff className="h-4 w-4 text-yellow-600" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteLimit(limit.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-12 w-12 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Penting: Sistem Spending Limits</h3>
              <p className="text-muted-foreground mt-2">
                Sistem ini akan otomatis mengecek batas pengeluaran saat membuat transaksi keuangan.
                Transaksi yang melebihi limit akan memerlukan approval tambahan atau ditolak otomatis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Limit Types:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <span>Per Transaksi: Limit per transaksi individu</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span>Harian: Kumulatif semua transaksi dalam sehari</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                      <span>Bulanan: Kumulatif semua transaksi dalam sebulan</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Ledger Types:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                      <span>Operasional: Untuk biaya kantor dan administrasi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
                      <span>Proyek: Untuk dana proyek karbon dan sosial</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                      <span>Semua: Berlaku untuk semua jenis ledger</span>
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