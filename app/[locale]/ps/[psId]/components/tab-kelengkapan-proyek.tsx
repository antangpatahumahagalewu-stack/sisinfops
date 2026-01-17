"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Download,
  Edit,
  Building2,
  MapPin,
  Users,
  TreePine,
  Coins,
  Calendar,
  FileUp,
  BarChart,
  ShieldCheck,
  Link as LinkIcon,
  Globe
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface ComplianceData {
  project_id: string
  project_type: string
  compliance_score: number
  details: Record<string, {
    status: string
    score: number
    message: string
    data?: any
  }>
  missing_fields: string[]
  next_actions: string[]
  summary: {
    level: string
    description: string
    recommendation: string
  }
}

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  required: boolean
}

export function TabKelengkapanProyek({ psId }: { psId: string }) {
  const [loading, setLoading] = useState(true)
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const locale = params.locale as string

  useEffect(() => {
    async function fetchCompliance() {
      try {
        const supabase = createClient()
        
        // First, get the current user session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setError("Harus login untuk melihat data kelengkapan")
          setLoading(false)
          return
        }

        const response = await fetch(
          `/api/compliance-check?project_id=${psId}&type=perhutanan_sosial`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }
        )

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        setComplianceData(data)
      } catch (err) {
        console.error("Error fetching compliance data:", err)
        setError("Gagal mengambil data kelengkapan")
      } finally {
        setLoading(false)
      }
    }

    fetchCompliance()
  }, [psId])

  const checklistItems: ChecklistItem[] = [
    {
      id: "organizational_info",
      label: "Profil Organisasi",
      description: "Informasi lengkap organisasi pengusul proyek",
      icon: <Building2 className="h-4 w-4" />,
      required: true
    },
    {
      id: "land_tenure",
      label: "Kepemilikan & Tenure Lahan",
      description: "Status kepemilikan, sertifikat, dan tenure lahan",
      icon: <MapPin className="h-4 w-4" />,
      required: true
    },
    {
      id: "forest_status_history",
      label: "Riwayat Status Lahan (10 tahun)",
      description: "Data historis tutupan lahan 10 tahun terakhir",
      icon: <TreePine className="h-4 w-4" />,
      required: true
    },
    {
      id: "deforestation_drivers",
      label: "Analisis Penyebab Perubahan Lahan",
      description: "Identifikasi penyebab degradasi dan rencana intervensi",
      icon: <AlertCircle className="h-4 w-4" />,
      required: true
    },
    {
      id: "social_model_details",
      label: "Model Sosial & Komunitas",
      description: "Detail penerima manfaat, profil sosial, dan peran komunitas",
      icon: <Users className="h-4 w-4" />,
      required: true
    },
    {
      id: "carbon_model_details",
      label: "Model Teknis Karbon",
      description: "Spesifikasi teknis (ARR/REDD+/Pertanian)",
      icon: <BarChart className="h-4 w-4" />,
      required: true
    },
    {
      id: "financial_model",
      label: "Model Finansial",
      description: "Breakdown biaya, sumber pendanaan, dan rencana keuangan",
      icon: <Coins className="h-4 w-4" />,
      required: true
    },
    {
      id: "implementation_timeline",
      label: "Rencana Implementasi",
      description: "Timeline kegiatan 10-30 tahun",
      icon: <Calendar className="h-4 w-4" />,
      required: true
    },
    {
      id: "kml_file",
      label: "Peta Batas Proyek (KML)",
      description: "File KML batas wilayah proyek",
      icon: <Globe className="h-4 w-4" />,
      required: true
    },
    {
      id: "carbon_estimate",
      label: "Estimasi Potensi Karbon",
      description: "Perkiraan potensi penyerapan karbon",
      icon: <TreePine className="h-4 w-4" />,
      required: true
    },
    {
      id: "verification_frequency",
      label: "Rencana Monitoring & Verifikasi",
      description: "Frekuensi monitoring, verifikasi, dan pelaporan",
      icon: <ShieldCheck className="h-4 w-4" />,
      required: true
    },
    {
      id: "organization_link",
      label: "Keterkaitan dengan Organisasi",
      description: "Hubungan proyek dengan organisasi pengusul",
      icon: <LinkIcon className="h-4 w-4" />,
      required: true
    },
    {
      id: "verra_kml",
      label: "Dokumen Registrasi",
      description: "Dokumen pendaftaran dan file pendukung",
      icon: <FileUp className="h-4 w-4" />,
      required: true
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "missing":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "not_applicable":
        return <FileText className="h-5 w-5 text-gray-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">LENGKAP</Badge>
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">SEBAGIAN</Badge>
      case "missing":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">BELUM</Badge>
      case "not_applicable":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">TIDAK BERLAKU</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">-</Badge>
    }
  }

  const getEditLink = (itemId: string) => {
    const links: Record<string, string> = {
      organizational_info: `/${locale}/dashboard/organizations`,
      land_tenure: `/${locale}/ps/${psId}?tab=lahan`,
      forest_status_history: `/${locale}/ps/${psId}?tab=lahan`,
      deforestation_drivers: `/${locale}/ps/${psId}?tab=lahan`,
      social_model_details: `/${locale}/dashboard/data?edit=social_model&psId=${psId}`,
      carbon_model_details: `/${locale}/dashboard/carbon-projects`,
      financial_model: `/${locale}/dashboard/keuangan`,
      implementation_timeline: `/${locale}/dashboard/implementasi`,
      kml_file: `/${locale}/dashboard/data?edit=kml&psId=${psId}`,
      carbon_estimate: `/${locale}/dashboard/carbon-projects`,
      verification_frequency: `/${locale}/dashboard/carbon-projects`,
      organization_link: `/${locale}/dashboard/data?edit=organization&psId=${psId}`,
      verra_kml: `/${locale}/dashboard/verra-registration`
    }
    return links[itemId] || "#"
  }

  const handleExportPDF = () => {
    alert("Fitur ekspor PDF akan segera tersedia. Saat ini, Anda dapat menggunakan fitur print browser.")
    // TODO: Implement PDF export
  }

  const handleExportExcel = () => {
    alert("Fitur ekspor Excel akan segera tersedia. Data dapat diunduh melalui menu Data PS.")
    // TODO: Implement Excel export
  }

  const handleExportJSON = () => {
    if (complianceData) {
      const dataStr = JSON.stringify(complianceData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kelengkapan-proyek-${psId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memeriksa kelengkapan data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!complianceData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600">Data kelengkapan tidak ditemukan</p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h3 className="text-lg font-semibold">Kelengkapan Data Proyek</h3>
        <p className="text-sm text-muted-foreground">
          Pastikan semua data lengkap untuk persiapan assessment proyek
        </p>
      </div>

      {/* Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              <span className="text-lg sm:text-xl">Skor Kelengkapan Data</span>
            </div>
            <Badge className={
              complianceData.summary.level === "EXCELLENT" ? "bg-green-100 text-green-800 text-sm px-3 py-1" :
              complianceData.summary.level === "GOOD" ? "bg-green-100 text-green-800 text-sm px-3 py-1" :
              complianceData.summary.level === "FAIR" ? "bg-yellow-100 text-yellow-800 text-sm px-3 py-1" :
              "bg-red-100 text-red-800 text-sm px-3 py-1"
            }>
              {complianceData.summary.level}
            </Badge>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {complianceData.summary.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress Kelengkapan</span>
                <span className="text-sm font-bold">{complianceData.compliance_score}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${complianceData.compliance_score}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {checklistItems.filter(item => 
                    complianceData.details[item.id]?.status === "complete"
                  ).length}
                </div>
                <div className="text-sm text-gray-700 font-medium">Lengkap</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {checklistItems.filter(item => 
                    complianceData.details[item.id]?.status === "partial"
                  ).length}
                </div>
                <div className="text-sm text-gray-700 font-medium">Sebagian</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {checklistItems.filter(item => 
                    complianceData.details[item.id]?.status === "missing"
                  ).length}
                </div>
                <div className="text-sm text-gray-700 font-medium">Belum</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {checklistItems.filter(item => 
                    complianceData.details[item.id]?.status === "not_applicable"
                  ).length}
                </div>
                <div className="text-sm text-gray-700 font-medium">Tidak Berlaku</div>
              </div>
            </div>

            {complianceData.compliance_score >= 90 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-800">Data Siap untuk Assessment</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Data sudah memenuhi standar kelengkapan. Anda dapat melanjutkan ke proses assessment.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Perlu Penyempurnaan Data</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {complianceData.summary.recommendation}
                    </p>
                    {complianceData.next_actions.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {complianceData.next_actions.slice(0, 3).map((action, index) => (
                          <li key={index} className="text-sm text-yellow-700 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-500"></div>
                            {action}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="h-5 w-5" />
            Checklist 13 Poin Kelengkapan
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Verifikasi kelengkapan data sesuai standar proyek karbon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklistItems.map((item) => {
              const detail = complianceData.details[item.id]
              const status = detail?.status || "missing"
              
              return (
                <div 
                  key={item.id} 
                  className="flex flex-col sm:flex-row sm:items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 mb-3 sm:mb-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {getStatusIcon(status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <h4 className="font-semibold text-base break-words">{item.label}</h4>
                        <div className="self-start sm:self-center">
                          {getStatusBadge(status)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      {detail && (
                        <p className="text-xs text-gray-500">{detail.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-start">
                    {status !== "complete" && status !== "not_applicable" && (
                      <Button size="sm" variant="outline" asChild className="justify-center sm:justify-start">
                        <Link href={getEditLink(item.id)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Isi Data
                        </Link>
                      </Button>
                    )}
                    {detail?.data && (
                      <Button size="sm" variant="ghost" asChild className="justify-center sm:justify-start">
                        <Link href={getEditLink(item.id)}>
                          Lihat Detail
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Section */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Ekspor Laporan
            </CardTitle>
            <CardDescription>
              Unduh laporan kelengkapan data dalam berbagai format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full justify-start py-3" variant="outline" onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                <span className="text-sm">PDF Report (Siap Kirim)</span>
              </Button>
              <Button className="w-full justify-start py-3" variant="outline" onClick={handleExportExcel}>
                <FileText className="mr-2 h-4 w-4" />
                <span className="text-sm">Excel (Data Mentah)</span>
              </Button>
              <Button className="w-full justify-start py-3" variant="outline" onClick={handleExportJSON}>
                <FileText className="mr-2 h-4 w-4" />
                <span className="text-sm">JSON (API Integration)</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Persiapan Assessment
            </CardTitle>
            <CardDescription>
              Persiapan untuk proses due diligence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                className="w-full py-3" 
                disabled={complianceData.compliance_score < 90}
              >
                <span className="text-sm font-medium">Mulai Assessment</span>
              </Button>
              <Button className="w-full py-3" variant="outline" onClick={() => alert("Fitur preview akan segera tersedia")}>
                <span className="text-sm">Preview Tampilan Investor</span>
              </Button>
              <Button className="w-full py-3" variant="outline" onClick={() => alert("Draft disimpan (simulasi)")}>
                <span className="text-sm">Simpan sebagai Draft</span>
              </Button>
            </div>
            {complianceData.compliance_score < 90 && (
              <p className="text-xs text-red-600 mt-3">
                * Skor kelengkapan harus ≥90% untuk memulai assessment
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
