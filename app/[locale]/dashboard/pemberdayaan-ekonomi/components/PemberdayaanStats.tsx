"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, DollarSign, PieChart, BarChart } from "lucide-react"

interface StatsData {
  kabupaten_id: string
  kabupaten_nama: string
  total_usaha: number
  total_anggota: number
  total_pendapatan: number
  avg_pendapatan_per_usaha: number
  jenis_usaha_count: Record<string, number>
}

interface PemberdayaanStatsProps {
  statsData: StatsData[]
}

export default function PemberdayaanStats({ statsData }: PemberdayaanStatsProps) {
  // Calculate top jenis usaha across all kabupaten
  const jenisUsahaAggregate: Record<string, number> = {}
  statsData.forEach(item => {
    if (item.jenis_usaha_count) {
      Object.entries(item.jenis_usaha_count).forEach(([jenis, count]) => {
        jenisUsahaAggregate[jenis] = (jenisUsahaAggregate[jenis] || 0) + count
      })
    }
  })

  const topJenisUsaha = Object.entries(jenisUsahaAggregate)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }))

  // Sort kabupaten by total usaha descending
  const sortedKabupaten = [...statsData].sort((a, b) => b.total_usaha - a.total_usaha)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Statistik per Kabupaten
          </CardTitle>
          <CardDescription>
            Perbandingan data pemberdayaan ekonomi antar kabupaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Kabupaten</th>
                  <th className="text-left py-3 px-4 font-medium">Jumlah Usaha</th>
                  <th className="text-left py-3 px-4 font-medium">Total Anggota</th>
                  <th className="text-left py-3 px-4 font-medium">Total Pendapatan</th>
                  <th className="text-left py-3 px-4 font-medium">Rata-rata Pendapatan/Usaha</th>
                </tr>
              </thead>
              <tbody>
                {sortedKabupaten.map((item) => (
                  <tr key={item.kabupaten_id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">
                      {item.kabupaten_nama.replace("KABUPATEN ", "")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold">{item.total_usaha}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold">{item.total_anggota.toLocaleString("id-ID")}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-green-700">
                        Rp {item.total_pendapatan.toLocaleString("id-ID")}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold">
                        Rp {item.avg_pendapatan_per_usaha.toLocaleString("id-ID")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Top 5 Jenis Usaha
            </CardTitle>
            <CardDescription>
              Jenis usaha paling populer di seluruh kabupaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topJenisUsaha.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-lg font-bold">{item.value} usaha</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Performa Kabupaten
            </CardTitle>
            <CardDescription>
              Kabupaten dengan performa terbaik berdasarkan jumlah usaha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedKabupaten.slice(0, 5).map((item, index) => (
                <div key={item.kabupaten_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    } font-medium`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">
                        {item.kabupaten_nama.replace("KABUPATEN ", "")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.total_anggota.toLocaleString("id-ID")} anggota
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{item.total_usaha} usaha</div>
                    <div className="text-sm text-green-700">
                      Rp {item.total_pendapatan.toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}