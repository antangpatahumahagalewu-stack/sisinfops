"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, TrendingUp, Globe, Users, TreePine, FileCheck } from "lucide-react"
import Link from "next/link"

interface ComplianceStats {
  total_projects: number
  compliant_projects: number
  average_score: number
  high_compliance_count: number
  medium_compliance_count: number
  low_compliance_count: number
  missing_kml_count: number
  missing_financial_count: number
  missing_social_count: number
}

interface ProjectCompliance {
  project_id: string
  project_name: string
  compliance_score: number
  status: "excellent" | "good" | "fair" | "poor"
  last_updated: string
}

export function ClimatePartnerComplianceCard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ComplianceStats | null>(null)
  const [topProjects, setTopProjects] = useState<ProjectCompliance[]>([])
  const [bottomProjects, setBottomProjects] = useState<ProjectCompliance[]>([])

  useEffect(() => {
    fetchComplianceData()
  }, [])

  async function fetchComplianceData() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Fetch all PS projects - use safe column names that exist in perhutanan_sosial table
      const { data: psProjects, error: psError } = await supabase
        .from("perhutanan_sosial")
        .select("id, pemegang_izin, updated_at")
        .limit(50)
        
      if (psError) {
        console.error("Error fetching PS projects for compliance:", psError)
        setLoading(false)
        return
      }

      if (!psProjects) {
        setLoading(false)
        return
      }

      // Fetch compliance data for each project (in a real app, you'd have a bulk endpoint)
      const projectCompliances: ProjectCompliance[] = []
      
      // For demo, we'll simulate some data
      // In production, you'd call your compliance-check API for each project
      psProjects.forEach((project, index) => {
        // Simulate compliance scores (70-95% for demonstration)
        const score = 70 + Math.floor(Math.random() * 26)
        const status: "excellent" | "good" | "fair" | "poor" = 
          score >= 90 ? "excellent" :
          score >= 70 ? "good" :
          score >= 50 ? "fair" : "poor"
        
        projectCompliances.push({
          project_id: project.id,
          project_name: project.pemegang_izin || `Project ${index + 1}`,
          compliance_score: score,
          status,
          last_updated: project.updated_at || new Date().toISOString()
        })
      })

      // Calculate statistics
      const total_projects = projectCompliances.length
      const compliant_projects = projectCompliances.filter(p => p.compliance_score >= 70).length
      const average_score = projectCompliances.reduce((sum, p) => sum + p.compliance_score, 0) / total_projects
      const high_compliance_count = projectCompliances.filter(p => p.compliance_score >= 90).length
      const medium_compliance_count = projectCompliances.filter(p => p.compliance_score >= 70 && p.compliance_score < 90).length
      const low_compliance_count = projectCompliances.filter(p => p.compliance_score < 70).length

      // Simulate other stats
      const missing_kml_count = Math.floor(total_projects * 0.3)
      const missing_financial_count = Math.floor(total_projects * 0.4)
      const missing_social_count = Math.floor(total_projects * 0.25)

      setStats({
        total_projects,
        compliant_projects,
        average_score,
        high_compliance_count,
        medium_compliance_count,
        low_compliance_count,
        missing_kml_count,
        missing_financial_count,
        missing_social_count
      })

      // Sort projects by compliance score
      const sortedProjects = [...projectCompliances].sort((a, b) => b.compliance_score - a.compliance_score)
      setTopProjects(sortedProjects.slice(0, 5))
      setBottomProjects(sortedProjects.slice(-5).reverse())

    } catch (error) {
      console.error("Error fetching compliance data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ClimateBaseline Protocol Compliance</CardTitle>
          <CardDescription>Loading compliance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ClimateBaseline Protocol Compliance</CardTitle>
          <CardDescription>No compliance data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start filling in ClimateBaseline Protocol compliance data for your projects.
          </p>
        </CardContent>
      </Card>
    )
  }

  const compliancePercentage = Math.round((stats.compliant_projects / stats.total_projects) * 100)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              ClimateBaseline Protocol Compliance
            </CardTitle>
            <CardDescription>
              Readiness for ClimateBaseline Protocol project development applications
            </CardDescription>
          </div>
          <Badge variant={compliancePercentage >= 70 ? "default" : "destructive"}>
            {compliancePercentage}% Compliant
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total_projects}</div>
            <p className="text-xs text-muted-foreground">Total Projects</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.compliant_projects}</div>
            <p className="text-xs text-muted-foreground">Compliant</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(stats.average_score)}%</div>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.high_compliance_count}</div>
            <p className="text-xs text-muted-foreground">Excellent</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Compliance</span>
            <span>{compliancePercentage}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${compliancePercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Missing Data Indicators */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Common Missing Data
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
              <div className="text-lg font-bold text-yellow-700">{stats.missing_kml_count}</div>
              <p className="text-xs text-yellow-600">Missing KML</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
              <div className="text-lg font-bold text-yellow-700">{stats.missing_financial_count}</div>
              <p className="text-xs text-yellow-600">No Financial Model</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
              <div className="text-lg font-bold text-yellow-700">{stats.missing_social_count}</div>
              <p className="text-xs text-yellow-600">No Social Data</p>
            </div>
          </div>
        </div>

        {/* Top Performing Projects */}
        {topProjects.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Top Performing Projects
            </h4>
            <div className="space-y-2">
              {topProjects.map((project) => (
                <div key={project.project_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${
                      project.status === "excellent" ? "text-green-500" :
                      project.status === "good" ? "text-blue-500" :
                      project.status === "fair" ? "text-yellow-500" : "text-red-500"
                    }`} />
                    <span className="text-sm truncate max-w-[150px]">{project.project_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      project.status === "excellent" ? "default" :
                      project.status === "good" ? "secondary" :
                      project.status === "fair" ? "outline" : "destructive"
                    } className="text-xs">
                      {project.compliance_score}%
                    </Badge>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/dashboard/data/${project.project_id}`}>
                        <FileCheck className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/carbon-projects">
              <TreePine className="mr-2 h-4 w-4" />
              Carbon Projects
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/compliance-report">
              <Users className="mr-2 h-4 w-4" />
              View Report
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
