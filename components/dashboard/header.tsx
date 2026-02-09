"use client"

import { User } from "@supabase/supabase-js"
import { Profile } from "@/lib/types/pks"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User as UserIcon, Settings, Menu, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from 'next-intl'
import { LanguageSwitcher } from "@/components/ui/language-switcher"

interface DashboardHeaderProps {
  user: User
  profile: Profile | null
  onMenuToggle?: () => void
}

export default function DashboardHeader({ user, profile, onMenuToggle }: DashboardHeaderProps) {
  const supabase = createClient()
  const router = useRouter()
  const t = useTranslations('common')
  const locale = useLocale()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push(`/${locale}/login`)
    router.refresh()
  }

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email?.slice(0, 2).toUpperCase() || "YU"
  }

  const getRoleDisplay = () => {
    if (profile?.role === "admin") {
      return "Root - Administrator"
    }
    
    switch (profile?.role) {
      case "monev": return "Monitoring & Evaluasi"
      case "viewer": return "Viewer"
      case "program_planner": return "Program Planner"
      case "program_implementer": return "Program Implementer"
      case "carbon_specialist": return "Carbon Specialist"
      case "monev_officer": return "Monev Officer"
      case "finance_manager": return "Finance Manager"
      case "finance_operational": return "Finance Operational"
      case "finance_project_carbon": return "Finance Project Carbon"
      case "finance_project_implementation": return "Finance Project Implementation"
      case "finance_project_social": return "Finance Project Social"
      case "investor": return "Investor"
      default: return "User"
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {t('appName')}
          </h1>
          <p className="text-sm text-gray-500 hidden sm:block">
            {t('foundationName')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900">
            {profile?.full_name || user.email}
          </p>
          <div className="flex items-center justify-end gap-1">
            {profile?.role === "admin" && (
              <Shield className="h-3 w-3 text-red-600" />
            )}
            <p className={`text-xs ${profile?.role === "admin" ? "text-red-600 font-bold" : "text-gray-500"}`}>
              {getRoleDisplay()}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/profile`)}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>{t('profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
