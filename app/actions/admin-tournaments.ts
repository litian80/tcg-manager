'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateTournamentStatus(id: string, isPublished: boolean) {
    const supabase = await createClient();

    // Check Auth & Role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Forbidden: Admins only');
    }

    // Update
    const { error } = await supabase
        .from('tournaments')
        .update({ is_published: isPublished })
        .eq('id', id);

    if (error) {
        console.error('Error updating tournament:', error);
        throw new Error('Failed to update tournament');
    }

    revalidatePath('/admin/tournaments');
    revalidatePath('/'); // Update public list too
    return { success: true };
}

export async function getAllTournaments() {
    const supabase = await createClient();

    // Check Auth & Role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Forbidden: Admins only');
    }

    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

export async function deleteTournament(id: string) {
    const supabase = await createClient();

    // Check Auth & Role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Forbidden: Admins only');
    }

    const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting tournament:', error);
        throw new Error('Failed to delete tournament');
    }

    revalidatePath('/admin/tournaments');
    revalidatePath('/'); // Update public list too
    return { success: true };
}
