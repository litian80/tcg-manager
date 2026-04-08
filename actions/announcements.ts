"use server";

import { createClient } from "@/utils/supabase/server";
import { authorizeTournamentManagement } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(tournamentId: string, data: {
    title: string;
    banner_text: string;
    details_text?: string;
    type: 'info' | 'warning' | 'urgent' | 'success';
    target_audience: string[];
}) {
    const auth = await authorizeTournamentManagement(tournamentId);
    if (!auth || !auth.isAuthorized) {
        return { error: "Unauthorized" };
    }

    const supabase = await createClient();

    const { data: announcement, error } = await supabase
        .from('tournament_announcements')
        .insert({
            tournament_id: tournamentId,
            title: data.title,
            banner_text: data.banner_text,
            details_text: data.details_text,
            type: data.type,
            target_audience: data.target_audience,
            is_active: false, // Initial creation should be inactive by default
            created_by: auth.user.id
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating announcement:", error);
        return { error: "Failed to create announcement" };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { data: announcement };
}

export async function setAnnouncementActive(tournamentId: string, announcementId: string | null) {
    const auth = await authorizeTournamentManagement(tournamentId);
    if (!auth || !auth.isAuthorized) {
        return { error: "Unauthorized" };
    }

    const supabase = await createClient();

    let error;

    if (announcementId) {
        const result = await supabase.rpc('set_tournament_announcement_active', {
            p_tournament_id: tournamentId,
            p_announcement_id: announcementId
        });
        error = result.error;
    } else {
        const result = await supabase.rpc('set_tournament_announcement_inactive', {
            p_tournament_id: tournamentId
        });
        error = result.error;
    }

    if (error) {
        console.error("Error toggling announcement active state:", error);
        return { error: "Failed to update announcement state" };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteAnnouncement(tournamentId: string, announcementId: string) {
    const auth = await authorizeTournamentManagement(tournamentId);
    if (!auth || !auth.isAuthorized) {
        return { error: "Unauthorized" };
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from('tournament_announcements')
        .delete()
        .eq('id', announcementId)
        .eq('tournament_id', tournamentId);

    if (error) {
        console.error("Error deleting announcement:", error);
        return { error: "Failed to delete announcement" };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
