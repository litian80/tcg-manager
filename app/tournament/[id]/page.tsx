import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import TournamentView from "./tournament-view";
import { Match, ExtendedTournament as Tournament, RosterPlayer } from "@/types";
import { Role } from "@/lib/rbac";
import { UserResult } from "@/actions/tournament/staff";
import { RealtimeListener } from "@/components/tournament/realtime-listener";

interface Profile {
    role?: string;
    pokemon_player_id?: string;
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Tournament Details and User Data in parallel
    const [tournamentPromise, userData] = await Promise.all([
        supabase
            .from("tournaments")
            .select("*")
            .eq("id", id)
            .single(),
        supabase.auth.getUser()
    ]);

    const { data: tournamentData, error: tournamentError } = await tournamentPromise;
    
    if (tournamentError || !tournamentData) {
        console.error("Error fetching tournament:", tournamentError);
        notFound();
    }

    const tournament = tournamentData as unknown as Tournament;
    const { user } = userData.data;

    // 2. Fetch User Profile and Role
    let userRole: Role | undefined = undefined;
    let profile: Profile | null = null;

    if (user) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('role, pokemon_player_id, birth_year')
            .eq('id', user.id)
            .single();

        profile = profileData;

        if (profile?.role) {
            userRole = profile.role as Role;
        }
    }

    // Permission check for showing the "Manage" button
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tournamentRecord = tournamentData as any;
    const isOrganizer = user && userRole !== 'admin' && (
        tournamentRecord.organizer_popid && profile?.pokemon_player_id === tournamentRecord.organizer_popid
    );

    const canManageStaff = userRole === 'admin' || !!isOrganizer;

    // 3. Fetch user's registration status and deck list in parallel if user has profile
    let myRegistrationStatus: string | null = null;
    let myWaitlistPosition: number | null = null;
    let deckList: any = null;
    
    if (profile?.pokemon_player_id) {
        const [registrationData, deckListData] = await Promise.all([
            supabase
                .from("tournament_players")
                .select("registration_status, created_at, division")
                .eq("tournament_id", id)
                .eq("player_id", profile.pokemon_player_id)
                .maybeSingle(),
            tournamentRecord.requires_deck_list ? 
                supabase
                    .from("deck_lists")
                    .select("*")
                    .eq("tournament_id", id)
                    .eq("player_id", profile.pokemon_player_id)
                    .maybeSingle() : 
                Promise.resolve({ data: null })
        ]);

    myRegistrationStatus = registrationData.data?.registration_status || null;
    deckList = deckListData.data || null;
    
    // Calculate waitlist position if applicable
    if (myRegistrationStatus === 'waitlisted' && registrationData.data?.division && registrationData.data?.created_at) {
        const { count } = await supabase
            .from("tournament_players")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", id)
            .eq("division", registrationData.data.division)
            .eq("registration_status", "waitlisted")
            .lt("created_at", registrationData.data.created_at);
            
        myWaitlistPosition = (count || 0) + 1;
    }
    }

    const [matchesPromise, penaltiesPromise] = await Promise.all([
        supabase
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
                outcome,
                p1_display_record,
                p2_display_record,
                p1:players!player1_tom_id(first_name, last_name),
                p2:players!player2_tom_id(first_name, last_name)
            `)
            .eq("tournament_id", id),
        (userRole === 'judge' || canManageStaff) ? 
            supabase
                .from('player_penalties')
                .select('player_id')
                .eq('tournament_id', id) : 
            Promise.resolve({ data: null, error: null })
    ]);

    const { data: matchesData, error: matchesError } = await matchesPromise;

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

        if (winner === p1) {
            stats[p1].wins++;
            stats[p2].losses++;
        } else if (winner === p2) {
            stats[p2].wins++;
            stats[p1].losses++;
        } else if (match.outcome === 3 || winner === 'tie' || winner === 'draw' || !winner) {
            // Tie (outcome 3, or explicit tie string, or null winner if finished)
            stats[p1].ties++;
            stats[p2].ties++;
        }
    });

    // 3. Fetch Roster if Matches are empty (Pre-Tournament)
    let rosterPlayers: RosterPlayer[] = [];
    if (matches.length === 0) {
        const { data: rosterData, error: rosterError } = await supabase
            .from("tournament_players")
            .select(`
                player_id,
                registration_status,
                player:players!player_id(first_name, last_name, tom_player_id)
            `)
            .eq("tournament_id", id);

        if (rosterError) {
            console.error("Error fetching roster:", rosterError);
        } else if (rosterData) {
            // Map to flat structure
            rosterPlayers = rosterData.map((item: any) => ({
                id: item.player?.tom_player_id || item.player_id, // Use TOM ID if available as simpler ID, or UUID
                first_name: item.player?.first_name || "Unknown",
                last_name: item.player?.last_name || "Unknown",
                tom_player_id: item.player?.tom_player_id,
                registration_status: item.registration_status
            }));
        }
    }

    // 6. Process penalty counts (if fetched)
    let penaltyCounts: Record<string, number> = {};
    if (penaltiesPromise) {
        const { data: penalties } = await penaltiesPromise;
        if (penalties) {
            penalties.forEach((p: { player_id: string }) => {
                penaltyCounts[p.player_id] = (penaltyCounts[p.player_id] || 0) + 1;
            });
        }
    }


    return (
        <>
            <RealtimeListener tournamentId={id} />
            <TournamentView
                tournament={{
                    ...tournament,
                    requires_deck_list: tournamentRecord.requires_deck_list,
                    deck_list_submission_deadline: tournamentRecord.deck_list_submission_deadline
                }}
                matches={allMatches}
                currentRound={currentRound}
                stats={stats}
                userRole={userRole}
                canManageStaff={canManageStaff}
                rosterPlayers={rosterPlayers}
                myPlayerId={profile?.pokemon_player_id}
                myRegistrationStatus={myRegistrationStatus}
                myWaitlistPosition={myWaitlistPosition}
                penaltyCounts={penaltyCounts}
                deckList={deckList}

            />
        </>
    );
}
