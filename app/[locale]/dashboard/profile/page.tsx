import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Mail, Phone, MapPin, Edit } from "lucide-react"
import Link from "next/link"

export default async function ProfilePage({
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

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return session.user.email?.slice(0, 2).toUpperCase() || "YU"
  }

  const getRoleDisplay = () => {
    switch (profile?.role) {
      case "admin": return "Administrator"
      case "monev": return "Monitoring & Evaluasi"
      case "viewer": return "Viewer"
      case "program_planner": return "Program Planner"
      case "program_implementer": return "Program Implementer"
      case "carbon_specialist": return "Carbon Specialist"
      default: return "User"
    }
  }

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  return (
    <div className="container max-w-6xl mx-auto p-4">
      {/* Cover Photo */}
      <Card className="overflow-hidden border-0 shadow-lg mb-6">
        <div className="h-48 bg-gradient-to-r from-primary/20 to-secondary/20 relative">
          <div className="absolute bottom-4 right-4">
            <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Cover
            </Button>
          </div>
        </div>
        
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between -mt-16 ml-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-end gap-6">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src="" />
                <AvatarFallback className="text-3xl bg-primary text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="pb-4">
                <h1 className="text-3xl font-bold">{profile?.full_name || session.user.email}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="text-sm">
                    {getRoleDisplay()}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {session.user.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 md:mt-0 md:pb-4">
              <Button asChild>
                <Link href="/dashboard/profile/edit">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profil
                </Link>
              </Button>
              <Button variant="outline">Bagikan Profil</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: About & Contact */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="about">Tentang</TabsTrigger>
              <TabsTrigger value="activity">Aktivitas</TabsTrigger>
              <TabsTrigger value="settings">Pengaturan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Profil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Bergabung pada:</span>
                      </div>
                      <p className="pl-6">{formatDate(profile?.created_at)}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Terakhir diperbarui:</span>
                      </div>
                      <p className="pl-6">{formatDate(profile?.updated_at)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Detail Akun</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Role Sistem</span>
                        <Badge variant="outline">{profile?.role || "-"}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status Akun</span>
                        <Badge variant="default">Aktif</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ID Pengguna</span>
                        <span className="font-mono text-sm">{session.user.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {profile?.bio && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Tentang Saya</h3>
                      <p className="text-muted-foreground whitespace-pre-line">{profile.bio}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Program</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Aktivitas</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Dokumen</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">100%</div>
                      <div className="text-sm text-muted-foreground">Kehadiran</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Aktivitas Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Belum ada aktivitas yang tercatat.</p>
                    <p className="text-sm mt-2">Aktivitas Anda akan muncul di sini.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan Akun</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Keamanan</h4>
                    <Button variant="outline" className="w-full justify-start">
                      Ubah Kata Sandi
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Notifikasi</h4>
                    <Button variant="outline" className="w-full justify-start">
                      Atur Notifikasi
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Privasi</h4>
                    <Button variant="outline" className="w-full justify-start">
                      Pengaturan Privasi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Contact & Quick Links */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kontak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{session.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <p className="font-medium">{profile?.phone || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Lokasi</p>
                  <p className="font-medium">{profile?.location || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tautan Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/${locale}/dashboard`}>Dashboard</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/${locale}/dashboard/settings`}>Pengaturan Sistem</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/${locale}/dashboard/data`}>Data PS</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/${locale}/dashboard/upload`}>Upload Excel</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Akun</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Verifikasi Email</span>
                  <Badge variant={session.user.email_confirmed_at ? "default" : "destructive"}>
                    {session.user.email_confirmed_at ? "Terverifikasi" : "Belum"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status Autentikasi</span>
                  <Badge variant="default">Aktif</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Provider</span>
                  <span className="text-sm font-medium">
                    {session.user.app_metadata?.provider || "email"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
