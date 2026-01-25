"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface PemberdayaanData {
  id: string
  perhutanan_sosial_id: string
  ps_nama: string
  kabupaten_nama: string
  jenis_usaha: string
  produk: string
  volume_produksi: number
  satuan_volume: string
  pendapatan_per_bulan: number
  jumlah_anggota: number
  tahun: number
  status: string
  karakteristik_khusus?: string
  created_at: string
}

interface PemberdayaanTableProps {
  data: PemberdayaanData[]
  isProgramPlanner: boolean
}

export default function PemberdayaanTable({ data, isProgramPlanner }: PemberdayaanTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PemberdayaanData | null>(null)

  const handleDeleteClick = (item: PemberdayaanData) => {
    setSelectedItem(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return
    
    // TODO: Implement delete API call
    console.log("Deleting item:", selectedItem.id)
    setDeleteDialogOpen(false)
    setSelectedItem(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        )
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      case "archived":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PS / Lokasi</TableHead>
              <TableHead>Jenis Usaha</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Pendapatan/Bulan</TableHead>
              <TableHead className="text-right">Anggota</TableHead>
              <TableHead>Tahun</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Tidak ada data ditemukan. Coba ubah filter atau tambah data baru.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.ps_nama || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.kabupaten_nama?.replace("KABUPATEN ", "") || "N/A"}
                      </div>
                      {item.karakteristik_khusus && (
                        <div className="text-xs text-blue-600">
                          {item.karakteristik_khusus.substring(0, 30)}...
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.jenis_usaha || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate">{item.produk || "-"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.volume_produksi ? (
                      <div>
                        <span className="font-medium">{item.volume_produksi.toLocaleString("id-ID")}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {item.satuan_volume || "unit"}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.pendapatan_per_bulan ? (
                      <div className="font-medium text-green-700">
                        {formatCurrency(item.pendapatan_per_bulan)}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.jumlah_anggota ? (
                      <div className="font-medium">{item.jumlah_anggota.toLocaleString("id-ID")}</div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.tahun || "-"}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/ps/${item.perhutanan_sosial_id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Profil PS
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/pemberdayaan-ekonomi/${item.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detail Usaha
                          </Link>
                        </DropdownMenuItem>
                        {isProgramPlanner && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/pemberdayaan-ekonomi/${item.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apakah Anda yakin?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus data usaha "{selectedItem?.jenis_usaha}" 
              dari {selectedItem?.ps_nama}. Data yang telah dihapus tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}