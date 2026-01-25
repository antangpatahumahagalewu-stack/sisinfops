import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cacheGet } from "@/lib/redis/client"
import { generateQueryCacheKey, maskSensitiveFields } from "@/lib/redis/security"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication (optional, bisa public atau require auth)
    const { data: { session } } = await supabase.auth.getSession()
    
    // Jika perlu autentikasi, uncomment berikut:
    // if (!session) {
    //   return NextResponse.json(
    //     { error: "Unauthorized" },
    //     { status: 401 }
    //   );
    // }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const kabupaten = searchParams.get("kabupaten")
    const skema = searchParams.get("skema")
    const jenis_hutan = searchParams.get("jenis_hutan")
    const rkps_status = searchParams.get("rkps_status")
    const peta_status = searchParams.get("peta_status")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0
    const search = searchParams.get("search")
    const sort_by = searchParams.get("sort_by") || "created_at"
    const sort_order = searchParams.get("sort_order") || "desc"

    // Build params object for cache key
    const params: Record<string, any> = {
      kabupaten,
      skema,
      jenis_hutan,
      rkps_status,
      peta_status,
      limit,
      offset,
      search,
      sort_by,
      sort_order
    }

    const cacheKey = generateQueryCacheKey('ps-list', params)

    return await cacheGet(
      cacheKey,
      async () => {
        let query = supabase
          .from("perhutanan_sosial")
          .select(`
            *,
            kabupaten:kabupaten_id (
              id,
              nama
            )
          `, { count: 'exact' })

        // Apply filters
        if (kabupaten) {
          query = query.eq("kabupaten.nama", kabupaten)
        }
        
        if (skema) {
          query = query.eq("skema", skema)
        }

        if (jenis_hutan) {
          query = query.eq("jenis_hutan", jenis_hutan)
        }

        if (rkps_status) {
          query = query.eq("rkps_status", rkps_status)
        }

        if (peta_status) {
          query = query.eq("peta_status", peta_status)
        }

        if (search) {
          query = query.or(`pemegang_izin.ilike.%${search}%,desa.ilike.%${search}%,kecamatan.ilike.%${search}%,nomor_sk.ilike.%${search}%`)
        }

        // Apply sorting
        if (sort_by === 'kabupaten') {
          query = query.order('kabupaten.nama', { ascending: sort_order === 'asc' })
        } else {
          query = query.order(sort_by, { ascending: sort_order === 'asc' })
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1)

        const { data: psData, error, count } = await query

        if (error) {
          console.error("Database error:", error)
          return NextResponse.json(
            { error: "Failed to fetch PS data", details: error.message },
            { status: 500 }
          )
        }

        // Transform data for response
        const transformedData = psData?.map(item => ({
          id: item.id,
          kabupaten_id: item.kabupaten_id,
          kabupaten_nama: item.kabupaten?.nama || 'Unknown',
          skema: item.skema,
          pemegang_izin: item.pemegang_izin,
          desa: item.desa,
          kecamatan: item.kecamatan,
          nomor_sk: item.nomor_sk,
          tanggal_sk: item.tanggal_sk,
          masa_berlaku: item.masa_berlaku,
          tanggal_berakhir_izin: item.tanggal_berakhir_izin,
          nomor_pks: item.nomor_pks,
          luas_ha: item.luas_ha,
          jenis_hutan: item.jenis_hutan,
          status_kawasan: item.status_kawasan,
          rkps_status: item.rkps_status,
          peta_status: item.peta_status,
          keterangan: item.keterangan,
          fasilitator: item.fasilitator,
          jumlah_kk: item.jumlah_kk,
          created_at: item.created_at,
          updated_at: item.updated_at
        })) || []

        // Apply security masking to sensitive fields
        const maskedData = maskSensitiveFields(transformedData)

        return NextResponse.json({
          success: true,
          data: maskedData,
          total: count || 0,
          limit,
          offset,
          has_more: (offset + limit) < (count || 0)
        })
      },
      60, // TTL 60 seconds - cukup untuk listing data yang sering diakses
      false // No encryption needed for listing data
    )

  } catch (error) {
    console.error("Unexpected error in PS list API:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}