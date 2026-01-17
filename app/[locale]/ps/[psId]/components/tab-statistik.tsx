"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, FileText, Calendar, Image, Activity } from "lucide-react"

interface StatistikData {
  totalKegiatan: number
  totalDokumen: number
  totalGaleri: number
  totalCatatan: number
  kegiatanPerTahun: Array<{ tahun: string; jumlah: number }>
  dokumenPerJenis: Array<{ jenis: string; jumlah: number }>
  statusKegiatan: Array<{ status: string; jumlah: number }>
}

export function TabStatistik({ psId }: { psId: string }) {
  const [data, setData] = useState<StatistikData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatistik() {
      const supabase = createClient()
      
      // Fetch data dari berbagai tabel
      const [
        { count: kegiatanCount },
        { count: dokumenCount },
        { count: galeriCount },
        { count: catatanCount },
        { data: kegiatanData },
        { data: dokumenData },
      ] = await Promise.all([
        supabase.from("kegiatan").select("*", { count: 'exact', head: true }).eq("perhutanan_sosial_id", psId),
        supabase.from("dokumen").select("*", { count: 'exact', head: true }).eq("perhutanan_sosial_id", psId),
        supabase.from("galeri").select("*", { count: 'exact', head: true }).eq("perhutanan_sosial_id", psId),
        supabase.from("catatan").select("*", { count: 'exact', head: true }).eq("perhutanan_sosial_id", psId),
        supabase.from("kegiatan").select("tanggal_mulai, status").eq("perhutanan_sosial_id", psId),
        supabase.from("dokumen").select("jenis_dokumen").eq("perhutanan_sosial_id", psId),
      ])

      // Proses data untuk chart
      const kegiatanPerTahun: Record<string, number> = {}
      const statusKegiatan: Record<string, number> = {}
      const dokumenPerJenis: Record<string, number> = {}

      kegiatanData?.forEach(kegiatan => {
        if (kegiatan.tanggal_mulai) {
          const tahun = new Date(kegiatan.tanggal_mulai).getFullYear().toString()
          kegiatanPerTahun[tahun] = (kegiatanPerTahun[tahun] || 0) + 1
        }
        if (kegiatan.status) {
          statusKegiatan[kegiatan.status] = (statusKegiatan[kegiatan.status] || 0) + 1
        }
      })

      dokumenData?.forEach(dokumen => {
        if (dokumen.jenis_dokumen) {
          dokumenPerJenis[dokumen.jenis_dokumen] = (dokumenPerJenis[dokumen.jenis_dokumen] || 0) + 1
        }
      })

      const statistik: StatistikData = {
        totalKegiatan: kegiatanCount || 0,
        totalDokumen: dokumenCount || 0,
        totalGaleri: galeriCount || 0,
        totalCatatan: catatanCount || 0,
        kegiatanPerTahun: Object.entries(kegiatanPerTahun).map(([tahun, jumlah]) => ({ tahun, jumlah })),
        dokumenPerJenis: Object.entries(dokumenPerJenis).map(([jenis, jumlah]) => ({ jenis, jumlah })),
        statusKegiatan: Object.entries(statusKegiatan).map(([status, jumlah]) => ({ status, jumlah })),
      }

      setData(statistik)
      setLoading(false)
    }

    fetchStatistik()
  }, [psId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat statistik...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Statistik PS</h3>
        <p className="text-sm text-muted-foreground">
          Data statistik dan analisis untuk Perhutanan Sosial ini
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Kegiatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalKegiatan || 0}</div>
            <p className="text-xs text-muted-foreground">Kegiatan tercatat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalDokumen || 0}</div>
            <p className="text-xs text-muted-foreground">Dokumen tersimpan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              Total Galeri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalGaleri || 0}</div>
            <p className="text-xs text-muted-foreground">Foto & video</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Catatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalCatatan || 0}</div>
            <p className="text-xs text-muted-foreground">Catatan lapangan</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kegiatan per Tahun */}
        {data?.kegiatanPerTahun && data.kegiatanPerTahun.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kegiatan per Tahun</CardTitle>
              <CardDescription>Distribusi kegiatan berdasarkan tahun</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.kegiatanPerTahun.map((item) => (
                  <div key={item.tahun} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{item.tahun}</span>
                    <Badge variant="secondary">{item.jumlah} kegiatan</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dokumen per Jenis */}
        {data?.dokumenPerJenis && data.dokumenPerJenis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dokumen per Jenis</CardTitle>
              <CardDescription>Distribusi dokumen berdasarkan jenis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.dokumenPerJenis.map((item) => (
                  <div key={item.jenis} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{item.jenis}</span>
                    <Badge variant="outline">{item.jumlah} dokumen</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Kegiatan */}
        {data?.statusKegiatan && data.statusKegiatan.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Status Kegiatan</CardTitle>
              <CardDescription>Distribusi kegiatan berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.statusKegiatan.map((item) => (
                  <div key={item.status} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{item.jumlah}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.status}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data Kosong Message */}
      {(!data || 
        (data.totalKegiatan === 0 && 
         data.totalDokumen === 0 && 
         data.totalGaleri === 0 && 
         data.totalCatatan === 0)) && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Belum ada data statistik
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Data statistik akan tersedia setelah menambahkan kegiatan, dokumen, galeri, atau catatan.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
