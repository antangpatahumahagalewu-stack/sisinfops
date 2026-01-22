import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import dynamic from 'next/dynamic'
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic import untuk komponen berat dengan loading fallback
const InvestorCarbonDashboard = dynamic(
  () => import("@/components/dashboard/investor-carbon-dashboard").then(mod => mod.InvestorCarbonDashboard),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    ),
  }
)

export default async function InvestorDashboardPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  // Check if user has access to investor dashboard
  const allowedRoles = ["admin", "carbon_specialist", "program_planner"]
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Investor Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive investment analysis for carbon projects - Risk, ROI, Compliance & Projections
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </div>
      }>
        <InvestorCarbonDashboard />
      </Suspense>
    </div>
  )
}
