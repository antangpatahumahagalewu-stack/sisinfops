import * as XLSX from 'xlsx'
import { format, parse } from 'date-fns'
import { PerhutananSosial, Skema, JenisHutan, StatusKawasan, StatusAdaBelum } from '@/lib/types/pks'

interface RawExcelData {
  sheetName: string
  data: any[][]
}

interface ParsedRow {
  kabupaten?: string
  skema?: string
  pemegang_izin?: string
  desa?: string
  kecamatan?: string
  nomor_sk?: string
  tanggal_sk?: string
  masa_berlaku?: string
  tanggal_berakhir_izin?: string
  nomor_pks?: string
  luas_ha?: number
  jenis_hutan?: string
  status_kawasan?: string
  rkps_status?: string
  peta_status?: string
  keterangan?: string
  fasilitator?: string
}

export class ExcelParser {
  private workbook: XLSX.WorkBook

  constructor(buffer: ArrayBuffer) {
    this.workbook = XLSX.read(buffer, { type: 'array' })
  }

  /**
   * Parse all sheets and return structured data
   */
  async parseAll(): Promise<PerhutananSosial[]> {
    const results: PerhutananSosial[] = []

    // Process each sheet
    for (const sheetName of this.workbook.SheetNames) {
      console.log(`Processing sheet: ${sheetName}`)
      
      if (sheetName.includes('DATA PS YANG TELAH BERTANDATANGAN')) {
        const data = await this.parseDetailSheet(sheetName)
        results.push(...data)
      } else if (sheetName.includes('REKAPITULASI')) {
        // For summary sheet, we don't extract individual rows
        console.log('Skipping summary sheet for individual data extraction')
      } else if (sheetName.includes('DATA POTENSI') || sheetName.includes('POTENSI')) {
        const data = await this.parsePotentialSheet(sheetName)
        results.push(...data)
      }
    }

    console.log(`Total parsed rows: ${results.length}`)
    return results
  }

  /**
   * Parse detail sheet (DATA PS YANG TELAH BERTANDATANGAN)
   */
  private async parseDetailSheet(sheetName: string): Promise<PerhutananSosial[]> {
    const worksheet = this.workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })
    
    const results: PerhutananSosial[] = []
    let currentKabupaten = ''
    let headers: string[] = []

    // Find header row (contains "No." or "SKEMA")
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i]
      if (Array.isArray(row)) {
        const firstCell = String(row[0] || '').toUpperCase()
        if (firstCell.includes('NO') || firstCell.includes('SKEMA')) {
          headers = row.map(cell => String(cell || '').trim())
          console.log('Found headers at row', i, ':', headers)
          
          // Process data rows after header
          for (let j = i + 1; j < rawData.length; j++) {
            const dataRow = rawData[j]
            if (!Array.isArray(dataRow) || dataRow.length < 5) continue
            
            // Check if this row contains kabupaten name (all caps)
            const firstCellValue = String(dataRow[0] || '')
            if (firstCellValue && firstCellValue.toUpperCase() === firstCellValue && 
                !firstCellValue.match(/^\d+$/) && firstCellValue.length > 3) {
              currentKabupaten = this.normalizeKabupatenName(firstCellValue)
              console.log('Switching to kabupaten:', currentKabupaten)
              continue
            }

            // Check if row has data (non-empty first few cells)
            const hasData = dataRow.slice(0, 5).some(cell => {
              const val = String(cell || '')
              return val.trim().length > 0 && !val.includes('TOTAL')
            })

            if (hasData) {
              const parsedRow = this.parseDetailRow(dataRow, headers, currentKabupaten)
              if (parsedRow) {
                results.push(parsedRow)
              }
            }
          }
          break
        }
      }
    }

    return results
  }

  /**
   * Parse potential data sheet (DATA POTENSI)
   */
  private async parsePotentialSheet(sheetName: string): Promise<PerhutananSosial[]> {
    const worksheet = this.workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })
    
    const results: PerhutananSosial[] = []
    let currentKabupaten = ''
    let headers: string[] = []

    // Find header row (contains "SKEMA PS" or "SKEMA")
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i]
      if (Array.isArray(row)) {
        const firstCell = String(row[0] || '').toUpperCase()
        if (firstCell.includes('SKEMA') || firstCell.includes('PEMEGANG')) {
          headers = row.map(cell => String(cell || '').trim())
          console.log('Found headers at row', i, ':', headers)
          
          // Process data rows after header
          for (let j = i + 1; j < rawData.length; j++) {
            const dataRow = rawData[j]
            if (!Array.isArray(dataRow) || dataRow.length < 5) continue
            
            // Check if this row contains kabupaten name (all caps)
            const firstCellValue = String(dataRow[0] || '')
            if (firstCellValue && firstCellValue.toUpperCase() === firstCellValue && 
                !firstCellValue.match(/^\d+$/) && firstCellValue.length > 3) {
              currentKabupaten = this.normalizeKabupatenName(firstCellValue)
              console.log('Switching to kabupaten:', currentKabupaten)
              continue
            }

            // Skip total rows
            const firstCellStr = String(dataRow[0] || '')
            if (firstCellStr.includes('TOTAL') || firstCellStr.includes('JUMLAH')) {
              continue
            }

            // Check if row has data (non-empty first few cells)
            const hasData = dataRow.slice(0, 5).some(cell => {
              const val = String(cell || '')
              return val.trim().length > 0
            })

            if (hasData) {
              const parsedRow = this.parsePotentialRow(dataRow, headers, currentKabupaten)
              if (parsedRow) {
                results.push(parsedRow)
              }
            }
          }
          break
        }
      }
    }

    return results
  }

  /**
   * Parse a single potential row
   */
  private parsePotentialRow(row: any[], headers: string[], kabupaten: string): PerhutananSosial | null {
    try {
      // Create a map of header to value
      const rowData: Record<string, any> = {}
      for (let i = 0; i < Math.min(headers.length, row.length); i++) {
        const header = headers[i] || `col_${i}`
        rowData[header] = row[i]
      }

      // Extract values based on expected headers
      const skema = this.extractSkema(rowData)
      const pemegangIzin = this.extractPemegangIzinPotensi(rowData)
      const luasHa = this.extractLuasPotensi(rowData)

      if ((!pemegangIzin || pemegangIzin.length < 2) && skema !== 'POTENSI') {
        return null // Skip rows without valid data, except for POTENSI
      }

      return {
        id: '', // Will be generated by database
        kabupaten_id: '', // Will be mapped later
        kabupaten_nama: kabupaten,
        skema,
        pemegang_izin: pemegangIzin || 'Potensi Area',
        desa: this.extractDesaPotensi(rowData),
        kecamatan: this.extractKecamatanPotensi(rowData),
        nomor_sk: this.extractNomorSKPotensi(rowData),
        tanggal_sk: this.parseDate(this.extractTanggalSKPotensi(rowData)),
        masa_berlaku: this.extractMasaBerlakuPotensi(rowData),
        tanggal_berakhir_izin: this.parseDate(this.extractTanggalBerakhirPotensi(rowData)),
        nomor_pks: '',
        luas_ha: luasHa,
        jenis_hutan: this.extractJenisHutanPotensi(rowData),
        status_kawasan: this.extractStatusKawasanPotensi(rowData),
        rkps_status: 'belum',
        peta_status: 'belum',
        keterangan: this.extractKeteranganPotensi(rowData),
        fasilitator: this.extractFasilitatorPotensi(rowData),
        jumlah_kk: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    } catch (error) {
      console.error('Error parsing potential row:', error, row)
      return null
    }
  }

  /**
   * Parse a single detail row
   */
  private parseDetailRow(row: any[], headers: string[], kabupaten: string): PerhutananSosial | null {
    try {
      // Create a map of header to value
      const rowData: Record<string, any> = {}
      for (let i = 0; i < Math.min(headers.length, row.length); i++) {
        const header = headers[i] || `col_${i}`
        rowData[header] = row[i]
      }

      // Extract values based on expected headers
      const skema = this.extractSkema(rowData)
      const pemegangIzin = this.extractPemegangIzin(rowData)
      const luasHa = this.extractLuas(rowData)

      if (!pemegangIzin || pemegangIzin.length < 2) {
        return null // Skip rows without valid data
      }

      return {
        id: '', // Will be generated by database
        kabupaten_id: '', // Will be mapped later
        kabupaten_nama: kabupaten,
        skema,
        pemegang_izin: pemegangIzin,
        desa: this.extractDesa(rowData),
        kecamatan: this.extractKecamatan(rowData),
        nomor_sk: this.extractNomorSK(rowData),
        tanggal_sk: this.parseDate(this.extractTanggalSK(rowData)),
        masa_berlaku: this.extractMasaBerlaku(rowData),
        tanggal_berakhir_izin: this.parseDate(this.extractTanggalBerakhir(rowData)),
        nomor_pks: this.extractNomorPKS(rowData),
        luas_ha: luasHa,
        jenis_hutan: this.extractJenisHutan(rowData),
        status_kawasan: this.extractStatusKawasan(rowData),
        rkps_status: this.extractStatus(rowData, 'rkps'),
        peta_status: this.extractStatus(rowData, 'peta'),
        keterangan: this.extractKeterangan(rowData),
        fasilitator: this.extractFasilitator(rowData),
        jumlah_kk: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    } catch (error) {
      console.error('Error parsing row:', error, row)
      return null
    }
  }

  // Helper extraction methods
  private extractSkema(rowData: Record<string, any>): Skema {
    const value = String(rowData['SKEMA'] || rowData['skema'] || rowData[1] || '').toUpperCase().trim()
    if (value.includes('HKM')) return 'HKM'
    if (value.includes('LPHD')) return 'LPHD'
    if (value.includes('HA')) return 'HA'
    if (value.includes('HTR')) return 'HTR'
    if (value.includes('IUPHHK')) return 'IUPHHK'
    if (value.includes('IUPHK')) return 'IUPHKm'
    if (value.includes('POTENSI')) return 'POTENSI'
    return 'LPHD' // default
  }

  private extractPemegangIzin(rowData: Record<string, any>): string {
    return String(rowData['PEMEGANG IZIN'] || rowData['pemegang_izin'] || rowData[2] || '').trim()
  }

  private extractDesa(rowData: Record<string, any>): string {
    return String(rowData['Desa/Kelurahan'] || rowData['desa'] || rowData[3] || '').trim()
  }

  private extractKecamatan(rowData: Record<string, any>): string {
    return String(rowData['KECAMATAN'] || rowData['kecamatan'] || rowData[4] || '').trim()
  }

  private extractNomorSK(rowData: Record<string, any>): string {
    return String(rowData['NOMOR SK KEMENTRIAN LINGKUNGAN HIDUP'] || rowData['nomor_sk'] || rowData[5] || '').trim()
  }

  private extractTanggalSK(rowData: Record<string, any>): string {
    return String(rowData['TANGGAL SK KEMENLHK'] || rowData['tanggal_sk'] || rowData[6] || '').trim()
  }

  private extractMasaBerlaku(rowData: Record<string, any>): string {
    return String(rowData['MASA BERLAKU'] || rowData['masa_berlaku'] || rowData[7] || '').trim()
  }

  private extractTanggalBerakhir(rowData: Record<string, any>): string {
    return String(rowData['TANGGAL BERAKHIR IJIN SK'] || rowData['tanggal_berakhir'] || rowData[8] || '').trim()
  }

  private extractNomorPKS(rowData: Record<string, any>): string {
    return String(rowData['NOMOR DOKUMEN PKS'] || rowData['nomor_pks'] || rowData[9] || '').trim()
  }

  private extractLuas(rowData: Record<string, any>): number {
    const value = rowData['LUAS IZIN DALAM SK (HA)'] || rowData['luas_ha'] || rowData[10] || 0
    const num = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'))
    return isNaN(num) ? 0 : num
  }

  private extractJenisHutan(rowData: Record<string, any>): JenisHutan {
    const value = String(rowData['Jenis Hutan'] || rowData['jenis_hutan'] || rowData[11] || '').trim()
    if (value.includes('Gambut')) return 'Gambut'
    if (value.includes('Mineral')) return 'Mineral'
    return 'Mineral/Gambut'
  }

  private extractStatusKawasan(rowData: Record<string, any>): StatusKawasan {
    const value = String(rowData['STATUS'] || rowData['status_kawasan'] || rowData[12] || '').trim()
    if (value.includes('HL')) return 'HL'
    if (value.includes('HPT')) return 'HPT'
    if (value.includes('HPK')) return 'HPK'
    if (value.includes('HP')) return 'HP'
    if (value.includes('HA')) return 'HA'
    return '------'
  }

  private extractStatus(rowData: Record<string, any>, type: 'rkps' | 'peta'): StatusAdaBelum {
    // Look for checkmarks, stars, or text
    const rkpsValue = String(rowData['RKPS'] || rowData['rkps'] || rowData[13] || '').trim()
    const petaValue = String(rowData['PETA PS'] || rowData['peta'] || rowData[14] || '').trim()
    
    const value = type === 'rkps' ? rkpsValue : petaValue
    
    if (value.includes('✓') || value.includes('ada') || value.includes('ADA') || value.includes('**')) {
      return 'ada'
    }
    return 'belum'
  }

  private extractKeterangan(rowData: Record<string, any>): string {
    return String(rowData['KETERANGAN'] || rowData['keterangan'] || '').trim()
  }

  private extractFasilitator(rowData: Record<string, any>): string {
    return String(rowData['FASILITATOR'] || rowData['fasilitator'] || 'AMAL').trim()
  }

  // Potential data extraction methods
  private extractPemegangIzinPotensi(rowData: Record<string, any>): string {
    return String(rowData['PEMEGANG IZIN'] || rowData['pemegang_izin'] || rowData[2] || rowData[1] || '').trim()
  }

  private extractLuasPotensi(rowData: Record<string, any>): number {
    const value = rowData['LUAS POTENSI (HA)'] || rowData['LUAS IZIN DALAM SK (HA)'] || rowData['luas_ha'] || rowData[10] || rowData[11] || 0
    const num = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'))
    return isNaN(num) ? 0 : num
  }

  private extractDesaPotensi(rowData: Record<string, any>): string {
    return String(rowData['Desa/Kelurahan'] || rowData['desa'] || rowData[3] || rowData[4] || '').trim()
  }

  private extractKecamatanPotensi(rowData: Record<string, any>): string {
    return String(rowData['KECAMATAN'] || rowData['kecamatan'] || rowData[4] || rowData[5] || '').trim()
  }

  private extractNomorSKPotensi(rowData: Record<string, any>): string {
    return String(rowData['NOMOR SK KEMENTRIAN LINGKUNGAN HIDUP'] || rowData['nomor_sk'] || rowData[5] || rowData[6] || '').trim()
  }

  private extractTanggalSKPotensi(rowData: Record<string, any>): string {
    return String(rowData['TANGGAL IZIN SK-KEMENLHK'] || rowData['TANGGAL SK KEMENLHK'] || rowData['tanggal_sk'] || rowData[6] || rowData[7] || '').trim()
  }

  private extractMasaBerlakuPotensi(rowData: Record<string, any>): string {
    return String(rowData['MASA BERLAKU IJIN'] || rowData['MASA BERLAKU'] || rowData['masa_berlaku'] || rowData[7] || rowData[8] || '').trim()
  }

  private extractTanggalBerakhirPotensi(rowData: Record<string, any>): string {
    return String(rowData['TANGGAL BERAKHIR IJIN SK'] || rowData['tanggal_berakhir'] || rowData[8] || rowData[9] || '').trim()
  }

  private extractJenisHutanPotensi(rowData: Record<string, any>): JenisHutan {
    const value = String(rowData['Jenis Hutan'] || rowData['jenis_hutan'] || rowData[11] || rowData[12] || '').trim()
    if (value.includes('Gambut')) return 'Gambut'
    if (value.includes('Mineral')) return 'Mineral'
    return 'Mineral/Gambut'
  }

  private extractStatusKawasanPotensi(rowData: Record<string, any>): StatusKawasan {
    const value = String(rowData['STATUS'] || rowData['status_kawasan'] || rowData[12] || rowData[13] || '').trim()
    if (value.includes('HL')) return 'HL'
    if (value.includes('HPT')) return 'HPT'
    if (value.includes('HPK')) return 'HPK'
    if (value.includes('HP')) return 'HP'
    if (value.includes('HA')) return 'HA'
    return '------'
  }

  private extractKeteranganPotensi(rowData: Record<string, any>): string {
    return String(rowData['KETERANGAN'] || rowData['keterangan'] || '').trim()
  }

  private extractFasilitatorPotensi(rowData: Record<string, any>): string {
    return String(rowData['FASILITATOR'] || rowData['fasilitator'] || 'AMAL').trim()
  }

  /**
   * Parse various date formats found in Excel
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim().length === 0) return null

    const str = dateStr.trim()
    
    // Try ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return new Date(str)
    }
    
    // Try Indonesian date format (DD Month YYYY)
    const indonesianMonths: Record<string, number> = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
      'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    }
    
    const parts = str.toLowerCase().split(' ')
    if (parts.length === 3 && indonesianMonths[parts[1]]) {
      const day = parseInt(parts[0])
      const month = indonesianMonths[parts[1]]
      const year = parseInt(parts[2])
      return new Date(year, month, day)
    }
    
    // Try other formats
    try {
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return date
      }
    } catch {
      // Ignore
    }
    
    return null
  }

  /**
   * Normalize kabupaten name
   */
  private normalizeKabupatenName(name: string): string {
    const normalized = name.trim().toUpperCase()
    if (normalized.includes('KATINGAN')) return 'KABUPATEN KATINGAN'
    if (normalized.includes('KAPUAS')) return 'KABUPATEN KAPUAS'
    if (normalized.includes('PULANG PISAU')) return 'KABUPATEN PULANG PISAU'
    if (normalized.includes('GUNUNG MAS')) return 'KABUPATEN GUNUNG MAS'
    return normalized
  }

  /**
   * Get summary statistics from REKAPITULASI sheet
   */
  async getSummaryStats(): Promise<{
    total_ps: number
    total_luas: number
    kabupaten_stats: Array<{
      kabupaten_nama: string
      jumlah_ps: number
      luas_ha: number
      rkps_ada: number
      peta_ada: number
    }>
  }> {
    const summarySheet = this.workbook.SheetNames.find(name => name.includes('REKAPITULASI'))
    if (!summarySheet) {
      return { total_ps: 0, total_luas: 0, kabupaten_stats: [] }
    }

    const worksheet = this.workbook.Sheets[summarySheet]
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })
    
    const stats: Array<{
      kabupaten_nama: string
      jumlah_ps: number
      luas_ha: number
      rkps_ada: number
      peta_ada: number
    }> = []

    let totalPs = 0
    let totalLuas = 0

    for (const row of rawData) {
      if (!Array.isArray(row) || row.length < 3) continue
      
      const firstCell = String(row[0] || '').trim()
      if (firstCell.match(/^\d+$/) && row[1]) {
        const kabupaten = String(row[1]).trim()
        const jumlahPs = parseInt(String(row[2] || 0)) || 0
        const luasHa = parseFloat(String(row[3] || 0).replace(',', '.')) || 0
        
        totalPs += jumlahPs
        totalLuas += luasHa

        // Extract RKPS and PETA status from columns 4 and 5
        const rkpsCell = String(row[4] || '')
        const petaCell = String(row[5] || '')
        
        const rkpsAda = rkpsCell.includes('ada') || rkpsCell.includes('ADA') ? 1 : 0
        const petaAda = petaCell.includes('ada') || petaCell.includes('ADA') ? 1 : 0

        stats.push({
          kabupaten_nama: this.normalizeKabupatenName(kabupaten),
          jumlah_ps: jumlahPs,
          luas_ha: luasHa,
          rkps_ada: rkpsAda,
          peta_ada: petaAda
        })
      }
    }

    return {
      total_ps: totalPs,
      total_luas: totalLuas,
      kabupaten_stats: stats
    }
  }
}

/**
 * Main function to parse Excel file
 */
export async function parseExcelFile(buffer: ArrayBuffer): Promise<PerhutananSosial[]> {
  const parser = new ExcelParser(buffer)
  return await parser.parseAll()
}

/**
 * Get summary statistics from Excel file
 */
export async function getExcelSummary(buffer: ArrayBuffer) {
  const parser = new ExcelParser(buffer)
  return await parser.getSummaryStats()
}
