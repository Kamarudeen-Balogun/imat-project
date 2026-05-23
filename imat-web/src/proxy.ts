import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => /^sb-.*-auth-token(?:\.\d+)?$/i.test(cookie.name))

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isPortalRoute = request.nextUrl.pathname.startsWith('/portal')

  if (!isDashboardRoute && !isPortalRoute) {
    return response
  }

  if (!hasSupabaseAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // The browser client owns the final session check inside protected layouts.
  // Avoid a server-side Supabase verification here because local/dev fetches can
  // fail or return a transient null user while the browser session is valid.
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
