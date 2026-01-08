"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string || 'id'
  const supabase = createClient()
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      // Redirect to dashboard on successful login with locale
      router.push(`/${locale}/dashboard`)
      router.refresh()
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <div className="h-24 w-24">
          <img
            src="/logo6.png"
            alt="Logo Yayasan ANTANGPATAHU MAHAGA LEWU"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {tCommon('appName')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('welcome')}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@yayasan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                tCommon('loading', {defaultMessage: "Memproses..."})
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {tCommon('login')}
                </>
              )}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            Aplikasi ini hanya untuk penggunaan internal yayasan.
            <br />
            Hubungi administrator untuk mendapatkan akses.
          </p>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center">
        <div className="text-sm text-gray-600">
          <p className="font-semibold">YAYASAN ANTANGPATAHU MAHAGA LEWU</p>
          <p className="mt-1">Sistem Informasi Perhutanan Sosial & PKS di Kalimantan Tengah</p>
          <p className="mt-1">Divisi Perencana Program, Implementasi, dan Monev</p>
          <p className="mt-1">BOBY HARINTO MIHING</p>
          <p className="mt-1">Copyright © 2026 Yayasan Antangpatahu Mahaga Lewu</p>
        </div>
      </div>
    </div>
  )
}