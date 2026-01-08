import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n/locales';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'id',
  localePrefix: 'always'
});

export async function middleware(request: NextRequest) {
  // First handle i18n routing - this will handle locale detection and redirects
  const intlResponse = intlMiddleware(request);
  
  // If intl middleware returns a redirect (status 307), return it immediately
  // This handles locale detection and redirects
  if (intlResponse && intlResponse.status === 307) {
    return intlResponse;
  }
  
  // Get the pathname (after intl processing, it will have locale prefix)
  const pathname = request.nextUrl.pathname;
  
  // Handle authentication
  // Create a response object for Supabase to work with
  let response = intlResponse || NextResponse.next();

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
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect all routes except /login and root locale pages
  // Note: paths now include locale prefix (e.g., /id/login, /zh-TW/login)
  const isAuthPage = pathname.endsWith('/login') || 
                     pathname === '/' || 
                     pathname.match(/^\/(id|zh-TW)\/?$/);
  
  if (!session && !isAuthPage) {
    // Redirect to login if not authenticated and trying to access protected route
    // Preserve locale in redirect
    const locale = pathname.split('/')[1] || 'id';
    const redirectUrl = new URL(`/${locale}/login`, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && isAuthPage) {
    // Redirect to dashboard if authenticated and trying to access login page
    const locale = pathname.split('/')[1] || 'id';
    const redirectUrl = new URL(`/${locale}/dashboard`, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Return the response (either from intl middleware or our auth logic)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
}