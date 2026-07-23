import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Routes that require an authenticated session and/or a role check. Everything
// else (home, /tournament/*, /login, /api, ...) is public browsing: we still
// call getUser() below to refresh the session, but skip the per-request profile
// DB read that used to run on EVERY route. That read only pays off where we
// actually gate access, so restricting it here cuts Supabase load on public
// traffic (the bulk of a live event's requests).
const PROTECTED_PREFIXES = ['/admin', '/organizer', '/profile', '/onboarding']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore if called from a Server Component
          }
        },
      },
    }
  )

  try {
    // Always run getUser() — this refreshes the auth cookie on every route and
    // short-circuits (no network) for anonymous visitors with no session.
    const { data: { user } } = await supabase.auth.getUser()

    const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p))

    // Unauthenticated visitors may browse public routes; protected ones redirect.
    if (!user) {
      if (
        path.startsWith('/organizer') ||
        path.startsWith('/admin') ||
        path.startsWith('/profile')
      ) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(redirectUrl)
      }
      return NextResponse.next()
    }

    // Authenticated: only the protected routes need the profile (onboarding + RBAC).
    if (isProtected) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, pokemon_player_id, birth_year, role')
        .eq('id', user.id)
        .single()

      // Mandatory onboarding gate (except on the onboarding page itself).
      if (
        !path.startsWith('/onboarding') &&
        (!profile?.first_name ||
          !profile?.last_name ||
          !profile?.pokemon_player_id ||
          !profile?.birth_year)
      ) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Role-based access control.
      if (path.startsWith('/admin') && profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
      if (
        path.startsWith('/organizer') &&
        profile?.role !== 'admin' &&
        profile?.role !== 'organizer'
      ) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  } catch (error) {
    console.error('Middleware error:', error)
    // On transient errors, allow the request through rather than breaking the page.
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
