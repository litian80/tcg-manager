import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// In-memory cache for profiles to reduce DB queries on navigation
// Note: This is per-edge-instance/server-process
const profileCache = new Map<string, { role: string; expires: number }>()

export async function middleware(request: NextRequest) {
  // Only protect /organizer/* routes
  if (!request.nextUrl.pathname.startsWith('/organizer')) {
    return NextResponse.next()
  }

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

    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    const userId = user.id

    const isAdminPath = request.nextUrl.pathname.startsWith('/organizer/admin')

    // Check cache first
    const cached = profileCache.get(userId)
    if (cached && cached.expires > Date.now()) {
      if (isAdminPath) {
        if (cached.role === 'admin') return NextResponse.next()
      } else {
        if (cached.role === 'admin' || cached.role === 'organizer') return NextResponse.next()
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Role check from DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (isAdminPath) {
      if (profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } else {
      if (profile.role !== 'admin' && profile.role !== 'organizer') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Update cache (5 minute TTL)
    profileCache.set(userId, {
      role: profile.role,
      expires: Date.now() + 5 * 60 * 1000
    })

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware authorization error:', error)
    // Safe fallback: redirect to home if auth check fails unexpectedly
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: ['/organizer/:path*']
}
