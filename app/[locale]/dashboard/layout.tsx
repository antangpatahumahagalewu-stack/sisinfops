"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import DashboardSidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/header"
import { ChatWidget } from "@/components/chat/chat-widget"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const locale = params.locale as string
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [logoutWarning, setLogoutWarning] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
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

        setSession({ ...session, user })

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        setProfile(profile)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [locale, router, supabase])

  // Setup auto-logout timer and warning
  useEffect(() => {
    // Only setup timers if session has expires_at
    if (session?.expires_at) {
      const expiresAt = session.expires_at * 1000 // convert to milliseconds
      const currentTime = Date.now()
      const timeRemaining = expiresAt - currentTime

      // Clear existing timers
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

      // Set logout timer (24 hours from session creation)
      logoutTimerRef.current = setTimeout(() => {
        handleAutoLogout()
      }, timeRemaining)

      // Set warning timer (5 minutes before expiry)
      const warningTime = Math.max(timeRemaining - 5 * 60 * 1000, 0)
      warningTimerRef.current = setTimeout(() => {
        setLogoutWarning(true)
        startCountdown(expiresAt)
      }, warningTime)

      // Update time left display periodically
      const updateTimeLeft = () => {
        const remaining = expiresAt - Date.now()
        if (remaining > 0) {
          const hours = Math.floor(remaining / (1000 * 60 * 60))
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
          setTimeLeft(`${hours} jam ${minutes} menit`)
        } else {
          setTimeLeft("Sesi telah berakhir")
        }
      }

      // Initial update
      updateTimeLeft()
      const interval = setInterval(updateTimeLeft, 60000) // Update every minute

      return () => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
        clearInterval(interval)
      }
    }
    // If no session or no expires_at, return a cleanup function that does nothing
    return () => {
      // Cleanup if timers were set before session was cleared
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [session])

  const startCountdown = (expiresAt: number) => {
    const countdownInterval = setInterval(() => {
      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        clearInterval(countdownInterval)
        setTimeLeft("Logout otomatis...")
      } else {
        const minutes = Math.floor(remaining / (1000 * 60))
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes} menit ${seconds} detik`)
      }
    }, 1000)
  }

  const handleAutoLogout = async () => {
    await supabase.auth.signOut()
    router.push(`/${locale}/login`)
  }

  const handleExtendSession = async () => {
    // This would require refresh token logic
    // For now, we'll just hide the warning and let middleware handle refresh
    setLogoutWarning(false)
  }

  // Show loading spinner while loading
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

  // If no session, don't render anything (redirect will happen in useEffect)
  if (!session) {
    return null
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
        <main className="flex-1 p-4 md:p-6">
          {logoutWarning && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <div className="flex items-center justify-between">
                  <span>
                    Sesi Anda akan berakhir dalam {timeLeft}. Silakan simpan pekerjaan Anda.
                  </span>
                  <button
                    onClick={handleExtendSession}
                    className="ml-4 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded"
                  >
                    Oke
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}