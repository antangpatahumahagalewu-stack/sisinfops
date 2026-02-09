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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserCog, 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Search,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import EditUserModal from "./edit-user-modal"
import DeleteUserDialog from "./delete-user-dialog"

interface User {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  last_sign_in_at: string | null
  created_at: string
  profile_updated_at: string
}

interface UserManagementTableProps {
  initialData: User[]
  currentUserId: string
  validRoles: string[]
}

export default function UserManagementTable({ 
  initialData, 
  currentUserId,
  validRoles 
}: UserManagementTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(initialData)
  const [filteredUsers, setFilteredUsers] = useState<User[]>(initialData)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Update filtered users when filters or search change
  useEffect(() => {
    let result = users
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(user => 
        user.full_name?.toLowerCase().includes(term) || 
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term)
      )
    }
    
    // Apply role filter
    if (roleFilter !== "all") {
      result = result.filter(user => user.role === roleFilter)
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active"
      result = result.filter(user => user.is_active === isActive)
    }
    
    setFilteredUsers(result)
  }, [users, searchTerm, roleFilter, statusFilter])

      // Function to handle user update
  const handleUpdateUser = async (updatedUser: User) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: updatedUser.full_name,
          role: updatedUser.role,
          is_active: updatedUser.is_active
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === updatedUser.id ? { ...updatedUser, ...data.user } : user
      ))

      toast.success(`Pengguna ${updatedUser.full_name} berhasil diperbarui.`)

      setIsEditModalOpen(false)
      setEditingUser(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui pengguna.")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle user deletion
  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      // Remove from local state
      setUsers(users.filter(user => user.id !== userId))

      toast.success("Pengguna berhasil dihapus.")

      setIsDeleteDialogOpen(false)
      setDeletingUser(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus pengguna.")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to toggle user active status
  const toggleUserStatus = async (user: User) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !user.is_active
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status')
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      ))

      toast.success(`Status pengguna ${user.full_name} berhasil diubah.`)

      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah status pengguna.")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to get role display name
  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'admin': 'Administrator',
      'monev': 'Monev',
      'viewer': 'Viewer',
      'program_planner': 'Program Planner',
      'program_implementer': 'Program Implementer',
      'carbon_specialist': 'Carbon Specialist',
      'monev_officer': 'Monev Officer',
      'finance_manager': 'Finance Manager',
      'finance_operational': 'Finance Operational',
      'finance_project_carbon': 'Finance Project Carbon',
      'finance_project_implementation': 'Finance Project Implementation',
      'finance_project_social': 'Finance Project Social',
      'investor': 'Investor'
    }
    return roleNames[role] || role.replace('_', ' ').toUpperCase()
  }

  // Function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Belum pernah'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari nama, email, atau peran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter peran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Peran</SelectItem>
              {validRoles.map(role => (
                <SelectItem key={role} value={role}>
                  {getRoleDisplayName(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Non-Aktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Pengguna</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Terakhir Masuk</TableHead>
              <TableHead>Bergabung</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Tidak ada pengguna yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {user.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || 'Tidak ada nama'}</p>
                        <p className="text-xs text-muted-foreground">ID: {user.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${
                        user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                        user.role.includes('finance') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        user.role.includes('program') ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-700">Aktif</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-700">Non-Aktif</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(user.last_sign_in_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(user.created_at)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => {
                          setEditingUser(user)
                          setIsEditModalOpen(true)
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Pengguna
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setDeletingUser(user)
                            setIsDeleteDialogOpen(true)
                          }}
                          disabled={user.id === currentUserId}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus Pengguna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingUser(null)
          }}
          onSave={handleUpdateUser}
          validRoles={validRoles}
          isLoading={isLoading}
        />
      )}

      {/* Delete User Dialog */}
      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false)
            setDeletingUser(null)
          }}
          onConfirm={() => handleDeleteUser(deletingUser.id)}
          isLoading={isLoading}
          isSelfDelete={deletingUser.id === currentUserId}
        />
      )}

      {/* Summary */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <div>
          Menampilkan {filteredUsers.length} dari {users.length} pengguna
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Aktif: {users.filter(u => u.is_active).length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span>Non-Aktif: {users.filter(u => !u.is_active).length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}