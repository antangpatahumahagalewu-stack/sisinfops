"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter, 
  Eye, 
  Calendar, 
  User, 
  Activity, 
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface ActivityLog {
  id: string
  user_id: string
  user_role: string
  activity_type: string
  resource_type: string | null
  resource_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_name?: string
}

interface ActivityLogTableProps {
  initialData: ActivityLog[]
  userOptions: Array<{ id: string; full_name: string | null; role: string }>
  activityTypeOptions: string[]
  resourceTypeOptions: string[]
  currentUserId: string
  defaultActivityType?: string
}

export default function ActivityLogTable({
  initialData,
  userOptions,
  activityTypeOptions,
  resourceTypeOptions,
  currentUserId,
  defaultActivityType
}: ActivityLogTableProps) {
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityLog[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(initialData.length)
  const [filters, setFilters] = useState({
    userId: "all",
    activityType: defaultActivityType && defaultActivityType.trim() !== "" ? defaultActivityType : "all",
    resourceType: "all",
    startDate: "",
    endDate: "",
    search: ""
  })
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null)

  // Ensure filter values are never empty strings
  useEffect(() => {
    const correctedFilters = { ...filters }
    let needsUpdate = false
    
    if (!correctedFilters.userId || correctedFilters.userId.trim() === "") {
      correctedFilters.userId = "all"
      needsUpdate = true
    }
    if (!correctedFilters.activityType || correctedFilters.activityType.trim() === "") {
      correctedFilters.activityType = defaultActivityType && defaultActivityType.trim() !== "" ? defaultActivityType : "all"
      needsUpdate = true
    }
    if (!correctedFilters.resourceType || correctedFilters.resourceType.trim() === "") {
      correctedFilters.resourceType = "all"
      needsUpdate = true
    }
    
    if (needsUpdate) {
      setFilters(correctedFilters)
    }
  }, [filters, defaultActivityType])

  const limit = 20

  // Helper to ensure value is never empty string for Select components
  const ensureNonEmpty = (val: any): string => {
    if (val == null) return 'unknown'
    const str = String(val)
    return str.trim() === '' ? 'unknown' : str
  }

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('page', page.toString())
      queryParams.append('limit', limit.toString())
      
      // Only append filter if it's not "all" (our special value for no filter) and not empty
      if (filters.userId && filters.userId !== "all") queryParams.append('userId', filters.userId)
      if (filters.activityType && filters.activityType !== "all") queryParams.append('activityType', filters.activityType)
      if (filters.resourceType && filters.resourceType !== "all") queryParams.append('resourceType', filters.resourceType)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.search) queryParams.append('search', filters.search)

      const response = await fetch(`/api/activity-logs?${queryParams.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setActivities(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalItems(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [page, filters])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    // Ensure value is never empty string, null, or undefined - convert to "all" if empty
    const safeValue = value == null || value.trim() === "" ? "all" : value;
    setFilters(prev => ({ ...prev, [key]: safeValue }))
    setPage(1) // Reset to first page when filters change
  }

  const resetFilters = () => {
    setFilters({
      userId: "all",
      activityType: defaultActivityType && defaultActivityType.trim() !== "" ? defaultActivityType : "all",
      resourceType: "all",
      startDate: "",
      endDate: "",
      search: ""
    })
    setPage(1)
  }

  const getActivityTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      login: "bg-green-100 text-green-800 border-green-200",
      logout: "bg-red-100 text-red-800 border-red-200",
      page_view: "bg-blue-100 text-blue-800 border-blue-200",
      data_read: "bg-purple-100 text-purple-800 border-purple-200",
      data_create: "bg-emerald-100 text-emerald-800 border-emerald-200",
      data_update: "bg-amber-100 text-amber-800 border-amber-200",
      data_delete: "bg-rose-100 text-rose-800 border-rose-200",
      file_upload: "bg-cyan-100 text-cyan-800 border-cyan-200",
      file_download: "bg-sky-100 text-sky-800 border-sky-200",
      search: "bg-violet-100 text-violet-800 border-violet-200",
      export: "bg-orange-100 text-orange-800 border-orange-200",
      import: "bg-lime-100 text-lime-800 border-lime-200",
      api_call: "bg-indigo-100 text-indigo-800 border-indigo-200",
      error: "bg-red-100 text-red-800 border-red-200",
      other: "bg-gray-100 text-gray-800 border-gray-200"
    }

    const labels: Record<string, string> = {
      login: "Login",
      logout: "Logout",
      page_view: "View Page",
      data_read: "Read Data",
      data_create: "Create Data",
      data_update: "Update Data",
      data_delete: "Delete Data",
      file_upload: "Upload File",
      file_download: "Download File",
      search: "Search",
      export: "Export",
      import: "Import",
      api_call: "API Call",
      error: "Error",
      other: "Other"
    }

    return (
      <Badge variant="outline" className={`text-xs font-medium ${colors[type] || colors.other}`}>
        {labels[type] || type}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'dd MMM yyyy, HH:mm:ss', { locale: id })
    } catch {
      return dateString
    }
  }

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Filter Log Aktivitas</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="text-xs"
          >
            Reset Filter
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* User Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Pengguna</label>
              <Select
              value={filters.userId}
              onValueChange={(value) => handleFilterChange("userId", value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua Pengguna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pengguna</SelectItem>
                {userOptions && Array.isArray(userOptions) 
                  ? userOptions.filter(user => {
                      if (!user || user.id == null) {
                        console.warn('Skipping user with invalid id:', user);
                        return false;
                      }
                      const idStr = String(user.id);
                      if (idStr.trim() === '') {
                        console.warn('Skipping user with empty id:', user);
                        return false;
                      }
                      return true;
                    }).map(user => (
                      <SelectItem key={user.id} value={ensureNonEmpty(user.id)}>
                        {user.full_name || `User ${String(user.id).substring(0, 8)}`} ({user.role})
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Jenis Aktivitas</label>
            <Select
              value={filters.activityType}
              onValueChange={(value) => handleFilterChange("activityType", value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {activityTypeOptions && Array.isArray(activityTypeOptions)
                  ? activityTypeOptions.filter(type => {
                      if (type == null) {
                        console.warn('Skipping activity type with null value:', type);
                        return false;
                      }
                      const typeStr = String(type);
                      if (typeStr.trim() === '') {
                        console.warn('Skipping activity type with empty value:', type);
                        return false;
                      }
                      return true;
                    }).map(type => (
                      <SelectItem key={type} value={ensureNonEmpty(type)}>
                        {String(type).replace(/_/g, ' ').toUpperCase()}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>

          {/* Resource Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Jenis Resource</label>
            <Select
              value={filters.resourceType}
              onValueChange={(value) => handleFilterChange("resourceType", value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Resource</SelectItem>
                {resourceTypeOptions && Array.isArray(resourceTypeOptions)
                  ? resourceTypeOptions.filter(type => {
                      if (type == null) {
                        console.warn('Skipping resource type with null value:', type);
                        return false;
                      }
                      const typeStr = String(type);
                      if (typeStr.trim() === '') {
                        console.warn('Skipping resource type with empty value:', type);
                        return false;
                      }
                      return true;
                    }).map(type => (
                      <SelectItem key={type} value={ensureNonEmpty(type)}>
                        {String(type)}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Pencarian</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari di detail..."
                className="pl-9 h-9"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-9 h-9"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Sampai Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-9 h-9"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Total Aktivitas</span>
          </div>
          <p className="text-2xl font-bold text-blue-800 mt-1">{totalItems}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Pengguna Unik</span>
          </div>
          <p className="text-2xl font-bold text-green-800 mt-1">
            {[...new Set(activities.map(a => a.user_id))].length}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Halaman</span>
          </div>
          <p className="text-2xl font-bold text-purple-800 mt-1">
            {page} / {totalPages}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Aktivitas</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Tidak ada data aktivitas yang ditemukan
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(activity.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {activity.user_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user_role || 'unknown'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getActivityTypeBadge(activity.activity_type)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {activity.resource_type && (
                        <p className="text-sm font-medium">{activity.resource_type}</p>
                      )}
                      {activity.resource_id && (
                        <p className="text-xs text-muted-foreground font-mono">
                          ID: {truncateText(activity.resource_id, 12)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="text-sm truncate">
                        {truncateText(JSON.stringify(activity.details), 40)}
                      </p>
                      {activity.ip_address && (
                        <p className="text-xs text-muted-foreground">
                          IP: {activity.ip_address}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedActivity(activity)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detail Aktivitas</DialogTitle>
                          <DialogDescription>
                            Informasi lengkap tentang aktivitas ini
                          </DialogDescription>
                        </DialogHeader>
                        {selectedActivity && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Waktu</p>
                                <p className="text-sm">{formatDateTime(selectedActivity.created_at)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Aktivitas</p>
                                <div className="mt-1">
                                  {getActivityTypeBadge(selectedActivity.activity_type)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Pengguna</p>
                                <p className="text-sm">{selectedActivity.user_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{selectedActivity.user_role}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Resource</p>
                                <p className="text-sm">{selectedActivity.resource_type || 'N/A'}</p>
                                {selectedActivity.resource_id && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {selectedActivity.resource_id}
                                  </p>
                                )}
                              </div>
                            </div>

                            {selectedActivity.ip_address && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                                <p className="text-sm font-mono">{selectedActivity.ip_address}</p>
                              </div>
                            )}

                            {selectedActivity.user_agent && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">User Agent</p>
                                <p className="text-sm text-xs font-mono bg-muted p-2 rounded">
                                  {selectedActivity.user_agent}
                                </p>
                              </div>
                            )}

                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Detail</p>
                              <pre className="text-sm bg-muted p-3 rounded overflow-auto max-h-60">
                                {JSON.stringify(selectedActivity.details, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, totalItems)} dari {totalItems} aktivitas
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Sebelumnya
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Berikutnya
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}