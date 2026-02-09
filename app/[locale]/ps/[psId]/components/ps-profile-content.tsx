"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, FileText, Upload, BarChart } from "lucide-react"

import { PsHeader } from "./ps-header"
import { PsTabs } from "./ps-tabs"
import { ComprehensiveEditForm } from "./comprehensive-edit-form"
import { PsProfile } from "../types"

interface PsProfileContentProps {
  ps: PsProfile
  psId: string
}

export default function PsProfileContent({ ps, psId }: PsProfileContentProps) {
  const [editMode, setEditMode] = useState<null | 'comprehensive'>(null)

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-3 sm:px-4 py-1">
        {/* Navigation and Page Title */}
        <div className="mb-1">
          <Button variant="ghost" size="sm" asChild className="mb-0">
            <Link href="/dashboard/data">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="text-sm">Kembali Ke Data PS</span>
            </Link>
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profil Perhutanan Sosial</h1>
              <p className="text-gray-600 mt-0 text-xs sm:text-sm">
                Detail lengkap dan manajemen data untuk {ps.namaPs}
              </p>
            </div>
            <div className="flex gap-1 self-start sm:self-center">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                Cetak Laporan
              </Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                Bagikan
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Left Column - Header and Tabs */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-4">
            {editMode === 'comprehensive' ? (
              <ComprehensiveEditForm
                ps={ps}
                psId={psId}
                onSuccess={() => setEditMode(null)}
                onCancel={() => setEditMode(null)}
              />
            ) : (
              <>
                {/* Header Card */}
                <PsHeader ps={ps} />

                {/* Tabs Section */}
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                  <div className="border-b">
                    <div className="px-3 sm:px-4 py-2">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900">Detail Informasi</h2>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        Kelola dan lihat informasi lengkap PS dalam tab berikut
                      </p>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <Suspense 
                      fallback={
                        <div className="flex items-center justify-center h-32">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-600">Memuat data PS...</p>
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
          <div className="space-y-3 sm:space-y-4">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow border p-3 sm:p-4">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Aksi Cepat</h3>
              <div className="space-y-2">
                <Button 
                  className="w-full justify-start py-2 text-sm" 
                  variant="outline"
                  onClick={() => setEditMode(editMode === 'comprehensive' ? null : 'comprehensive')}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {editMode === 'comprehensive' ? "Batalkan Edit Data" : "Edit Data Lengkap"}
                </Button>
                <Button className="w-full justify-start py-2 text-sm" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Tambah Catatan
                </Button>
                <Button className="w-full justify-start py-2 text-sm" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Dokumen
                </Button>
                <Button className="w-full justify-start py-2 text-sm" variant="outline">
                  <BarChart className="mr-2 h-4 w-4" />
                  Lihat Statistik
                </Button>
              </div>
            </div>

            {/* Status Overview */}
            <div className="bg-white rounded-lg shadow border p-3 sm:p-4">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Status Dokumen</h3>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-gray-800">RKPS</span>
                    {ps.rkps_status === 'ada' ? (
                      <span className="text-xs sm:text-sm font-bold text-green-600">✓ Ada</span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-red-600">✗ Belum</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${ps.rkps_status === 'ada' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: ps.rkps_status === 'ada' ? '100%' : '30%' }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-gray-800">Peta PS</span>
                    {ps.peta_status === 'ada' ? (
                      <span className="text-xs sm:text-sm font-bold text-green-600">✓ Ada</span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-red-600">✗ Belum</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${ps.peta_status === 'ada' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: ps.peta_status === 'ada' ? '100%' : '30%' }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-gray-800">Laporan Tahunan</span>
                    <span className="text-xs sm:text-sm font-bold text-gray-600">⏳ Belum Tersedia</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-300 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow border p-3 sm:p-4">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">Linimasa Terkini</h3>
              <div className="space-y-2">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2 sm:ml-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Data diperbarui</p>
                    <p className="text-xs text-gray-500">2 hari yang lalu</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2 sm:ml-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Verifikasi selesai</p>
                    <p className="text-xs text-gray-500">1 minggu yang lalu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-2 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 gap-1">
            <div>
              <span className="font-medium">Terakhir diakses:</span> {new Date().toLocaleDateString('id-ID')}
            </div>
            <div className="flex items-center gap-2">
              <span>Versi: 1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
