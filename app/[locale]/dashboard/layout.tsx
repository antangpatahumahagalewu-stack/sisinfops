"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import DashboardSidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/header"
import { ChatWidget } from "@/components/chat/chat-widget"

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const [locale, setLocale] = useState("id")
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          const { locale: loc } = await params
          router.push(`/${loc}/login`)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const { locale: loc } = await params
          router.push(`/${loc}/login`)
          return
        }

        setSession({ ...session, user })

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        setProfile(profile)

        const { locale: loc } = await params
        setLocale(loc)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params, router, supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar 
        role={profile?.role || "viewer"} 
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          user={session.user} 
          profile={profile} 
          onMenuToggle={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <ChatWidget />
    </div>
  )
}
