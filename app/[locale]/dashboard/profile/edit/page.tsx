import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function EditProfilePage() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single()

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/profile">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Profil
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Profil</h1>
        <p className="text-muted-foreground">Perbarui informasi profil Anda</p>
      </div>

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
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input 
                  id="full_name" 
                  defaultValue={profile?.full_name || ""}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  defaultValue={session.user.email || ""}
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
                  placeholder="Masukkan nomor telepon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi</Label>
                <Input 
                  id="location" 
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
                     session.user.email?.slice(0, 2).toUpperCase() || "YU"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Unggah Foto</Button>
                  <Button variant="ghost" size="sm" className="text-red-600">Hapus</Button>
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Button className="w-full">Simpan Perubahan</Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/profile">Batal</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}