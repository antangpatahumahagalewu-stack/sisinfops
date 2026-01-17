import { createClient } from "@/lib/supabase/server"
import { InvestorCarbonDashboard } from "@/components/dashboard/investor-carbon-dashboard"
import { redirect } from "next/navigation"

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

      <InvestorCarbonDashboard />
    </div>
  )
}
