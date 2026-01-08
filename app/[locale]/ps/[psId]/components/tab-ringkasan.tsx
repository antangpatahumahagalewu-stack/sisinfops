"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Calendar,
  FileText,
  Trees,
  Building2,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface RingkasanData {
  id: string
  skema: string
  pemegang_izin: string
  desa: string | null
  kecamatan: string | null
  kabupaten: { nama: string } | null
  nomor_sk: string | null
  tanggal_sk: string | null
  nomor_pks: string | null
  luas_ha: number | null
  jenis_hutan: string | null
  status_kawasan: string | null
  rkps_status: string | null
  peta_status: string | null
  keterangan: string | null
  fasilitator: string | null
  jumlah_kk: number | null
}

export function TabRingkasan({ psId }: { psId: string }) {
  const [data, setData] = useState<RingkasanData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRingkasan() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("perhutanan_sosial")
        .select(
          `
          *,
          kabupaten:kabupaten_id (
            nama
          )
        `
        )
        .eq("id", psId)
        .single()

      if (error) {
        console.error("Error fetching ringkasan:", error)
      } else {
        setData(data)
      }
      setLoading(false)
    }

    fetchRingkasan()
  }, [psId])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat ringkasan...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600">Data tidak ditemukan</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Ringkasan PS</h3>
        <p className="text-sm text-muted-foreground">
          Ringkasan umum Perhutanan Sosial
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informasi Dasar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Skema</span>
              <p className="font-semibold">{data.skema}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Pemegang Izin</span>
              <p className="font-semibold">{data.pemegang_izin}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-gray-600">
                  {data.desa && `${data.desa}, `}
                  {data.kecamatan && `${data.kecamatan}, `}
                  {data.kabupaten?.nama || ""}
                </span>
              </div>
            </div>
            {data.fasilitator && (
              <div>
                <span className="text-sm text-gray-600">Fasilitator</span>
                <p className="font-medium">{data.fasilitator}</p>
              </div>
            )}
            {data.jumlah_kk && (
              <div>
                <span className="text-sm text-gray-600">Jumlah KK</span>
                <p className="font-semibold text-lg">
                  {data.jumlah_kk.toLocaleString("id-ID")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SK & PKS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              SK & PKS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.nomor_sk && (
              <div>
                <span className="text-sm text-gray-600">Nomor SK</span>
                <p className="font-medium">{data.nomor_sk}</p>
              </div>
            )}
            {data.tanggal_sk && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-sm text-gray-600">Tanggal SK: </span>
                  <span className="font-medium">{formatDate(data.tanggal_sk)}</span>
                </div>
              </div>
            )}
            {data.nomor_pks && (
              <div>
                <span className="text-sm text-gray-600">Nomor PKS</span>
                <p className="font-medium">{data.nomor_pks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Luas & Kawasan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trees className="h-5 w-5" />
              Luas & Kawasan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.luas_ha && (
              <div>
                <span className="text-sm text-gray-600">Luas</span>
                <p className="font-semibold text-lg">
                  {data.luas_ha.toLocaleString("id-ID", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ha
                </p>
              </div>
            )}
            {data.jenis_hutan && (
              <div>
                <span className="text-sm text-gray-600">Jenis Hutan</span>
                <p className="font-medium">{data.jenis_hutan}</p>
              </div>
            )}
            {data.status_kawasan && (
              <div>
                <span className="text-sm text-gray-600">Status Kawasan</span>
                <p className="font-medium">{data.status_kawasan}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Dokumen */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Dokumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">RKPS</span>
              {data.rkps_status === "ada" ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ada
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Belum
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Peta</span>
              {data.peta_status === "ada" ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ada
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Belum
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keterangan */}
      {data.keterangan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keterangan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {data.keterangan}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
