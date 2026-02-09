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

  // Fetch initial price list data from database
  let priceListData: any[] = []
  let fetchError = null
  
  try {
    // Use specific column selection to match database structure
    const { data, error } = await supabase
      .from("price_list")
      .select(`
        id,
        item_code,
        item_name,
        item_description,
        category,
        unit,
        unit_price,
        currency,
        valid_from,
        valid_until,
        is_active,
        created_at,
        created_by,
        profiles:created_by (full_name)
      `)
      .order("item_code", { ascending: true })
      .limit(50)

    if (error) {
      console.warn("Error fetching price list data:", error.message)
      fetchError = error
      
      // Try fallback with minimal columns if the above fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("price_list")
        .select("id, item_code, item_name, category, unit, unit_price, currency, is_active")
        .order("item_code", { ascending: true })
        .limit(50)
      
      if (!fallbackError && fallbackData) {
        priceListData = fallbackData.map(item => ({
          ...item,
          item_description: null,
          valid_from: null,
          valid_until: null,
          created_at: new Date().toISOString(),
          created_by: null,
          profiles: { full_name: "System" }
        }))
        console.log(`✅ Fetched ${priceListData.length} items with fallback query`)
      } else {
        console.warn("Fallback query also failed:", fallbackError?.message)
      }
    } else {
      priceListData = data || []
      console.log(`✅ Fetched ${priceListData.length} items from price_list table`)
    }
  } catch (error) {
    console.warn("Exception fetching price list:", error)
    fetchError = error as Error
  }

  // Don't provide mock data, just return empty array
  if (priceListData.length === 0) {
    console.log("ℹ️  No data found in database, returning empty array")
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PriceListPageClient 
        initialData={priceListData}
        canManage={canManage}
        locale={locale}
      />
    </div>
  )
}