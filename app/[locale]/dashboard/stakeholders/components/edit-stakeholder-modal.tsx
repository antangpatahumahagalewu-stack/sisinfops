"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface EditStakeholderModalProps {
  stakeholder: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (stakeholder: any) => void
  carbonProjects: any[]
  programs: any[]
  validCategories: string[]
  validInfluenceLevels: string[]
  validFPICStatuses: string[]
}

export default function EditStakeholderModal({
  stakeholder,
  open,
  onOpenChange,
  onSave,
  carbonProjects,
  programs,
  validCategories,
  validInfluenceLevels,
  validFPICStatuses
}: EditStakeholderModalProps) {
  const [formData, setFormData] = useState(stakeholder)
  const [isLoading, setIsLoading] = useState(false)

  // Update form data when stakeholder changes
  useEffect(() => {
    setFormData(stakeholder)
  }, [stakeholder])

  const handleChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      await onSave(formData)
    } catch (error) {
      console.error("Error saving stakeholder:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Format category label
  const formatCategoryLabel = (category: string) => {
    return category.replace('_', ' ').toUpperCase()
  }

  // Format status label
  const formatStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase()
  }

  // Format influence label
  const formatInfluenceLabel = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Stakeholder</DialogTitle>
          <DialogDescription>
            Perbarui informasi stakeholder dan status FPIC.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Informasi Dasar</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama_stakeholder">Nama Stakeholder *</Label>
                <Input
                  id="nama_stakeholder"
                  value={formData.nama_stakeholder || ""}
                  onChange={(e) => handleChange("nama_stakeholder", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisasi">Organisasi</Label>
                <Input
                  id="organisasi"
                  value={formData.organisasi || ""}
                  onChange={(e) => handleChange("organisasi", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telepon">Telepon</Label>
                <Input
                  id="telepon"
                  value={formData.telepon || ""}
                  onChange={(e) => handleChange("telepon", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Textarea
                id="alamat"
                value={formData.alamat || ""}
                onChange={(e) => handleChange("alamat", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Category & Project/Program */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Kategori & Proyek</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kategori">Kategori *</Label>
                <Select
                  value={formData.kategori || "other"}
                  onValueChange={(value) => handleChange("kategori", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {validCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatCategoryLabel(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tingkat_pengaruh">Tingkat Pengaruh</Label>
                <Select
                  value={formData.tingkat_pengaruh || "medium"}
                  onValueChange={(value) => handleChange("tingkat_pengaruh", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tingkat pengaruh" />
                  </SelectTrigger>
                  <SelectContent>
                    {validInfluenceLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {formatInfluenceLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kode_project">Carbon Project</Label>
                <Select
                  value={formData.kode_project || ""}
                  onValueChange={(value) => handleChange("kode_project", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih carbon project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak terkait project</SelectItem>
                    {carbonProjects.map((project) => (
                      <SelectItem key={project.id} value={project.kode_project}>
                        {project.nama_project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="program_id">Program</Label>
                <Select
                  value={formData.program_id || ""}
                  onValueChange={(value) => handleChange("program_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak terkait program</SelectItem>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.kode_program}>
                        {program.nama_program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* FPIC Status & Engagement */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">FPIC & Engagement</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fpic_status">Status FPIC</Label>
                <Select
                  value={formData.fpic_status || "not_started"}
                  onValueChange={(value) => handleChange("fpic_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status FPIC" />
                  </SelectTrigger>
                  <SelectContent>
                    {validFPICStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggal_fpic">Tanggal FPIC</Label>
                <Input
                  id="tanggal_fpic"
                  type="date"
                  value={formData.tanggal_fpic?.split('T')[0] || ""}
                  onChange={(e) => handleChange("tanggal_fpic", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_engagement">Jenis Engagement Terakhir</Label>
                <Input
                  id="jenis_engagement"
                  value={formData.jenis_engagement || ""}
                  onChange={(e) => handleChange("jenis_engagement", e.target.value)}
                  placeholder="e.g., Meeting, Consultation, Workshop"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggal_engagement_terakhir">Tanggal Engagement Terakhir</Label>
                <Input
                  id="tanggal_engagement_terakhir"
                  type="date"
                  value={formData.tanggal_engagement_terakhir?.split('T')[0] || ""}
                  onChange={(e) => handleChange("tanggal_engagement_terakhir", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan_engagement">Catatan Engagement</Label>
              <Textarea
                id="catatan_engagement"
                value={formData.catatan_engagement || ""}
                onChange={(e) => handleChange("catatan_engagement", e.target.value)}
                rows={3}
                placeholder="Catatan hasil engagement, keputusan, atau tindak lanjut..."
              />
            </div>
          </div>

          {/* Notes & Risk Assessment */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Catatan & Risiko</h3>
            
            <div className="space-y-2">
              <Label htmlFor="catatan_khusus">Catatan Khusus</Label>
              <Textarea
                id="catatan_khusus"
                value={formData.catatan_khusus || ""}
                onChange={(e) => handleChange("catatan_khusus", e.target.value)}
                rows={3}
                placeholder="Catatan khusus, concern, atau informasi penting lainnya..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level_risiko">Level Risiko</Label>
                <Select
                  value={formData.level_risiko || "low"}
                  onValueChange={(value) => handleChange("level_risiko", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih level risiko" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_aktif">Status Aktif</Label>
                <Select
                  value={formData.status_aktif ? "true" : "false"}
                  onValueChange={(value) => handleChange("status_aktif", value === "true")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Non-Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}