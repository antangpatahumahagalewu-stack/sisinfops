import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - allow admin, carbon_specialist, and program_planner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || !["admin", "carbon_specialist", "program_planner"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("project_id")
    const projectType = searchParams.get("type") || "perhutanan_sosial" // or "carbon_project"

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    let complianceData: Record<string, any> = {}
    let totalScore = 0
    let maxScore = 1300 // 13 points * 100 points each
    let missingFields: string[] = []
    let nextActions: string[] = []

    // ============================================
    // 1. ORGANIZATIONAL INFORMATION CHECK
    // ============================================
    const orgCheck = await checkOrganizationalInfo(supabase, projectId, projectType)
    complianceData["organizational_info"] = orgCheck
    totalScore += orgCheck.score
    if (orgCheck.status !== "complete") {
      missingFields.push("organizational_info")
      nextActions.push("Isi informasi organisasi pengusul proyek")
    }

    // ============================================
    // 2. LAND TENURE CHECK
    // ============================================
    const landTenureCheck = await checkLandTenure(supabase, projectId, projectType)
    complianceData["land_tenure"] = landTenureCheck
    totalScore += landTenureCheck.score
    if (landTenureCheck.status !== "complete") {
      missingFields.push("land_tenure")
      nextActions.push("Lengkapi data status kepemilikan lahan")
    }

    // ============================================
    // 3. FOREST STATUS HISTORY CHECK (10 years)
    // ============================================
    const forestStatusCheck = await checkForestStatusHistory(supabase, projectId, projectType)
    complianceData["forest_status_history"] = forestStatusCheck
    totalScore += forestStatusCheck.score
    if (forestStatusCheck.status !== "complete") {
      missingFields.push("forest_status_history")
      nextActions.push("Upload riwayat status hutan 10 tahun")
    }

    // ============================================
    // 4. DEFORESTATION DRIVERS CHECK
    // ============================================
    const deforestationCheck = await checkDeforestationDrivers(supabase, projectId, projectType)
    complianceData["deforestation_drivers"] = deforestationCheck
    totalScore += deforestationCheck.score
    if (deforestationCheck.status !== "complete") {
      missingFields.push("deforestation_drivers")
      nextActions.push("Identifikasi penyebab deforestasi")
    }

    // ============================================
    // 5. SOCIAL MODEL DETAILS CHECK
    // ============================================
    const socialModelCheck = await checkSocialModelDetails(supabase, projectId, projectType)
    complianceData["social_model_details"] = socialModelCheck
    totalScore += socialModelCheck.score
    if (socialModelCheck.status !== "complete") {
      missingFields.push("social_model_details")
      nextActions.push("Lengkapi detail model sosial komunitas")
    }

    // ============================================
    // 6. CARBON MODEL DETAILS CHECK
    // ============================================
    const carbonModelCheck = await checkCarbonModelDetails(supabase, projectId, projectType)
    complianceData["carbon_model_details"] = carbonModelCheck
    totalScore += carbonModelCheck.score
    if (carbonModelCheck.status !== "complete") {
      missingFields.push("carbon_model_details")
      nextActions.push("Isi detail teknis carbon model")
    }

    // ============================================
    // 7. FINANCIAL MODEL CHECK
    // ============================================
    const financialModelCheck = await checkFinancialModel(supabase, projectId, projectType)
    complianceData["financial_model"] = financialModelCheck
    totalScore += financialModelCheck.score
    if (financialModelCheck.status !== "complete") {
      missingFields.push("financial_model")
      nextActions.push("Lengkapi model finansial proyek")
    }

    // ============================================
    // 8. IMPLEMENTATION TIMELINE CHECK
    // ============================================
    const timelineCheck = await checkImplementationTimeline(supabase, projectId, projectType)
    complianceData["implementation_timeline"] = timelineCheck
    totalScore += timelineCheck.score
    if (timelineCheck.status !== "complete") {
      missingFields.push("implementation_timeline")
      nextActions.push("Buat timeline implementasi 10-30 tahun")
    }

    // ============================================
    // 9. KML FILE CHECK
    // ============================================
    const kmlCheck = await checkKMLFile(supabase, projectId, projectType)
    complianceData["kml_file"] = kmlCheck
    totalScore += kmlCheck.score
    if (kmlCheck.status !== "complete") {
      missingFields.push("kml_file")
      nextActions.push("Upload file KML batas proyek")
    }

    // ============================================
    // 10. INITIAL CARBON ESTIMATE CHECK
    // ============================================
    const carbonEstimateCheck = await checkCarbonEstimate(supabase, projectId, projectType)
    complianceData["carbon_estimate"] = carbonEstimateCheck
    totalScore += carbonEstimateCheck.score
    if (carbonEstimateCheck.status !== "complete") {
      missingFields.push("carbon_estimate")
      nextActions.push("Tambahkan estimasi karbon awal")
    }

    // ============================================
    // 11. VERIFICATION FREQUENCY CHECK
    // ============================================
    const verificationCheck = await checkVerificationFrequency(supabase, projectId, projectType)
    complianceData["verification_frequency"] = verificationCheck
    totalScore += verificationCheck.score
    if (verificationCheck.status !== "complete") {
      missingFields.push("verification_frequency")
      nextActions.push("Tentukan frekuensi verifikasi")
    }

    // ============================================
    // 12. ORGANIZATION LINK CHECK
    // ============================================
    const orgLinkCheck = await checkOrganizationLink(supabase, projectId, projectType)
    complianceData["organization_link"] = orgLinkCheck
    totalScore += orgLinkCheck.score
    if (orgLinkCheck.status !== "complete") {
      missingFields.push("organization_link")
      nextActions.push("Hubungkan proyek dengan organisasi")
    }

    // ============================================
    // 13. KML IN VERRA CHECK
    // ============================================
    const verraKmlCheck = await checkVerraKML(supabase, projectId, projectType)
    complianceData["verra_kml"] = verraKmlCheck
    totalScore += verraKmlCheck.score
    if (verraKmlCheck.status !== "complete") {
      missingFields.push("verra_kml")
      nextActions.push("Tambahkan KML di registrasi Verra")
    }

    // Calculate overall compliance score percentage
    const complianceScore = Math.round((totalScore / maxScore) * 100)

    return NextResponse.json({
      project_id: projectId,
      project_type: projectType,
      compliance_score: complianceScore,
      details: complianceData,
      missing_fields: missingFields,
      next_actions: nextActions,
      summary: getComplianceSummary(complianceScore)
    })

  } catch (error) {
    console.error("Compliance check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ============================================
// HELPER FUNCTIONS FOR EACH COMPLIANCE CHECK
// ============================================

async function checkOrganizationalInfo(supabase: any, projectId: string, projectType: string) {
  // Get organization linked to project
  let organizationId = null
  
  if (projectType === "perhutanan_sosial") {
    const { data: ps } = await supabase
      .from("perhutanan_sosial")
      .select("organization_id")
      .eq("id", projectId)
      .single()
    
    organizationId = ps?.organization_id
  } else if (projectType === "carbon_project") {
    const { data: cp } = await supabase
      .from("carbon_projects")
      .select("id")
      .eq("id", projectId)
      .single()
    
    // For carbon projects, we need to trace back to perhutanan_sosial
    // This is a simplified version - you might need more complex logic
    organizationId = null // Implement based on your schema
  }

  if (!organizationId) {
    return { status: "missing", score: 0, message: "No organization linked to project" }
  }

  // Check organization details
  const { data: org } = await supabase
    .from("organizations")
    .select("name, legal_form, technical_experience, years_of_operation")
    .eq("id", organizationId)
    .single()

  if (!org) {
    return { status: "missing", score: 0, message: "Organization not found" }
  }

  // Calculate completeness score
  let score = 0
  let maxScore = 100
  let completedFields = 0
  let totalFields = 4

  if (org.name) { completedFields++; score += 25 }
  if (org.legal_form) { completedFields++; score += 25 }
  if (org.technical_experience) { completedFields++; score += 25 }
  if (org.years_of_operation) { completedFields++; score += 25 }

  const status = completedFields === totalFields ? "complete" : 
                 completedFields > 0 ? "partial" : "missing"

  return {
    status,
    score,
    message: `Organization info: ${completedFields}/${totalFields} fields complete`,
    data: org
  }
}

async function checkLandTenure(supabase: any, projectId: string, projectType: string) {
  const { data: landTenure } = await supabase
    .from("land_tenure")
    .select("ownership_status, area_ha, land_certificate_number, challenges")
    .eq("perhutanan_sosial_id", projectId)
    .single()

  if (!landTenure) {
    return { status: "missing", score: 0, message: "Land tenure data not found" }
  }

  let score = 0
  let maxScore = 100
  let completedFields = 0
  let totalFields = 4

  if (landTenure.ownership_status) { completedFields++; score += 25 }
  if (landTenure.area_ha) { completedFields++; score += 25 }
  if (landTenure.land_certificate_number) { completedFields++; score += 25 }
  if (landTenure.challenges) { completedFields++; score += 25 }

  const status = completedFields === totalFields ? "complete" : 
                 completedFields > 0 ? "partial" : "missing"

  return {
    status,
    score,
    message: `Land tenure: ${completedFields}/${totalFields} fields complete`,
    data: landTenure
  }
}

async function checkForestStatusHistory(supabase: any, projectId: string, projectType: string) {
  const { data: forestHistory, count } = await supabase
    .from("forest_status_history")
    .select("*", { count: "exact" })
    .eq("perhutanan_sosial_id", projectId)

  if (!forestHistory || count === 0) {
    return { status: "missing", score: 0, message: "Forest status history not found" }
  }

  // Check if we have at least 10 years of data
  const has10Years = count >= 10
  const score = has10Years ? 100 : Math.round((count / 10) * 100)
  const status = has10Years ? "complete" : count > 0 ? "partial" : "missing"

  return {
    status,
    score,
    message: `Forest status: ${count} years of data (${has10Years ? '10+ years complete' : 'needs more years'})`,
    data: { years_count: count, has_10_years: has10Years }
  }
}

async function checkDeforestationDrivers(supabase: any, projectId: string, projectType: string) {
  const { data: drivers } = await supabase
    .from("deforestation_drivers")
    .select("driver_type, driver_description, intervention_activity")
    .eq("perhutanan_sosial_id", projectId)
    .single()

  if (!drivers) {
    return { status: "missing", score: 0, message: "Deforestation drivers not identified" }
  }

  let score = 0
  let completedFields = 0
  let totalFields = 3

  if (drivers.driver_type) { completedFields++; score += 33 }
  if (drivers.driver_description) { completedFields++; score += 34 }
  if (drivers.intervention_activity) { completedFields++; score += 33 }

  const status = completedFields === totalFields ? "complete" : 
                 completedFields > 0 ? "partial" : "missing"

  return {
    status,
    score,
    message: `Deforestation drivers: ${completedFields}/${totalFields} fields complete`,
    data: drivers
  }
}

async function checkSocialModelDetails(supabase: any, projectId: string, projectType: string) {
  const { data: socialModel } = await supabase
    .from("social_model_details")
    .select("direct_beneficiaries_count, households_count, social_profile, community_role_in_project")
    .eq("perhutanan_sosial_id", projectId)
    .single()

  if (!socialModel) {
    return { status: "missing", score: 0, message: "Social model details not found" }
  }

  let score = 0
  let completedFields = 0
  let totalFields = 4

  if (socialModel.direct_beneficiaries_count) { completedFields++; score += 25 }
  if (socialModel.households_count) { completedFields++; score += 25 }
  if (socialModel.social_profile) { completedFields++; score += 25 }
  if (socialModel.community_role_in_project) { completedFields++; score += 25 }

  const status = completedFields === totalFields ? "complete" : 
                 completedFields > 0 ? "partial" : "missing"

  return {
    status,
    score,
    message: `Social model: ${completedFields}/${totalFields} fields complete`,
    data: socialModel
  }
}

async function checkCarbonModelDetails(supabase: any, projectId: string, projectType: string) {
  // For carbon projects, check carbon_model_details
  if (projectType === "carbon_project") {
    const { data: carbonModel } = await supabase
      .from("carbon_model_details")
      .select("model_type, planting_density_per_ha, species_composition")
      .eq("carbon_project_id", projectId)
      .single()

    if (!carbonModel) {
      return { status: "missing", score: 0, message: "Carbon model details not found" }
    }

    let score = 0
    let completedFields = 0
    let totalFields = 3

    if (carbonModel.model_type) { completedFields++; score += 34 }
    if (carbonModel.planting_density_per_ha) { completedFields++; score += 33 }
    if (carbonModel.species_composition) { completedFields++; score += 33 }

    const status = completedFields === totalFields ? "complete" : 
                   completedFields > 0 ? "partial" : "missing"

    return {
      status,
      score,
      message: `Carbon model: ${completedFields}/${totalFields} fields complete`,
      data: carbonModel
    }
  }

  // For perhutanan sosial projects, we might not have direct carbon model
  return { status: "not_applicable", score: 100, message: "Carbon model not required for this project type" }
}

async function checkFinancialModel(supabase: any, projectId: string, projectType: string) {
  // For carbon projects, check financial_model
  if (projectType === "carbon_project") {
    const { data: financialModel } = await supabase
      .from("financial_model")
      .select("total_project_cost, funding_sources, financing_plan")
      .eq("carbon_project_id", projectId)
      .single()

    if (!financialModel) {
      return { status: "missing", score: 0, message: "Financial model not found" }
    }

    let score = 0
    let completedFields = 0
    let totalFields = 3

    if (financialModel.total_project_cost) { completedFields++; score += 34 }
    if (financialModel.funding_sources) { completedFields++; score += 33 }
    if (financialModel.financing_plan) { completedFields++; score += 33 }

    const status = completedFields === totalFields ? "complete" : 
                   completedFields > 0 ? "partial" : "missing"

    return {
      status,
      score,
      message: `Financial model: ${completedFields}/${totalFields} fields complete`,
      data: financialModel
    }
  }

  return { status: "not_applicable", score: 100, message: "Financial model not required for this project type" }
}

async function checkImplementationTimeline(supabase: any, projectId: string, projectType: string) {
  // For carbon projects, check implementation_timeline
  if (projectType === "carbon_project") {
    const { data: timeline, count } = await supabase
      .from("implementation_timeline")
      .select("*", { count: "exact" })
      .eq("carbon_project_id", projectId)

    if (!timeline || count === 0) {
      return { status: "missing", score: 0, message: "Implementation timeline not found" }
    }

    // Check if we have at least 10 years of timeline
    const has10Years = count >= 10
    const score = has10Years ? 100 : Math.round((count / 10) * 100)
    const status = has10Years ? "complete" : count > 0 ? "partial" : "missing"

    return {
      status,
      score,
      message: `Implementation timeline: ${count} years planned (${has10Years ? '10+ years complete' : 'needs more years'})`,
      data: { years_count: count, has_10_years: has10Years }
    }
  }

  return { status: "not_applicable", score: 100, message: "Implementation timeline not required for this project type" }
}

async function checkKMLFile(supabase: any, projectId: string, projectType: string) {
  // Check project_documents for KML files
  const { data: kmlFiles } = await supabase
    .from("project_documents")
    .select("file_url, file_name")
    .eq("carbon_project_id", projectId)
    .eq("document_type", "KML")

  if (!kmlFiles || kmlFiles.length === 0) {
    return { status: "missing", score: 0, message: "KML file not uploaded" }
  }

  return {
    status: "complete",
    score: 100,
    message: `KML file found: ${kmlFiles[0].file_name}`,
    data: kmlFiles[0]
  }
}

async function checkCarbonEstimate(supabase: any, projectId: string, projectType: string) {
  // For carbon projects, check initial_estimate_tco2e
  if (projectType === "carbon_project") {
    const { data: carbonProject } = await supabase
      .from("carbon_projects")
      .select("initial_estimate_tco2e")
      .eq("id", projectId)
      .single()

    if (!carbonProject || !carbonProject.initial_estimate_tco2e) {
      return { status: "missing", score: 0, message: "Initial carbon estimate not set" }
    }

    return {
      status: "complete",
      score: 100,
      message: `Initial carbon estimate: ${carbonProject.initial_estimate_tco2e} tCO₂e`,
      data: carbonProject
    }
  }

  return { status: "not_applicable", score: 100, message: "Carbon estimate not required for this project type" }
}

async function checkVerificationFrequency(supabase: any, projectId: string, projectType: string) {
  // For carbon projects, check verification_frequency
  if (projectType === "carbon_project") {
    const { data: carbonProject } = await supabase
      .from("carbon_projects")
      .select("verification_frequency")
      .eq("id", projectId)
      .single()

    if (!carbonProject || !carbonProject.verification_frequency) {
      return { status: "missing", score: 0, message: "Verification frequency not set" }
    }

    return {
      status: "complete",
      score: 100,
      message: `Verification frequency: every ${carbonProject.verification_frequency} years`,
      data: carbonProject
    }
  }

  return { status: "not_applicable", score: 100, message: "Verification frequency not required for this project type" }
}

async function checkOrganizationLink(supabase: any, projectId: string, projectType: string) {
  // Check if project is linked to an organization
  if (projectType === "perhutanan_sosial") {
    const { data: ps } = await supabase
      .from("perhutanan_sosial")
      .select("organization_id")
      .eq("id", projectId)
      .single()

    if (!ps || !ps.organization_id) {
      return { status: "missing", score: 0, message: "Project not linked to an organization" }
    }

    return {
      status: "complete",
      score: 100,
      message: "Project linked to organization",
      data: ps
    }
  }

  return { status: "not_applicable", score: 100, message: "Organization link not required for this project type" }
}

async function checkVerraKML(supabase: any, projectId: string, projectType: string) {
  // For carbon projects, check verra_project_registrations for KML
  if (projectType === "carbon_project") {
    const { data: verraRegistration } = await supabase
      .from("verra_project_registrations")
      .select("kml_file_url, kml_file_name")
      .eq("carbon_project_id", projectId)
      .single()

    if (!verraRegistration || !verraRegistration.kml_file_url) {
      return { status: "missing", score: 0, message: "KML not uploaded to Verra registration" }
    }

    return {
      status: "complete",
      score: 100,
      message: `KML uploaded to Verra: ${verraRegistration.kml_file_name}`,
      data: verraRegistration
    }
  }

  return { status: "not_applicable", score: 100, message: "Verra KML not required for this project type" }
}

function getComplianceSummary(score: number) {
  if (score >= 90) {
    return {
      level: "EXCELLENT",
      description: "Project is highly compliant with ClimateBaseline Protocol requirements",
      recommendation: "Ready for submission to ClimateBaseline Protocol"
    }
  } else if (score >= 70) {
    return {
      level: "GOOD",
      description: "Project is mostly compliant but needs minor improvements",
      recommendation: "Complete the missing fields before submission"
    }
  } else if (score >= 50) {
    return {
      level: "FAIR",
      description: "Project has significant compliance gaps",
      recommendation: "Address the major missing sections"
    }
  } else {
    return {
      level: "POOR",
      description: "Project lacks most required compliance data",
      recommendation: "Start filling in the compliance data from the beginning"
    }
  }
}
