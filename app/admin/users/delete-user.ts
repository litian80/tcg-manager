'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function deleteUser(targetUserId: string) {
    const supabase = await createClient()

    // 1. Authenticate and Authorize
    // Verification: We need to ensure the requester is an actual admin
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error("Forbidden: Admins only")
    }

    // 2. Perform Deletion using Service Role
    // We use the admin client because standard users cannot delete from authorized users table
    const adminClient = createAdminClient()
    const { error } = await adminClient.auth.admin.deleteUser(targetUserId)

    if (error) {
        console.error('Delete user error:', error)
        throw new Error(error.message)
    }

    // 3. Revalidate
    revalidatePath('/admin/users')
    return { success: true }
}
