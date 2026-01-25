import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cacheGet } from "@/lib/redis/client"
import { generateCacheKey } from "@/lib/redis/security"

export async function GET() {
  try {
    const cacheKey = generateCacheKey('dashboard', 'carbon-stats', undefined, 'v1')
    
    return await cacheGet(
      cacheKey,
      async () => {
        const supabase = await createClient()
        
        // Fetch carbon projects statistics
        const { data: carbonProjects, error: carbonError } = await supabase
          .from("carbon_projects")
          .select("id, kode_project, nama_project, status, luas_total_ha, estimasi_penyimpanan_karbon, standar_karbon, metodologi, tanggal_mulai, tanggal_selesai, created_at")

        if (carbonError) {
          console.error("Error fetching carbon projects:", carbonError)
          return NextResponse.json(
            { error: "Failed to fetch carbon projects data" },
            { status: 500 }
          )
        }

        // Fetch perhutanan sosial statistics for comparison
        const { data: psData, error: psError } = await supabase
          .from("perhutanan_sosial")
          .select("id, kabupaten_id, luas_ha")

        if (psError) {
          console.error("Error fetching perhutanan sosial data:", psError)
        }

        // Calculate statistics
        const totalCarbonProjects = carbonProjects?.length || 0
        const activeProjects = carbonProjects?.filter((p: any) => p.status === 'active').length || 0
        const totalLuasCarbon = carbonProjects?.reduce((sum: number, p: any) => sum + (p.luas_total_ha || 0), 0) || 0
        const totalEstimatedCO2 = carbonProjects?.reduce((sum: number, p: any) => sum + (p.estimasi_penyimpanan_karbon || 0), 0) || 0

        // Count by standard
        const standards = carbonProjects?.reduce((acc: Record<string, number>, project: any) => {
          const standard = project.standar_karbon || 'Unknown'
          acc[standard] = (acc[standard] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        // Calculate compliance readiness (projects with estimate and luas)
        const compliantProjects = carbonProjects?.filter((p: any) => 
          p.estimasi_penyimpanan_karbon && p.luas_total_ha
        ).length || 0

        // Calculate ratio of carbon projects to PS
        const totalPS = psData?.length || 0
        const conversionRate = totalPS > 0 ? (totalCarbonProjects / totalPS) * 100 : 0

        return NextResponse.json({
          success: true,
          data: {
            total_carbon_projects: totalCarbonProjects,
            active_projects: activeProjects,
            total_luas_ha: totalLuasCarbon,
            total_estimated_co2_tons: totalEstimatedCO2,
            compliant_projects: compliantProjects,
            compliance_rate: totalCarbonProjects > 0 ? (compliantProjects / totalCarbonProjects) * 100 : 0,
            standards_distribution: standards,
            ps_conversion_rate: conversionRate,
            projects_by_status: carbonProjects?.reduce((acc: Record<string, number>, project: any) => {
              const status = project.status || 'unknown'
              acc[status] = (acc[status] || 0) + 1
              return acc
            }, {} as Record<string, number>) || {},
            recent_projects: carbonProjects
              ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
              .map((p: any) => ({
                id: p.id,
                kode_project: p.kode_project,
                nama_project: p.nama_project,
                luas_total_ha: p.luas_total_ha,
                estimasi_penyimpanan_karbon: p.estimasi_penyimpanan_karbon,
                standar_karbon: p.standar_karbon,
                status: p.status
              }))
          }
        })
      },
      300, // TTL 5 minutes
      false // No encryption needed for aggregated stats
    )
    
  } catch (error) {
    console.error("Unexpected error in carbon-stats API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
