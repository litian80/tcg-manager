/* eslint-disable prefer-const */
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import TournamentView from "./tournament-view";
import { Match, ExtendedTournament as Tournament, RosterPlayer } from "@/types";
import { Role } from "@/lib/rbac";
import { UserResult } from "@/actions/tournament/staff";
import { RealtimeListener } from "@/components/tournament/realtime-listener";
import { buildPaymentRedirectUrl } from "@/utils/payment";
import { calculatePlayerDivision, Division } from "@/actions/registration";

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
    let myPaymentUrl: string | null = null;
    let myPaymentPendingSince: string | null = null;
    let deckList: any = null;
    let myDivision: Division | null = null;
    
    if (profile?.pokemon_player_id) {
        const [registrationData, deckListData] = await Promise.all([
            supabase
                .from("tournament_players")
                .select("registration_status, created_at, division, payment_callback_token, payment_pending_since")
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
    myPaymentPendingSince = registrationData.data?.payment_pending_since || null;
    deckList = deckListData.data || null;

    // REG-004: Compute player's division and fee for display
    const profileBirthYear = (profile as any)?.birth_year;
    if (registrationData.data?.division) {
        myDivision = registrationData.data.division as Division;
    } else if (profileBirthYear) {
        try {
            myDivision = await calculatePlayerDivision(profileBirthYear, id);
        } catch { /* division calc failed, leave null */ }
    }

    // If pending_payment and the tournament has a payment URL, reconstruct the redirect URL (EC-16 fix)
    if (myRegistrationStatus === 'pending_payment' && 
        registrationData.data?.payment_callback_token && 
        tournamentRecord.payment_url) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const regDivision = registrationData.data.division || myDivision || 'master';
      const urlColumnMap = { junior: 'payment_url_juniors', senior: 'payment_url_seniors', master: 'payment_url_masters' } as const;
      const targetUrl = tournamentRecord[urlColumnMap[regDivision as keyof typeof urlColumnMap]] || tournamentRecord.payment_url_masters;

      if (targetUrl) {
          myPaymentUrl = buildPaymentRedirectUrl(targetUrl, {
            player_name: `${(profile as any)?.first_name || ''} ${(profile as any)?.last_name || ''}`.trim() || profile.pokemon_player_id,
            player_id: profile.pokemon_player_id,
            tournament_id: id,
            division: regDivision,
            callback_token: registrationData.data.payment_callback_token,
            return_url: `${siteUrl}/tournament/${id}/payment-status?token=${registrationData.data.payment_callback_token}`,
          });
      }
    }
    
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

    // Check if user is an assigned judge for this tournament (assignment-based, not role-based)
    let isAssignedJudge = false;
    if (user) {
        const { count } = await supabase
            .from('tournament_judges')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', id)
            .eq('user_id', user.id);
        isAssignedJudge = (count ?? 0) > 0;
    }

    const [matchesPromise, penaltiesPromise, deckChecksPromise] = await Promise.all([
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
                time_extension_minutes,
                p1_display_record,
                p2_display_record,
                p1_reported_result,
                p2_reported_result,
                player1_win,
                tie,
                player2_win,
                p1:players!player1_tom_id(first_name, last_name),
                p2:players!player2_tom_id(first_name, last_name)
            `)
            .eq("tournament_id", id),

        (isAssignedJudge || canManageStaff) ? 
            supabase
                .from('player_penalties')
                .select('player_id')
                .eq('tournament_id', id) : 
            Promise.resolve({ data: null, error: null })
        , (isAssignedJudge || canManageStaff) ? 
            supabase
                .from('deck_checks')
                .select('player_id, round_number')
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

    // 3. Fetch Roster (always — needed for pre-tournament view AND the Roster tab during active play)
    let rosterPlayers: RosterPlayer[] = [];
    {
        const { data: rosterData, error: rosterError } = await supabase
            .from("tournament_players")
            .select(`
                player_id,
                registration_status,
                division,
                player:players!player_id(first_name, last_name, tom_player_id)
            `)
            .eq("tournament_id", id);

        if (rosterError) {
            console.error("Error fetching roster:", rosterError);
        } else if (rosterData) {
            const { data: deckStatusData } = tournamentRecord.requires_deck_list
                ? await supabase
                    .from('deck_lists')
                    .select('player_id, validation_status, raw_text')
                    .eq('tournament_id', id)
                : { data: [] };

            const deckStatusMap = new Map<string, string>();
            if (deckStatusData) {
                deckStatusData.forEach((item: any) => {
                    deckStatusMap.set(item.player_id, item.raw_text === '[PAPER DECKLIST]' ? 'paper' : 'online');
                });
            }

            rosterPlayers = rosterData.map((item: any) => ({
                id: item.player?.tom_player_id || item.player_id,
                player_id: item.player_id,
                first_name: item.player?.first_name || "Unknown",
                last_name: item.player?.last_name || "Unknown",
                tom_player_id: item.player?.tom_player_id,
                registration_status: item.registration_status,
                division: item.division,
                deck_list_status: deckStatusMap.has(item.player_id)
                    ? (deckStatusMap.get(item.player_id) === 'paper' ? 'paper' as const : 'online' as const)
                    : 'missing' as const
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

    let deckCheckCounts: Record<string, number> = {};
    if (deckChecksPromise) {
        const { data: checks } = await deckChecksPromise;
        if (checks) {
            checks.forEach((c: { player_id: string; round_number?: number }) => {
                const currentMax = deckCheckCounts[c.player_id] || 0;
                deckCheckCounts[c.player_id] = Math.max(currentMax, c.round_number || 0);
            });
        }
    }

    let activeAnnouncement = null;
    if (tournamentRecord.active_announcement_id) {
        const { data: annData, error: annError } = await supabase
            .from('tournament_announcements')
            .select('*')
            .eq('id', tournamentRecord.active_announcement_id)
            .single();

        if (!annError && annData) {
            // Server-side audience filtering to prevent data leakage
            const isEnrolledPlayer = !!profile?.pokemon_player_id && 
                (myRegistrationStatus === 'registered' || 
                 myRegistrationStatus === 'checked_in' || 
                 myRegistrationStatus === 'dropped' || 
                 myRegistrationStatus === 'finished');
            const isPlayerStaff = canManageStaff || isAssignedJudge;
            const isPlayerOrganizer = canManageStaff;
            const isPlayerSpectator = !isEnrolledPlayer && !isPlayerStaff && !isPlayerOrganizer;

            const audience = annData.target_audience || [];
            let isTarget = false;
            
            if (audience.includes("all")) {
                isTarget = true;
            } else {
                if (isEnrolledPlayer && audience.includes("participants")) isTarget = true;
                if (isPlayerStaff && audience.includes("staff")) isTarget = true;
                if (isPlayerOrganizer && audience.includes("organizers")) isTarget = true;
                if (isPlayerSpectator && audience.includes("spectators")) isTarget = true;
            }

            if (isTarget) {
                activeAnnouncement = annData;
            }
        }
    }

    // 7. Fetch the current player's detailed penalties and deck checks for the Dashboard
    const [myPenaltiesRes, myDeckChecksRes] = profile?.pokemon_player_id ? await Promise.all([
        supabase
            .from('player_penalties')
            .select('*')
            .eq('tournament_id', id)
            .eq('player_id', profile.pokemon_player_id),
        supabase
            .from('deck_checks')
            .select('*')
            .eq('tournament_id', id)
            .eq('player_id', profile.pokemon_player_id)
    ]) : [{ data: null }, { data: null }];


    const parsedData = tournamentRecord.parsed_data as { tom_stage?: number } | null;
    const tomStage = parsedData?.tom_stage ?? 1;

    // Filter matches for the current round
    // Note: We are now passing ALL matches to the view so the Tabs can handle filtering.
    // We sort them by table number globally for consistency, though round-based sort happens in view.
    const allMatches = matches.sort((a, b) => a.table_number - b.table_number);

    return (
        <>
            <RealtimeListener tournamentId={id} />
            <TournamentView
                tomStage={tomStage}
                tournament={{
                    ...tournament,
                    requires_deck_list: tournamentRecord.requires_deck_list,
                    deck_list_submission_deadline: tournamentRecord.deck_list_submission_deadline
                }}
                matches={allMatches}
                currentRound={currentRound}
                stats={stats}
                isJudge={canManageStaff || isAssignedJudge}
                canManageStaff={canManageStaff}
                rosterPlayers={rosterPlayers}
                myPlayerId={profile?.pokemon_player_id}
                myRegistrationStatus={myRegistrationStatus}
                myWaitlistPosition={myWaitlistPosition}
                myPaymentUrl={myPaymentUrl}
                myPaymentPendingSince={myPaymentPendingSince}
                myDivision={myDivision}
                penaltyCounts={penaltyCounts}
                deckCheckCounts={deckCheckCounts}
                deckList={deckList}
                myPenalties={myPenaltiesRes.data || []}
                myDeckChecks={myDeckChecksRes.data || []}
                isLoggedIn={!!user}
                activeAnnouncement={activeAnnouncement}
            />
        </>
    );
}
