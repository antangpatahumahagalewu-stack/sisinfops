"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  const supabase = createClient()

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

      // Redirect to dashboard on successful login
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (role: 'admin' | 'monev' | 'viewer') => {
    setLoading(true)
    setError(null)

    // Demo credentials based on role
    const demoCredentials = {
      admin: { email: "admin@yayasan.com", password: "admin123" },
      monev: { email: "monev@yayasan.com", password: "monev123" },
      viewer: { email: "viewer@yayasan.com", password: "viewer123" },
    }

    setEmail(demoCredentials[role].email)
    setPassword(demoCredentials[role].password)

    try {
      const { error } = await supabase.auth.signInWithPassword(demoCredentials[role])

      if (error) {
        setError(error.message)
        return
      }

      router.push("/dashboard")
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
            Sistem Informasi Perhutanan Sosial
          </CardTitle>
          <CardDescription className="text-center">
            Aplikasi internal yayasan - Masuk dengan akun Anda
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
              {loading ? "Memproses..." : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Masuk
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Atau coba demo
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="text-xs"
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin('monev')}
                disabled={loading}
                className="text-xs"
              >
                Monev
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin('viewer')}
                disabled={loading}
                className="text-xs"
              >
                Viewer
              </Button>
            </div>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            Aplikasi ini hanya untuk penggunaan internal yayasan.
            <br />
            Hubungi administrator untuk mendapatkan akses.
          </p>
          <div className="text-xs text-center text-muted-foreground">
            <strong>Note:</strong> Demo users tidak memiliki akses ke data real.
          </div>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center">
        <div className="text-sm text-gray-600">
          <p className="font-semibold">YAYASAN ANTANGPATAHU MAHAGA LEWU</p>
          <p className="mt-1">Sistem Informasi Perhutanan Sosial & PKS 4 Kabupaten</p>
        </div>
      </div>
    </div>
  )
}
