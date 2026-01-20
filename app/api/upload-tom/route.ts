/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { createAdminClient } from '@/utils/supabase/admin';

// Helper to handle single vs array in XML parser
const asArray = <T>(item: T | T[] | undefined): T[] => {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
};

export async function POST(req: NextRequest) {
    const supabase = createAdminClient();

    try {
        const xmlData = await req.text();
        if (!xmlData) {
            return NextResponse.json({ error: 'Empty body' }, { status: 400 });
        }

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
        });
        const result = parser.parse(xmlData);
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
                const activePods = standingsPods.filter((p: any) => p.type !== 'dnf');

                // If we have active pods, check if they are all finished
                if (activePods.length > 0) {
                    const allFinished = activePods.every((p: any) => p.type === 'finished');
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

        // Upsert tournament
        const { data: existingTournament, error: fetchError } = await supabase
            .from('tournaments')
            .select('id')
            .eq('name', name)
            .eq('date', date)
            .single();

        let tournamentId: string;

        if (existingTournament) {
            tournamentId = existingTournament.id;
            await supabase
                .from('tournaments')
                .update({
                    status: tournamentStatus
                })
                .eq('id', tournamentId);
        } else {
            const { data: newTournament, error: insertError } = await supabase
                .from('tournaments')
                .insert({
                    name: name,
                    date: date,
                    total_rounds: roundCount,
                    status: tournamentStatus
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('Error creating tournament:', insertError);
                return NextResponse.json({ error: 'Failed to create tournament', details: insertError }, { status: 500 });
            }
            tournamentId = newTournament.id;
        }

        // --- Step B: Players ---
        // Sibling of `data`. <tournament><players><player>...</player></players></tournament>
        const playersRoot = tournamentRoot.players;
        const xmlPlayers = asArray(playersRoot?.player);

        for (const p of xmlPlayers) {
            const userid = p.userid ? p.userid.toString() : null;
            if (!userid) continue;

            const { error: playerError } = await supabase
                .from('players')
                .upsert({
                    tom_player_id: userid,
                    first_name: p.firstname || 'Unknown',
                    last_name: p.lastname || 'Unknown',
                    tournament_id: tournamentId
                }, { onConflict: 'tom_player_id' });

            if (playerError) {
                console.error(`Error syncing player ${userid}:`, playerError);
            }
        }

        // --- Step C: Matches ---
        // <tournament><pods><pod>...<rounds><round>...</round></rounds>...</pod></pods>

        await supabase.from('matches').delete().eq('tournament_id', tournamentId);

        const pods = asArray(tournamentRoot.pods?.pod);
        const matchesToInsert: any[] = [];
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

                matches.forEach((m: any) => {
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

                    matchesToInsert.push({
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
                        p2_display_record: p2Display
                    });
                });
            });
        });

        if (matchesToInsert.length > 0) {
            const { error: matchError } = await supabase
                .from('matches')
                .insert(matchesToInsert);

            if (matchError) {
                console.error('Error inserting matches:', matchError);
                return NextResponse.json({ error: 'Failed to insert matches', details: matchError }, { status: 500 });
            }
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

        if (standingsRoot) {
            const standingsPods = asArray(standingsRoot.pod);

            // We want final standings, usually category="0" (all ages) or the main one.
            // JSON shows multiple pods for categories. We might want to sync all?
            // Or just flatten them. Duplicate entries for players?
            // Let's take checking for category "0" (Master/All) if available, or just all unique players.
            // JSON has category="0", "1", "2".
            // We'll collect best rank for each player? Or just Insert all and let DB constraints handle?
            // `standings` table likely has (tournament_id, player_tom_id) unique?
            // Let's assume we just want the main standings.
            // Or filter valid players.

            const rawStandings: any[] = [];
            standingsPods.forEach((sp: any) => {
                // Only process "finished" pods? type="finished" in JSON
                const spPlayers = asArray(sp.player);
                spPlayers.forEach((p: any) => {
                    if (p.id && p.place) {
                        rawStandings.push({
                            player_tom_id: p.id.toString(),
                            rank: parseInt(p.place.toString()),
                            points: 0 // Points not in standings JSON shown?
                        });
                    }
                });
            });

            // Deduplicate: If player appears in multiple categories, which one to keep?
            // The one with lowest rank (highest place)?
            // Or maybe just insert all if `standings` doesn't enforce uniqueness per tournament.
            // Likely we only want one entry per player. 
            // Map userid -> standing
            const uniqueStandings = new Map<string, { player_tom_id: string; rank: number; points: number }>();
            rawStandings.forEach(s => {
                if (!uniqueStandings.has(s.player_tom_id)) {
                    uniqueStandings.set(s.player_tom_id, s);
                } else {
                    // Keep better rank?
                    const existing = uniqueStandings.get(s.player_tom_id)!;
                    if (s.rank < existing.rank) {
                        uniqueStandings.set(s.player_tom_id, s);
                    }
                }
            });

            try {
                await supabase.from('standings').delete().eq('tournament_id', tournamentId);

                const standingsToInsert = Array.from(uniqueStandings.values()).map(s => ({
                    tournament_id: tournamentId,
                    player_tom_id: s.player_tom_id,
                    rank: s.rank,
                    points: 0 // default
                }));

                if (standingsToInsert.length > 0) {
                    const { error: standingsError } = await supabase
                        .from('standings')
                        .insert(standingsToInsert);

                    if (standingsError) {
                        console.error('Error inserting standings:', standingsError);
                    }
                }
            } catch (e) {
                console.warn('Standings table might not exist or schema mismatch', e);
            }
        }

        return NextResponse.json({ success: true, tournamentId });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
