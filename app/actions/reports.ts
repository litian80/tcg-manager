"use server";

import { createClient } from "@/utils/supabase/server";

export async function generatePenaltyCSV(tournamentId: string) {
    const supabase = await createClient();

    // 1. Fetch Tournament Details
    const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("name, id, tom_uid")
        .eq("id", tournamentId)
        .single();

    if (tournamentError || !tournament) {
        throw new Error("Tournament not found");
    }

    // 2. Fetch Penalties
    const { data: penalties, error: penaltiesError } = await supabase
        .from("player_penalties")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: true });

    if (penaltiesError) {
        console.error("Error fetching penalties:", penaltiesError);
        throw new Error("Failed to fetch penalties");
    }

    // 3. Manual Join for Judges
    // Collect IDs
    const judgeIds = Array.from(new Set(penalties.map((p) => p.judge_user_id)));

    // Fetch Judges (Profiles)
    let judgesMap: Record<string, any> = {};
    if (judgeIds.length > 0) {
        const { data: judges, error: judgesError } = await supabase
            .from("profiles")
            .select("id, pokemon_player_id, first_name, last_name")
            .in("id", judgeIds);

        if (judgesError) console.error("Error fetching judges:", judgesError);
        if (judges) {
            judges.forEach((j) => {
                judgesMap[j.id] = j;
            });
        }
    }

    // 4. Format CSV
    const headers = [
        "Tournament ID",
        "Round of Issue",
        "Judge Player ID",
        "Competitor's Player ID",
        "Category",
        "Severity",
        "Penalty",
        "Notes",
    ];

    // Helper to escape CSV fields
    const escapeCsv = (str: string | null | undefined) => {
        if (str === null || str === undefined) return "";
        const stringValue = String(str);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const rows = penalties.map((p: any) => {
        const judge = judgesMap[p.judge_user_id];

        // Judge ID: preference for POP ID, fallback to Unknown
        const judgeId = judge?.pokemon_player_id || "Unknown";

        return [
            escapeCsv(tournament.tom_uid || tournament.name), // Preference for TOM UID as requested
            escapeCsv(p.round_number),
            escapeCsv(judgeId),
            escapeCsv(p.player_id), // Directly use player_id from penalties table as requested
            escapeCsv(p.category),
            escapeCsv(p.severity),
            escapeCsv(p.penalty),
            escapeCsv(p.notes),
        ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return csvContent;
}
