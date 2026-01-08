import { createClient } from "@/lib/supabase/server"
import { parseExcelFile } from "@/lib/excel/parser"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "monev")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: "Only Excel files are allowed" }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Parse Excel file
    const parsedData = await parseExcelFile(arrayBuffer)

    if (parsedData.length === 0) {
      return NextResponse.json({ 
        error: "No valid data found in Excel file. Please check the format.",
        imported: 0,
        failed: 0 
      }, { status: 400 })
    }

    // Get kabupaten mapping
    const { data: kabupatenData } = await supabase
      .from("kabupaten")
      .select("id, nama")

    const kabupatenMap = new Map(
      kabupatenData?.map(k => [k.nama.toUpperCase(), k.id]) || []
    )

    let imported = 0
    let failed = 0
    const errors: string[] = []

    // Process each row
    for (const row of parsedData) {
      try {
        // Map kabupaten name to ID
        const kabupatenId = kabupatenMap.get(row.kabupaten_nama?.toUpperCase() || "")
        
        if (!kabupatenId) {
          failed++
          errors.push(`Kabupaten tidak ditemukan: ${row.kabupaten_nama}`)
          continue
        }

        // Check for duplicates by nomor_pks
        if (row.nomor_pks) {
          const { data: existing } = await supabase
            .from("perhutanan_sosial")
            .select("id")
            .eq("nomor_pks", row.nomor_pks)
            .maybeSingle()

          if (existing) {
            // Update existing record
            const { error } = await supabase
              .from("perhutanan_sosial")
              .update({
                kabupaten_id: kabupatenId,
                skema: row.skema,
                pemegang_izin: row.pemegang_izin,
                desa: row.desa,
                kecamatan: row.kecamatan,
                nomor_sk: row.nomor_sk,
                tanggal_sk: row.tanggal_sk,
                masa_berlaku: row.masa_berlaku,
                tanggal_berakhir_izin: row.tanggal_berakhir_izin,
                luas_ha: row.luas_ha,
                jenis_hutan: row.jenis_hutan,
                status_kawasan: row.status_kawasan,
                rkps_status: row.rkps_status,
                peta_status: row.peta_status,
                keterangan: row.keterangan,
                fasilitator: row.fasilitator,
                updated_at: new Date().toISOString()
              })
              .eq("id", existing.id)

            if (error) {
              failed++
              errors.push(`Gagal update data: ${row.pemegang_izin} - ${error.message}`)
            } else {
              imported++
            }
            continue
          }
        }

        // Insert new record
        const { error } = await supabase
          .from("perhutanan_sosial")
          .insert({
            kabupaten_id: kabupatenId,
            skema: row.skema,
            pemegang_izin: row.pemegang_izin,
            desa: row.desa,
            kecamatan: row.kecamatan,
            nomor_sk: row.nomor_sk,
            tanggal_sk: row.tanggal_sk,
            masa_berlaku: row.masa_berlaku,
            tanggal_berakhir_izin: row.tanggal_berakhir_izin,
            nomor_pks: row.nomor_pks,
            luas_ha: row.luas_ha,
            jenis_hutan: row.jenis_hutan,
            status_kawasan: row.status_kawasan,
            rkps_status: row.rkps_status,
            peta_status: row.peta_status,
            keterangan: row.keterangan,
            fasilitator: row.fasilitator,
            jumlah_kk: row.jumlah_kk,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (error) {
          failed++
          errors.push(`Gagal insert data: ${row.pemegang_izin} - ${error.message}`)
        } else {
          imported++
        }
      } catch (error) {
        failed++
        errors.push(`Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: parsedData.length,
      errors: errors.slice(0, 10) // Limit errors in response
    })

  } catch (error) {
    console.error("Excel import error:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check import status or download template
export async function GET() {
  return NextResponse.json({
    message: "Excel import API is running",
    endpoints: {
      POST: "Upload and import Excel file",
    },
    requirements: {
      file: "Excel file (.xlsx, .xls)",
      max_size: "10MB",
      authentication: "Required",
      roles: "admin or monev"
    }
  })
}
