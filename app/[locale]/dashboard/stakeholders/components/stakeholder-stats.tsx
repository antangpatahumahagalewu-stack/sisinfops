"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users2, FileCheck, AlertTriangle, Calendar, Building, Users, Globe, Briefcase, School, Newspaper } from "lucide-react"

interface StakeholderStatsProps {
  totalStakeholders: number
  fpicCompleted: number
  highInfluence: number
  recentEngagement: number
  stakeholderCategories: Record<string, number>
}

export default function StakeholderStats({
  totalStakeholders,
  fpicCompleted,
  highInfluence,
  recentEngagement,
  stakeholderCategories
}: StakeholderStatsProps) {
  const fpicPercentage = totalStakeholders > 0 ? Math.round((fpicCompleted / totalStakeholders) * 100) : 0
  const highInfluencePercentage = totalStakeholders > 0 ? Math.round((highInfluence / totalStakeholders) * 100) : 0
  const recentEngagementPercentage = totalStakeholders > 0 ? Math.round((recentEngagement / totalStakeholders) * 100) : 0

  // Category icons mapping
  const categoryIcons: Record<string, React.ReactNode> = {
    government: <Building className="h-4 w-4" />,
    community: <Users className="h-4 w-4" />,
    ngo_cso: <Globe className="h-4 w-4" />,
    investor: <Briefcase className="h-4 w-4" />,
    academic: <School className="h-4 w-4" />,
    private_sector: <Briefcase className="h-4 w-4" />,
    media: <Newspaper className="h-4 w-4" />,
    international_organization: <Globe className="h-4 w-4" />,
    other: <Users2 className="h-4 w-4" />
  }

  // Category colors mapping
  const categoryColors: Record<string, { bg: string, text: string, border: string }> = {
    government: { bg: "bg-blue-50/50", text: "text-blue-700", border: "border-blue-100" },
    community: { bg: "bg-green-50/50", text: "text-green-700", border: "border-green-100" },
    ngo_cso: { bg: "bg-purple-50/50", text: "text-purple-700", border: "border-purple-100" },
    investor: { bg: "bg-amber-50/50", text: "text-amber-700", border: "border-amber-100" },
    academic: { bg: "bg-cyan-50/50", text: "text-cyan-700", border: "border-cyan-100" },
    private_sector: { bg: "bg-gray-50/50", text: "text-gray-700", border: "border-gray-100" },
    media: { bg: "bg-red-50/50", text: "text-red-700", border: "border-red-100" },
    international_organization: { bg: "bg-indigo-50/50", text: "text-indigo-700", border: "border-indigo-100" },
    other: { bg: "bg-gray-50/50", text: "text-gray-700", border: "border-gray-100" }
  }

  // Category labels
  const categoryLabels: Record<string, string> = {
    government: "Government",
    community: "Community",
    ngo_cso: "NGO/CSO",
    investor: "Investor",
    academic: "Academic",
    private_sector: "Private Sector",
    media: "Media",
    international_organization: "International Org",
    other: "Other"
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col bg-blue-50/50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stakeholder</CardTitle>
            <Users2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-blue-700">{totalStakeholders}</div>
            <p className="text-xs text-blue-600">Stakeholder terdaftar</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-green-50/50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FPIC Completed</CardTitle>
            <FileCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-green-700">{fpicCompleted}</div>
            <p className="text-xs text-green-600">{fpicPercentage}% dari total</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-amber-50/50 border-amber-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Influence</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-amber-700">{highInfluence}</div>
            <p className="text-xs text-amber-600">{highInfluencePercentage}% dari total</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-purple-50/50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Engagement</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-purple-700">{recentEngagement}</div>
            <p className="text-xs text-purple-600">Dalam 30 hari terakhir</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      {Object.keys(stakeholderCategories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribusi Kategori Stakeholder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(stakeholderCategories)
                .sort(([, countA], [, countB]) => countB - countA)
                .map(([category, count]) => {
                  const percentage = totalStakeholders > 0 ? Math.round((count / totalStakeholders) * 100) : 0
                  const colors = categoryColors[category] || categoryColors.other
                  const icon = categoryIcons[category] || categoryIcons.other
                  const label = categoryLabels[category] || category.replace('_', ' ').toUpperCase()

                  return (
                    <div 
                      key={category} 
                      className={`flex items-center justify-between p-3 ${colors.bg} border ${colors.border} rounded-lg`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${colors.bg}`}>
                          <div className={colors.text}>
                            {icon}
                          </div>
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${colors.text}`}>{label}</p>
                          <p className="text-xs text-muted-foreground">{count} stakeholder</p>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        {percentage}%
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}