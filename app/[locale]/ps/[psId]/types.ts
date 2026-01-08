export type PsStatus = "SEHAT" | "PERLU_PENDAMPINGAN" | "RISIKO"

export interface Lembaga {
  nama: string
  ketua: string
  jumlahAnggota: number
  kepalaDesa?: string | null
}

export interface PsProfile {
  id: string
  namaPs: string
  desa: string
  kecamatan: string
  kabupaten: string
  skema: string
  luasHa: number
  tahunSk: number
  status: PsStatus
  lembaga: Lembaga
}
