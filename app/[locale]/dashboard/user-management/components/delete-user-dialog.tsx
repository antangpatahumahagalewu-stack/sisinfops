"use client"

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { Loader2, AlertTriangle } from "lucide-react"

interface User {
  id: string
  full_name: string
  email: string
}

interface DeleteUserDialogProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isLoading: boolean
  isSelfDelete: boolean
}

export default function DeleteUserDialog({
  user,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  isSelfDelete
}: DeleteUserDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Hapus Pengguna
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSelfDelete ? (
              <div className="space-y-2">
                <p className="font-semibold text-red-600">⚠️ TIDAK DAPAT MENGHAPUS AKUN SENDIRI</p>
                <p>Anda tidak dapat menghapus akun Anda sendiri untuk alasan keamanan.</p>
                <p className="text-sm text-muted-foreground">
                  Jika Anda perlu menghapus akun ini, mintalah administrator lain untuk melakukannya.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  Apakah Anda yakin ingin menghapus pengguna <strong>{user.full_name || user.email}</strong>?
                </p>
                <p className="text-sm text-muted-foreground">
                  ID: {user.id}
                </p>
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                  <p className="font-semibold">⚠️ PERINGATAN: Aksi ini tidak dapat dibatalkan</p>
                  <ul className="mt-1 list-disc pl-4 space-y-1">
                    <li>Semua data pengguna akan dihapus secara permanen</li>
                    <li>Riwayat aktivitas akan tetap ada untuk audit</li>
                    <li>Pengguna tidak akan dapat login lagi</li>
                  </ul>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
          {!isSelfDelete && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Ya, Hapus Pengguna'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}