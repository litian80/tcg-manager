import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import UserTable from './user-table'

export default async function AdminUsersPage() {
    const supabase = await createClient()

    // 1. Authenticate and Authorize
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/')
    }

    return (
        <div className="container py-10 space-y-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground">
                    Search for users and manage their restricted profile data.
                </p>
            </div>

            <UserTable />
        </div>
    )
}
