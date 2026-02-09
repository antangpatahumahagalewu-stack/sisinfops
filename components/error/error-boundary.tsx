"use client"

import React, { Component, ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = "/dashboard"
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.state.error?.message || "Terjadi kesalahan yang tidak diketahui"
      const errorStack = this.state.errorInfo?.componentStack || this.state.error?.stack

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Terjadi Kesalahan</h2>
              <p className="mt-2 text-sm text-gray-600">
                Maaf, terjadi kesalahan dalam aplikasi. Silakan coba lagi.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Pesan Error:</h3>
                  <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
                </div>
                
                {errorStack && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Detail Teknis:</h3>
                    <pre className="mt-1 text-xs text-gray-500 overflow-auto max-h-40 p-2 bg-gray-50 rounded">
                      {errorStack}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="default"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Kembali ke Dashboard
              </Button>
              <Button
                onClick={this.handleReload}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Muat Ulang Halaman
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Simple loading fallback component
export function LoadingFallback({ message = "Memuat..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}

// Maintenance component for Phase 2 features
export function MaintenanceNotice({ featureName = "Fitur ini" }: { featureName?: string }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4 text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-amber-100">
          <AlertCircle className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Fitur Sedang Dalam Pemeliharaan</h2>
        <p className="text-gray-600">
          {featureName} saat ini sedang dalam proses migrasi ke skema database baru.
          Fitur ini akan tersedia kembali pada <strong>Phase 2</strong> setelah
          integrasi selesai.
        </p>
        <div className="text-sm text-gray-500">
          <p>Fitur yang tersedia saat ini:</p>
          <ul className="mt-2 space-y-1">
            <li>• Dashboard & Data PS</li>
            <li>• Data Potensi & Kabupaten</li>
            <li>• Statistik & Upload Excel</li>
            <li>• Manajemen Pengguna & Pengaturan</li>
          </ul>
        </div>
      </div>
    </div>
  )
}