import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    console.log("🔍 Kabupaten-carbon-luas API: Starting...")
    
    // SIMPLIFIED VERSION - Return basic data first to isolate issues
    try {
      // 1. Try to get kabupaten data (most basic)
      console.log("🔍 Attempting to fetch kabupaten data...")
      const { data: kabupatenData, error: kabupatenError } = await supabase
        .from("kabupaten")
        .select("id, nama")
        .limit(5)
        .order("nama")

      if (kabupatenError) {
        console.error("❌ Error fetching kabupaten:", kabupatenError.message)
        // Return fallback data instead of failing
        return NextResponse.json({
          success: true,
          data: {
            kabupaten_with_carbon_projects: [],
            total_kabupaten_with_carbon: 0,
            total_luas_ha: 0,
            all_kabupaten: [],
            debug: {
              error: "kabupaten_fetch_failed",
              message: kabupatenError.message,
              timestamp: new Date().toISOString()
            }
          },
          message: "Using fallback data - kabupaten query failed"
        })
      }

      console.log(`✅ Found ${kabupatenData?.length || 0} kabupaten`)
      
      // 2. Try to get perhutanan_sosial data
      console.log("🔍 Attempting to fetch perhutanan_sosial data...")
      const { data: psData, error: psError } = await supabase
        .from("perhutanan_sosial")
        .select("id, kabupaten_id, luas_ha")
        .limit(10)

      if (psError) {
        console.error("❌ Error fetching perhutanan sosial:", psError.message)
        // Return with available kabupaten data
        const allKabupaten = kabupatenData?.map(kab => ({
          id: kab.id,
          nama: kab.nama,
          luas_total_ha: 0,
          has_carbon_project: false
        })) || []

        return NextResponse.json({
          success: true,
          data: {
            kabupaten_with_carbon_projects: [],
            total_kabupaten_with_carbon: 0,
            total_luas_ha: 0,
            all_kabupaten: allKabupaten,
            debug: {
              kabupaten_count: kabupatenData?.length || 0,
              ps_error: psError.message,
              timestamp: new Date().toISOString()
            }
          },
          message: "Partial data - perhutanan_sosial query failed"
        })
      }

      console.log(`✅ Found ${psData?.length || 0} perhutanan_sosial records`)
      
      // 3. Calculate basic luas data
      const kabupatenLuas = kabupatenData?.map(kab => {
        const psInKabupaten = psData?.filter(ps => ps.kabupaten_id === kab.id) || []
        const totalLuas = psInKabupaten.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
        
        return {
          id: kab.id,
          nama: kab.nama,
          luas_total_ha: totalLuas,
          has_carbon_project: false // Simplified for now
        }
      }) || []

      // For now, assume no carbon projects to simplify
      const kabupatenWithCarbonProjects = kabupatenLuas.filter(kab => kab.has_carbon_project)
      const totalLuas = kabupatenWithCarbonProjects.reduce((sum, kab) => sum + (kab.luas_total_ha || 0), 0)

      console.log(`📊 Calculated luas for ${kabupatenLuas.length} kabupaten`)
      
      return NextResponse.json({
        success: true,
        data: {
          kabupaten_with_carbon_projects: kabupatenWithCarbonProjects,
          total_kabupaten_with_carbon: kabupatenWithCarbonProjects.length,
          total_luas_ha: totalLuas,
          all_kabupaten: kabupatenLuas,
          debug: {
            kabupaten_count: kabupatenData?.length || 0,
            ps_count: psData?.length || 0,
            timestamp: new Date().toISOString(),
            version: "simplified_v1"
          }
        },
        message: "Success - using simplified calculation"
      })

    } catch (innerError: any) {
      console.error("❌ Inner error in simplified API:", innerError.message)
      
      // Ultimate fallback - return empty data
      return NextResponse.json({
        success: true,
        data: {
          kabupaten_with_carbon_projects: [],
          total_kabupaten_with_carbon: 0,
          total_luas_ha: 0,
          all_kabupaten: [],
          debug: {
            error: "inner_error",
            message: innerError.message,
            timestamp: new Date().toISOString()
          }
        },
        message: "Fallback data - internal error occurred"
      })
    }
    
  } catch (outerError: any) {
    console.error("❌ Outer error in kabupaten-carbon-luas API:", outerError.message)
    
    // Final fallback if everything fails
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: outerError.message,
      fallback_data: {
        kabupaten_with_carbon_projects: [],
        total_kabupaten_with_carbon: 0,
        total_luas_ha: 0,
        all_kabupaten: []
      }
    }, { status: 500 })
  }
}
