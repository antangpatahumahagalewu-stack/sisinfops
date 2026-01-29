"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
}

interface EditUserModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onSave: (user: User) => Promise<void>
  validRoles: string[]
  isLoading: boolean
}

export default function EditUserModal({
  user,
  isOpen,
  onClose,
  onSave,
  validRoles,
  isLoading
}: EditUserModalProps) {
  const [editedUser, setEditedUser] = useState<User>({ ...user })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(editedUser)
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Ubah informasi pengguna {user.full_name || user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                value={editedUser.full_name || ''}
                onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editedUser.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Peran (Role)</Label>
              <Select
                value={editedUser.role}
                onValueChange={(value) => setEditedUser({ ...editedUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  {validRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="is_active">Status Akun</Label>
                <p className="text-sm text-muted-foreground">
                  {editedUser.is_active ? 'Akun aktif' : 'Akun dinonaktifkan'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={editedUser.is_active}
                onCheckedChange={(checked) => setEditedUser({ ...editedUser, is_active: checked })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user_id">ID Pengguna</Label>
              <Input
                id="user_id"
                value={editedUser.id}
                disabled
                className="bg-gray-50 font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}