import { NextRequest, NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

// Mapping dari ID numerik di URL ke UUID di database
const PROJECT_ID_MAPPING: Record<string, string> = {
  "1": "17a97b56-a525-4c65-b627-2e1e9e3ce343", // Pulang Pisau
  "2": "db56f3d7-60c8-42a6-aff1-2220b51b32de", // Gunung Mas  
  "3": "61f9898e-224a-4841-9cd3-102f8c387943", // Kapuas
  "4": "a71ef98b-4213-41cc-8616-f450aae8889d", // Katingan
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; locale: string }> }
) {
  try {
    const { id, locale } = await context.params
    
    // Check if ID is numeric (1-4) and mapped
    if (PROJECT_ID_MAPPING[id]) {
      const uuid = PROJECT_ID_MAPPING[id]
      // Redirect to carbon-projects with investor view parameter
      const redirectUrl = `/${locale}/dashboard/carbon-projects/${uuid}?view=investor`
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
    
    // If ID is already a UUID, redirect to carbon-projects with investor view
    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(id)) {
      const redirectUrl = `/${locale}/dashboard/carbon-projects/${id}?view=investor`
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
    
    // If ID is not recognized, show 404
    return NextResponse.json(
      { error: 'Project not found', message: `Project with ID ${id} not found` },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error in investor project route handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Also handle other HTTP methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}