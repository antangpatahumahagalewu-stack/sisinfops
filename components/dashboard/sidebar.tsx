"use client"

import { useState } from "react"
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
  Gavel
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/lib/types/pks"

interface SidebarProps {
  role: Role
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    translationKey: "dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[]
  },
  {
    title: "Data PS",
    href: "/dashboard/data",
    translationKey: "dataPS",
    icon: Database,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[]
  },
  {
    title: "Data Potensi",
    href: "/dashboard/potensi",
    translationKey: "potensi",
    icon: Trees,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[]
  },
  {
    title: "Per Kabupaten",
    href: "/dashboard/kabupaten",
    translationKey: "kabupaten",
    icon: Map,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[]
  },
  {
    title: "Statistik",
    href: "/dashboard/statistics",
    translationKey: "statistics",
    icon: BarChart3,
    roles: ["admin", "monev", "viewer", "program_planner", "program_implementer", "carbon_specialist"] as Role[]
  },
  {
    title: "Dashboard Program",
    href: "/dashboard/program-dashboard",
    translationKey: "dashboardProgram",
    icon: BarChart3,
    roles: ["admin", "program_planner", "program_implementer", "carbon_specialist", "monev_officer"] as Role[]
  },
  {
    title: "Carbon Projects",
    href: "/dashboard/carbon-projects",
    translationKey: "carbonProjects",
    icon: FolderTree,
    roles: ["admin", "carbon_specialist", "program_planner"] as Role[]
  },
  {
    title: "Program Management",
    href: "/dashboard/programs",
    translationKey: "programs",
    icon: Target,
    roles: ["admin", "program_planner", "carbon_specialist"] as Role[]
  },
  {
    title: "DRAM Management",
    href: "/dashboard/dram",
    translationKey: "dram",
    icon: FileText,
    roles: ["admin", "program_planner"] as Role[]
  },
  {
    title: "Implementasi Program",
    href: "/dashboard/implementasi",
    translationKey: "implementasi",
    icon: CalendarCheck,
    roles: ["admin", "program_implementer", "program_planner"] as Role[]
  },
  {
    title: "Monitoring & Evaluasi",
    href: "/dashboard/monev",
    translationKey: "monev",
    icon: Eye,
    roles: ["admin", "monev_officer", "program_planner", "carbon_specialist"] as Role[]
  },
  {
    title: "Pemberdayaan Ekonomi",
    href: "/dashboard/pemberdayaan-ekonomi",
    translationKey: "pemberdayaanEkonomi",
    icon: CircleDollarSign,
    roles: ["admin", "program_planner", "program_implementer"] as Role[]
  },
  {
    title: "Stakeholder & FPIC",
    href: "/dashboard/stakeholders",
    translationKey: "stakeholders",
    icon: Users2,
    roles: ["admin", "carbon_specialist", "program_planner"] as Role[]
  },
  {
    title: "Legal & Carbon Rights",
    href: "/dashboard/legal",
    translationKey: "legal",
    icon: Gavel,
    roles: ["admin", "carbon_specialist"] as Role[]
  },
  {
    title: "PDD Generator",
    href: "/dashboard/pdd-generator",
    translationKey: "pddGenerator",
    icon: FileCode,
    roles: ["admin", "carbon_specialist"] as Role[]
  },
  {
    title: "Upload Excel",
    href: "/dashboard/upload",
    translationKey: "uploadExcel",
    icon: Upload,
    roles: ["admin", "monev"] as Role[]
  },
  {
    title: "Pengguna",
    href: "/dashboard/users",
    translationKey: "users",
    icon: Users,
    roles: ["admin"] as Role[]
  },
  {
    title: "Pengaturan",
    href: "/dashboard/settings",
    translationKey: "settings",
    icon: Settings,
    roles: ["admin"] as Role[]
  },
]

export default function DashboardSidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  // Pisahkan menu menjadi dua kelompok
  const mainMenuItems = menuItems.slice(0, 5) // Dashboard sampai Statistik
  const programMenuItems = menuItems.slice(5) // Dashboard Program dan seterusnya

  const filteredMainMenu = mainMenuItems.filter(item => 
    item.roles.includes(role)
  )
  const filteredProgramMenu = programMenuItems.filter(item => 
    item.roles.includes(role)
  )

  const renderMenuItems = (items: typeof menuItems) => {
    return items.map((item) => {
      const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
      return (
        <Link key={item.href} href={`/${locale}${item.href}`}>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{t(item.translationKey)}</span>}
          </Button>
        </Link>
      )
    })
  }

  return (
    <aside className={cn(
      "flex flex-col border-r bg-white transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex-shrink-0">
            <img
              src="/logo6.png"
              alt="Logo Yayasan ANTANGPATAHU MAHAGA LEWU"
              className="h-full w-full object-contain"
            />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-sm">{tCommon('sipsPlus')}</h1>
              <p className="text-xs text-muted-foreground">{tCommon('carbonProjectOS')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {renderMenuItems(filteredMainMenu)}
          
          {filteredProgramMenu.length > 0 && (
            <>
              <div className="my-2 border-t border-gray-200" />
              {renderMenuItems(filteredProgramMenu)}
            </>
          )}
        </nav>
      </div>

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
    </aside>
  )
}
