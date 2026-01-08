"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, AlertCircle, CheckCircle, XCircle } from "lucide-react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [stats, setStats] = useState<{ imported: number; failed: number } | null>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError("Hanya file Excel (.xlsx, .xls) yang diperbolehkan")
        return
      }
      setFile(selectedFile)
      setError(null)
      setSuccess(null)
      setStats(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Silakan pilih file Excel terlebih dahulu")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/excel/import", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengupload file")
      }

      setSuccess(`Berhasil mengimpor ${result.imported} data dari file Excel`)
      setStats({
        imported: result.imported,
        failed: result.failed,
      })
      
      // Refresh data di halaman lain
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengupload file")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    // In a real application, you would serve a template file
    // For now, we'll just show a message
    alert("Fitur download template akan segera tersedia. Gunakan format Excel yang ada sebagai referensi.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Data Excel</h1>
        <p className="text-muted-foreground">
          Import data Perhutanan Sosial dari file Excel ke database
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload file Excel dengan data Perhutanan Sosial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="excel-file">File Excel</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Format: .xlsx atau .xls (maks. 10MB)
              </p>
            </div>

            {file && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={loading}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              className="w-full" 
              disabled={!file || loading}
            >
              {loading ? "Mengupload..." : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Import Data
                </>
              )}
            </Button>

            {stats && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Hasil Import</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Berhasil</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.imported}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Gagal</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.failed}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panduan Upload</CardTitle>
            <CardDescription>
              Instruksi untuk menyiapkan file Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Struktur File Excel</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>File harus mengandung sheet "DATA PS YANG TELAH BERTANDATANGAN"</li>
                <li>Kolom wajib: SKEMA, PEMEGANG IZIN, DESA/KELURAHAN, KECAMATAN</li>
                <li>Kolom tambahan: NOMOR SK, TANGGAL SK, LUAS IZIN DALAM SK (HA), dll</li>
                <li>Data terpisah per kabupaten dalam sheet yang sama</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Format Data</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Tanggal: Format DD MMMM YYYY atau YYYY-MM-DD</li>
                <li>Luas: Angka desimal (gunakan titik sebagai pemisah)</li>
                <li>SKEMA: HKM, LPHD, HA, HTR, IUPHHK, IUPHKm</li>
                <li>Status: "ada" atau "belum" untuk RKPS dan PETA</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Tips</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Pastikan tidak ada merged cell di area data</li>
                <li>Hapus baris kosong di antara data</li>
                <li>Backup data sebelum melakukan import massal</li>
                <li>Verifikasi data setelah import selesai</li>
              </ul>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDownloadTemplate}
            >
              Download Template Excel
            </Button>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">Perhatian</p>
              <p className="mt-1">
                Data yang sudah diimport akan langsung masuk ke database. 
                Pastikan data sudah benar sebelum melakukan upload.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
