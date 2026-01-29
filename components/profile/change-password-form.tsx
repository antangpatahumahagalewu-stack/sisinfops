"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react"

interface PasswordStrength {
  score: number
  label: string
  color: string
}

export default function ChangePasswordForm() {
  const t = useTranslations("profile")
  const tCommon = useTranslations("common")

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, label: "", color: "" })

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, label: "Kosong", color: "bg-gray-200" }
    
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[a-z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    const strengths = [
      { label: "Sangat Lemah", color: "bg-red-500" },
      { label: "Lemah", color: "bg-orange-500" },
      { label: "Cukup", color: "bg-yellow-500" },
      { label: "Baik", color: "bg-blue-500" },
      { label: "Sangat Baik", color: "bg-green-500" },
      { label: "Kuat", color: "bg-green-600" }
    ]

    return {
      score,
      label: strengths[Math.min(score, 5)].label,
      color: strengths[Math.min(score, 5)].color
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))

    if (id === "newPassword") {
      setPasswordStrength(calculatePasswordStrength(value))
    }
  }

  const validateForm = (): string | null => {
    if (!formData.currentPassword) return "Password saat ini diperlukan"
    if (!formData.newPassword) return "Password baru diperlukan"
    if (formData.newPassword.length < 8) return "Password baru minimal 8 karakter"
    if (formData.newPassword !== formData.confirmPassword) return "Konfirmasi password tidak cocok"
    if (formData.currentPassword === formData.newPassword) return "Password baru harus berbeda dengan password saat ini"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const validationError = validateForm()
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengubah password')
      }

      setMessage({ type: 'success', text: result.message || 'Password berhasil diubah' })
      
      // Reset form on success
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setPasswordStrength({ score: 0, label: "", color: "" })

      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage(null)
      }, 5000)

    } catch (error: any) {
      console.error('Error changing password:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Terjadi kesalahan saat mengubah password' 
      })
    } finally {
      setLoading(false)
    }
  }

  const strengthBars = Array.from({ length: 5 }, (_, i) => i < passwordStrength.score)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubah Password</CardTitle>
        <CardDescription>
          Pastikan password Anda kuat dan tidak mudah ditebak
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password Saat Ini</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Masukkan password saat ini"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Minimal 8 karakter"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.newPassword && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Kekuatan password:</span>
                  <span className="font-medium">{passwordStrength.label}</span>
                </div>
                <div className="flex gap-1">
                  {strengthBars.map((filled, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full ${filled ? passwordStrength.color : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>Password yang kuat mengandung:</p>
                  <ul className="list-disc pl-4">
                    <li>Minimal 8 karakter</li>
                    <li>Huruf besar dan kecil</li>
                    <li>Angka</li>
                    <li>Simbol khusus</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Ulangi password baru"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-sm text-red-500">Password tidak cocok</p>
            )}
            {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
              <p className="text-sm text-green-500">✓ Password cocok</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengubah Password...
              </>
            ) : (
              'Ubah Password'
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium">Tips keamanan:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Jangan gunakan password yang sama untuk akun lain</li>
              <li>Jangan bagikan password Anda dengan siapapun</li>
              <li>Ganti password secara berkala setiap 3-6 bulan</li>
              <li>Gunakan password manager untuk mengingat password yang kuat</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}