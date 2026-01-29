"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
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
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

interface CreateUserModalProps {
  trigger: React.ReactNode
  currentUserId: string
  validRoles: string[]
}

export default function CreateUserModal({
  trigger,
  currentUserId,
  validRoles
}: CreateUserModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "viewer"
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      toast.success(`Pengguna ${data.user.full_name} berhasil dibuat`, {
        description: `Email: ${data.user.email}, Role: ${data.user.role}`
      })

      // Reset form and close modal
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "viewer"
      })
      setIsOpen(false)

      // Refresh the page to show new user
      window.location.reload()
    } catch (error: any) {
      toast.error("Gagal membuat pengguna", {
        description: error.message || "Terjadi kesalahan"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Tambah Pengguna Baru
            </DialogTitle>
            <DialogDescription>
              Buat akun pengguna baru dengan email, password, dan peran tertentu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nama Lengkap *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Password akan dikirim ke email pengguna
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Peran (Role) *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
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
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 border border-blue-200">
              <p className="font-semibold">💡 Informasi Penting</p>
              <ul className="mt-1 list-disc pl-4 space-y-1">
                <li>Email akan dikonfirmasi otomatis</li>
                <li>Password dapat direset oleh pengguna</li>
                <li>Peran dapat diubah nanti oleh admin</li>
                <li>Notifikasi akan dikirim ke email pengguna</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuat...
                </>
              ) : (
                'Buat Pengguna'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}