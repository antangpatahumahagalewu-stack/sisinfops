import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user profile for role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    // Only admin and monev can promote
    if (!profile || (profile.role !== 'admin' && profile.role !== 'monev')) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and monev can promote data" },
        { status: 403 }
      )
    }

    // Fetch the potensi data
    const { data: potensiData, error: fetchError } = await supabase
      .from("potensi")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !potensiData) {
      return NextResponse.json(
        { error: "Potensi data not found" },
        { status: 404 }
      )
    }

    // Prepare data for perhutanan_sosial table
    const psData = {
      kabupaten_id: potensiData.kabupaten_id,
      skema: potensiData.skema === 'POTENSI' ? 'HUTAN DESA' : potensiData.skema, // Default skema jika POTENSI
      pemegang_izin: potensiData.pemegang_izin,
      desa: potensiData.desa,
      kecamatan: potensiData.kecamatan,
      nomor_sk: potensiData.nomor_sk,
      tanggal_sk: potensiData.tanggal_sk,
      masa_berlaku: potensiData.masa_berlaku,
      tanggal_berakhir_izin: potensiData.tanggal_berakhir_izin,
      luas_ha: potensiData.luas_izin_sk_ha || potensiData.luas_potensi_ha || 0,
      jenis_hutan: potensiData.jenis_hutan,
      status_kawasan: potensiData.status_kawasan,
      keterangan: `Dipromosi dari data potensi: ${potensiData.keterangan || ''}. ${potensiData.nama_area ? `Nama area: ${potensiData.nama_area}` : ''}`,
      fasilitator: potensiData.fasilitator,
      // Default values for new PS
      nomor_pks: null,
      rkps_status: 'belum',
      peta_status: 'belum',
      jumlah_kk: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert into perhutanan_sosial table
    const { data: insertedPs, error: insertError } = await supabase
      .from("perhutanan_sosial")
      .insert(psData)
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting into perhutanan_sosial:", insertError)
      return NextResponse.json(
        { error: "Failed to create perhutanan_sosial record", details: insertError },
        { status: 500 }
      )
    }

    // Delete from potensi table (hard delete - mutation)
    const { error: deleteError } = await supabase
      .from("potensi")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting from potensi:", deleteError)
      // Even if delete fails, we already created the PS record
      // We'll still return success but log the error
      return NextResponse.json({
        success: true,
        psId: insertedPs.id,
        warning: "PS created but failed to delete from potensi table",
        error: deleteError
      })
    }

    return NextResponse.json({
      success: true,
      message: "Potensi successfully promoted to Perhutanan Sosial",
      psId: insertedPs.id,
      data: insertedPs
    })

  } catch (error) {
    console.error("Unexpected error in promote endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
