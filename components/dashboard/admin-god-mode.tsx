"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Shield, 
  Database, 
  Users, 
  History, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit, 
  Plus, 
  Check, 
  X, 
  AlertTriangle,
  Server,
  HardDrive,
  Cpu,
  Network,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Upload,
  Terminal,
  Code,
  FileCode,
  Settings,
  Key
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { isGodAdmin, hasGodMode, getUserEnhancedPermissions } from "@/lib/auth/rbac"
import { toast } from "sonner"

interface DatabaseTable {
  name: string
  rows: number
  size: string
}

interface SystemStatus {
  database_connected: boolean
  admin_count: number
  total_users: number
  total_tables: number
  audit_logs_count: number
}

interface AuditLog {
  id: string
  admin_id: string
  action: string
  table_name: string
  operation: string
  affected_rows: number
  created_at: string
}

export default function AdminGodModeDashboard() {
  const t = useTranslations('admin')
  const [loading, setLoading] = useState(true)
  const [godModeEnabled, setGodModeEnabled] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean> & { GOD_MODE: boolean } | null>(null)
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM profiles LIMIT 10")
  const [queryResults, setQueryResults] = useState<any[]>([])
  const [queryLoading, setQueryLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkGodMode()
    loadSystemStatus()
    loadDatabaseTables()
    loadAuditLogs()
    loadUserPermissions()
  }, [])

  const checkGodMode = async () => {
    try {
      const isGod = await isGodAdmin()
      const hasGod = await hasGodMode()
      setGodModeEnabled(isGod || hasGod)
    } catch (error) {
      console.error("Error checking god mode:", error)
      setGodModeEnabled(false)
    }
  }

  const loadSystemStatus = async () => {
    try {
      // Get admin count
      const { data: adminProfiles, error: adminError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
      
      // Get total users
      const { data: allProfiles, error: userError } = await supabase
        .from("profiles")
        .select("id")
      
      // Get total tables count (approximate)
      const { data: tablesData, error: tablesError } = await supabase
        .from("god_mode_audit")
        .select("table_name", { count: 'exact', head: true })
        .limit(1)
      
      // Get audit logs count
      const { data: auditData, error: auditError } = await supabase
        .from("god_mode_audit")
        .select("id", { count: 'exact', head: true })
      
      setSystemStatus({
        database_connected: !adminError && !userError,
        admin_count: adminProfiles?.length || 0,
        total_users: allProfiles?.length || 0,
        total_tables: 0, // Will be updated by loadDatabaseTables
        audit_logs_count: auditData?.length || 0
      })
    } catch (error) {
      console.error("Error loading system status:", error)
    }
  }

  const loadDatabaseTables = async () => {
    try {
      // Execute a query to get table information
      const { data, error } = await supabase.rpc('admin_query_readonly', {
        query_text: `
          SELECT 
            table_name,
            (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `
      })

      if (error) {
        console.error("Error loading tables:", error)
        // Fallback to a simpler query
        const { data: tablesData } = await supabase
          .from("god_mode_audit")
          .select("table_name")
          .limit(20)
        
        const uniqueTables = Array.from(new Set(tablesData?.map(item => item.table_name) || []))
        setDatabaseTables(uniqueTables.map(name => ({
          name,
          rows: 0,
          size: "N/A"
        })))
      } else if (data) {
        // Parse the query results
        const tables = JSON.parse(data)
        setDatabaseTables(tables.map((table: any) => ({
          name: table.table_name,
          rows: 0,
          size: "N/A"
        })))
        
        // Update system status with table count
        if (systemStatus) {
          setSystemStatus(prev => prev ? {
            ...prev,
            total_tables: tables.length
          } : prev)
        }
      }
    } catch (error) {
      console.error("Error in loadDatabaseTables:", error)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("god_mode_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (!error && data) {
        setAuditLogs(data)
      }
    } catch (error) {
      console.error("Error loading audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPermissions = async () => {
    try {
      const permissions = await getUserEnhancedPermissions()
      setUserPermissions(permissions)
    } catch (error) {
      console.error("Error loading user permissions:", error)
    }
  }

  const executeSqlQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error("SQL query cannot be empty")
      return
    }

    setQueryLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_query_readonly', {
        query_text: sqlQuery
      })

      if (error) {
        toast.error(`Query error: ${error.message}`)
        setQueryResults([])
      } else if (data) {
        const results = JSON.parse(data)
        setQueryResults(results)
        toast.success(`Query executed successfully. ${results.length} rows returned.`)
      }
    } catch (error: any) {
      toast.error(`Execution error: ${error.message}`)
      setQueryResults([])
    } finally {
      setQueryLoading(false)
    }
  }

  const clearAuditLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all audit logs? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase
        .from("god_mode_audit")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000") // Always false condition to delete all

      if (error) {
        toast.error(`Error clearing logs: ${error.message}`)
      } else {
        toast.success("Audit logs cleared successfully")
        loadAuditLogs()
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const exportAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("god_mode_audit")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        toast.error(`Error exporting logs: ${error.message}`)
        return
      }

      // Convert to CSV
      const headers = ["ID", "Admin ID", "Action", "Table", "Operation", "Affected Rows", "Timestamp"]
      const csvContent = [
        headers.join(","),
        ...data.map(log => [
          log.id,
          log.admin_id,
          `"${log.action}"`,
          log.table_name,
          log.operation,
          log.affected_rows,
          log.created_at
        ].join(","))
      ].join("\n")

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("Audit logs exported successfully")
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const refreshAllData = () => {
    setLoading(true)
    Promise.all([
      loadSystemStatus(),
      loadDatabaseTables(),
      loadAuditLogs(),
      loadUserPermissions()
    ]).finally(() => setLoading(false))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Loading Admin Dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!godModeEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have God Mode privileges. Only the sole administrator can access this dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin God Mode Dashboard
          </h1>
          <p className="text-muted-foreground">
            Complete system control and monitoring for the sole administrator
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={godModeEnabled ? "default" : "destructive"} className="gap-1">
            {godModeEnabled ? (
              <>
                <Unlock className="h-3 w-3" />
                GOD MODE ENABLED
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
                ACCESS RESTRICTED
              </>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={refreshAllData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus?.database_connected ? "Connected" : "Disconnected"}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStatus?.total_tables || 0} tables, {systemStatus?.total_users || 0} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Administrator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.admin_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus?.admin_count === 1 ? "Sole admin" : "Multiple admins"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.audit_logs_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total logged admin actions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userPermissions ? Object.keys(userPermissions).filter(k => userPermissions[k]).length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Enabled permissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            SQL Query
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Admin Action Audit Logs</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportAuditLogs}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="destructive" size="sm" onClick={clearAuditLogs}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                All actions performed by administrators are logged here for security and accountability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Affected Rows</TableHead>
                      <TableHead>Admin ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={log.action}>
                            {log.action}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.table_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              log.operation === 'DELETE' ? 'destructive' :
                              log.operation === 'UPDATE' ? 'secondary' :
                              log.operation === 'INSERT' ? 'default' : 'secondary'
                            }>
                              {log.operation}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.affected_rows}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.admin_id.substring(0, 8)}...
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
              <CardDescription>
                All tables in the public schema with their approximate row counts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table Name</TableHead>
                      <TableHead>Estimated Rows</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {databaseTables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Loading table information...
                        </TableCell>
                      </TableRow>
                    ) : (
                      databaseTables.map((table) => (
                        <TableRow key={table.name}>
                          <TableCell className="font-mono">{table.name}</TableCell>
                          <TableCell>{table.rows.toLocaleString()}</TableCell>
                          <TableCell>{table.size}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SQL Query Tab */}
        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Safe SQL Query Execution</CardTitle>
              <CardDescription>
                Execute read-only SQL queries against the database. Only SELECT queries are allowed for security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SQL Query</label>
                <textarea
                  className="w-full h-32 font-mono text-sm p-3 border rounded-md bg-muted"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM table_name LIMIT 10"
                />
                <div className="flex items-center text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Only SELECT queries are allowed. Modifying queries (INSERT, UPDATE, DELETE) will be rejected.
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={executeSqlQuery} disabled={queryLoading}>
                  {queryLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Executing...
                    </>
                  ) : (
                    <>
                      <Terminal className="h-4 w-4 mr-2" />
                      Execute Query
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setSqlQuery("SELECT * FROM profiles LIMIT 10")}>
                  Reset to Default
                </Button>
              </div>

              {queryResults.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Results ({queryResults.length} rows)</label>
                  <div className="rounded-md border max-h-96 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          {Object.keys(queryResults[0] || {}).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResults.slice(0, 100).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <TableCell key={cellIndex} className="max-w-[200px] truncate">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {queryResults.length > 100 && (
                    <p className="text-sm text-muted-foreground">
                      Showing first 100 of {queryResults.length} rows
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Current Permissions</CardTitle>
              <CardDescription>
                All permissions available to your account. With God Mode enabled, you have ALL permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userPermissions && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(userPermissions).map(([permission, enabled]) => (
                    <div
                      key={permission}
                      className={`flex items-center gap-2 p-2 rounded-md border ${
                        enabled ? 'bg-green-50 border-green-200' : 'bg-muted'
                      }`}
                    >
                      {enabled ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{permission}</span>
                      {permission === 'GOD_MODE' && enabled && (
                        <Badge variant="default" className="ml-auto">GOD MODE</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Warning</AlertTitle>
        <AlertDescription>
          You are operating in God Mode. All your actions are being logged and cannot be undone.
          Use this power responsibly. Any destructive actions will be permanently recorded in the audit logs.
        </AlertDescription>
      </Alert>
    </div>
  )
}