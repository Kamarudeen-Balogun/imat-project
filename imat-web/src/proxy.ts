import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => /^sb-.*-auth-token$/i.test(cookie.name))

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isPortalRoute = request.nextUrl.pathname.startsWith('/portal')

  if (!isDashboardRoute && !isPortalRoute) {
    return response
  }

  if (!hasSupabaseAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Create an unmodified supabase client for proxy use only when a protected route needs it.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    }
  )

  // Call getUser() only for protected routes with an auth cookie.
  // If Supabase verification fails transiently, allow the request through and let the
  // client-side session check handle the final redirect.
  let user = null

  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    console.warn("Proxy auth check failed; allowing request through.")
  }

  if (isDashboardRoute || isPortalRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

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