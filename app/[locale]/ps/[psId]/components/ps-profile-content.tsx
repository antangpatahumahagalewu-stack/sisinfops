"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, FileText, Upload, BarChart } from "lucide-react"

import { PsHeader } from "./ps-header"
import { PsTabs } from "./ps-tabs"
import { EditPsForm } from "./edit-ps-form"
import { PsProfile } from "../types"

interface PsProfileContentProps {
  ps: PsProfile
  psId: string
}

export default function PsProfileContent({ ps, psId }: PsProfileContentProps) {
  const [showEditForm, setShowEditForm] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation and Page Title */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/data">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profil Perhutanan Sosial</h1>
              <p className="text-gray-600 mt-2">
                Detail lengkap dan manajemen data untuk {ps.namaPs}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Cetak Laporan
              </Button>
              <Button variant="outline" size="sm">
                Bagikan
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Header and Tabs */}
          <div className="lg:col-span-3 space-y-8">
            {showEditForm ? (
              <EditPsForm 
                ps={ps} 
                onSuccess={() => setShowEditForm(false)}
                onCancel={() => setShowEditForm(false)}
              />
            ) : (
              <>
                {/* Header Card */}
                <PsHeader ps={ps} />

                {/* Tabs Section */}
                <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
                  <div className="border-b">
                    <div className="px-6 py-4">
                      <h2 className="text-xl font-bold text-gray-900">Detail Informasi</h2>
                      <p className="text-gray-600 text-sm">
                        Kelola dan lihat informasi lengkap PS dalam tab berikut
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <Suspense 
                      fallback={
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Memuat data PS...</p>
                          </div>
                        </div>
                      }
                    >
                      <PsTabs psId={ps.id} />
                    </Suspense>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Sidebar Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Aksi Cepat</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setShowEditForm(!showEditForm)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {showEditForm ? "Batalkan Edit" : "Edit Data"}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Tambah Catatan
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Dokumen
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart className="mr-2 h-4 w-4" />
                  Lihat Statistik
                </Button>
              </div>
            </div>

            {/* Status Overview */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Status Dokumen</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">RKPS</span>
                    <span className="text-sm font-bold text-green-600">✓ Tersedia</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Peta PS</span>
                    <span className="text-sm font-bold text-yellow-600">⏳ Dalam Proses</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Laporan Tahunan</span>
                    <span className="text-sm font-bold text-red-600">✗ Belum</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Linimasa Terkini</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Data diperbarui</p>
                    <p className="text-xs text-gray-500">2 hari yang lalu</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Verifikasi selesai</p>
                    <p className="text-xs text-gray-500">1 minggu yang lalu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">Terakhir diakses:</span> {new Date().toLocaleDateString('id-ID')}
            </div>
            <div className="flex items-center gap-4">
              <span>Versi: 1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
