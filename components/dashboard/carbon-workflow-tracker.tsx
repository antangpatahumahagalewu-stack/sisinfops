"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Target, 
  ShieldCheck, 
  Coins, 
  Users,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface CarbonWorkflowStatus {
  project_id: string
  kode_project: string
  nama_project: string
  overall_status: string
  program_status: string | null
  dram_status: string | null
  due_diligence_status: string | null
  verra_status: string | null
  vvb_status: string | null
  credits_status: string | null
  last_update: string
  tracked_modules: number
}

interface ModuleConfig {
  name: string
  displayName: string
  icon: React.ReactNode
  link: (projectId: string) => string
  statusField: keyof CarbonWorkflowStatus
}

export function CarbonWorkflowTracker({ projectId }: { projectId?: string }) {
  const [loading, setLoading] = useState(true)
  const [workflowData, setWorkflowData] = useState<CarbonWorkflowStatus[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId || null)
  const supabase = createClient()

  // Module configuration
  const modules: ModuleConfig[] = [
    {
      name: 'program',
      displayName: 'Program',
      icon: <Target className="h-4 w-4" />,
      link: (id) => `/dashboard/programs?project=${id}`,
      statusField: 'program_status'
    },
    {
      name: 'dram',
      displayName: 'DRAM',
      icon: <FileText className="h-4 w-4" />,
      link: (id) => `/dashboard/dram?project=${id}`,
      statusField: 'dram_status'
    },
    {
      name: 'due_diligence',
      displayName: 'Due Diligence',
      icon: <ShieldCheck className="h-4 w-4" />,
      link: (id) => `/dashboard/due-diligence?project=${id}`,
      statusField: 'due_diligence_status'
    },
    {
      name: 'verra_registration',
      displayName: 'Verra Registration',
      icon: <CheckCircle className="h-4 w-4" />,
      link: (id) => `/dashboard/verra-registration?project=${id}`,
      statusField: 'verra_status'
    },
    {
      name: 'vvb_management',
      displayName: 'VVB Management',
      icon: <ShieldCheck className="h-4 w-4" />,
      link: (id) => `/dashboard/vvb-management?project=${id}`,
      statusField: 'vvb_status'
    },
    {
      name: 'carbon_credits',
      displayName: 'Carbon Credits',
      icon: <Coins className="h-4 w-4" />,
      link: (id) => `/dashboard/carbon-credits?project=${id}`,
      statusField: 'credits_status'
    },
    {
      name: 'investor_dashboard',
      displayName: 'Investor Dashboard',
      icon: <Users className="h-4 w-4" />,
      link: (id) => `/dashboard/investor?project=${id}`,
      statusField: 'investor_status' as keyof CarbonWorkflowStatus
    }
  ]

  // Load workflow data
  useEffect(() => {
    async function loadWorkflowData() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('v_carbon_workflow_dashboard')
          .select('*')
          .order('last_update', { ascending: false })

        if (error) throw error

        setWorkflowData(data || [])
        
        // Set default selected project if not provided
        if (!selectedProject && data && data.length > 0) {
          setSelectedProject(data[0].project_id)
        }

      } catch (error: any) {
        console.error("Error loading workflow data:", error)
        toast.error("Gagal memuat data workflow", {
          description: error.message
        })
      } finally {
        setLoading(false)
      }
    }

    loadWorkflowData()
  }, [])

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusConfig: Record<string, { color: string, icon: React.ReactNode }> = {
      'completed': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      'active': { color: 'bg-blue-100 text-blue-800', icon: <TrendingUp className="h-3 w-3" /> },
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      'draft': { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> },
      'registered': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      'verified': { color: 'bg-purple-100 text-purple-800', icon: <ShieldCheck className="h-3 w-3" /> },
      'issued': { color: 'bg-emerald-100 text-emerald-800', icon: <Coins className="h-3 w-3" /> },
      'in_progress': { color: 'bg-blue-100 text-blue-800', icon: <TrendingUp className="h-3 w-3" /> },
      'ready': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> }
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="h-3 w-3" /> }

    return (
      <Badge className={`${config.color} gap-1`}>
        {config.icon}
        {status.toUpperCase()}
      </Badge>
    )
  }

  // Get overall status progress
  const getProgressPercentage = (project: CarbonWorkflowStatus) => {
    const completedModules = modules.filter(module => {
      const status = project[module.statusField] as string
      return status && ['completed', 'registered', 'verified', 'issued', 'active'].includes(status)
    }).length

    return Math.round((completedModules / modules.length) * 100)
  }

  // Refresh data
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('v_carbon_workflow_dashboard')
        .select('*')
        .order('last_update', { ascending: false })

      if (error) throw error

      setWorkflowData(data || [])
      toast.success("Data workflow diperbarui")
    } catch (error: any) {
      console.error("Error refreshing data:", error)
      toast.error("Gagal memperbarui data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carbon Workflow Tracker</CardTitle>
          <CardDescription>Memuat data workflow...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedProjectData = workflowData.find(p => p.project_id === selectedProject)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Carbon Workflow Tracker
            </CardTitle>
            <CardDescription>
              Track progress across all carbon project modules
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Project Selector */}
        {workflowData.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Pilih Project</h3>
              <span className="text-xs text-muted-foreground">
                {workflowData.length} project tersedia
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {workflowData.map(project => (
                <Button
                  key={project.project_id}
                  size="sm"
                  variant={selectedProject === project.project_id ? "default" : "outline"}
                  onClick={() => setSelectedProject(project.project_id)}
                  className="text-xs"
                >
                  {project.kode_project}
                  <Badge className="ml-2" variant="secondary">
                    {getProgressPercentage(project)}%
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Progress */}
        {selectedProjectData ? (
          <div className="space-y-6">
            {/* Project Header */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selectedProjectData.nama_project}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProjectData.kode_project} • Last update: {new Date(selectedProjectData.last_update).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {getProgressPercentage(selectedProjectData)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Completion</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Workflow Progress</span>
                  <span>{getProgressPercentage(selectedProjectData)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage(selectedProjectData)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Module Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map(module => {
                const status = selectedProjectData[module.statusField as keyof CarbonWorkflowStatus] as string
                const isCompleted = status && ['completed', 'registered', 'verified', 'issued', 'active'].includes(status)
                
                return (
                  <div 
                    key={module.name}
                    className={`p-4 border rounded-lg ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {module.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{module.displayName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {isCompleted ? 'Selesai' : 'Dalam proses'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        asChild
                        className="text-xs"
                      >
                        <Link href={module.link(selectedProjectData.project_id)}>
                          {isCompleted ? 'Lihat Detail' : 'Lanjutkan'}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Next Steps */}
            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Next Steps
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {modules
                  .filter(module => {
                    const status = selectedProjectData[module.statusField as keyof CarbonWorkflowStatus] as string
                    return !status || !['completed', 'registered', 'verified', 'issued', 'active'].includes(status)
                  })
                  .slice(0, 3)
                  .map(module => (
                    <li key={module.name} className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      Lanjutkan ke {module.displayName}
                    </li>
                  ))
                }
                {modules.filter(module => {
                  const status = selectedProjectData[module.statusField as keyof CarbonWorkflowStatus] as string
                  return !status || !['completed', 'registered', 'verified', 'issued', 'active'].includes(status)
                }).length === 0 && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Semua modul sudah selesai
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : workflowData.length === 0 ? (
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Belum ada data workflow</h3>
            <p className="text-muted-foreground mt-2">
              Mulai dengan membuat carbon project pertama Anda.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/carbon-projects/new">
                Buat Carbon Project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Pilih project untuk melihat workflow</h3>
            <p className="text-muted-foreground mt-2">
              Pilih salah satu project dari daftar di atas.
            </p>
          </div>
        )}

        {/* Integrated Dashboard Link */}
        {selectedProjectData && (
          <div className="mt-6 pt-6 border-t">
            <Button asChild className="w-full" variant="outline">
              <Link href={`/dashboard/carbon-integrated?project=${selectedProjectData.project_id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Buka Dashboard Terintegrasi
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}