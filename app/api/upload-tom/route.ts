
import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

import { TomPlayer, TomMatch, TomRound, TomPod, TomTournament } from '@/types';

// Helper to handle single vs array in XML parser
const asArray = <T>(item: T | T[] | undefined): T[] => {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
};

export async function POST(req: NextRequest) {
    const supabase = createAdminClient();
    const supabaseAuth = await createClient();
    const { searchParams } = new URL(req.url);
    const isPublished = searchParams.get('published') !== 'false'; // Default to true if missing

    try {
        const xmlData = await req.text();
        if (!xmlData) {
            return NextResponse.json({ error: 'Empty body' }, { status: 400 });
        }

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
        });
        const result = parser.parse(xmlData) as { tournament?: TomTournament };
        console.log('Parsed XML Structure:', JSON.stringify(result, null, 2));

        // Root is "tournament"
        const tournamentRoot = result.tournament;
        if (!tournamentRoot) {
            return NextResponse.json({ error: 'Invalid XML: Missing tournament tag' }, { status: 400 });
        }

        // --- Determine Status ---
        // Default to 'running'
        let tournamentStatus = 'running';

        // Requirements:
        // 1. Locate <standings>
        // 2. Condition for 'completed': <standings> tag exists AND every single pod has type="finished"
        // 3. Condition for 'running': All other cases
        const standingsRoot = tournamentRoot.standings;
        if (standingsRoot) {
            const standingsPods = asArray(standingsRoot.pod);
            console.log('Parsed Standings:', JSON.stringify(standingsPods, null, 2));

            // If standings exist checking if all pods are finished
            // Note: If standingsPods is empty (e.g. empty standings tag), semantics imply not completed.
            if (standingsPods.length > 0) {
                // Filter out 'dnf' pods as they are not indicative of the running state (just dropped players)
                const activePods = standingsPods.filter((p) => p.type !== 'dnf');

                // If we have active pods, check if they are all finished
                if (activePods.length > 0) {
                    const allFinished = activePods.every((p) => p.type === 'finished');
                    if (allFinished) {
                        tournamentStatus = 'completed';
                    }
                }
            }
        }

        // --- Step A: Tournament ---
        // XML Structure: <tournament><data><name>...</name><startdate>...</startdate></data> ... </tournament>
        const tournamentData = tournamentRoot.data;
        if (!tournamentData) {
            return NextResponse.json({ error: 'Invalid XML: Missing tournament data tag' }, { status: 400 });
        }

        const name = tournamentData.name;
        const startDateStr = tournamentData.startdate; // MM/DD/YYYY
        const city = tournamentData.city || 'Unknown';
        const country = tournamentData.country || 'Unknown';
        const tomUid = tournamentData.id?.toString() || '';
        // "organizer的popid" -> <organizer popid="..."> or <organizer><popid>...

        let organizerPopId = 'Unknown';
        if (tournamentData.organizer) {
            // Check if attribute or child
            organizerPopId = tournamentData.organizer.popid || tournamentData.organizer['@_popid'] || 'Unknown';
            // fast-xml-parser with ignoreAttributes: false, attributeNamePrefix: '' -> attributes are properties
        }

        // --- Step B: Fetch Uploader Profile & Apply Strict Guard Clauses ---
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: You must be logged in to upload.' }, { status: 401 });
        }

        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, pokemon_player_id')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            return NextResponse.json({ error: 'Forbidden: User profile not found.' }, { status: 403 });
        }

        const isAdmin = userProfile.role === 'admin';
        const isOrganizer = userProfile.role === 'organizer';
        const isMatchingOrganizer = isOrganizer && userProfile.pokemon_player_id === organizerPopId;

        if (!isAdmin && !isMatchingOrganizer) {
            return NextResponse.json({
                error: `Upload Rejected. You must be the Organizer listed in the TDF file (PID Match: ${organizerPopId}) or an Admin to perform this action.`
            }, { status: 403 });
        }

        // Use structure from previous file view:
        // const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

        // Let's refine simple extraction assuming standard TDF/XML
        // Update: User said "id, city, country, organizer的popid and startdate"

        // Convert MM/DD/YYYY to YYYY-MM-DD
        let date = startDateStr;
        if (startDateStr && startDateStr.includes('/')) {
            const parts = startDateStr.split('/');
            if (parts.length === 3) {
                // MM/DD/YYYY -> YYYY-MM-DD
                date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
        } else if (startDateStr && startDateStr.includes(' ')) {
            // Handle "07/02/2024 22:47:24"
            const parts = startDateStr.split(' ')[0].split('/');
            if (parts.length === 3) {
                date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
        }

        const roundCount = 0; // Will update if we find rounds

        const targetId = searchParams.get('targetId');

        // STRICT IDENTIFICATION CHECK
        // We use tom_uid, city, country, organizer_popid, date to identify.
        // OR, if the client provided a explicit targetId (e.g., updating an existing tournament), use that first.
        let existingTournament: { id: string } | null = null;
        
        if (targetId) {
            const { data } = await supabase
                .from('tournaments')
                .select('id')
                .eq('id', targetId)
                .single();
            existingTournament = data;
        }

        // Fallback 1: If tom_uid exists, it's a globally unique Sanction ID. Match on that alone.
        if (!existingTournament && tomUid) {
            const { data } = await supabase
                .from('tournaments')
                .select('id')
                .eq('tom_uid', tomUid)
                .maybeSingle(); // Use maybeSingle in case there are duplicates, we grab the first.
            
            if (data) existingTournament = data;
        }

        // Fallback 2: If no tom_uid in the file (unofficial tournament), match on Name, Date, Organizer
        if (!existingTournament) {
            const { data } = await supabase
                .from('tournaments')
                .select('id')
                .eq('name', name)
                .eq('date', date)
                .eq('organizer_popid', organizerPopId)
                .maybeSingle();
            
            if (data) existingTournament = data;
        }

        let tournamentId: string;
        const parsedDataPayload = { tom_stage: tournamentRoot.stage ? Number(tournamentRoot.stage) : 1 };

        if (existingTournament) {
            tournamentId = existingTournament.id;
            // Update mutable fields like status, total_rounds (later), and maybe name if changed?
            await supabase
                .from('tournaments')
                .update({
                    status: tournamentStatus,
                    name: name, // Update name just in case
                    is_published: isPublished,
                    parsed_data: parsedDataPayload
                })
                .eq('id', tournamentId);
        } else {
            const { data: newTournament, error: insertError } = await supabase
                .from('tournaments')
                .insert({
                    name: name,
                    date: date,
                    total_rounds: roundCount,
                    status: tournamentStatus,
                    tom_uid: tomUid,
                    city: city,
                    country: country,
                    organizer_popid: organizerPopId,
                    is_published: isPublished,
                    parsed_data: parsedDataPayload
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('Error creating tournament:', insertError);
                return NextResponse.json({ error: 'Failed to create tournament', details: insertError }, { status: 500 });
            }
            tournamentId = newTournament.id;
        }

        // --- Pre-Step: Identify Player States ---
        const dnfPlayerIds = new Set<string>();
        const activePlayerIds = new Set<string>();
        const finishedPlayerIds = new Set<string>();
        let hasStandings = false;

        if (standingsRoot) {
            const standingsPods = asArray(standingsRoot.pod);
            if (standingsPods.length > 0) hasStandings = true;
            standingsPods.forEach((pod) => {
                const podPlayers = asArray(pod.player);
                podPlayers.forEach((p) => {
                    if (p.id) {
                        const idStr = p.id.toString();
                        if (pod.type === 'dnf') {
                            dnfPlayerIds.add(idStr);
                        } else if (pod.type === 'finished') {
                            finishedPlayerIds.add(idStr);
                        } else {
                            activePlayerIds.add(idStr);
                        }
                    }
                });
            });
        }

        // --- Step B: Players ---
        // Sibling of `data`. <tournament><players><player>...</player></players></tournament>
        const playersRoot = tournamentRoot.players;
        const xmlPlayers = asArray(playersRoot?.player);

        const tournamentPlayersToInsert: { tournament_id: string; player_id: string; registration_status: string }[] = [];

        for (const p of xmlPlayers) {
            const userid = p.userid ? p.userid.toString() : null;
            if (!userid) continue;

            // Existing logic: Upsert into global players table
            const { error: playerError } = await supabase
                .from('players')
                .upsert({
                    tom_player_id: userid,
                    first_name: p.firstname || 'Unknown',
                    last_name: p.lastname || 'Unknown'
                }, { onConflict: 'tom_player_id' });

            if (playerError) {
                console.error(`Error syncing player ${userid}:`, playerError);
            }

            // Determine registration_status
            let regStatus = 'checked_in';
            if (dnfPlayerIds.has(userid)) {
                regStatus = 'dropped';
            } else if (hasStandings) {
                // If they are in active pods, they are still checked_in (playing)
                // If they are ONLY in finished pods and NOT active pods, they are finished
                if (!activePlayerIds.has(userid) && finishedPlayerIds.has(userid)) {
                    regStatus = 'finished';
                }
            }

            // New logic: Collect for tournament_players index
            // TOM is source of truth — if a player is in TOM, they are checked in, unless overridden above
            tournamentPlayersToInsert.push({
                tournament_id: tournamentId,
                player_id: userid,
                registration_status: regStatus
            });
        }

        // Bulk upsert into tournament_players
        // ignoreDuplicates: false so TOM can update existing registrations to checked_in
        if (tournamentPlayersToInsert.length > 0) {
            const { error: tpError } = await supabase
                .from('tournament_players')
                .upsert(tournamentPlayersToInsert, {
                    onConflict: 'tournament_id, player_id',
                    ignoreDuplicates: false
                });

            if (tpError) {
                console.error('Error populating tournament_players:', tpError);
            }
            
            // Delete any players NOT in this TOM file to ensure strict syncing
            const tomPlayerIds = tournamentPlayersToInsert.map(p => p.player_id);
            if (tomPlayerIds.length > 0) {
                await supabase
                    .from('tournament_players')
                    .delete()
                    .eq('tournament_id', tournamentId)
                    .not('player_id', 'in', `(${tomPlayerIds.map(id => `"${id}"`).join(',')})`); // Quote strings in postgres syntax
            }
        } else {
            // Delete everyone if TOM file is totally empty
            await supabase
                .from('tournament_players')
                .delete()
                .eq('tournament_id', tournamentId);
        }

        // --- Step C: Matches (Delta Upsert — DB-001) ---
        // <tournament><pods><pod>...<rounds><round>...</round></rounds>...</pod></pods>

        // Pre-read existing user-managed match data for preservation during upsert.
        // Supabase upsert sets omitted columns to DEFAULT/NULL, so we must explicitly
        // include time_extension_minutes in the payload to preserve judge-set values.
        const { data: existingMatches } = await supabase
            .from('matches')
            .select('round_number, table_number, division, time_extension_minutes')
            .eq('tournament_id', tournamentId);

        const extensionMap = new Map<string, number>();
        if (existingMatches) {
            existingMatches.forEach(m => {
                if (m.time_extension_minutes) {
                    extensionMap.set(`${m.round_number}-${m.table_number}-${m.division}`, m.time_extension_minutes);
                }
            });
        }

        const pods = asArray(tournamentRoot.pods?.pod);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchesToUpsert: any[] = [];
        let maxRoundNumber = 0;

        // Global stats tracker for this tournament parse
        // Map<PlayerID, { w, l, d }>
        const playerStats = new Map<string, { w: number; l: number; d: number }>();

        const getStat = (id: string) => playerStats.get(id) || { w: 0, l: 0, d: 0 };
        const updateStat = (id: string, result: 'w' | 'l' | 'd') => {
            const s = getStat(id);
            if (result === 'w') s.w++;
            if (result === 'l') s.l++;
            if (result === 'd') s.d++;
            playerStats.set(id, s);
        };
        const formatRecord = (s: { w: number; l: number; d: number }) => `${s.w}-${s.l}-${s.d}`;

        pods.forEach((pod: any) => {
            const category = pod.category?.toString() || 'Unknown';
            let division = `Division ${category}`;
            if (category === '0') division = 'Junior';
            else if (category === '1') division = 'Senior';
            else if (category === '2') division = 'Masters';
            else if (category === '0/1' || category === '8') division = 'Junior/Senior';
            else if (category === '9') division = 'Master/Senior';
            else if (category === '10') division = 'Junior/Senior/Master';

            // Ensure rounds are processed in chronological order
            let rounds = asArray(pod.rounds?.round);
            rounds = rounds.sort((a: any, b: any) => {
                const ra = parseInt(a.number || '0');
                const rb = parseInt(b.number || '0');
                return ra - rb;
            });

            rounds.forEach((r: any) => {
                const roundNumber = parseInt(r.number || '0');
                if (roundNumber > maxRoundNumber) maxRoundNumber = roundNumber;

                const matches = asArray(r.matches?.match);

                matches.forEach((m) => {
                    const outcome = parseInt(m.outcome?.toString() || '0');
                    let p1Id = m.player1?.userid?.toString();
                    let p2Id = m.player2?.userid?.toString();

                    if (outcome === 5) {
                        p1Id = m.player?.userid?.toString();
                        p2Id = null;
                    }

                    let winnerId: string | null = null;
                    let isFinished = false;

                    // Temporary stats for this match (to calculate "After Match" record without mutating global state immediately if needed, 
                    // though we do need to mutate global state for NEXT matches).

                    // Logic:
                    // If Running: Display Record = Current Stats.
                    // If Finished: Display Record = Current Stats + Result. 
                    // THEN execute the update to global stats.

                    let p1Res: 'w' | 'l' | 'd' | null = null;
                    let p2Res: 'w' | 'l' | 'd' | null = null;

                    switch (outcome) {
                        case 1: // P1 Wins
                            winnerId = p1Id;
                            isFinished = true;
                            p1Res = 'w';
                            p2Res = 'l';
                            break;
                        case 2: // P2 Wins
                            winnerId = p2Id;
                            isFinished = true;
                            p1Res = 'l';
                            p2Res = 'w';
                            break;
                        case 3: // Tie
                            winnerId = null;
                            isFinished = true;
                            p1Res = 'd';
                            p2Res = 'd';
                            break;
                        case 5: // Bye
                            winnerId = p1Id;
                            isFinished = true;
                            p1Res = 'w'; // Bye counts as Win usually? Or just free points? Standard is Win.
                            break;
                        case 0: // Running
                        default:
                            winnerId = null;
                            isFinished = false;
                            break;
                    }

                    // Calculate Display Records
                    let p1Display = "";
                    let p2Display = "";

                    if (p1Id) {
                        const s = getStat(p1Id);
                        if (isFinished && p1Res) {
                            // Calculate hypothetical "after" stats
                            const after = { ...s };
                            if (p1Res === 'w') after.w++;
                            if (p1Res === 'l') after.l++;
                            if (p1Res === 'd') after.d++;
                            p1Display = formatRecord(after);
                        } else {
                            // Running -> Entering stats
                            p1Display = formatRecord(s);
                        }
                    }

                    if (p2Id) {
                        const s = getStat(p2Id);
                        if (isFinished && p2Res) {
                            const after = { ...s };
                            if (p2Res === 'w') after.w++;
                            if (p2Res === 'l') after.l++;
                            if (p2Res === 'd') after.d++;
                            p2Display = formatRecord(after);
                        } else {
                            p2Display = formatRecord(s);
                        }
                    }

                    // UPDATE Global Stats (only if finished)
                    if (isFinished) {
                        if (p1Id && p1Res) updateStat(p1Id, p1Res);
                        if (p2Id && p2Res) updateStat(p2Id, p2Res);
                    }

                    if (!p1Id && outcome !== 5) {
                        // warning handled below or skipped
                    }
                    if (!p1Id && !p2Id) {
                        console.warn(`Skipping match with missing player(s): Match R${roundNumber}-T${m.tablenumber}`);
                        return;
                    }

                    matchesToUpsert.push({
                        tournament_id: tournamentId,
                        round_number: roundNumber,
                        table_number: parseInt(m.tablenumber?.toString() || '0'),
                        player1_tom_id: p1Id,
                        player2_tom_id: p2Id,
                        winner_tom_id: winnerId,
                        outcome: outcome,
                        is_finished: isFinished,
                        division: division,
                        p1_display_record: p1Display,
                        p2_display_record: p2Display,
                        // Preserve judge-set time extensions from pre-read (app-managed field)
                        time_extension_minutes: extensionMap.get(`${roundNumber}-${parseInt(m.tablenumber?.toString() || '0')}-${division}`) || 0
                    });
                });
            });
        });

        if (matchesToUpsert.length > 0) {
            const { error: matchError } = await supabase
                .from('matches')
                .upsert(matchesToUpsert, {
                    onConflict: 'tournament_id,round_number,table_number,division',
                    ignoreDuplicates: false
                });

            if (matchError) {
                console.error('Error upserting matches:', matchError);
                return NextResponse.json({ error: 'Failed to upsert matches', details: matchError }, { status: 500 });
            }

            // Garbage Collection: Remove orphaned matches no longer in TOM XML
            const validMatchKeys = new Set(
                matchesToUpsert.map((m: any) => `${m.round_number}-${m.table_number}-${m.division}`)
            );

            const { data: allDbMatches } = await supabase
                .from('matches')
                .select('id, round_number, table_number, division')
                .eq('tournament_id', tournamentId);

            const orphanIds = (allDbMatches || [])
                .filter((m: any) => !validMatchKeys.has(`${m.round_number}-${m.table_number}-${m.division}`))
                .map((m: any) => m.id);

            if (orphanIds.length > 0) {
                console.log(`GC: Removing ${orphanIds.length} orphaned matches for tournament ${tournamentId}`);
                await supabase.from('matches').delete().in('id', orphanIds);
            }
        } else {
            // No matches in XML — clean up all existing matches for this tournament
            await supabase.from('matches').delete().eq('tournament_id', tournamentId);
        }

        // Update total rounds if we found some
        if (maxRoundNumber > 0) {
            await supabase.from('tournaments')
                .update({ total_rounds: maxRoundNumber })
                .eq('id', tournamentId);
        }

        // --- Step D: Standings (Optional) ---
        // JSON: tournament.standings.pod[...]
        // Inside pod: player (array or single) -> { id: "...", place: "..." }
        // Wait, JSON says `id` instead of `userid` for standings players?
        // JSON: "player": [ { "id": "4", "place": "1" }, ... ]

        // --- Step D: Standings ---
        // Requirement:
        // 1. Map `category` to Division Name (Junior/Senior/Master).
        // 2. Iterate players in <standings><pod>.
        // 3. Merge with calculated stats (Pass 1) from `playerStats`.
        // 4. Update `tournament_players`.

        if (standingsRoot) {
            const standingsPods = asArray(standingsRoot.pod);

            const tpUpdates: {
                tournament_id: string;
                player_id: string;
                rank: number;
                division: string;
                wins: number;
                losses: number;
                ties: number;
                points: number;
            }[] = [];

            standingsPods.forEach((pod) => {
                const category = pod.category?.toString();
                let divisionName = "Unknown";

                // Mappings from requirements
                if (category === "0") divisionName = "Junior";
                else if (category === "1") divisionName = "Senior";
                else if (category === "2") divisionName = "Master";
                // Add play for others effectively defaulting to Unknown or skipping? 
                // Let's assume standard only for now based on prompt, but keep others?
                // If the user didn't specify, maybe just stringify?
                // Requirement says: 0->Junior, 1->Senior, 2->Master.

                // Skip if not strictly one of these?
                // Or just use it if mapped, else 'Other'?
                // Safe to include others if they exist.
                if (category === "0/1" || category === "8") divisionName = "Junior/Senior"; // Legacy/Mix support
                if (!["Junior", "Senior", "Master"].includes(divisionName)) {
                    // If we strictly only want J/S/M as tabs, we might want to filter.
                    // But for data integrity, let's keep valid divisions.
                }

                const podPlayers = asArray(pod.player);
                podPlayers.forEach((p) => {
                    const playerId = p.id?.toString();
                    if (!playerId) return;

                    const rank = parseInt(p.place?.toString() || '0');

                    // Retrieve stats calculated from matches
                    const stats = getStat(playerId);
                    // Calculate points: W=3, T=1, L=0
                    // Note: 'd' in our map assumes Tie.
                    const points = (stats.w * 3) + (stats.d * 1);

                    tpUpdates.push({
                        tournament_id: tournamentId,
                        player_id: playerId,
                        rank: rank,
                        division: divisionName,
                        wins: stats.w,
                        losses: stats.l,
                        ties: stats.d,
                        points: points
                    });
                });
            });

            // Perform Bulk Upsert to tournament_players
            // We use upsert because the rows likely exist from Step B, but we are adding metadata.
            if (tpUpdates.length > 0) {
                const { error: standingsError } = await supabase
                    .from('tournament_players')
                    .upsert(tpUpdates, {
                        onConflict: 'tournament_id, player_id',
                        ignoreDuplicates: false // We WANT to update
                    });

                if (standingsError) {
                    console.error('Error updating standings in tournament_players:', standingsError);
                } else {
                    console.log(`Updated standings for ${tpUpdates.length} players.`);
                }
            }
        }

        // Final Touch: Update updated_at to trigger Realtime listeners (even if no other data changed)
        await supabase
            .from('tournaments')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', tournamentId);

        return NextResponse.json({ success: true, tournamentId });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
