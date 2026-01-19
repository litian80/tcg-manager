
import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { createAdminClient } from '@/utils/supabase/admin';

// --- Interfaces for XML Data ---
// Only for type checking hints, structure is dynamic
interface TomPlayer {
    userid: string;
    firstname: string;
    lastname: string;
    birthdate?: string;
}

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
            // Handle "07/02/2024 22:47:24" if simpler date field missing? No, data.startdate looks like "07/02/2024"
            const parts = startDateStr.split(' ')[0].split('/');
            if (parts.length === 3) {
                date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
        }

        // Calculate round count? XML has tournament.data.roundtime etc, but maybe derived from matches?
        // Or just omit total_rounds update if unknown. The initial XML had roundCount tag, new one doesn't seem to in `data`.
        // We'll calculate it from rounds or set default.
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
                    // Update status or other fields if needed
                })
                .eq('id', tournamentId);
        } else {
            const { data: newTournament, error: insertError } = await supabase
                .from('tournaments')
                .insert({
                    name: name,
                    date: date,
                    total_rounds: roundCount, // Placeholder
                    status: 'ongoing'
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
        // Use recursive search for rounds if structure varies? 
        // Based on JSON: tournament.pods.pod.rounds.round[...]

        await supabase.from('matches').delete().eq('tournament_id', tournamentId);

        const pods = asArray(tournamentRoot.pods?.pod);
        const matchesToInsert: any[] = [];
        let maxRoundNumber = 0;

        pods.forEach((pod: any) => {
            // Extract category attribute (e.g. "0", "1", "2")
            // With ignoreAttributes: false, attributes might be properties on the object
            // or prefixed depending on config. We set attributeNamePrefix: ''.
            const category = pod.category?.toString() || 'Unknown';

            let division = `Division ${category}`;
            if (category === '0') division = 'Junior';
            else if (category === '1') division = 'Senior';
            else if (category === '2') division = 'Masters';
            else if (category === '0/1' || category === '8') division = 'Junior/Senior';

            const rounds = asArray(pod.rounds?.round);
            rounds.forEach((r: any) => {
                const roundNumber = parseInt(r.number || '0');
                if (roundNumber > maxRoundNumber) maxRoundNumber = roundNumber;

                // r.matches might be object wrapper { match: [...] }
                const matches = asArray(r.matches?.match);

                matches.forEach((m: any) => {
                    // Check outcome/result
                    // JSON: outcome: "1" (Player 1 wins?), timestamp, tablenumber
                    // Players are objects: player1: { userid: "4" }

                    const p1Id = m.player1?.userid?.toString();
                    const p2Id = m.player2?.userid?.toString();
                    const outcome = m.outcome; // "1" -> p1, "2" -> p2? "0" -> draw?

                    let winnerId = null;
                    if (outcome === '1' || outcome === 1) winnerId = p1Id;
                    else if (outcome === '2' || outcome === 2) winnerId = p2Id;
                    else if (outcome === '0' || outcome === 0) winnerId = null; // Draw

                    if (!p1Id || !p2Id) {
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
                        is_finished: !!outcome,
                        division: division
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

        const standingsRoot = tournamentRoot.standings;
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
            const uniqueStandings = new Map<string, any>();
            rawStandings.forEach(s => {
                if (!uniqueStandings.has(s.player_tom_id)) {
                    uniqueStandings.set(s.player_tom_id, s);
                } else {
                    // Keep better rank?
                    const existing = uniqueStandings.get(s.player_tom_id);
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
