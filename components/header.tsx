'use client'

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Button } from './ui/button'
import { UserNav } from './user-nav'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { LogoIcon } from './logo-icon'

export function Header({ initialUser }: { initialUser: User | null }) {
    const [user, setUser] = useState<User | null>(initialUser)
    const supabase = createClient()

    useEffect(() => {
        // Sync user state if it changes client-side
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    return (
        <header className="border-b bg-background">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <LogoIcon className="h-8 w-8 text-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        BracketOps
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    {user ? (
                        <UserNav user={user} />
                    ) : (
                        <Link href="/login">
                            <Button variant="outline">Login</Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}
