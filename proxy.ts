import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { locales } from './i18n/locales'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'id',
  localePrefix: 'always'
})

async function handleRequest(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Bypass proxy for static files
  const staticExtensions = ['.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.json']
  const isStaticFile = staticExtensions.some(ext => pathname.endsWith(ext))
  if (isStaticFile) {
    return NextResponse.next()
  }

  // Bypass for API routes - let API routes handle their own authentication
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // First handle i18n routing - this will handle locale detection and redirects
  const intlResponse = intlMiddleware(request)

  // If intl middleware returns a redirect (status 307), return it immediately
  // This handles locale detection and redirects
  if (intlResponse && intlResponse.status === 307) {
    return intlResponse
  }

  // Handle authentication
  // Create a response object for Supabase to work with
  let response = intlResponse || NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          // Update the response with new cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  const {
    data: { session }
  } = await supabase.auth.getSession()

  // Maximum session duration: 24 hours in milliseconds
  const MAX_SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  // Check if session exists and handle expiration
  if (session?.expires_at) {
    // expires_at is in seconds (Unix timestamp), convert to milliseconds
    const expiresAt = session.expires_at * 1000
    const currentTime = Date.now()
    
    // Check if session has expired based on expires_at
    if (currentTime > expiresAt) {
      // Session expired, sign out and redirect to login
      await supabase.auth.signOut()
      const locale = pathname.split('/')[1] || 'id'
      const redirectUrl = new URL(`/${locale}/login`, request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Additional safety check: if session is valid for more than 24 hours from now,
    // force logout (this handles cases where JWT expiry might be misconfigured)
    const timeUntilExpiry = expiresAt - currentTime
    if (timeUntilExpiry > MAX_SESSION_DURATION) {
      // Session would be valid for more than 24 hours from current time
      // This shouldn't happen if Supabase JWT expiry is properly configured to 24 hours
      await supabase.auth.signOut()
      const locale = pathname.split('/')[1] || 'id'
      const redirectUrl = new URL(`/${locale}/login`, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Protect all routes except /login and root locale pages
  // Note: paths now include locale prefix (e.g., /id/login, /zh-TW/login)
  const isAuthPage = pathname.endsWith('/login') ||
    pathname === '/' ||
    pathname.match(/^\/(id|zh-TW)\/?$/)

  if (!session && !isAuthPage) {
    // Redirect to login if not authenticated and trying to access protected route
    // Preserve locale in redirect
    const locale = pathname.split('/')[1] || 'id'
    const redirectUrl = new URL(`/${locale}/login`, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && isAuthPage) {
    // Redirect to dashboard if authenticated and trying to access login page
    const locale = pathname.split('/')[1] || 'id'
    const redirectUrl = new URL(`/${locale}/dashboard`, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Return the response (either from intl middleware or our auth logic)
  return response
}

// Export a default function for Next.js proxy
export default async function proxy(request: NextRequest) {
  return handleRequest(request)
}

// Also export as named "proxy" for compatibility
export { proxy }
