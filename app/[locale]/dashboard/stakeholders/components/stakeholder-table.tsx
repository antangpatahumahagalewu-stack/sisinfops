"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { 
  Eye, Edit, Trash2, Filter, Search, MoreHorizontal,
  Building, Users, Globe, Briefcase, School, Newspaper, UserCheck, FileCheck
} from "lucide-react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import EditStakeholderModal from "./edit-stakeholder-modal"

interface StakeholderTableProps {
  stakeholders: any[]
  carbonProjects: any[]
  programs: any[]
  canManage: boolean
  validCategories: string[]
  validInfluenceLevels: string[]
  validFPICStatuses: string[]
}

export default function StakeholderTable({
  stakeholders: initialStakeholders,
  carbonProjects,
  programs,
  canManage,
  validCategories,
  validInfluenceLevels,
  validFPICStatuses
}: StakeholderTableProps) {
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedFPICStatus, setSelectedFPICStatus] = useState<string>("all")
  const [selectedInfluence, setSelectedInfluence] = useState<string>("all")
  const [editingStakeholder, setEditingStakeholder] = useState<any>(null)
  const supabase = createClient()

  // Filter stakeholders based on search and filters
  const filteredStakeholders = stakeholders.filter(stakeholder => {
    // Search term filter
    const matchesSearch = searchTerm === "" || 
      stakeholder.nama_stakeholder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stakeholder.organisasi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stakeholder.email?.toLowerCase().includes(searchTerm.toLowerCase())

    // Project filter
    const matchesProject = selectedProject === "all" || 
      stakeholder.kode_project === selectedProject ||
      stakeholder.program_id === selectedProject

    // Category filter
    const matchesCategory = selectedCategory === "all" || 
      stakeholder.kategori === selectedCategory

    // FPIC status filter
    const matchesFPICStatus = selectedFPICStatus === "all" || 
      stakeholder.fpic_status === selectedFPICStatus

    // Influence level filter
    const matchesInfluence = selectedInfluence === "all" || 
      stakeholder.tingkat_pengaruh === selectedInfluence

    return matchesSearch && matchesProject && matchesCategory && matchesFPICStatus && matchesInfluence
  })

  // Handle delete stakeholder
  const handleDeleteStakeholder = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus stakeholder ini?")) return

    try {
      const { error } = await supabase
        .from("stakeholders")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Remove from local state
      setStakeholders(stakeholders.filter(s => s.id !== id))

      // Simple alert instead of toast
      alert("Stakeholder berhasil dihapus")
    } catch (error) {
      console.error("Error deleting stakeholder:", error)
      alert("Gagal menghapus stakeholder")
    }
  }

  // Handle update stakeholder
  const handleUpdateStakeholder = async (updatedStakeholder: any) => {
    try {
      const { error } = await supabase
        .from("stakeholders")
        .update(updatedStakeholder)
        .eq("id", updatedStakeholder.id)

      if (error) throw error

      // Update local state
      setStakeholders(stakeholders.map(s => 
        s.id === updatedStakeholder.id ? { ...s, ...updatedStakeholder } : s
      ))

      setEditingStakeholder(null)
      // Simple alert instead of toast
      alert("Stakeholder berhasil diperbarui")
    } catch (error) {
      console.error("Error updating stakeholder:", error)
      alert("Gagal memperbarui stakeholder")
    }
  }

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      government: "bg-blue-100 text-blue-800 border-blue-200",
      community: "bg-green-100 text-green-800 border-green-200",
      ngo_cso: "bg-purple-100 text-purple-800 border-purple-200",
      investor: "bg-amber-100 text-amber-800 border-amber-200",
      academic: "bg-cyan-100 text-cyan-800 border-cyan-200",
      private_sector: "bg-gray-100 text-gray-800 border-gray-200",
      media: "bg-red-100 text-red-800 border-red-200",
      international_organization: "bg-indigo-100 text-indigo-800 border-indigo-200",
      other: "bg-gray-100 text-gray-800 border-gray-200"
    }

    const icons: Record<string, React.ReactNode> = {
      government: <Building className="h-3 w-3" />,
      community: <Users className="h-3 w-3" />,
      ngo_cso: <Globe className="h-3 w-3" />,
      investor: <Briefcase className="h-3 w-3" />,
      academic: <School className="h-3 w-3" />,
      private_sector: <Briefcase className="h-3 w-3" />,
      media: <Newspaper className="h-3 w-3" />,
      international_organization: <Globe className="h-3 w-3" />,
      other: <Users className="h-3 w-3" />
    }

    const labels: Record<string, string> = {
      government: "Government",
      community: "Community",
      ngo_cso: "NGO/CSO",
      investor: "Investor",
      academic: "Academic",
      private_sector: "Private Sector",
      media: "Media",
      international_organization: "Intl. Org",
      other: "Other"
    }

    return (
      <Badge variant="outline" className={`text-xs ${colors[category] || colors.other}`}>
        <span className="flex items-center gap-1">
          {icons[category] || icons.other}
          {labels[category] || category.replace('_', ' ').toUpperCase()}
        </span>
      </Badge>
    )
  }

  // Get influence level badge
  const getInfluenceBadge = (level: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-800 border-gray-200",
      medium: "bg-blue-100 text-blue-800 border-blue-200",
      high: "bg-red-100 text-red-800 border-red-200"
    }

    const labels: Record<string, string> = {
      low: "Low",
      medium: "Medium",
      high: "High"
    }

    return (
      <Badge variant="outline" className={`text-xs ${colors[level] || colors.low}`}>
        {labels[level] || level.toUpperCase()}
      </Badge>
    )
  }

  // Get FPIC status badge
  const getFPICStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      not_started: "bg-gray-100 text-gray-800 border-gray-200",
      in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      on_hold: "bg-red-100 text-red-800 border-red-200"
    }

    const labels: Record<string, string> = {
      not_started: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
      on_hold: "On Hold"
    }

    return (
      <Badge variant="outline" className={`text-xs ${colors[status] || colors.not_started}`}>
        {labels[status] || status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  // Get FPIC progress percentage
  const getFPICProgress = (status: string) => {
    const progress: Record<string, number> = {
      not_started: 0,
      in_progress: 50,
      completed: 100,
      on_hold: 25
    }
    return progress[status] || 0
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get related project/program name
  const getRelatedProjectName = (stakeholder: any) => {
    if (stakeholder.carbon_projects) {
      return stakeholder.carbon_projects.nama_project
    }
    if (stakeholder.programs) {
      return stakeholder.programs.nama_program
    }
    return "-"
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedProject("all")
    setSelectedCategory("all")
    setSelectedFPICStatus("all")
    setSelectedInfluence("all")
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari stakeholder, organisasi, atau email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Proyek/Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Proyek/Program</SelectItem>
              {carbonProjects.map((project) => (
                <SelectItem key={project.id} value={project.kode_project}>
                  {project.nama_project}
                </SelectItem>
              ))}
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.kode_program}>
                  {program.nama_program}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {validCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedFPICStatus} onValueChange={setSelectedFPICStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status FPIC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {validFPICStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedInfluence} onValueChange={setSelectedInfluence}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tingkat Pengaruh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tingkat</SelectItem>
              {validInfluenceLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredStakeholders.length} dari {stakeholders.length} stakeholder
        </p>
      </div>

      {/* Table */}
      {filteredStakeholders.length > 0 ? (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Nama Stakeholder</th>
                <th className="text-left py-3 px-4 font-medium">Kategori</th>
                <th className="text-left py-3 px-4 font-medium">Proyek/Program</th>
                <th className="text-left py-3 px-4 font-medium">Status FPIC</th>
                <th className="text-left py-3 px-4 font-medium">Tingkat Pengaruh</th>
                <th className="text-left py-3 px-4 font-medium">Engagement Terakhir</th>
                <th className="text-left py-3 px-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStakeholders.map((stakeholder) => (
                <tr key={stakeholder.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{stakeholder.nama_stakeholder}</div>
                      <div className="text-xs text-muted-foreground">
                        {stakeholder.organisasi} • {stakeholder.email || 'No email'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getCategoryBadge(stakeholder.kategori)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">{getRelatedProjectName(stakeholder)}</div>
                    <div className="text-xs text-muted-foreground">
                      {stakeholder.kode_project || stakeholder.program_id || '-'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {getFPICStatusBadge(stakeholder.fpic_status)}
                      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500"
                          style={{ width: `${getFPICProgress(stakeholder.fpic_status)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getInfluenceBadge(stakeholder.tingkat_pengaruh)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">{formatDate(stakeholder.tanggal_engagement_terakhir)}</div>
                    {stakeholder.jenis_engagement && (
                      <div className="text-xs text-muted-foreground">
                        {stakeholder.jenis_engagement}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`#view-${stakeholder.id}`} onClick={(e) => {
                          e.preventDefault()
                          setEditingStakeholder(stakeholder)
                        }}>
                          <Eye className="h-3 w-3" />
                        </a>
                      </Button>
                      {canManage && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditingStakeholder(stakeholder)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditingStakeholder(stakeholder)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Stakeholder
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteStakeholder(stakeholder.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus Stakeholder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Log Engagement
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileCheck className="h-4 w-4 mr-2" />
                                Update FPIC Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Tidak ada stakeholder yang ditemukan</h3>
          <p className="text-muted-foreground mt-2">
            {stakeholders.length === 0 
              ? "Belum ada stakeholder yang terdaftar. Mulai dengan menambahkan stakeholder pertama."
              : "Coba ubah filter pencarian Anda."}
          </p>
          {stakeholders.length === 0 && canManage && (
            <p className="text-sm text-muted-foreground mt-2">
              Klik tombol "Tambah Stakeholder" di atas untuk menambahkan stakeholder pertama.
            </p>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingStakeholder && (
        <EditStakeholderModal
          stakeholder={editingStakeholder}
          open={!!editingStakeholder}
          onOpenChange={(open: boolean) => !open && setEditingStakeholder(null)}
          onSave={handleUpdateStakeholder}
          carbonProjects={carbonProjects}
          programs={programs}
          validCategories={validCategories}
          validInfluenceLevels={validInfluenceLevels}
          validFPICStatuses={validFPICStatuses}
        />
      )}
    </div>
  )
}