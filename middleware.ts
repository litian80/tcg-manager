import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Routes that should never trigger the onboarding gate
const ONBOARDING_EXEMPT = ['/onboarding', '/auth', '/login', '/api', '/privacy']

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
            // Ignore if called from Server Component
          }
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // ──────────────────────────────────────────────
    // STAGE 1: MANDATORY ONBOARDING GATE
    // Applies to ALL authenticated users on all routes
    // ──────────────────────────────────────────────
    if (user && !ONBOARDING_EXEMPT.some(r => path.startsWith(r))) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, pokemon_player_id, birth_year, role')
        .eq('id', user.id)
        .single()

      if (!profile?.first_name || !profile?.last_name || !profile?.pokemon_player_id || !profile?.birth_year) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      // ──────────────────────────────────────────────
      // STAGE 2: ROLE-BASED ACCESS CONTROL
      // Only for /organizer/* and /admin/* routes
      // ──────────────────────────────────────────────
      if (path.startsWith('/admin')) {
        if (profile.role !== 'admin') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      } else if (path.startsWith('/organizer')) {
        if (profile.role !== 'admin' && profile.role !== 'organizer') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      return NextResponse.next()
    }

    // ──────────────────────────────────────────────
    // STAGE 3: UNAUTHENTICATED ACCESS
    // Protected routes require login
    // ──────────────────────────────────────────────
    if (!user && (path.startsWith('/organizer') || path.startsWith('/admin') || path.startsWith('/profile'))) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error('Middleware error:', error)
    // On transient errors, allow the request through rather than breaking the page
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
