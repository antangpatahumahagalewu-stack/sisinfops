import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { FinancialDashboard } from "@/components/dashboard/financial-dashboard"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('financialDashboard.title'),
    description: t('financialDashboard.description'),
  }
}

export default async function FinanceDashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance`)
  }

  // Check if user has permission to view financial dashboard
  const canView = await hasPermission("FINANCIAL_VIEW", session.user.id)
  if (!canView) {
    redirect(`/${locale}/dashboard?error=unauthorized`)
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <FinancialDashboard />
    </div>
  )
}