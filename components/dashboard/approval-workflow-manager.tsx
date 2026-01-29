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
  Workflow,
  CheckSquare,
  Users,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
  Clock,
  Shield,
  FileText,
  BarChart3,
  PieChart
} from "lucide-react"
import { hasPermission } from "@/lib/auth/rbac"
import { toast } from "sonner"

interface ApprovalWorkflow {
  id: string
  workflow_name: string
  workflow_type: 'TRANSACTION' | 'BUDGET' | 'GRANT' | 'BENEFIT_DISTRIBUTION' | 'REPORT'
  min_approvals: number
  required_roles: string[]
  amount_threshold: number | null
  ledger_type: 'OPERASIONAL' | 'PROYEK' | 'ALL' | null
  auto_approve_days: number
  is_active: boolean
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface RoleInfo {
  role_name: string
  display_name: string
}

export function ApprovalWorkflowManager() {
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([])
  const [filteredWorkflows, setFilteredWorkflows] = useState<ApprovalWorkflow[]>([])
  const [canManageWorkflows, setCanManageWorkflows] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ApprovalWorkflow>>({})
  const [newWorkflow, setNewWorkflow] = useState<Partial<ApprovalWorkflow>>({
    workflow_type: 'TRANSACTION',
    min_approvals: 1,
    required_roles: [],
    ledger_type: 'ALL',
    auto_approve_days: 3,
    is_active: true
  })
  const [showNewForm, setShowNewForm] = useState(false)
  const [searchName, setSearchName] = useState("")
  const [filterType, setFilterType] = useState("ALL")

  const roles: RoleInfo[] = [
    { role_name: 'admin', display_name: 'Administrator' },
    { role_name: 'finance_manager', display_name: 'Finance Manager' },
    { role_name: 'finance_operational', display_name: 'Finance Operational' },
    { role_name: 'finance_project_carbon', display_name: 'Finance Project Carbon' },
    { role_name: 'finance_project_implementation', display_name: 'Finance Project Implementation' },
    { role_name: 'finance_project_social', display_name: 'Finance Project Social' },
    { role_name: 'carbon_specialist', display_name: 'Carbon Specialist' },
    { role_name: 'program_planner', display_name: 'Program Planner' },
    { role_name: 'program_implementer', display_name: 'Program Implementer' },
    { role_name: 'monev', display_name: 'Monitoring & Evaluation' },
    { role_name: 'director', display_name: 'Director' }
  ]

  const workflowTypes = [
    { value: 'TRANSACTION', label: 'Transaksi Keuangan', icon: DollarSign },
    { value: 'BUDGET', label: 'Anggaran', icon: BarChart3 },
    { value: 'GRANT', label: 'Grant', icon: FileText },
    { value: 'BENEFIT_DISTRIBUTION', label: 'Bagi Hasil', icon: PieChart },
    { value: 'REPORT', label: 'Laporan', icon: FileText }
  ]

  const ledgerTypes = [
    { value: 'ALL', label: 'Semua Ledger' },
    { value: 'OPERASIONAL', label: 'Operasional' },
    { value: 'PROYEK', label: 'Proyek' }
  ]

  useEffect(() => {
    checkPermissions()
    fetchApprovalWorkflows()
  }, [])

  useEffect(() => {
    filterWorkflows()
  }, [workflows, activeTab, searchName, filterType])

  async function checkPermissions() {
    const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE") || await hasPermission("FINANCIAL_TRANSACTION_APPROVE")
    setCanManageWorkflows(canManage)
  }

  async function fetchApprovalWorkflows() {
    setLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("approval_workflows")
        .select("*")
        .order("workflow_name", { ascending: true })

      if (error) throw error

      if (data) {
        setWorkflows(data)
      }
    } catch (error) {
      console.error("Error fetching approval workflows:", error)
      toast.error("Gagal memuat data approval workflows")
    } finally {
      setLoading(false)
    }
  }

  function filterWorkflows() {
    let filtered = [...workflows]

    // Filter by tab
    if (activeTab === "active") {
      filtered = filtered.filter(wf => wf.is_active)
    } else if (activeTab === "inactive") {
      filtered = filtered.filter(wf => !wf.is_active)
    }

    // Filter by name search
    if (searchName) {
      filtered = filtered.filter(wf => 
        wf.workflow_name.toLowerCase().includes(searchName.toLowerCase()) ||
        wf.description?.toLowerCase().includes(searchName.toLowerCase())
      )
    }

    // Filter by type
    if (filterType !== "ALL") {
      filtered = filtered.filter(wf => wf.workflow_type === filterType)
    }

    setFilteredWorkflows(filtered)
  }

  async function handleSaveWorkflow(workflowId: string) {
    if (!canManageWorkflows) {
      toast.error("Anda tidak memiliki izin untuk mengelola approval workflows")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("approval_workflows")
        .update(editForm)
        .eq("id", workflowId)

      if (error) throw error

      toast.success("Approval workflow berhasil diperbarui")
      setEditingId(null)
      fetchApprovalWorkflows()
    } catch (error) {
      console.error("Error updating approval workflow:", error)
      toast.error("Gagal memperbarui approval workflow")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateWorkflow() {
    if (!canManageWorkflows) {
      toast.error("Anda tidak memiliki izin untuk membuat approval workflows")
      return
    }

    if (!newWorkflow.workflow_name || !newWorkflow.workflow_type || !newWorkflow.required_roles || newWorkflow.required_roles.length === 0) {
      toast.error("Harap lengkapi semua field yang diperlukan")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("approval_workflows")
        .insert([{
          ...newWorkflow,
          required_roles: newWorkflow.required_roles,
          amount_threshold: newWorkflow.amount_threshold ? parseFloat(newWorkflow.amount_threshold as any) : null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])

      if (error) throw error

      toast.success("Approval workflow berhasil dibuat")
      setShowNewForm(false)
      setNewWorkflow({
        workflow_type: 'TRANSACTION',
        min_approvals: 1,
        required_roles: [],
        ledger_type: 'ALL',
        auto_approve_days: 3,
        is_active: true
      })
      fetchApprovalWorkflows()
    } catch (error) {
      console.error("Error creating approval workflow:", error)
      toast.error("Gagal membuat approval workflow")
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(workflowId: string, currentStatus: boolean) {
    if (!canManageWorkflows) {
      toast.error("Anda tidak memiliki izin untuk mengelola approval workflows")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("approval_workflows")
        .update({ is_active: !currentStatus })
        .eq("id", workflowId)

      if (error) throw error

      toast.success(`Approval workflow ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`)
      fetchApprovalWorkflows()
    } catch (error) {
      console.error("Error toggling approval workflow:", error)
      toast.error("Gagal mengubah status approval workflow")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteWorkflow(workflowId: string) {
    if (!canManageWorkflows) {
      toast.error("Anda tidak memiliki izin untuk menghapus approval workflows")
      return
    }

    if (!confirm("Apakah Anda yakin ingin menghapus approval workflow ini?")) {
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("approval_workflows")
        .delete()
        .eq("id", workflowId)

      if (error) throw error

      toast.success("Approval workflow berhasil dihapus")
      fetchApprovalWorkflows()
    } catch (error) {
      console.error("Error deleting approval workflow:", error)
      toast.error("Gagal menghapus approval workflow")
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number | null) {
    if (!amount) return "Tidak ada batas"
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function getWorkflowTypeDisplay(type: string) {
    const workflowType = workflowTypes.find(t => t.value === type)
    return workflowType ? workflowType.label : type
  }

  function getRoleDisplayName(roleName: string) {
    const role = roles.find(r => r.role_name === roleName)
    return role ? role.display_name : roleName
  }

  function getLedgerTypeDisplay(type: string | null) {
    if (!type) return "Semua"
    const ledgerType = ledgerTypes.find(t => t.value === type)
    return ledgerType ? ledgerType.label : type
  }

  if (loading && workflows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow Management</CardTitle>
          <CardDescription>Loading approval workflows data...</CardDescription>
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
            <Workflow className="h-6 w-6 text-purple-600" />
            Approval Workflow Management
          </h2>
          <p className="text-muted-foreground">
            Kelola alur persetujuan multi-level dengan four-eyes principle
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchApprovalWorkflows} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManageWorkflows && (
            <Button onClick={() => setShowNewForm(!showNewForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Workflow Baru
            </Button>
          )}
        </div>
      </div>

      {/* New Workflow Form */}
      {showNewForm && canManageWorkflows && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-lg">Tambah Approval Workflow Baru</CardTitle>
            <CardDescription>
              Buat alur persetujuan baru untuk berbagai jenis entitas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nama Workflow</Label>
                <Input
                  id="new-name"
                  placeholder="Contoh: Large Transaction Approval"
                  value={newWorkflow.workflow_name || ''}
                  onChange={(e) => setNewWorkflow({...newWorkflow, workflow_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-type">Jenis Workflow</Label>
                <Select 
                  value={newWorkflow.workflow_type} 
                  onValueChange={(value: any) => setNewWorkflow({...newWorkflow, workflow_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflowTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-min-approvals">Minimal Persetujuan</Label>
                <Input
                  id="new-min-approvals"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Contoh: 2"
                  value={newWorkflow.min_approvals || 1}
                  onChange={(e) => setNewWorkflow({...newWorkflow, min_approvals: parseInt(e.target.value)})}
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah minimal approver yang diperlukan (four-eyes principle)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-threshold">Batas Jumlah (Opsional)</Label>
                <Input
                  id="new-threshold"
                  type="number"
                  placeholder="Contoh: 10000000 (10 juta)"
                  value={newWorkflow.amount_threshold || ''}
                  onChange={(e) => setNewWorkflow({...newWorkflow, amount_threshold: e.target.value ? parseFloat(e.target.value) : null})}
                />
                <p className="text-xs text-muted-foreground">
                  Trigger workflow jika jumlah melebihi batas ini (kosongkan untuk semua)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role yang Diperlukan (Pilih minimal {newWorkflow.min_approvals || 1})</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {roles.map((role) => (
                    <div key={role.role_name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role.role_name}`}
                        checked={newWorkflow.required_roles?.includes(role.role_name) || false}
                        onChange={(e) => {
                          const updatedRoles = e.target.checked
                            ? [...(newWorkflow.required_roles || []), role.role_name]
                            : (newWorkflow.required_roles || []).filter(r => r !== role.role_name)
                          setNewWorkflow({...newWorkflow, required_roles: updatedRoles})
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`role-${role.role_name}`} className="text-sm">
                        {role.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-ledger">Jenis Ledger</Label>
                <Select 
                  value={newWorkflow.ledger_type || 'ALL'} 
                  onValueChange={(value: any) => setNewWorkflow({...newWorkflow, ledger_type: value})}
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
                <Label htmlFor="new-auto-approve">Auto-Approve Setelah (hari)</Label>
                <Input
                  id="new-auto-approve"
                  type="number"
                  min="1"
                  max="30"
                  placeholder="Contoh: 3"
                  value={newWorkflow.auto_approve_days || 3}
                  onChange={(e) => setNewWorkflow({...newWorkflow, auto_approve_days: parseInt(e.target.value)})}
                />
                <p className="text-xs text-muted-foreground">
                  Otomatis approve jika tidak ada tindakan setelah X hari
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-description">Deskripsi (Opsional)</Label>
                <Input
                  id="new-description"
                  placeholder="Contoh: Workflow untuk transaksi besar > 10 juta"
                  value={newWorkflow.description || ''}
                  onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreateWorkflow} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Simpan Workflow Baru
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
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground">Alur persetujuan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {workflows.filter(w => w.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Sedang aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Types</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(workflows.map(w => w.workflow_type))).length}
            </div>
            <p className="text-xs text-muted-foreground">Jenis workflow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Approvers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.length > 0 
                ? (workflows.reduce((sum, w) => sum + w.min_approvals, 0) / workflows.length).toFixed(1)
                : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">Rata-rata approver</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Approval Workflows</CardTitle>
              <CardDescription>
                Daftar alur persetujuan untuk berbagai jenis entitas keuangan
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Input
                  placeholder="Cari berdasarkan nama atau deskripsi..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-10"
                />
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Jenis</SelectItem>
                  {workflowTypes.map((type) => (
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
              <TabsTrigger value="all">Semua ({workflows.length})</TabsTrigger>
              <TabsTrigger value="active">Aktif ({workflows.filter(w => w.is_active).length})</TabsTrigger>
              <TabsTrigger value="inactive">Nonaktif ({workflows.filter(w => !w.is_active).length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredWorkflows.length === 0 ? (
                <div className="text-center py-8">
                  <Workflow className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">Tidak ada approval workflows</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchName || filterType !== "ALL" 
                      ? "Tidak ada hasil untuk filter yang dipilih" 
                      : "Belum ada approval workflows yang dibuat"}
                  </p>
                  {canManageWorkflows && (
                    <Button onClick={() => setShowNewForm(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Buat Approval Workflow Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWorkflows.map((workflow) => (
                    <Card key={workflow.id} className={`${!workflow.is_active ? 'opacity-70' : ''}`}>
                      <CardContent className="pt-6">
                        {editingId === workflow.id ? (
                          // Edit Form
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Nama Workflow</Label>
                                <Input
                                  value={editForm.workflow_name ?? workflow.workflow_name}
                                  onChange={(e) => setEditForm({...editForm, workflow_name: e.target.value})}
                                  disabled={!canManageWorkflows}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Jenis Workflow</Label>
                                <Select 
                                  value={editForm.workflow_type ?? workflow.workflow_type}
                                  onValueChange={(value: any) => setEditForm({...editForm, workflow_type: value})}
                                  disabled={!canManageWorkflows}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {workflowTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Minimal Persetujuan</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={editForm.min_approvals ?? workflow.min_approvals}
                                  onChange={(e) => setEditForm({...editForm, min_approvals: parseInt(e.target.value)})}
                                  disabled={!canManageWorkflows}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Batas Jumlah (Opsional)</Label>
                                <Input
                                  type="number"
                                  placeholder="Kosongkan untuk semua"
                                  value={editForm.amount_threshold ?? workflow.amount_threshold ?? ''}
                                  onChange={(e) => setEditForm({...editForm, amount_threshold: e.target.value ? parseFloat(e.target.value) : null})}
                                  disabled={!canManageWorkflows}
                                />
                              </div>

                              <div className="space-y-2 col-span-2">
                                <Label>Role yang Diperlukan</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                                  {roles.map((role) => (
                                    <div key={role.role_name} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`edit-role-${role.role_name}`}
                                        checked={(editForm.required_roles ?? workflow.required_roles).includes(role.role_name)}
                                        onChange={(e) => {
                                          const currentRoles = editForm.required_roles ?? workflow.required_roles
                                          const updatedRoles = e.target.checked
                                            ? [...currentRoles, role.role_name]
                                            : currentRoles.filter(r => r !== role.role_name)
                                          setEditForm({...editForm, required_roles: updatedRoles})
                                        }}
                                        disabled={!canManageWorkflows}
                                        className="rounded border-gray-300"
                                      />
                                      <Label htmlFor={`edit-role-${role.role_name}`} className="text-sm">
                                        {role.display_name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Status</Label>
                                <Select 
                                  value={editForm.is_active !== undefined ? (editForm.is_active ? 'active' : 'inactive') : (workflow.is_active ? 'active' : 'inactive')}
                                  onValueChange={(value) => setEditForm({...editForm, is_active: value === 'active'})}
                                  disabled={!canManageWorkflows}
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

                              <div className="space-y-2">
                                <Label>Auto-Approve (hari)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={editForm.auto_approve_days ?? workflow.auto_approve_days}
                                  onChange={(e) => setEditForm({...editForm, auto_approve_days: parseInt(e.target.value)})}
                                  disabled={!canManageWorkflows}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Deskripsi</Label>
                              <Input
                                value={editForm.description ?? workflow.description ?? ''}
                                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                disabled={!canManageWorkflows}
                              />
                            </div>

                            <div className="flex gap-3 pt-2">
                              <Button size="sm" onClick={() => handleSaveWorkflow(workflow.id)} disabled={loading}>
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
                                <Badge variant={workflow.is_active ? "default" : "secondary"}>
                                  {workflow.is_active ? "AKTIF" : "NONAKTIF"}
                                </Badge>
                                <Badge variant="outline" className="font-semibold">
                                  {getWorkflowTypeDisplay(workflow.workflow_type)}
                                </Badge>
                                <Badge variant="outline">
                                  {getLedgerTypeDisplay(workflow.ledger_type)}
                                </Badge>
                                {workflow.amount_threshold && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    {formatCurrency(workflow.amount_threshold)}+
                                  </Badge>
                                )}
                              </div>
                              
                              <h3 className="text-xl font-bold mb-2">{workflow.workflow_name}</h3>
                              
                              {workflow.description && (
                                <p className="text-muted-foreground mb-4">{workflow.description}</p>
                              )}
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground">Minimal Approver</div>
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-purple-600" />
                                    <span className="text-lg font-bold">{workflow.min_approvals} orang</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground">Auto-Approve</div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-600" />
                                    <span className="text-lg font-bold">{workflow.auto_approve_days} hari</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground">Role yang Diperlukan</div>
                                  <div className="text-lg font-bold">{workflow.required_roles.length} role</div>
                                </div>
                                
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground">Dibuat</div>
                                  <div className="text-sm">{new Date(workflow.created_at).toLocaleDateString('id-ID')}</div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm font-medium text-muted-foreground mb-2">Role yang Dapat Menyetujui:</div>
                                <div className="flex flex-wrap gap-2">
                                  {workflow.required_roles.map((role) => (
                                    <Badge key={role} variant="outline" className="bg-gray-50">
                                      {getRoleDisplayName(role)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {canManageWorkflows && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingId(workflow.id)
                                    setEditForm({
                                      workflow_name: workflow.workflow_name,
                                      workflow_type: workflow.workflow_type,
                                      min_approvals: workflow.min_approvals,
                                      required_roles: workflow.required_roles,
                                      amount_threshold: workflow.amount_threshold,
                                      ledger_type: workflow.ledger_type,
                                      auto_approve_days: workflow.auto_approve_days,
                                      is_active: workflow.is_active,
                                      description: workflow.description
                                    })
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleActive(workflow.id, workflow.is_active)}
                                >
                                  {workflow.is_active ? (
                                    <EyeOff className="h-4 w-4 text-yellow-600" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteWorkflow(workflow.id)}
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
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <Shield className="h-12 w-12 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Four-Eyes Principle & Anti-Fraud</h3>
              <p className="text-muted-foreground mt-2">
                Sistem approval workflow menggunakan prinsip four-eyes untuk mencegah fraud.
                Setiap transaksi besar memerlukan persetujuan dari minimal 2 orang dengan role berbeda.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Contoh Workflow:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <span><strong>Transaksi Kecil ({'<'} 1 juta):</strong> Self-approval oleh finance staff</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-1.5"></div>
                      <span><strong>Transaksi Sedang (1-10 juta):</strong> 2 approvers (Finance Manager + Admin)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 bg-purple-500 rounded-full mt-1.5"></div>
                      <span><strong>Transaksi Besar ({'>'} 10 juta):</strong> 3 approvers (Finance Manager + Admin + Director)</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Fitur Keamanan:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckSquare className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span><strong>Auto-Expire:</strong> Request expired setelah batas waktu</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span><strong>Role Separation:</strong> Tidak bisa approve request sendiri</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <span><strong>Escalation:</strong> Notifikasi ke atasan jika delay approval</span>
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