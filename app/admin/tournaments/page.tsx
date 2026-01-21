import { getAllTournaments } from '@/app/actions/admin-tournaments'
import { DataTable } from './data-table'
import { columns } from './columns'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function AdminTournamentsPage() {
    const supabase = await createClient()

    // Server-side auth check (redundant with action but good for page load speed/security)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/')
    }

    let tournaments = []
    try {
        tournaments = await getAllTournaments()
    } catch (e) {
        console.error(e)
        // Handle error gracefully in UI if needed
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tournament Administration</h2>
                <div className="flex items-center space-x-2">
                    {/* Add Filter or Create button here if needed later */}
                </div>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <DataTable data={tournaments || []} columns={columns} />
            </div>
        </div>
    )
}
