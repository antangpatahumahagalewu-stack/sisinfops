import { NextResponse } from "next/server"
import { getCacheStats } from "@/lib/redis/client"

export async function GET() {
  try {
    const stats = await getCacheStats()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        uptime: process.uptime(),
        node_env: process.env.NODE_ENV || 'development'
      },
      recommendations: getRecommendations(stats)
    })
  } catch (error) {
    console.error("Error fetching Redis stats:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch Redis stats",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getRecommendations(stats: {
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
  connected: boolean;
}): string[] {
  const recommendations: string[] = []
  
  if (stats.hitRate < 50) {
    recommendations.push("Cache hit rate rendah (<50%). Pertimbangkan untuk meningkatkan TTL atau menambah endpoint yang di-cache.")
  }
  
  if (stats.hitRate > 90) {
    recommendations.push("Cache hit rate sangat baik (>90%). Pertimbangkan untuk mengurangi TTL untuk data yang lebih fresh.")
  }
  
  if (stats.totalKeys === 0) {
    recommendations.push("Tidak ada keys di cache. Pastikan caching diaktifkan di endpoint yang sesuai.")
  }
  
  if (stats.totalKeys > 1000) {
    recommendations.push("Jumlah cache keys tinggi (>1000). Pertimbangkan untuk membersihkan keys yang tidak digunakan.")
  }
  
  // Parse memory usage
  const memoryValue = parseFloat(stats.memoryUsage)
  const memoryUnit = stats.memoryUsage.replace(/[\d.]/g, '')
  
  if (memoryUnit === 'MB' && memoryValue > 500) {
    recommendations.push("Penggunaan memory Redis tinggi (>500MB). Pertimbangkan untuk menambah memory atau mengoptimasi cache.")
  }
  
  if (!stats.connected) {
    recommendations.push("Redis tidak terkoneksi. Periksa koneksi Redis server.")
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Status cache optimal. Tidak ada rekomendasi perubahan.")
  }
  
  return recommendations
}