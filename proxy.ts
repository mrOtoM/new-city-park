import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { LOGIN_PATH, PATHNAME_HEADER, safeNextPath } from '@/lib/auth/redirects'

/**
 * Refreshes the session cookie and keeps anonymous callers out of the matched
 * routes. It is a routing convenience, not the security boundary: every page,
 * action, and handler still authorizes itself through lib/auth/dal.ts.
 */
export async function proxy(request: NextRequest) {
  const requestedPath = request.nextUrl.pathname + request.nextUrl.search

  // Overwrites any client-supplied value, so the DAL can trust this header.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(PATHNAME_HEADER, requestedPath)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = LOGIN_PATH
    loginUrl.search = ''
    loginUrl.searchParams.set('next', safeNextPath(requestedPath))

    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/calendar', '/trainings', '/trainings/:path*', '/profile', '/statistics', '/users'],
}
