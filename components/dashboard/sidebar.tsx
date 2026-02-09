"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from 'next-intl'
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Upload, 
  Map, 
  BarChart3, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Trees,
  Target,
  FolderTree,
  FileText,
  CalendarCheck,
  Eye,
  Building2,
  Scale,
  FileCode,
  CircleDollarSign,
  Users2,
  Gavel,
  FileCheck,
  ShieldCheck,
  Coins,
  TrendingUp,
  Shield,
  History,
  DollarSign,
  Building,
  TreePine,
  Wallet,
  CreditCard,
  Receipt,
  ListChecks,
  Banknote,
  Tag
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/lib/types/pks"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  role: Role
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

  const menuItems = [
  // A. DATA DASAR / BASELINE (Phase 1 - READY)
  {
    title: "Dashboard",
    href: "/dashboard",
    translationKey: "dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[],
    group: "foundation",
    phase: 1
  },
  {
    title: "Data PS",
    href: "/dashboard/data",
    translationKey: "dataPS",
    icon: Database,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[],
    group: "foundation",
    phase: 1
  },
  {
    title: "Data Potensi",
    href: "/dashboard/potensi",
    translationKey: "potensi",
    icon: Trees,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[],
    group: "foundation",
    phase: 1
  },
  {
    title: "Per Kabupaten",
    href: "/dashboard/kabupaten",
    translationKey: "kabupaten",
    icon: Map,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[],
    group: "foundation",
    phase: 1
  },
  {
    title: "Statistik",
    href: "/dashboard/statistics",
    translationKey: "statistics",
    icon: BarChart3,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[],
    group: "foundation",
    phase: 1
  },
// B. PROYEK KARBON (Phase 2)
  {
    title: "Carbon Projects",
    href: "/dashboard/carbon-projects",
    translationKey: "carbonProjects",
    icon: FolderTree,
    roles: ["admin", "carbon_specialist", "program_planner"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "Investor Dashboard",
    href: "/dashboard/investor",
    translationKey: "investorDashboard",
    icon: TrendingUp,
    roles: ["admin", "carbon_specialist", "program_planner"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "Due Diligence Toolkit",
    href: "/dashboard/due-diligence",
    translationKey: "dueDiligenceToolkit",
    icon: Shield,
    roles: ["admin", "carbon_specialist", "program_planner"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "Verra Registration",
    href: "/dashboard/verra-registration",
    translationKey: "verraRegistration",
    icon: FileCheck,
    roles: ["admin", "carbon_specialist"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "Program Kerja",
    href: "/dashboard/programs",
    translationKey: "programs",
    icon: Target,
    roles: ["admin", "program_planner", "carbon_specialist"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "DRAM Management",
    href: "/dashboard/dram",
    translationKey: "dram",
    icon: FileText,
    roles: ["admin", "program_planner"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "PDD Generator",
    href: "/dashboard/pdd-generator",
    translationKey: "pddGenerator",
    icon: FileCode,
    roles: ["admin", "carbon_specialist"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "VVB Management",
    href: "/dashboard/vvb-management",
    translationKey: "vvbManagement",
    icon: ShieldCheck,
    roles: ["admin", "carbon_specialist"] as Role[],
    group: "development",
    phase: 2
  },
  {
    title: "Carbon Credits",
    href: "/dashboard/carbon-credits",
    translationKey: "carbonCredits",
    icon: Coins,
    roles: ["admin", "carbon_specialist"] as Role[],
    group: "development",
    phase: 2
  },
  // C. IMPLEMENTASI & MRV (Phase 2)
  {
    title: "Dashboard Program",
    href: "/dashboard/program-dashboard",
    translationKey: "dashboardProgram",
    icon: BarChart3,
    roles: ["admin", "program_planner", "program_implementer", "carbon_specialist"] as Role[],
    group: "implementation",
    phase: 2
  },
  {
    title: "Implementasi Program",
    href: "/dashboard/implementasi",
    translationKey: "implementasi",
    icon: CalendarCheck,
    roles: ["admin", "program_implementer", "program_planner"] as Role[],
    group: "implementation",
    phase: 2
  },
  {
    title: "Monitoring & Evaluasi",
    href: "/dashboard/monev",
    translationKey: "monev",
    icon: Eye,
    roles: ["admin", "monev", "program_planner", "carbon_specialist"] as Role[],
    group: "implementation",
    phase: 2
  },
  // D. SOSIAL-EKONOMI & SAFEGUARD (Phase 2)
  {
    title: "Pemberdayaan Ekonomi",
    href: "/dashboard/pemberdayaan-ekonomi",
    translationKey: "pemberdayaanEkonomi",
    icon: CircleDollarSign,
    roles: ["admin", "program_planner", "program_implementer"] as Role[],
    group: "socioeconomic",
    phase: 2
  },
  {
    title: "Stakeholder & FPIC",
    href: "/dashboard/stakeholders",
    translationKey: "stakeholders",
    icon: Users2,
    roles: ["admin", "carbon_specialist", "program_planner"] as Role[],
    group: "socioeconomic",
    phase: 2
  },
  // E. LEGAL & TATA KELOLA (Phase 2)
  {
    title: "Legal & Carbon Rights",
    href: "/dashboard/legal",
    translationKey: "legal",
    icon: Gavel,
    roles: ["admin", "carbon_specialist"] as Role[],
    group: "legal",
    phase: 2
  },
  // F. FINANCE (Phase 2)
  {
    title: "Dashboard Keuangan",
    href: "/dashboard/finance",
    translationKey: "financialDashboard",
    icon: LayoutDashboard,
    roles: ["admin", "finance_manager", "finance_operational", "finance_project_carbon", "finance_project_implementation", "finance_project_social", "investor", "carbon_specialist", "program_planner"] as Role[],
    group: "finance",
    phase: 2
  },
  {
    title: "Operasional Kantor",
    href: "/dashboard/finance/operasional",
    translationKey: "operasionalKantor",
    icon: Building,
    roles: ["admin", "finance_manager", "finance_operational"] as Role[],
    group: "finance",
    phase: 2
  },
  {
    title: "Proyek & Program",
    href: "/dashboard/finance/proyek",
    translationKey: "proyekProgram",
    icon: TreePine,
    roles: ["admin", "finance_manager", "finance_project_carbon", "finance_project_implementation", "finance_project_social", "program_planner", "carbon_specialist"] as Role[],
    group: "finance",
    phase: 2
  },
  {
    title: "Transaksi",
    href: "/dashboard/finance/transactions",
    translationKey: "transactions",
    icon: Receipt,
    roles: ["admin", "finance_manager", "finance_operational", "finance_project_carbon", "finance_project_implementation", "finance_project_social"] as Role[],
    group: "finance",
    phase: 2
  },
  {
    title: "Anggaran",
    href: "/dashboard/finance/budgets",
    translationKey: "budgets",
    icon: Wallet,
    roles: ["admin", "finance_manager", "finance_operational"] as Role[],
    group: "finance",
    phase: 2
  },
  {
    title: "Master Price List",
    href: "/dashboard/finance/price-list",
    translationKey: "masterPriceList",
    icon: Tag,
    roles: ["admin", "finance_manager", "finance_operational", "program_planner"] as Role[],
    group: "finance",
    phase: 2
  },
  {
    title: "Laporan Keuangan",
    href: "/dashboard/finance/reports",
    translationKey: "financialReports",
    icon: FileText,
    roles: ["admin", "finance_manager", "finance_operational", "finance_project_carbon", "finance_project_implementation", "finance_project_social", "investor", "program_planner", "carbon_specialist"] as Role[],
    group: "finance",
    phase: 2
  },
  {
    title: "Kontrol & Kepatuhan",
    href: "/dashboard/finance/controls",
    translationKey: "financialControls",
    icon: ShieldCheck,
    roles: ["admin", "finance_manager"] as Role[],
    group: "finance",
    phase: 2
  },
  // G. SISTEM & ADMINISTRASI (Phase 1 - READY)
  {
    title: "Upload Excel",
    href: "/dashboard/upload",
    translationKey: "uploadExcel",
    icon: Upload,
    roles: ["admin", "monev"] as Role[],
    group: "system",
    phase: 1
  },
  {
    title: "Manajemen Pengguna",
    href: "/dashboard/user-management",
    translationKey: "users",
    icon: Users,
    roles: ["admin"] as Role[],
    group: "system",
    phase: 1
  },
  {
    title: "Log Aktivitas",
    href: "/dashboard/activity-log",
    translationKey: "activityLog",
    icon: History,
    roles: ["admin"] as Role[],
    group: "system",
    phase: 1
  },
  {
    title: "Pengaturan",
    href: "/dashboard/settings",
    translationKey: "settings",
    icon: Settings,
    roles: ["admin"] as Role[],
    group: "system",
    phase: 1
  },
]

export default function DashboardSidebar({ role, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Group menu items by category
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!item.roles.includes(role)) return acc
    
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof menuItems>)

  // Group labels in Indonesian
  const groupLabels: Record<string, string> = {
    foundation: "BASELINE",
    development: "PROYEK KARBON",
    implementation: "IMPLEMENTASI & MRV",
    socioeconomic: "SOSIAL-EKONOMI & SAFEGUARD",
    legal: "LEGAL & TATA KELOLA",
    finance: "FINANCE",
    system: "SISTEM & ADMINISTRASI"
  }

  // Order of groups to display
  const groupOrder = ["foundation", "development", "implementation", "socioeconomic", "legal", "finance", "system"]

  const renderMenuItems = () => {
    return groupOrder.map((groupId) => {
      const items = groupedMenuItems[groupId]
      if (!items || items.length === 0) return null

      return (
        <div key={groupId} className="space-y-0">
          {!collapsed && (
            <div className="px-2 pt-0.5 pb-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {groupLabels[groupId]}
              </p>
            </div>
          )}
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={`/${locale}${item.href}`}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-1.5 relative text-sm",
                    collapsed && "justify-center px-1.5"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-sm">{t(item.translationKey)}</span>
                    </div>
                  )}
                </Button>
              </Link>
            )
          })}
          {!collapsed && groupId !== "system" && (
            <div className="mx-2 my-1 border-t border-gray-200" />
          )}
        </div>
      )
    })
  }

  // Sidebar content component (used by both desktop and mobile)
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="flex h-14 items-center border-b px-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 flex-shrink-0">
            <img
              src="/logo6.png"
              alt="Logo Yayasan ANTANGPATAHU MAHAGA LEWU"
              className="h-full w-full object-contain"
            />
          </div>
          {(!collapsed || isMobile) && (
            <div>
              <h1 className="font-bold text-sm">{tCommon('sipsPlus')}</h1>
              <p className="text-xs text-muted-foreground">{tCommon('carbonProjectOS')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <nav className="space-y-0">
          {renderMenuItems()}
        </nav>
      </div>

      {!isMobile && (
        <div className="border-t p-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            {!collapsed && <span className="ml-2 text-xs">{tCommon('hide')}</span>}
          </Button>
        </div>
      )}
    </>
  )

  // Desktop sidebar
  const DesktopSidebar = () => (
    <aside className={cn(
      "hidden md:flex flex-col border-r bg-white transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent />
    </aside>
  )

  // Mobile sidebar
  const MobileSidebar = () => (
    <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Menu navigasi utama aplikasi SIPS+ untuk mengakses dashboard dan fitur lainnya
        </SheetDescription>
        <SidebarContent isMobile={true} />
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      <DesktopSidebar />
      {isMobile && <MobileSidebar />}
    </>
  )
}
