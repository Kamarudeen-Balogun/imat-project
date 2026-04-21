import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create an unmodified supabase client for proxy use
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

  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => /^sb-.*-auth-token$/i.test(cookie.name))

  // Call getUser() to securely check session validity.
  // If Supabase auth verification fails transiently, allow the request through and let
  // the client-side session check handle the final redirect.
  let user = null

  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (error) {
    console.warn("Proxy auth check failed; allowing request through:", error)
  }

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isPortalRoute = request.nextUrl.pathname.startsWith('/portal')

  if (isDashboardRoute || isPortalRoute) {
    if (!user) {
      if (isDashboardRoute && hasSupabaseAuthCookie) {
        return response
      }

      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  const shouldCleanupActivityLogs = isDashboardRoute || isPortalRoute || request.nextUrl.pathname.startsWith('/newsroom')

  if (shouldCleanupActivityLogs) {
    try {
      await supabase.rpc('cleanup_activity_logs')
    } catch (error) {
      console.warn("Activity log cleanup failed:", error)
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