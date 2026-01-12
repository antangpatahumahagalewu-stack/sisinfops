export type Role = 'admin' | 'monev' | 'viewer' | 'program_planner' | 'program_implementer' | 'carbon_specialist' | 'monev_officer'

export type Skema = 'HKM' | 'LPHD' | 'HA' | 'HTR' | 'IUPHHK' | 'IUPHKm' | 'POTENSI'

export type JenisHutan = 'Mineral' | 'Gambut' | 'Mineral/Gambut'

export type StatusKawasan = 'HL' | 'HPT' | 'HPK' | 'HP' | 'HA' | '------'

export type StatusAdaBelum = 'ada' | 'belum'

export interface Kabupaten {
  id: string
  nama: string
  created_at: Date
}

export interface PerhutananSosial {
  id: string
  kabupaten_id: string
  kabupaten_nama?: string
  
  // Basic info
  skema: Skema
  pemegang_izin: string
  desa: string
  kecamatan: string
  
  // SK Details
  nomor_sk: string
  tanggal_sk: Date | null
  masa_berlaku: string
  tanggal_berakhir_izin: Date | null
  
  // PKS Details
  nomor_pks: string
  luas_ha: number
  jenis_hutan: JenisHutan
  status_kawasan: StatusKawasan
  
  // Status
  rkps_status: StatusAdaBelum
  peta_status: StatusAdaBelum
  
  // Additional info
  keterangan: string
  fasilitator: string
  jumlah_kk: number | null
  created_at: Date
  updated_at: Date
}

export interface Profile {
  id: string
  full_name: string | null
  role: Role
  created_at: Date
  updated_at: Date
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: any
  new_data: any
  user_id: string | null
  created_at: Date
}

export interface ExcelImportResult {
  success: boolean
  imported: number
  failed: number
  errors: string[]
  data: PerhutananSosial[]
}

export interface DashboardStats {
  total_ps: number
  total_luas: number
  kabupaten_stats: {
    kabupaten_id: string
    kabupaten_nama: string
    jumlah_ps: number
    luas_ha: number
    rkps_ada: number
    peta_ada: number
  }[]
}
