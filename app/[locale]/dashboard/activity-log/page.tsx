import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, Filter, Download, Search, User, Calendar, Activity, FileText } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { locales } from "@/i18n/locales"
import ActivityLogTable from "./components/activity-log-table"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function ActivityLogPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  // Check if user is admin
  if (profile?.role !== 'admin') {
    redirect(`/${locale}/dashboard`)
  }

  // Get all users for filter (admin only)
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name")

  // Get activity types for filter
  const activityTypes = [
    'login', 'logout', 'page_view', 'data_read', 'data_create',
    'data_update', 'data_delete', 'file_upload', 'file_download',
    'search', 'export', 'import', 'api_call', 'error', 'other'
  ]

  // Get resource types from activity_log table (distinct)
  let resourceTypes: string[] = []
  try {
    const { data: resourceTypesData } = await supabase
      .from("activity_log")
      .select("resource_type")
      .not("resource_type", "is", null)
      .order("resource_type")

    resourceTypes = [...new Set(resourceTypesData?.map(item => item.resource_type).filter(Boolean) || [])]
  } catch (error) {
    console.error("Error fetching resource types:", error)
    resourceTypes = []
  }

  // Get recent activities for stats
  const { data: recentActivities } = await supabase
    .from("activity_log")
    .select("*", { count: 'exact' })
    .order("created_at", { ascending: false })
    .limit(50)

  const totalActivities = recentActivities?.length || 0

  // Calculate stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const { count: todayCount } = await supabase
    .from("activity_log")
    .select("*", { count: 'exact', head: true })
    .gte("created_at", todayISO)

  const { count: loginCount } = await supabase
    .from("activity_log")
    .select("*", { count: 'exact', head: true })
    .eq("activity_type", "login")

  const { count: dataUpdateCount } = await supabase
    .from("activity_log")
    .select("*", { count: 'exact', head: true })
    .eq("activity_type", "data_update")

  // Get top users by activity count
  let topUsers: Record<string, number> = {}
  try {
    const { data: topUsersData } = await supabase
      .from("activity_log")
      .select("user_id, profiles!inner(full_name)")
      .limit(10)

    topUsers = topUsersData?.reduce((acc: Record<string, number>, item) => {
      const userId = item.user_id
      acc[userId] = (acc[userId] || 0) + 1
      return acc
    }, {}) || {}
  } catch (error) {
    console.error("Error fetching top users:", error)
    topUsers = {}
  }

  const topUsersList = Object.entries(topUsers || {}).slice(0, 5)

  // Get online users (active in last 5 minutes)
  let onlineUsers: any[] = []
  try {
    const { data: onlineUsersData } = await supabase
      .from("online_users_view")
      .select("*")
      .order("last_seen_at", { ascending: false })

    onlineUsers = onlineUsersData || []
  } catch (error) {
    console.error("Error fetching online users:", error)
    onlineUsers = []
  }

  // Get user activity dashboard data
  let userActivityData: any[] = []
  try {
    const { data: activityData } = await supabase
      .from("user_activity_dashboard")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(10)

    userActivityData = activityData || []
  } catch (error) {
    console.error("Error fetching user activity data:", error)
    userActivityData = []
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Aktivitas Sistem</h1>
          <p className="text-muted-foreground">
            Melacak semua aktivitas pengguna: login, akses data, perubahan, dll.
          </p>
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
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Pencarian Lanjut
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col bg-blue-50/50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Aktivitas</CardTitle>
            <History className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-blue-700">{totalActivities}</div>
            <p className="text-xs text-blue-600">Catatan aktivitas</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-green-50/50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivitas Hari Ini</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-green-700">{todayCount || 0}</div>
            <p className="text-xs text-green-600">Sejak {today.toLocaleDateString('id-ID')}</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-purple-50/50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Login</CardTitle>
            <User className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-purple-700">{loginCount || 0}</div>
            <p className="text-xs text-purple-600">Sesi login pengguna</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-amber-50/50 border-amber-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perubahan Data</CardTitle>
            <Activity className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-amber-700">{dataUpdateCount || 0}</div>
            <p className="text-xs text-amber-600">Update data oleh pengguna</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="all">Semua Aktivitas</TabsTrigger>
          <TabsTrigger value="login">Login/Logout</TabsTrigger>
          <TabsTrigger value="data">Operasi Data</TabsTrigger>
          <TabsTrigger value="files">File & Upload</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="recent">24 Jam Terakhir</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semua Log Aktivitas</CardTitle>
              <CardDescription>
                Tabel lengkap semua aktivitas pengguna dalam sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLogTable
                initialData={recentActivities || []}
                userOptions={allUsers || []}
                activityTypeOptions={activityTypes}
                resourceTypeOptions={resourceTypes}
                currentUserId={user.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Log Aktivitas Login & Logout</CardTitle>
              <CardDescription>
                Catatan semua sesi login dan logout pengguna
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLogTable
                initialData={recentActivities?.filter(a => a.activity_type === 'login' || a.activity_type === 'logout') || []}
                userOptions={allUsers || []}
                activityTypeOptions={['login', 'logout']}
                resourceTypeOptions={resourceTypes}
                currentUserId={user.id}
                defaultActivityType="login"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Log Operasi Data</CardTitle>
              <CardDescription>
                Catatan semua operasi data: baca, buat, update, hapus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLogTable
                initialData={recentActivities?.filter(a => 
                  ['data_read', 'data_create', 'data_update', 'data_delete'].includes(a.activity_type)
                ) || []}
                userOptions={allUsers || []}
                activityTypeOptions={['data_read', 'data_create', 'data_update', 'data_delete']}
                resourceTypeOptions={resourceTypes}
                currentUserId={user.id}
                defaultActivityType="data_update"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Log File & Upload</CardTitle>
              <CardDescription>
                Catatan semua aktivitas file: upload, download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLogTable
                initialData={recentActivities?.filter(a => 
                  ['file_upload', 'file_download'].includes(a.activity_type)
                ) || []}
                userOptions={allUsers || []}
                activityTypeOptions={['file_upload', 'file_download']}
                resourceTypeOptions={resourceTypes}
                currentUserId={user.id}
                defaultActivityType="file_upload"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pengguna Paling Aktif</CardTitle>
            <CardDescription>
              5 pengguna dengan aktivitas terbanyak
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topUsersList.length > 0 ? (
              <div className="space-y-3">
                {topUsersList.map(([userId, count], index) => {
                  const userProfile = allUsers?.find(u => u.id === userId)
                  return (
                    <div key={userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {userProfile?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userProfile?.role || 'Unknown role'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">aktivitas</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data aktivitas
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengguna Online</CardTitle>
            <CardDescription>
              User yang aktif dalam 5 menit terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onlineUsers.length > 0 ? (
              <div className="space-y-3">
                {onlineUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium">
                          {user.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.role} • {user.activity_status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {user.last_seen_at ? new Date(user.last_seen_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.is_online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {onlineUsers.length - 5} pengguna online lainnya
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada pengguna online
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Sistem Audit</CardTitle>
            <CardDescription>
              Tentang sistem pelacakan aktivitas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Apa yang dicatat?</p>
                <p className="text-xs text-muted-foreground">
                  Semua aktivitas pengguna: login, logout, akses halaman, operasi data (CRUD), upload/download file, dll.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Siapa yang bisa melihat?</p>
                <p className="text-xs text-muted-foreground">
                  Hanya Administrator yang dapat mengakses log aktivitas ini.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <History className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Berapa lama disimpan?</p>
                <p className="text-xs text-muted-foreground">
                  Data aktivitas disimpan secara permanen untuk keperluan audit dan monitoring.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}