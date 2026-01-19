export type Role = 'admin' | 'monev' | 'viewer' | 'program_planner' | 'program_implementer' | 'carbon_specialist' | 'monev_officer'

export type Skema = 'HKM' | 'LPHD' | 'HA' | 'HTR' | 'IUPHHK' | 'IUPHKm' | 'POTENSI'

export type JenisHutan = 'Mineral' | 'Gambut'

export type StatusKawasan = 'HL' | 'HPT' | 'HPK' | 'HP' | 'HA' | '------'

export type StatusAdaBelum = 'ada' | 'belum'

// Financial Module Types
export type JenisDonor = 'NGO_INTERN' | 'NGO_LOKAL' | 'PEMERINTAH_ASING' | 'PEMERINTAH_LOKAL' | 'SWASTA' | 'INDIVIDU' | 'LAINNYA'
export type JenisGrant = 'OPERASIONAL' | 'INVESTASI' | 'BANTUAN_TEKNIS' | 'RISET' | 'KAPASITAS' | 'LAINNYA'
export type JenisAnggaran = 'OPERASIONAL' | 'INVESTASI' | 'BAGI_HASIL' | 'ADMINISTRASI' | 'MONITORING' | 'KAPASITAS' | 'LAINNYA'
export type JenisTransaksi = 'PENERIMAAN' | 'PENGELUARAN'
export type JenisDistribusi = 'TUNAI' | 'BARANG' | 'JASA' | 'BIBIT' | 'ALAT' | 'LAINNYA'

// Verra Compliance Types
export type VerraProjectType = 'AR' | 'IFM' | 'REDD' | 'A/RR' | 'ENERGY' | 'OTHER'
export type VerraRegistrationStatus = 
  | 'draft' | 'internal_review' | 'vvb_appointed' | 'under_validation'
  | 'validated' | 'submitted_to_verra' | 'registered' | 'under_monitoring'
  | 'under_verification' | 'verified' | 'issued' | 'suspended' | 'terminated'

export type VVBAccreditationStatus = 'active' | 'suspended' | 'withdrawn' | 'expired'
export type VVBEngagementType = 'validation' | 'verification' | 'both'
export type CARType = 'major' | 'minor' | 'observation'
export type CarbonCreditStatus = 'issued' | 'retired' | 'cancelled' | 'transferred' | 'pending'
export type IssuanceBatchStatus = 
  | 'draft' | 'monitoring_completed' | 'verification_requested'
  | 'under_verification' | 'verification_completed' | 'issuance_requested'
  | 'under_review' | 'issued' | 'rejected'

export type VerraDocumentType = 
  | 'PDD' | 'MONITORING_REPORT' | 'VALIDATION_REPORT' | 'VERIFICATION_REPORT'
  | 'ISSUANCE_REQUEST' | 'CAR_RESPONSE' | 'REGISTRY_SUBMISSION' | 'OTHER'

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
