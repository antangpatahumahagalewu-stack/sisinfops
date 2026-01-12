"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function EditProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    location: "",
    bio: ""
  })

  const [userEmail, setUserEmail] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [initialData, setInitialData] = useState<any>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push(`/${locale}/login`)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push(`/${locale}/login`)
          return
        }

        setUserEmail(user.email || "")

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setInitialData(profileData)
          setFormData({
            full_name: profileData.full_name || "",
            phone: profileData.phone || "",
            location: profileData.location || "",
            bio: profileData.bio || ""
          })
        }
      } catch (error) {
        console.error("Error loading profile:", error)
        setMessage({ type: 'error', text: 'Gagal memuat data profil' })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [locale, router, supabase])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Validate required fields
      if (!formData.full_name.trim()) {
        setMessage({ type: 'error', text: 'Nama lengkap diperlukan' })
        setSaving(false)
        return
      }

      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memperbarui profil')
      }

      setMessage({ type: 'success', text: result.message || 'Profil berhasil diperbarui' })
      
      // Update local profile data
      if (profile) {
        setProfile({
          ...profile,
          ...formData,
          updated_at: new Date().toISOString()
        })
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null)
      }, 3000)

    } catch (error: any) {
      console.error('Error updating profile:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Terjadi kesalahan saat menyimpan perubahan' 
      })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    if (!initialData) return false
    return (
      formData.full_name !== (initialData.full_name || "") ||
      formData.phone !== (initialData.phone || "") ||
      formData.location !== (initialData.location || "") ||
      formData.bio !== (initialData.bio || "")
    )
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Memuat data profil...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/${locale}/dashboard/profile`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Profil
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Profil</h1>
        <p className="text-muted-foreground">Perbarui informasi profil Anda</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pribadi</CardTitle>
                <CardDescription>
                  Informasi ini akan ditampilkan di profil publik Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nama Lengkap *</Label>
                  <Input 
                    id="full_name" 
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={userEmail}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Email tidak dapat diubah
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Masukkan nomor telepon"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Lokasi</Label>
                  <Input 
                    id="location" 
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Masukkan lokasi"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tentang Saya</CardTitle>
                <CardDescription>
                  Ceritakan sedikit tentang diri Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="w-full min-h-[100px] p-2 border rounded-md"
                    placeholder="Tulis deskripsi singkat tentang diri Anda..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Foto Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || 
                      userEmail?.slice(0, 2).toUpperCase() || "YU"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" type="button">Unggah Foto</Button>
                    <Button variant="ghost" size="sm" type="button" className="text-red-600">Hapus</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Akun</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input 
                    id="role" 
                    value={profile?.role || "viewer"}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Role hanya dapat diubah oleh administrator
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joined">Bergabung Pada</Label>
                  <Input 
                    id="joined" 
                    value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID") : "-"}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_updated">Terakhir Diperbarui</Label>
                  <Input 
                    id="last_updated" 
                    value={profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString("id-ID") : "-"}
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={saving || !hasChanges()}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Perubahan'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    type="button"
                    asChild
                  >
                    <Link href={`/${locale}/dashboard/profile`}>Batal</Link>
                  </Button>
                  
                  {!hasChanges() && !saving && (
                    <p className="text-xs text-muted-foreground text-center">
                      Tidak ada perubahan yang perlu disimpan
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
