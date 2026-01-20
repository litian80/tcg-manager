import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import TournamentView, { Match, Tournament } from "./tournament-view";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Tournament Details
    const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

    if (tournamentError || !tournamentData) {
        console.error("Error fetching tournament:", tournamentError);
        notFound();
    }

    const tournament = tournamentData as unknown as Tournament;

    // 2. Fetch all matches 
    const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
      id,
      round_number,
      table_number,
      player1_tom_id,
      player2_tom_id,
      winner_tom_id,
      division,
      is_finished,
      p1:players!player1_tom_id(first_name, last_name),
      p2:players!player2_tom_id(first_name, last_name)
    `)
        .eq("tournament_id", id);

    if (matchesError) {
        console.error("Error fetching matches:", matchesError);
        return <div>Error loading matches.</div>;
    }

    // Cast matches to Match[]
    const matches = matchesData as unknown as Match[];

    // Determine current round (max round number)
    const currentRound = matches.length > 0
        ? Math.max(...matches.map(m => m.round_number))
        : 1;

    // Filter matches for the current round
    // Note: We are now passing ALL matches to the view so the Tabs can handle filtering.
    // We sort them by table number globally for consistency, though round-based sort happens in view.
    const allMatches = matches.sort((a, b) => a.table_number - b.table_number);

    // Calculate stats for all players
    const stats: Record<string, { wins: number; losses: number; ties: number }> = {};

    matches.forEach((match) => {
        if (!match.is_finished) return;

        const p1 = match.player1_tom_id;
        const p2 = match.player2_tom_id;
        const winner = match.winner_tom_id;

        // Initialize if not exists
        if (!stats[p1]) stats[p1] = { wins: 0, losses: 0, ties: 0 };
        if (!stats[p2]) stats[p2] = { wins: 0, losses: 0, ties: 0 };

        if (winner) {
            if (winner === p1) {
                stats[p1].wins++;
                stats[p2].losses++;
            } else {
                stats[p2].wins++;
                stats[p1].losses++;
            }
        } else {
            // Tie (finished but no winner)
            stats[p1].ties++;
            stats[p2].ties++;
        }
    });

    return (
        <TournamentView
            tournament={tournament}
            matches={allMatches}
            currentRound={currentRound}
            stats={stats}
        />
    );
}
