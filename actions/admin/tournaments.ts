'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { safeAction, type ActionResult } from "@/lib/safe-action";

export async function updateTournamentStatus(id: string, isPublished: boolean): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { error: 'Unauthorized' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return { error: 'Forbidden: Admins only' };
        }

        const { error } = await supabase
            .from('tournaments')
            .update({ is_published: isPublished })
            .eq('id', id);

        if (error) {
            console.error('Error updating tournament:', error);
            return { error: 'Failed to update tournament' };
        }

        revalidatePath('/admin/tournaments');
        revalidatePath('/');
        return { success: true };
    });
}

export async function getAllTournaments() {
    return safeAction(async () => {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { error: 'Unauthorized' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return { error: 'Forbidden: Admins only' };
        }

        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return { error: error.message };
        }

        return { success: data };
    });
}

export async function deleteTournament(id: string): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { error: 'Unauthorized' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return { error: 'Forbidden: Admins only' };
        }

        const { error } = await supabase
            .from('tournaments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete tournament error:', error);
            return { error: error.message || 'Failed to delete tournament' };
        }

        revalidatePath('/admin/tournaments');
        revalidatePath('/');
        return { success: true };
    });
}
