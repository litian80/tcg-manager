import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define allowed emails for admin access
const ADMIN_EMAILS = ['litian1980@gmail.com', 'joezhuu@gmail.com'];

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

        // 2. Check if user.email is in ADMIN_EMAILS
        const userEmail = user.email?.toLowerCase();
        const allowedEmails = ADMIN_EMAILS.map(e => e.toLowerCase());

        console.log(`Middleware: Checking admin access for ${userEmail}`);

        if (!userEmail || !allowedEmails.includes(userEmail)) {
            console.log('Middleware: Access denied for email:', userEmail);
            console.log('Middleware: Allowed emails:', allowedEmails);
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
