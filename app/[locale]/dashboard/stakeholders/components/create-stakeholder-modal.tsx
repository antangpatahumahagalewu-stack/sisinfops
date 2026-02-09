"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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

export interface CreateStakeholderModalProps {
  trigger: React.ReactNode
  carbonProjects: any[]
  programs: any[]
  validCategories: string[]
  validInfluenceLevels: string[]
  validFPICStatuses: string[]
}

export default function CreateStakeholderModal({
  trigger,
  carbonProjects,
  programs,
  validCategories,
  validInfluenceLevels,
  validFPICStatuses
}: CreateStakeholderModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nama_stakeholder: "",
    organisasi: "",
    email: "",
    telepon: "",
    alamat: "",
    kategori: "other",
    tingkat_pengaruh: "medium",
    kode_project: "",
    program_id: "",
    fpic_status: "not_started",
    tanggal_fpic: "",
    jenis_engagement: "",
    tanggal_engagement_terakhir: "",
    catatan_engagement: "",
    catatan_khusus: "",
    level_risiko: "low",
    status_aktif: true
  })
  const supabase = createClient()

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
      const { data, error } = await supabase
        .from("stakeholders")
        .insert([
          {
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) throw error

      // Reset form and close modal
      setFormData({
        nama_stakeholder: "",
        organisasi: "",
        email: "",
        telepon: "",
        alamat: "",
        kategori: "other",
        tingkat_pengaruh: "medium",
        kode_project: "",
        program_id: "",
        fpic_status: "not_started",
        tanggal_fpic: "",
        jenis_engagement: "",
        tanggal_engagement_terakhir: "",
        catatan_engagement: "",
        catatan_khusus: "",
        level_risiko: "low",
        status_aktif: true
      })

      setOpen(false)
      alert("Stakeholder berhasil ditambahkan")
      
      // Refresh page to show new stakeholder
      window.location.reload()
    } catch (error) {
      console.error("Error creating stakeholder:", error)
      alert("Gagal menambahkan stakeholder")
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Stakeholder Baru</DialogTitle>
          <DialogDescription>
            Tambahkan stakeholder baru untuk proyek karbon atau program.
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
                  value={formData.nama_stakeholder}
                  onChange={(e) => handleChange("nama_stakeholder", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisasi">Organisasi</Label>
                <Input
                  id="organisasi"
                  value={formData.organisasi}
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
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telepon">Telepon</Label>
                <Input
                  id="telepon"
                  value={formData.telepon}
                  onChange={(e) => handleChange("telepon", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Textarea
                id="alamat"
                value={formData.alamat}
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
                  value={formData.kategori}
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
                  value={formData.tingkat_pengaruh}
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
                  value={formData.kode_project}
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
                  value={formData.program_id}
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
                  value={formData.fpic_status}
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
                  value={formData.tanggal_fpic}
                  onChange={(e) => handleChange("tanggal_fpic", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_engagement">Jenis Engagement Terakhir</Label>
                <Input
                  id="jenis_engagement"
                  value={formData.jenis_engagement}
                  onChange={(e) => handleChange("jenis_engagement", e.target.value)}
                  placeholder="e.g., Meeting, Consultation, Workshop"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggal_engagement_terakhir">Tanggal Engagement Terakhir</Label>
                <Input
                  id="tanggal_engagement_terakhir"
                  type="date"
                  value={formData.tanggal_engagement_terakhir}
                  onChange={(e) => handleChange("tanggal_engagement_terakhir", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan_engagement">Catatan Engagement</Label>
              <Textarea
                id="catatan_engagement"
                value={formData.catatan_engagement}
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
                value={formData.catatan_khusus}
                onChange={(e) => handleChange("catatan_khusus", e.target.value)}
                rows={3}
                placeholder="Catatan khusus, concern, atau informasi penting lainnya..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level_risiko">Level Risiko</Label>
                <Select
                  value={formData.level_risiko}
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
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan Stakeholder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}