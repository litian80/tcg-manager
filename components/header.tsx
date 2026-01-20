'use client'

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Button } from './ui/button'
import { UserNav } from './user-nav'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

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
        <header className="border-b bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TCG Manager
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
