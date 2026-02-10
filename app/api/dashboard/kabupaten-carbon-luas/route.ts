import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get all kabupaten
    const { data: kabupatenData, error: kabupatenError } = await supabase
      .from("kabupaten")
      .select("id, nama")
      .order("nama")

    if (kabupatenError) {
      console.error("Error fetching kabupaten:", kabupatenError)
      return NextResponse.json(
        { error: "Failed to fetch kabupaten data" },
        { status: 500 }
      )
    }

    // Get all perhutanan_sosial data
    const { data: psData, error: psError } = await supabase
      .from("perhutanan_sosial")
      .select("id, kabupaten_id, luas_ha")

    if (psError) {
      console.error("Error fetching perhutanan sosial:", psError)
      return NextResponse.json(
        { error: "Failed to fetch perhutanan sosial data" },
        { status: 500 }
      )
    }

    // Get carbon projects - include kabupaten column for matching
    const { data: carbonProjects, error: carbonError } = await supabase
      .from("carbon_projects")
      .select("id, kabupaten, ps_id")

    if (carbonError) {
      console.error("Error fetching carbon projects:", carbonError)
      return NextResponse.json(
        { error: "Failed to fetch carbon projects data" },
        { status: 500 }
      )
    }

    // Get perhutanan sosial IDs that have carbon projects (via ps_id)
    const psWithCarbonProjects = new Set(
      carbonProjects?.map(cp => cp.ps_id).filter(Boolean) || []
    )

    // Calculate luas for each kabupaten and determine which have carbon projects
    const kabupatenLuas = kabupatenData?.map(kab => {
      // Get all PS in this kabupaten
      const psInKabupaten = psData?.filter(ps => ps.kabupaten_id === kab.id) || []
      
      // Calculate total luas for this kabupaten
      let totalLuas = psInKabupaten.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
      
      // SPECIAL LOGIC: If this is Pulang Pisau, add Palangka Raya area
      if (kab.nama === 'Kabupaten Pulang Pisau') {
        // Find Palangka Raya kabupaten
        const palangkaRayaKab = kabupatenData?.find(k => k.nama === 'Kotamadya Palangka Raya')
        if (palangkaRayaKab) {
          // Get Palangka Raya PS
          const psPalangkaRaya = psData?.filter(ps => ps.kabupaten_id === palangkaRayaKab.id) || []
          const palangkaRayaLuas = psPalangkaRaya.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0)
          totalLuas += palangkaRayaLuas
        }
      }
      
      // Check if this kabupaten has any carbon projects using TWO methods:
      // 1. Via ps_id links (traditional method)
      const hasCarbonProjectViaPS = psInKabupaten.some(ps => psWithCarbonProjects.has(ps.id))
      
      // 2. Via kabupaten name matching in carbon_projects table (new method)
      // Clean kabupaten names for matching
      const cleanKabupatenName = kab.nama.replace('Kabupaten ', '').replace('Kotamadya ', '').trim().toLowerCase()
      
      const hasCarbonProjectViaName = carbonProjects?.some(cp => {
        if (!cp.kabupaten) return false
        const cleanCPKabupaten = cp.kabupaten.toLowerCase()
        return cleanCPKabupaten.includes(cleanKabupatenName) || 
               cleanKabupatenName.includes(cleanCPKabupaten)
      }) || false
      
      const hasCarbonProject = hasCarbonProjectViaPS || hasCarbonProjectViaName
      
      return {
        id: kab.id,
        nama: kab.nama,
        luas_total_ha: totalLuas,
        has_carbon_project: hasCarbonProject,
        has_carbon_via_ps: hasCarbonProjectViaPS,
        has_carbon_via_name: hasCarbonProjectViaName
      }
    }) || []

    // Filter only kabupaten with carbon projects
    const kabupatenWithCarbonProjects = kabupatenLuas.filter(kab => kab.has_carbon_project)
    
    // Calculate total luas for kabupaten with carbon projects
    const totalLuas = kabupatenWithCarbonProjects.reduce((sum, kab) => sum + (kab.luas_total_ha || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        kabupaten_with_carbon_projects: kabupatenWithCarbonProjects,
        total_kabupaten_with_carbon: kabupatenWithCarbonProjects.length,
        total_luas_ha: totalLuas,
        all_kabupaten: kabupatenLuas.map(kab => ({
          id: kab.id,
          nama: kab.nama,
          luas_total_ha: kab.luas_total_ha,
          has_carbon_project: kab.has_carbon_project
        })),
        // Debug info
        debug: {
          carbon_projects_count: carbonProjects?.length || 0,
          carbon_projects_with_kabupaten: carbonProjects?.filter(cp => cp.kabupaten).length || 0,
          kabupaten_names_in_carbon_projects: carbonProjects?.map(cp => cp.kabupaten).filter(Boolean) || []
        }
      }
    })
    
  } catch (error) {
    console.error("Unexpected error in kabupaten-carbon-luas API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
