import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Users, Filter, Download, UserPlus, Shield, UserCog } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { locales } from "@/i18n/locales"
import UserManagementTable from "./components/user-management-table"
import CreateUserModal from "./components/create-user-modal"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function UserManagementPage({
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

  // Check if user is admin - only admin can access this page
  if (profile?.role !== 'admin') {
    redirect(`/${locale}/dashboard`)
  }

  // Fetch all users with their profiles
  let users: any[] = []
  let totalCount = 0
  try {
    // Create admin client for auth.admin operations (requires service role key)
    const adminClient = await createAdminClient()
    
    // First, get profiles with pagination (we'll fetch first 100 for now, but table will handle pagination via API)
    const { data: profiles, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching profiles:', error)
    } else {
      // For each profile, get auth user info using admin API
      users = await Promise.all(
        (profiles || []).map(async (profile) => {
          try {
            const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profile.id)
            
            if (authError) {
              console.error(`Error fetching auth user for ${profile.id}:`, authError)
              return {
                id: profile.id,
                full_name: profile.full_name,
                role: profile.role,
                email: 'Error fetching email',
                is_active: true,
                profile_created_at: profile.created_at,
                profile_updated_at: profile.updated_at
              }
            }
            
            return {
              id: profile.id,
              full_name: profile.full_name,
              role: profile.role,
              email: authUser.user?.email || 'No email',
              last_sign_in_at: authUser.user?.last_sign_in_at,
              created_at: authUser.user?.created_at,
              confirmed_at: authUser.user?.confirmed_at,
              banned_until: authUser.user?.banned_until,
              is_active: !authUser.user?.banned_until,
              profile_created_at: profile.created_at,
              profile_updated_at: profile.updated_at
            }
          } catch (error) {
            console.error(`Error processing user ${profile.id}:`, error)
            return {
              id: profile.id,
              full_name: profile.full_name,
              role: profile.role,
              email: 'Error',
              is_active: true,
              profile_created_at: profile.created_at,
              profile_updated_at: profile.updated_at
            }
          }
        })
      )
      totalCount = count || 0
    }
  } catch (error) {
    console.error('Unexpected error in user management page:', error)
  }

  // Get role statistics
  const roleStats: Record<string, number> = {}
  users.forEach(user => {
    roleStats[user.role] = (roleStats[user.role] || 0) + 1
  })

  // Get status statistics
  const activeUsers = users.filter(user => user.is_active).length
  const inactiveUsers = users.filter(user => !user.is_active).length

  // Get recent sign-ins (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentSignIns = users.filter(user => 
    user.last_sign_in_at && new Date(user.last_sign_in_at) > sevenDaysAgo
  ).length

  // Valid roles for dropdowns (13 roles as per system)
  const validRoles = [
    'admin', 'monev', 'viewer', 
    'program_planner', 'program_implementer', 
    'carbon_specialist', 'monev_officer',
    'finance_manager', 'finance_operational', 'finance_project_carbon',
    'finance_project_implementation', 'finance_project_social', 'investor'
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">
            Kelola semua pengguna sistem: buat, edit, hapus, dan ubah peran (role) pengguna
          </p>
        </div>
        <div className="flex gap-2">
          <CreateUserModal 
            trigger={
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Tambah Pengguna
              </Button>
            }
            currentUserId={user.id}
            validRoles={validRoles}
          />
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col bg-blue-50/50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-blue-700">{totalCount}</div>
            <p className="text-xs text-blue-600">Pengguna terdaftar</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-green-50/50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengguna Aktif</CardTitle>
            <UserCog className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-green-700">{activeUsers}</div>
            <p className="text-xs text-green-600">Sedang aktif</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-purple-50/50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-purple-700">{roleStats['admin'] || 0}</div>
            <p className="text-xs text-purple-600">Administrator system</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-amber-50/50 border-amber-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sign-in (7 hari)</CardTitle>
            <PlusCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-amber-700">{recentSignIns}</div>
            <p className="text-xs text-amber-600">Pengguna aktif minggu ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="all">Semua Pengguna</TabsTrigger>
          <TabsTrigger value="admin">Admin & Super User</TabsTrigger>
          <TabsTrigger value="finance">Tim Keuangan</TabsTrigger>
          <TabsTrigger value="program">Program & Proyek</TabsTrigger>
          <TabsTrigger value="carbon">Spesialis Karbon</TabsTrigger>
          <TabsTrigger value="inactive">Non-Aktif</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Semua Pengguna</CardTitle>
              <CardDescription>
                Tabel lengkap semua pengguna sistem dengan kemampuan manajemen penuh
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable
                initialData={users}
                currentUserId={user.id}
                validRoles={validRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin & Super User</CardTitle>
              <CardDescription>
                Pengguna dengan hak akses administrator dan super user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable
                initialData={users.filter(user => user.role === 'admin')}
                currentUserId={user.id}
                validRoles={validRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tim Keuangan</CardTitle>
              <CardDescription>
                Semua peran keuangan: finance_manager, finance_operational, finance_project_*, dll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable
                initialData={users.filter(user => user.role.includes('finance'))}
                currentUserId={user.id}
                validRoles={validRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="program" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tim Program & Proyek</CardTitle>
              <CardDescription>
                Peran program_planner, program_implementer, monev_officer, dll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable
                initialData={users.filter(user => 
                  ['program_planner', 'program_implementer', 'monev_officer'].includes(user.role)
                )}
                currentUserId={user.id}
                validRoles={validRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carbon" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spesialis Karbon & Investor</CardTitle>
              <CardDescription>
                Peran carbon_specialist, investor, dan terkait karbon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable
                initialData={users.filter(user => 
                  ['carbon_specialist', 'investor'].includes(user.role)
                )}
                currentUserId={user.id}
                validRoles={validRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengguna Non-Aktif</CardTitle>
              <CardDescription>
                Pengguna yang dinonaktifkan atau dibanned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable
                initialData={users.filter(user => !user.is_active)}
                currentUserId={user.id}
                validRoles={validRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribusi Peran Pengguna</CardTitle>
          <CardDescription>
            Jumlah pengguna per peran (role) dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(roleStats).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium capitalize">{role.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{count} pengguna</p>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
          <CardDescription>
            Operasi batch untuk manajemen pengguna
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Aktifkan Semua
            </Button>
            <Button variant="outline" size="sm">
              Nonaktifkan Semua
            </Button>
            <Button variant="outline" size="sm">
              Reset Password Massal
            </Button>
            <Button variant="outline" size="sm">
              Export CSV
            </Button>
            <Button variant="outline" size="sm">
              Import Pengguna
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}