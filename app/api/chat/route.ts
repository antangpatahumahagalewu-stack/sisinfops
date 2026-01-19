import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// System prompts in 3 languages
const SYSTEM_PROMPTS = {
  'id': `Kamu adalah asisten AI untuk Sistem Informasi Perhutanan Sosial & PKS Yayasan Antangpatahu Mahaga Lewu.

ATURAN KETAT:
1. HANYA jawab pertanyaan terkait data dan sistem Perhutanan Sosial dalam aplikasi ini
2. JANGAN pernah memberikan informasi di luar data yang tersedia dalam database
3. Jika tidak tahu jawabannya, katakan "Saya tidak memiliki data tersebut" BUKAN membuat-buat
4. Semua respons HARUS berdasarkan data statistik terkini yang diberikan dalam konteks
5. Gunakan bahasa Indonesia yang sopan dan profesional

DATA STATISTIK TERKINI:
Kamu akan diberikan data statistik terkini dari database. Gunakan data tersebut untuk menjawab pertanyaan.

JIKA PERTANYAAN TENTANG STATISTIK:
- Gunakan angka yang diberikan dalam konteks
- Jangan mengarang angka atau data
- Jika data tidak ada dalam konteks, katakan "Data tersebut tidak tersedia"

FORMAT RESPONS:
- Gunakan format yang mudah di-copy-paste (plain text dengan markdown sederhana)
- Sertakan referensi bahwa data berasal dari database sistem
- Gunakan angka dengan format yang jelas (contoh: 1,234 bukan 1234)
- Jika data tidak lengkap, beri catatan
- Prioritaskan keakuratan di atas kelengkapan
- Gunakan bullet points (-) untuk daftar
- Gunakan heading (##) untuk section
- Hindari emoji yang berlebihan`,

  'en': `You are an AI assistant for the Social Forestry Information System & PKS of Yayasan Antangpatahu Mahaga Lewu.

STRICT RULES:
1. ONLY answer questions related to Social Forestry data and systems within this application
2. NEVER provide information outside the available database data
3. If you don't know the answer, say "I don't have that data" DO NOT make up information
4. All responses MUST be based on the current statistics provided in the context
5. Use polite and professional English

CURRENT STATISTICS:
You will be given current statistics from the database. Use this data to answer questions.

IF QUESTIONS ABOUT STATISTICS:
- Use the numbers provided in the context
- Do not invent numbers or data
- If data is not in the context, say "That data is not available"

RESPONSE FORMAT:
- Use copy-paste friendly format (plain text with simple markdown)
- Include reference that data comes from the system database
- Use clear number formatting (example: 1,234 not 1234)
- If data is incomplete, add a note
- Prioritize accuracy over completeness
- Use bullet points (-) for lists
- Use heading (##) for sections
- Avoid excessive emojis`,

  'zh-TW': `你是 Antangpatahu Mahaga Lewu 基金會社會林業信息系統的 AI 助手。

嚴格規則：
1. 僅回答與此應用程序內的社會林業數據和系統相關的問題
2. 絕不提供數據庫數據之外的資訊
3. 如果您不知道答案，請說「我沒有該數據」，不要編造資訊
4. 所有回答必須基於上下文提供的當前統計數據
5. 使用禮貌且專業的中文

當前統計數據：
您將獲得數據庫中的當前統計數據。使用此數據回答問題。

如果問題涉及統計數據：
- 使用上下文中提供的數字
- 不要發明數字或數據
- 如果上下文中沒有數據，請說「該數據不可用」

回應格式：
- 使用易於複製粘貼的格式（純文本帶簡單標記）
- 包括數據來自系統數據庫的參考
- 使用清晰的數字格式（例如：1,234 而不是 1234）
- 如果數據不完整，請添加註釋
- 優先考慮準確性而非完整性
- 使用項目符號 (-) 用於列表
- 使用標題 (##) 用於部分
- 避免過多的表情符號`
}

// Carbon audit system prompts (development mode only)
const CARBON_AUDIT_PROMPTS = {
  'id': `Kamu adalah AI Auditor untuk fitur Carbon Project dalam Sistem Informasi Perhutanan Sosial.

KONTEKS DEVELOPMENT:
- Mode: ${process.env.NODE_ENV === 'development' ? 'Development' : 'Production'}
- Fitur audit HANYA tersedia dalam development mode (NODE_ENV=development)

TUGAS UTAMA:
1. Analisis kelengkapan fitur Carbon Project berdasarkan struktur database
2. Evaluasi implementasi modul: Carbon Projects, DRAM, Aksi Mitigasi, Kegiatan, Monitoring, Stakeholders, Legal, Pemberdayaan Ekonomi
3. Berikan rekomendasi pengembangan berdasarkan best practices

FORMAT LAPORAN:
- Gunakan format yang mudah di-copy-paste (plain text dengan markdown sederhana)
- Sertakan skor keseluruhan (0-100)
- Prioritaskan rekomendasi: HIGH, MEDIUM, LOW
- Fokus pada fitur carbon-specific
- Gunakan bullet points (-) untuk daftar
- Gunakan heading (##) untuk section
- Hindari emoji yang berlebihan
- Format angka dengan pemisah ribuan (1,234 bukan 1234)

CATATAN KEAMANAN:
- Hanya berikan analisis dalam development mode
- Jangan akses atau ekspos data sensitif`,

  'en': `You are an AI Auditor for Carbon Project features in the Social Forestry Information System.

DEVELOPMENT CONTEXT:
- Mode: ${process.env.NODE_ENV === 'development' ? 'Development' : 'Production'}
- Audit features are ONLY available in development mode (NODE_ENV=development)

MAIN TASKS:
1. Analyze completeness of Carbon Project features based on database structure
2. Evaluate implementation of modules: Carbon Projects, DRAM, Mitigation Actions, Activities, Monitoring, Stakeholders, Legal, Economic Empowerment
3. Provide development recommendations based on best practices

REPORT FORMAT:
- Use copy-paste friendly format (plain text with simple markdown)
- Include overall score (0-100)
- Prioritize recommendations: HIGH, MEDIUM, LOW
- Focus on carbon-specific features
- Use bullet points (-) for lists
- Use heading (##) for sections
- Avoid excessive emojis
- Format numbers with thousand separators (1,234 not 1234)

SECURITY NOTES:
- Only provide analysis in development mode
- Do not access or expose sensitive data`,

  'zh-TW': `你是社會林業信息系統中碳項目功能的 AI 審計員。

開發上下文：
- 模式：${process.env.NODE_ENV === 'development' ? '開發' : '生產'}
- 審計功能僅在開發模式下可用 (NODE_ENV=development)

主要任務：
1. 根據數據庫結構分析碳項目功能的完整性
2. 評估模塊實施：碳項目、DRAM、緩解行動、活動、監測、利益相關者、法律、經濟賦權
3. 根據最佳實踐提供開發建議

報告格式：
- 使用易於複製粘貼的格式（純文本帶簡單標記）
- 包括總分（0-100）
- 優先考慮建議：高、中、低
- 專注於碳特定功能
- 使用項目符號 (-) 用於列表
- 使用標題 (##) 用於部分
- 避免過多的表情符號
- 格式化數字帶千位分隔符（1,234 而不是 1234）

安全注意事項：
- 僅在開發模式下提供分析
- 請勿訪問或暴露敏感數據`
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    // Get user's profile for role-based access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, preferred_language")
      .eq("id", user.id)
      .single()

    const userRole = profile?.role || "viewer"
    const preferredLanguage = profile?.preferred_language || "id"

    // Parse request body
    const body = await request.json()
    const { message, language = preferredLanguage } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      )
    }

    // Validate language
    const validLanguage = ['id', 'en', 'zh-TW'].includes(language) ? language : 'id'
    
    // Check if this is a carbon audit request (development mode only)
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isCarbonAuditRequest = message.toLowerCase().includes('audit carbon') || 
                                 message.toLowerCase().includes('carbon audit') ||
                                 message.toLowerCase().includes('evaluate carbon') ||
                                 message.toLowerCase().includes('carbon feature')
    
    let systemPrompt = SYSTEM_PROMPTS[validLanguage as keyof typeof SYSTEM_PROMPTS]

    // Get database schema info for context
    const { data: tableInfo } = await supabase
      .from("information_schema.tables")
      .select("table_name, table_type")
      .eq("table_schema", "public")
      .order("table_name")

    const tableNames = tableInfo?.map(t => t.table_name).filter(name => 
      !name.startsWith("_") && name !== "information_schema"
    ) || []

    // Get actual data statistics for context (EXACT same queries as dashboard)
    let dataContext = ""
    
    // If carbon audit request and in development mode, use carbon audit analysis
    if (isCarbonAuditRequest && isDevelopment) {
      systemPrompt = CARBON_AUDIT_PROMPTS[validLanguage as keyof typeof CARBON_AUDIT_PROMPTS]
      dataContext = await performCarbonAudit(supabase, validLanguage, tableNames)
    } else if (isCarbonAuditRequest && !isDevelopment) {
      // Carbon audit requested but not in development mode
      systemPrompt = CARBON_AUDIT_PROMPTS[validLanguage as keyof typeof CARBON_AUDIT_PROMPTS]
      dataContext = getDevelopmentModeRequiredMessage(validLanguage)
    } else {
      // Normal data context (non-audit request)
      try {
        // Get dashboard statistics - EXACT same queries as app/[locale]/dashboard/page.tsx
        const { data: psData } = await supabase
          .from("perhutanan_sosial")
          .select("id, kabupaten_id, luas_ha, rkps_status, peta_status, jumlah_kk")

        const { data: kabupatenData } = await supabase
          .from("kabupaten")
          .select("id, nama")

        const { data: carbonProjects } = await supabase
          .from("carbon_projects")
          .select("id, status, luas_total_ha, initial_estimate_tco2e")

        // Calculate statistics - EXACT same calculations as dashboard
        const totalPS = psData?.length || 0
        const totalLuas = psData?.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0) || 0
        const totalRKPSAda = psData?.filter(ps => ps.rkps_status === 'ada').length || 0
        const totalPetaAda = psData?.filter(ps => ps.peta_status === 'ada').length || 0
        const totalKK = psData?.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0) || 0
        
        // Carbon projects stats - EXACT same as dashboard
        const totalCarbonProjects = carbonProjects?.length || 0
        const totalLuasCarbon = carbonProjects?.reduce((sum, cp) => sum + (cp.luas_total_ha || 0), 0) || 0
        const totalCO2Estimate = carbonProjects?.reduce((sum, cp) => sum + (cp.initial_estimate_tco2e || 0), 0) || 0
        const activeCarbonProjects = carbonProjects?.filter(cp => cp.status === 'active').length || 0
        
        // Calculate compliance rate (projects with initial estimate) - EXACT same as dashboard
        const compliantCarbonProjects = carbonProjects?.filter(cp => cp.initial_estimate_tco2e && cp.luas_total_ha).length || 0
        const complianceRate = totalCarbonProjects > 0 ? Math.round((compliantCarbonProjects / totalCarbonProjects) * 100) : 0

        // Calculate by kabupaten - EXACT same as dashboard
        const kabupatenStats = kabupatenData?.map(kab => {
          const psInKab = psData?.filter(ps => ps.kabupaten_id === kab.id) || []
          return {
            nama: kab.nama,
            jumlah_ps: psInKab.length,
            luas_ha: psInKab.reduce((sum, ps) => sum + (ps.luas_ha || 0), 0),
            rkps_ada: psInKab.filter(ps => ps.rkps_status === 'ada').length,
            peta_ada: psInKab.filter(ps => ps.peta_status === 'ada').length,
            jumlah_kk: psInKab.reduce((sum, ps) => sum + (ps.jumlah_kk || 0), 0),
          }
        }) || []

        // Generate data context in the appropriate language
        dataContext = generateDataContext(validLanguage, {
          totalPS,
          totalLuas,
          totalRKPSAda,
          totalPetaAda,
          totalKK,
          totalCarbonProjects,
          activeCarbonProjects,
          totalLuasCarbon,
          totalCO2Estimate,
          complianceRate,
          compliantCarbonProjects,
          kabupatenStats,
          tableNames
        })
      } catch (error) {
        console.error("Failed to fetch actual data for context:", error)
        dataContext = generateErrorContext(validLanguage, tableNames)
      }
    }

    // Prepare context about available data
    const databaseContext = `${dataContext}

USER CONTEXT:
- User ID: ${user.id}
- User Role: ${userRole}
- Language: ${validLanguage}

CURRENT QUERY: "${message}"
`

    // Initialize DeepSeek client
    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1"
    })

    // Call DeepSeek API
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt + databaseContext
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.1, // Low temperature for factual responses
      max_tokens: 1000,
      stream: false
    })

    const responseText = completion.choices[0]?.message?.content || "No response generated."

    // Try to log the interaction for auditing, but don't fail if table doesn't exist
    try {
      await supabase.from("chat_logs").insert({
        user_id: user.id,
        user_role: userRole,
        language: validLanguage,
        user_message: message,
        ai_response: responseText,
        tokens_used: completion.usage?.total_tokens || 0
      })
    } catch (err) {
      console.warn("Failed to log chat interaction (table may not exist yet):", (err as Error).message || err)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      language: validLanguage,
      tokens_used: completion.usage?.total_tokens || 0
    })

  } catch (error) {
    console.error("Chat API error:", error)
    
    // Check if it's an OpenAI/DeepSeek API error
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { 
          error: "AI service error", 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Carbon audit helper functions (development mode only)

interface CarbonTableInfo {
  table_name: string;
  exists: boolean;
  row_count: number;
  columns: string[];
}

async function performCarbonAudit(supabase: any, language: string, tableNames: string[]): Promise<string> {
  try {
    // Define carbon-related tables from the migration
    const carbonTables = [
      'carbon_projects',
      'programs',
      'dram',
      'aksi_mitigasi',
      'kegiatan_dram',
      'monitoring_evaluasi',
      'stakeholders',
      'legal_documents',
      'pemberdayaan_ekonomi',
      'role_permissions'
    ];
    
    const tableInfo: CarbonTableInfo[] = [];
    
    // Check each carbon table
    for (const tableName of carbonTables) {
      try {
        // Check if table exists
        const { data: tableCheck } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .single();
        
        const exists = !!tableCheck;
        let rowCount = 0;
        let columns: string[] = [];
        
        if (exists) {
          // Get row count
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          rowCount = count || 0;
          
          // Get column names
          const { data: columnData } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .order('column_name');
          
          columns = columnData?.map((col: any) => col.column_name) || [];
        }
        
        tableInfo.push({
          table_name: tableName,
          exists,
          row_count: rowCount,
          columns
        });
      } catch (error) {
        console.warn(`Error checking table ${tableName}:`, error);
        tableInfo.push({
          table_name: tableName,
          exists: false,
          row_count: 0,
          columns: []
        });
      }
    }
    
    // Calculate scores
    const existingTables = tableInfo.filter(t => t.exists).length;
    const totalTables = carbonTables.length;
    const tablesWithData = tableInfo.filter(t => t.exists && t.row_count > 0).length;
    const overallScore = Math.round((existingTables / totalTables) * 100);
    
    // Generate report based on language
    switch (language) {
      case 'en':
        return `## Carbon Project Feature Audit (Development Mode)

**Audit Time**: ${new Date().toLocaleString()}
**Environment**: NODE_ENV=${process.env.NODE_ENV}

### Database Structure Analysis
- **Total Carbon Tables**: ${totalTables}
- **Tables Implemented**: ${existingTables}/${totalTables} (${Math.round((existingTables / totalTables) * 100)}%)
- **Tables with Data**: ${tablesWithData}/${existingTables} (${existingTables > 0 ? Math.round((tablesWithData / existingTables) * 100) : 0}%)

### Table Details
${tableInfo.map(t => 
  `- **${t.table_name}**: ${t.exists ? 'EXISTS' : 'MISSING'} | Rows: ${t.row_count} | Columns: ${t.columns.length}`
).join('\n')}

### Audit Score: ${overallScore}/100

### Recommendations
${existingTables < totalTables ? `1. **HIGH**: Create missing tables (${totalTables - existingTables} tables missing)` : '1. ✅ All carbon tables exist'}
${tablesWithData < existingTables ? `2. **MEDIUM**: Add sample data to empty tables (${existingTables - tablesWithData} tables empty)` : '2. ✅ All tables have data'}
3. **LOW**: Verify foreign key relationships and RLS policies

**Note**: This audit is for development purposes only.`;

      case 'zh-TW':
        return `## 碳項目功能審計（開發模式）

**審計時間**：${new Date().toLocaleString()}
**環境**：NODE_ENV=${process.env.NODE_ENV}

### 數據庫結構分析
- **總碳表格**：${totalTables}
- **已實現表格**：${existingTables}/${totalTables} (${Math.round((existingTables / totalTables) * 100)}%)
- **有數據的表格**：${tablesWithData}/${existingTables} (${existingTables > 0 ? Math.round((tablesWithData / existingTables) * 100) : 0}%)

### 表格詳情
${tableInfo.map(t => 
  `- **${t.table_name}**：${t.exists ? '存在' : '缺失'} | 行數：${t.row_count} | 列數：${t.columns.length}`
).join('\n')}

### 審計分數：${overallScore}/100

### 建議
${existingTables < totalTables ? `1. **高**：創建缺失的表格（缺失 ${totalTables - existingTables} 個表格）` : '1. ✅ 所有碳表格都存在'}
${tablesWithData < existingTables ? `2. **中**：向空表格添加樣本數據（${existingTables - tablesWithData} 個表格為空）` : '2. ✅ 所有表格都有數據'}
3. **低**：驗證外鍵關係和 RLS 策略

**注意**：此審計僅用於開發目的。`;

      default: // Indonesian
        return `## Audit Fitur Carbon Project (Mode Development)

**Waktu Audit**: ${new Date().toLocaleString()}
**Environment**: NODE_ENV=${process.env.NODE_ENV}

### Analisis Struktur Database
- **Total Tabel Carbon**: ${totalTables}
- **Tabel Terimplementasi**: ${existingTables}/${totalTables} (${Math.round((existingTables / totalTables) * 100)}%)
- **Tabel dengan Data**: ${tablesWithData}/${existingTables} (${existingTables > 0 ? Math.round((tablesWithData / existingTables) * 100) : 0}%)

### Detail Tabel
${tableInfo.map(t => 
  `- **${t.table_name}**: ${t.exists ? 'ADA' : 'TIDAK ADA'} | Baris: ${t.row_count} | Kolom: ${t.columns.length}`
).join('\n')}

### Skor Audit: ${overallScore}/100

### Rekomendasi
${existingTables < totalTables ? `1. **TINGGI**: Buat tabel yang hilang (${totalTables - existingTables} tabel hilang)` : '1. ✅ Semua tabel carbon ada'}
${tablesWithData < existingTables ? `2. **SEDANG**: Tambahkan data sample ke tabel kosong (${existingTables - tablesWithData} tabel kosong)` : '2. ✅ Semua tabel memiliki data'}
3. **RENDAH**: Verifikasi relasi foreign key dan kebijakan RLS

**Catatan**: Audit ini hanya untuk keperluan development.`;
    }
  } catch (error) {
    console.error('Carbon audit error:', error);
    return `Error performing carbon audit: ${(error as Error).message}`;
  }
}

function getDevelopmentModeRequiredMessage(language: string): string {
  switch (language) {
    case 'en':
      return `## Development Mode Required

Carbon audit features are **ONLY** available in development mode.

**Current Environment**: NODE_ENV=${process.env.NODE_ENV}

**To use carbon audit**:
1. Set NODE_ENV=development
2. Restart the development server
3. Run the audit again

**Note**: This restriction is for security and data protection.`;

    case 'zh-TW':
      return `## 需要開發模式

碳審計功能**僅**在開發模式下可用。

**當前環境**：NODE_ENV=${process.env.NODE_ENV}

**要使用碳審計**：
1. 設置 NODE_ENV=development
2. 重新啟動開發服務器
3. 再次運行審計

**注意**：此限制是為了安全和數據保護。`;

    default: // Indonesian
      return `## Mode Development Diperlukan

Fitur audit carbon **HANYA** tersedia dalam mode development.

**Environment Saat Ini**: NODE_ENV=${process.env.NODE_ENV}

**Untuk menggunakan audit carbon**:
1. Set NODE_ENV=development
2. Restart server development
3. Jalankan audit lagi

**Catatan**: Restriksi ini untuk keamanan dan perlindungan data.`;
  }
}

// Helper functions for multilingual data context

interface KabupatenStat {
  nama: string;
  jumlah_ps: number;
  luas_ha: number;
  rkps_ada: number;
  peta_ada: number;
  jumlah_kk: number;
}

function generateDataContext(language: string, data: any): string {
  const {
    totalPS,
    totalLuas,
    totalRKPSAda,
    totalPetaAda,
    totalKK,
    totalCarbonProjects,
    activeCarbonProjects,
    totalLuasCarbon,
    totalCO2Estimate,
    complianceRate,
    compliantCarbonProjects,
    kabupatenStats,
    tableNames
  } = data

  switch (language) {
    case 'en':
      return `
CURRENT STATISTICS (SAME AS DASHBOARD):
- Total Social Forestry (PS): ${totalPS} units
- Total Land Area: ${totalLuas.toLocaleString('id-ID')} hectares
- Total Household Heads (KK): ${totalKK.toLocaleString('id-ID')} KK
- RKPS Available: ${totalRKPSAda} of ${totalPS} PS (${totalPS > 0 ? Math.round((totalRKPSAda / totalPS) * 100) : 0}% complete)
- Maps Available: ${totalPetaAda} of ${totalPS} PS (${totalPS > 0 ? Math.round((totalPetaAda / totalPS) * 100) : 0}% complete)
- Total Carbon Projects: ${totalCarbonProjects} projects
- Active Carbon Projects: ${activeCarbonProjects} projects
- Total Carbon Project Area: ${totalLuasCarbon.toLocaleString('id-ID')} hectares
- Total CO₂ Estimate: ${totalCO2Estimate.toLocaleString('id-ID')} tons CO₂e
- Compliance Rate: ${complianceRate}% (${compliantCarbonProjects} of ${totalCarbonProjects} projects)

DATA BY REGENCY (SAME AS DASHBOARD):
${kabupatenStats.map((kab: KabupatenStat) => `- ${kab.nama.replace('KABUPATEN ', '')}: ${kab.jumlah_ps} PS, ${kab.luas_ha.toLocaleString('id-ID')} ha, ${kab.jumlah_kk.toLocaleString('id-ID')} KK, RKPS: ${kab.rkps_ada}/${kab.jumlah_ps}, Maps: ${kab.peta_ada}/${kab.jumlah_ps}`).join('\n')}

IMPORTANT NOTES:
- This data is sourced from the integrated system database which is updated periodically
- These numbers should match those displayed on the dashboard
- Any differences may be due to caching or query timing
`
    
    case 'zh-TW':
      return `
當前統計數據（與儀表板相同）：
- 社會林業總數（PS）：${totalPS} 單位
- 總土地面積：${totalLuas.toLocaleString('id-ID')} 公頃
- 總戶長數（KK）：${totalKK.toLocaleString('id-ID')} KK
- RKPS 可用：${totalRKPSAda} / ${totalPS} PS（${totalPS > 0 ? Math.round((totalRKPSAda / totalPS) * 100) : 0}% 完成）
- 地圖可用：${totalPetaAda} / ${totalPS} PS（${totalPS > 0 ? Math.round((totalPetaAda / totalPS) * 100) : 0}% 完成）
- 碳項目總數：${totalCarbonProjects} 項目
- 活躍碳項目：${activeCarbonProjects} 項目
- 碳項目總面積：${totalLuasCarbon.toLocaleString('id-ID')} 公頃
- 總 CO₂ 估計：${totalCO2Estimate.toLocaleString('id-ID')} 噸 CO₂e
- 合規率：${complianceRate}%（${compliantCarbonProjects} / ${totalCarbonProjects} 項目）

按縣區數據（與儀表板相同）：
${kabupatenStats.map((kab: KabupatenStat) => `- ${kab.nama.replace('KABUPATEN ', '')}：${kab.jumlah_ps} PS，${kab.luas_ha.toLocaleString('id-ID')} 公頃，${kab.jumlah_kk.toLocaleString('id-ID')} KK，RKPS：${kab.rkps_ada}/${kab.jumlah_ps}，地圖：${kab.peta_ada}/${kab.jumlah_ps}`).join('\n')}

重要說明：
- 此數據源自定期更新的集成系統數據庫
- 這些數字應與儀表板上顯示的數字匹配
- 任何差異可能由於緩存或查詢時間造成
`
    
    default: // Indonesian
      return `
AKTUAL DATA STATISTIK TERBARU (SAMA DENGAN DASHBOARD):
- Total Perhutanan Sosial (PS): ${totalPS} unit
- Total Luas Lahan: ${totalLuas.toLocaleString('id-ID')} hektar
- Total Kepala Keluarga (KK): ${totalKK.toLocaleString('id-ID')} KK
- RKPS Tersedia: ${totalRKPSAda} dari ${totalPS} PS (${totalPS > 0 ? Math.round((totalRKPSAda / totalPS) * 100) : 0}% complete)
- Peta Tersedia: ${totalPetaAda} dari ${totalPS} PS (${totalPS > 0 ? Math.round((totalPetaAda / totalPS) * 100) : 0}% complete)
- Total Proyek Karbon: ${totalCarbonProjects} proyek
- Proyek Karbon Aktif: ${activeCarbonProjects} proyek
- Total Luas Proyek Karbon: ${totalLuasCarbon.toLocaleString('id-ID')} hektar
- Estimasi Total CO₂: ${totalCO2Estimate.toLocaleString('id-ID')} ton CO₂e
- Compliance Rate: ${complianceRate}% (${compliantCarbonProjects} dari ${totalCarbonProjects} projects)

DATA PER KABUPATEN (SAMA DENGAN DASHBOARD):
${kabupatenStats.map((kab: KabupatenStat) => `- ${kab.nama.replace('KABUPATEN ', '')}: ${kab.jumlah_ps} PS, ${kab.luas_ha.toLocaleString('id-ID')} ha, ${kab.jumlah_kk.toLocaleString('id-ID')} KK, RKPS: ${kab.rkps_ada}/${kab.jumlah_ps}, Peta: ${kab.peta_ada}/${kab.jumlah_ps}`).join('\n')}

CATATAN PENTING:
- Data bersumber dari database sistem yang terintegrasi dan diperbarui secara berkala
- Angka-angka ini harus cocok dengan yang ditampilkan di dashboard
- Jika ada perbedaan, mungkin karena sinkronisasi data atau waktu query yang berbeda
`
  }
}

function generateErrorContext(language: string, tableNames: string[]): string {
  switch (language) {
    case 'en':
      return `
DATABASE SCHEMA INFORMATION:
Available tables: ${tableNames.join(", ")}

ERROR: Unable to fetch current statistics from the database.`
    
    case 'zh-TW':
      return `
數據庫架構信息：
可用表格：${tableNames.join(", ")}

錯誤：無法從數據庫獲取當前統計數據。`
    
    default: // Indonesian
      return `
DATABASE SCHEMA INFORMATION:
Available tables: ${tableNames.join(", ")}

ERROR: Tidak dapat mengambil data statistik terkini dari database.`
  }
}
// Optional: GET endpoint to fetch chat history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    // Try to get chat history, but return empty array if table doesn't exist
    try {
      const { data: chatHistory } = await supabase
        .from("chat_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit)

      return NextResponse.json({
        success: true,
        history: chatHistory || []
      })
    } catch (err) {
      console.warn("Failed to fetch chat history (table may not exist yet):", (err as Error).message || err)
      return NextResponse.json({
        success: true,
        history: []
      })
    }

  } catch (error) {
    console.error("Chat history fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
