import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth/rbac"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PriceListPageClient from "@/components/dashboard/price-list-client"

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('masterPriceList.title', { defaultValue: "Master Price List" }),
    description: t('masterPriceList.description', { defaultValue: "Kelola daftar harga barang dan jasa" }),
  }
}

export default async function MasterPriceListPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  const supabase = await createClient()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/${locale}/login?redirect=/dashboard/finance/price-list`)
  }

  // Check if user has permission to view price list
  const canView = await hasPermission("FINANCIAL_VIEW", session.user.id)
  if (!canView) {
    redirect(`/${locale}/dashboard?error=unauthorized`)
  }

  // Check if user has permission to manage price list
  const canManage = await hasPermission("FINANCIAL_BUDGET_MANAGE", session.user.id)

  // Fetch initial price list data
  const { data: priceListData, error } = await supabase
    .from("master_price_list")
    .select(`
      *,
      profiles:created_by (full_name),
      approver:approved_by (full_name)
    `)
    .order("item_code", { ascending: true })
    .order("version", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching price list:", error)
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PriceListPageClient 
        initialData={priceListData || []}
        canManage={canManage}
        locale={locale}
      />
    </div>
  )
}