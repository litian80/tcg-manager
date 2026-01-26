'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

import { hasPermission, Role } from '@/lib/rbac'

interface UserNavProps {
    user: User
}

export function UserNav({ user }: UserNavProps) {
    const supabase = createClient()
    const router = useRouter()
    const [role, setRole] = useState<Role>('user')

    useEffect(() => {
        const fetchRole = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (data?.role) {
                setRole(data.role as Role)
            }
        }
        fetchRole()
    }, [user.id, supabase])

    const canUploadTom = hasPermission(role, 'tom.upload')
    const canManageUsers = hasPermission(role, 'user.manage')
    const canManageTournaments = hasPermission(role, 'tournament.manage')

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" suppressHydrationWarning>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata.avatar_url} alt={user.email} />
                        <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.user_metadata.full_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(canManageUsers || canManageTournaments) && (
                    <>
                        <DropdownMenuLabel>Admin Functions</DropdownMenuLabel>
                        {canManageUsers && (
                            <DropdownMenuItem asChild>
                                <Link href="/admin/users" className="w-full cursor-pointer">
                                    User Management
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canManageTournaments && (
                            <DropdownMenuItem asChild>
                                <Link href="/admin/tournaments" className="w-full cursor-pointer">
                                    Tournament Management
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                    </>
                )}
                {canUploadTom && (
                    <>
                        <DropdownMenuLabel>Organiser Functions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/upload" className="w-full cursor-pointer">
                                Organiser TOM Upload
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/organizer/tournaments" className="w-full cursor-pointer">
                                My Tournaments
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Help</DropdownMenuLabel>
                {canUploadTom && (
                    <DropdownMenuItem asChild>
                        <Link href="/help/organizer" className="w-full cursor-pointer">
                            Organizer Manuals
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer">
                        Profile
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
