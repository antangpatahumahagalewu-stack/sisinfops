import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ChangePasswordForm from "@/components/profile/change-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Bell, Globe, User } from "lucide-react"

export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="container max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola pengaturan akun dan preferensi Anda
        </p>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid grid-cols-1 md:grid-cols-4 mb-6">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Keamanan</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Bahasa & Region</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Akun</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keamanan Akun</CardTitle>
              <CardDescription>
                Kelola kata sandi dan keamanan akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sesi Aktif</CardTitle>
              <CardDescription>
                Kelola sesi yang sedang aktif di perangkat Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Sesi Saat Ini</p>
                    <p className="text-sm text-muted-foreground">
                      Browser: Informasi browser tidak tersedia di server
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dimulai: {new Date().toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    Aktif
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Untuk keamanan, disarankan untuk keluar dari semua perangkat jika Anda menggunakan perangkat bersama.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Notifikasi</CardTitle>
              <CardDescription>
                Atur bagaimana Anda ingin menerima notifikasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Fitur notifikasi sedang dalam pengembangan.</p>
                <p className="text-sm mt-2">Anda akan dapat mengatur notifikasi email dan dalam aplikasi di sini.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle>Bahasa & Region</CardTitle>
              <CardDescription>
                Atur bahasa dan preferensi regional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Pengaturan bahasa sedang dalam pengembangan.</p>
                <p className="text-sm mt-2">Anda akan dapat mengubah bahasa antarmuka dan format tanggal/waktu di sini.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Akun</CardTitle>
              <CardDescription>
                Kelola informasi akun dasar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Nama Lengkap</p>
                    <p className="text-lg">{profile?.full_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-lg">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-lg">{profile?.role || "viewer"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Bergabung Pada</p>
                    <p className="text-lg">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID') : "-"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Untuk mengubah informasi profil seperti nama lengkap, telepon, atau lokasi, kunjungi halaman edit profil.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-sm text-muted-foreground">
        <p className="font-medium">Catatan Penting:</p>
        <ul className="list-disc pl-4 space-y-1 mt-2">
          <li>Perubahan kata sandi akan berlaku secara instan di semua perangkat</li>
          <li>Pastikan kata sandi Anda kuat dan unik</li>
          <li>Jangan bagikan informasi login Anda dengan siapapun</li>
          <li>Hubungi administrator jika Anda mengalami masalah dengan akun</li>
        </ul>
      </div>
    </div>
  )
}