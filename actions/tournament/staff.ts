"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Role } from "@/lib/rbac";
import { sanitizeSearchQuery } from "@/lib/utils";
import { safeAction, type ActionResult } from "@/lib/safe-action";

export type UserResult = {
    id: string;
    email: string | null;
    display_name: string | null;
    pokemon_player_id: string | null;
    role: Role;
};

export async function searchUsers(query: string): Promise<UserResult[]> {
    const supabase = await createClient();

    if (!query || query.length < 2) {
        return [];
    }

    let users: any[] = [];
    const sanitizedQuery = query.trim();

    // Strategy 1: Search by Pokemon Player ID (Exact or approximate)


    // Select valid columns: id, email, first_name, last_name, nick_name, pokemon_player_id, role
    // Note: 'display_name' does NOT exist in DB.
    const { data: idData, error: idError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, nick_name, pokemon_player_id, role")
        .eq("pokemon_player_id", sanitizedQuery)
        .limit(5);

    if (idError) {
        console.error('Search Error (Strategy 1):', idError);
    } else {

    }

    if (idData && idData.length > 0) {
        users = [...users, ...idData];
    }

    // Strategy 2: Search by Name or Email

    // Corrected filter string without 'display_name'
    const safeQuery = sanitizeSearchQuery(sanitizedQuery);
    const filterString = `email.ilike.%${safeQuery}%,pokemon_player_id.ilike.%${safeQuery}%,first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%,nick_name.ilike.%${safeQuery}%`;


    const { data: textData, error: textError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, nick_name, pokemon_player_id, role")
        .or(filterString)
        .limit(5);

    if (textError) {
        console.error('Search Error (Strategy 2):', textError);
    } else {

    }

    if (textData) {
        // Dedup: only add if not already in list
        const existingIds = new Set(users.map(u => u.id));
        textData.forEach(user => {
            if (!existingIds.has(user.id)) {
                users.push(user);
            }
        });
    }



    // MAPPING STEP: Synthesis of display_name
    const mappedUsers: UserResult[] = users.map(user => {
        const displayName = user.nick_name
            ? `${user.first_name} ${user.last_name} (${user.nick_name})`
            : `${user.first_name} ${user.last_name}`;

        return {
            id: user.id,
            email: user.email,
            display_name: displayName, // Synthesized field
            pokemon_player_id: user.pokemon_player_id,
            role: user.role
        };
    });

    return mappedUsers;
}

export async function addJudge(tournamentId: string, targetUserId: string): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: "Unauthorized" };
        }

        // 1. Verify Permission (Organizer or Admin)
        const { data: requesterProfile } = await supabase
            .from("profiles")
            .select("role, pokemon_player_id")
            .eq("id", user.id)
            .single();

        const isAdmin = requesterProfile?.role === "admin";

        if (!isAdmin) {
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("organizer_popid")
                .eq("id", tournamentId)
                .single();

            if (!tournament || tournament.organizer_popid !== requesterProfile?.pokemon_player_id) {
                return { error: "Unauthorized: Only Admins or the Organizer can add judges." };
            }
        }

        // 2. Add to tournament_judges
        const { error: insertError } = await supabase
            .from("tournament_judges")
            .insert({
                tournament_id: tournamentId,
                user_id: targetUserId,
            });

        if (insertError) {
            if (insertError.code === "23505") {
                // Already added, proceed to check role
            } else {
                console.error("Error adding judge:", insertError);
                return { error: "Failed to add judge" };
            }
        }

        revalidatePath(`/tournament/${tournamentId}`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true };
    });
}

export async function removeJudge(tournamentId: string, targetUserId: string): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) return { error: "Unauthorized" };

        // Verify Permission (Organizer or Admin)
        const { data: requesterProfile } = await supabase
            .from("profiles")
            .select("role, pokemon_player_id")
            .eq("id", user.id)
            .single();

        const isAdmin = requesterProfile?.role === "admin";

        if (!isAdmin) {
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("organizer_popid")
                .eq("id", tournamentId)
                .single();

            if (!tournament || tournament.organizer_popid !== requesterProfile?.pokemon_player_id) {
                return { error: "Unauthorized: Only Admins or the Organizer can remove judges." };
            }
        }

        const { error } = await supabase
            .from("tournament_judges")
            .delete()
            .match({ tournament_id: tournamentId, user_id: targetUserId });

        if (error) {
            console.error("Error removing judge:", error);
            return { error: "Failed to remove judge" };
        }

        revalidatePath(`/tournament/${tournamentId}`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true };
    });
}
