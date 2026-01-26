import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define allowed emails for admin access
// Define allowed emails for admin access - REMOVED in favor of RBAC
// const ADMIN_EMAILS = [];

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: DO NOT REMOVE auth.getUser()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect /admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // 1. Check if user is logged in
        if (!user) {
            console.log('Middleware: No user found for /admin route');
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // 2. Check RBAC (Admin or Organizer)
        // We need to fetch the user's role from the profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const userRole = profile?.role;
        const allowedRoles = ['admin', 'organizer'];

        if (profileError || !userRole || !allowedRoles.includes(userRole)) {
            console.log(`Middleware: Access denied for user ${user.email}. Role: ${userRole || 'None'}`);
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    // MANDATORY ONBOARDING GATE
    if (user && !request.nextUrl.pathname.startsWith('/onboarding') && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/login')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, pokemon_player_id, birth_year')
            .eq('id', user.id)
            .single();

        if (!profile?.first_name || !profile?.last_name || !profile?.pokemon_player_id || !profile?.birth_year) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
