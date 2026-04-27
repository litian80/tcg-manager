
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
    const forceSync = searchParams.get('force') === 'true'; // DB-002: Force override for sync protection

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

        // Root is "tournament"
        const tournamentRoot = result.tournament;
        if (!tournamentRoot) {
            return NextResponse.json({ error: 'Invalid XML: Missing tournament tag' }, { status: 400 });
        }

        // --- Derive Game Type from TDF attributes ---
        const tdfGametype = (tournamentRoot.gametype || '').toString().toUpperCase();
        const tdfMode = (tournamentRoot.mode || '').toString().toUpperCase();
        const isGOTdf = tdfGametype === 'GO';
        const gameType = isGOTdf ? 'GO' : (tdfGametype === 'VIDEO_GAME' ? 'VIDEO_GAME' : 'TRADING_CARD_GAME');
        const tournamentMode = isGOTdf ? (tdfMode || 'GOPREMIER') : (tdfMode || 'LEAGUECHALLENGE');

        const isGO = gameType === 'GO';

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
        const forceSync = searchParams.get('force') === 'true';

        // STRICT IDENTIFICATION CHECK
        // We use tom_uid, city, country, organizer_popid, date to identify.
        // OR, if the client provided a explicit targetId (e.g., updating an existing tournament), use that first.
        let existingTournament: { id: string; currentName?: string; currentGameType?: string; currentMode?: string } | null = null;
        
        if (targetId) {
            const { data } = await supabase
                .from('tournaments')
                .select('id, organizer_popid, tom_uid, name, game_type, tournament_mode')
                .eq('id', targetId)
                .single();

            if (data) {
                // DB-003: Cross-validate TDF tom_uid against target tournament
                // Prevents auto-sync from applying wrong TDF file to pinned tournament
                if (tomUid && data.tom_uid && tomUid !== data.tom_uid) {
                    console.warn(`[TOM Sync] REJECTED: TDF Sanction ID ${tomUid} does not match target tournament ${targetId} (has ${data.tom_uid})`);
                    return NextResponse.json({
                        error: `TDF file mismatch: file contains Sanction ID ${tomUid} but target tournament has ${data.tom_uid}. Upload rejected to prevent data corruption.`
                    }, { status: 400 });
                }
                if (!tomUid && data.tom_uid) {
                    console.warn(`[TOM Sync] REJECTED: TDF has no Sanction ID but target tournament ${targetId} already has ${data.tom_uid}`);
                    return NextResponse.json({
                        error: `TDF file missing Sanction ID but target tournament already has one (${data.tom_uid}). Upload rejected.`
                    }, { status: 400 });
                }

                // SEC-002: Verify the uploader owns the target tournament
                if (!isAdmin && data.organizer_popid !== userProfile.pokemon_player_id) {
                    return NextResponse.json({
                        error: 'Forbidden: You do not own the target tournament.'
                    }, { status: 403 });
                }
                existingTournament = { id: data.id, currentName: data.name || undefined, currentGameType: data.game_type || undefined, currentMode: data.tournament_mode || undefined };
            }
        }

        // Fallback 1: If tom_uid exists, it's a globally unique Sanction ID. Match on that alone.
        if (!existingTournament && tomUid) {
            const { data } = await supabase
                .from('tournaments')
                .select('id, name, game_type, tournament_mode')
                .eq('tom_uid', tomUid)
                .maybeSingle(); // Use maybeSingle in case there are duplicates, we grab the first.
            
            if (data) existingTournament = { id: data.id, currentName: data.name || undefined, currentGameType: data.game_type || undefined, currentMode: data.tournament_mode || undefined };
        }

        // Fallback 2: If no tom_uid in the file (unofficial tournament), match on Name, Date, Organizer
        if (!existingTournament) {
            const { data } = await supabase
                .from('tournaments')
                .select('id, name, game_type, tournament_mode')
                .eq('name', name)
                .eq('date', date)
                .eq('organizer_popid', organizerPopId)
                .maybeSingle();
            
            if (data) existingTournament = { id: data.id, currentName: data.name || undefined, currentGameType: data.game_type || undefined, currentMode: data.tournament_mode || undefined };
        }

        let tournamentId: string;
        const parsedDataPayload: Record<string, unknown> = { tom_stage: tournamentRoot.stage ? Number(tournamentRoot.stage) : 1 };

        if (existingTournament) {
            tournamentId = existingTournament.id;
            // Update mutable fields like status, total_rounds (later)
            // DB-003: Build update payload — only update name if current name is empty/null
            const updatePayload: Record<string, unknown> = {
                status: tournamentStatus,
                is_published: isPublished,
                parsed_data: parsedDataPayload,
                // Only set game_type/tournament_mode if not already present (prevent accidental mutation)
                ...(!existingTournament.currentGameType ? { game_type: gameType } : {}),
                ...(!existingTournament.currentMode ? { tournament_mode: tournamentMode } : {}),
            };
            if (!existingTournament.currentName || existingTournament.currentName.trim() === '') {
                updatePayload.name = name;
            } else if (existingTournament.currentName !== name) {
                console.log(`[TOM Sync] Name differs — DB: "${existingTournament.currentName}" vs TDF: "${name}". Keeping DB name.`);
                // Store TDF name in parsed_data for reference
                parsedDataPayload.tdf_name = name;
                updatePayload.parsed_data = parsedDataPayload;
            }
            // If target tournament has no tom_uid yet, set it from TDF (first-time link)
            if (tomUid && targetId) {
                const { data: currentTournament } = await supabase
                    .from('tournaments')
                    .select('tom_uid')
                    .eq('id', tournamentId)
                    .single();
                if (currentTournament && !currentTournament.tom_uid) {
                    updatePayload.tom_uid = tomUid;
                    console.log(`[TOM Sync] First-time link: set tom_uid=${tomUid} for tournament ${tournamentId}`);
                }
            }
            await supabase
                .from('tournaments')
                .update(updatePayload)
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
                    parsed_data: parsedDataPayload,
                    game_type: gameType,
                    tournament_mode: tournamentMode,
                    ...(isGO ? { capacity_open: 0 } : {})
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

        // --- Step B2: Upsert tournament_players (always runs in both sync modes) ---
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
        }

        // --- Step B3: Player Deletion with Sync Protection (DB-002) ---
        const tomStage = (parsedDataPayload.tom_stage as number) || 1;
        const syncMode = tomStage === 1 ? 'setup_protected' : 'live_strict';
        let playersProtectedCount = 0;

        if (tomStage > 1) {
            // LIVE_STRICT: Full sync with decklist protection
            if (tournamentPlayersToInsert.length > 0) {
                const tomPlayerIds = tournamentPlayersToInsert.map(p => p.player_id);

                // Build base delete query: players in DB but NOT in TDF
                let deleteQuery = supabase
                    .from('tournament_players')
                    .delete()
                    .eq('tournament_id', tournamentId)
                    .not('player_id', 'in', `(${tomPlayerIds.map(id => `"${id}"`).join(',')})`);

                // Decklist protection: skip players with submitted decklists (unless force)
                if (!forceSync) {
                    const { data: decklistPlayers } = await supabase
                        .from('deck_lists')
                        .select('player_id')
                        .eq('tournament_id', tournamentId);

                    if (decklistPlayers && decklistPlayers.length > 0) {
                        const protectedIds = [...new Set(decklistPlayers.map(d => d.player_id))];
                        // Exclude players with decklists from deletion
                        deleteQuery = deleteQuery
                            .not('player_id', 'in', `(${protectedIds.map(id => `"${id}"`).join(',')})`);
                        playersProtectedCount = protectedIds.length;
                        console.log(`[TOM Sync] LIVE_STRICT: Protected ${protectedIds.length} player(s) with decklists from deletion`);
                    }
                }

                await deleteQuery;
            } else {
                // Empty TDF in live mode — only delete-all if force=true
                if (forceSync) {
                    await supabase
                        .from('tournament_players')
                        .delete()
                        .eq('tournament_id', tournamentId);
                    console.log(`[TOM Sync] LIVE_STRICT: Force-deleted all players (empty TDF)`);
                } else {
                    console.log(`[TOM Sync] LIVE_STRICT: Skipped delete-all (empty TDF without force flag)`);
                }
            }
        } else {
            // SETUP_PROTECTED: Skip ALL player deletions
            console.log(`[TOM Sync] SETUP_PROTECTED: Skipped all player deletions (stage=1, tournament=${tournamentId})`);
        }

        // Store sync metadata in parsed_data
        parsedDataPayload.sync_metadata = {
            mode: syncMode,
            last_sync_at: new Date().toISOString(),
            force_used: forceSync,
            players_upserted: tournamentPlayersToInsert.length,
            players_protected: playersProtectedCount
        };
        console.log(`[TOM Sync] tournament=${tournamentId} stage=${tomStage} mode=${syncMode} force=${forceSync} upserted=${tournamentPlayersToInsert.length} protected=${playersProtectedCount}`);

        // --- Step C: Matches (Delta Upsert — DB-001) ---
        // <tournament><pods><pod>...<rounds><round>...</round></rounds>...</pod></pods>

        // Pre-read existing user-managed match data for preservation during upsert.
        // Supabase upsert sets omitted columns to DEFAULT/NULL, so we must explicitly
        // include time_extension_minutes and generated match keys in the payload to preserve them.
        const { data: existingMatches } = await supabase
            .from('matches')
            .select('round_number, table_number, division, time_extension_minutes, player1_win, tie, player2_win')
            .eq('tournament_id', tournamentId);

        const existingMatchMap = new Map<string, any>();
        if (existingMatches) {
            existingMatches.forEach(m => {
                existingMatchMap.set(`${m.round_number}-${m.table_number}-${m.division}`, {
                    time_extension_minutes: m.time_extension_minutes,
                    player1_win: m.player1_win,
                    tie: m.tie,
                    player2_win: m.player2_win
                });
            });
        }

        const pods = asArray(tournamentRoot.pods?.pod);

        // Calculate max table number for barcode zero-padding logic
        let globalMaxTable = 0;
        pods.forEach((pod: any) => {
            const rounds = asArray(pod.rounds?.round);
            rounds.forEach((r: any) => {
                const matches = asArray(r.matches?.match);
                matches.forEach((m: any) => {
                    const tNum = parseInt(m.tablenumber?.toString() || '0');
                    if (tNum > globalMaxTable) globalMaxTable = tNum;
                });
            });
        });
        const tablePadding = Math.max(1, Math.min(3, globalMaxTable.toString().length));

        // TOM Match Slip Key Generator
        const generateBracketOpsKey = (category: string, roundNumber: number, tableNumber: number, outcome: number) => {
            const paddedTable = tableNumber.toString().padStart(tablePadding, '0');
            const baseStr = `${category}${roundNumber}${paddedTable}${outcome}`;
            let total = 0;
            let isOdd = true;
            for (const char of baseStr) {
                const digit = parseInt(char);
                const weight = isOdd ? 1 : 2;
                total += digit * weight;
                isOdd = !isOdd;
            }
            const checkDigit = (10 - (total % 10)) % 10;
            return `${baseStr}${checkDigit}`;
        };

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
            else if (category === '10') division = isGO ? 'Open' : 'Junior/Senior/Master';

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
                        // Skip match with missing player(s)
                        return;
                    }

                    const tNum = parseInt(m.tablenumber?.toString() || '0');
                    const matchKey = `${roundNumber}-${tNum}-${division}`;
                    const existingData = existingMatchMap.get(matchKey) || {};

                    // Generate Match Slip Keys if not present and not a Bye (outcome !== 5)
                    let p1WinKey = existingData.player1_win || null;
                    let tieKey = existingData.tie || null;
                    let p2WinKey = existingData.player2_win || null;

                    if (outcome !== 5) {
                        if (!p1WinKey) p1WinKey = generateBracketOpsKey(category, roundNumber, tNum, 1);
                        if (!tieKey) tieKey = generateBracketOpsKey(category, roundNumber, tNum, 3);
                        if (!p2WinKey) p2WinKey = generateBracketOpsKey(category, roundNumber, tNum, 2);
                    }

                    matchesToUpsert.push({
                        tournament_id: tournamentId,
                        round_number: roundNumber,
                        table_number: tNum,
                        player1_tom_id: p1Id,
                        player2_tom_id: p2Id,
                        winner_tom_id: winnerId,
                        outcome: outcome,
                        is_finished: isFinished,
                        division: division,
                        p1_display_record: p1Display,
                        p2_display_record: p2Display,
                        player1_win: p1WinKey,
                        tie: tieKey,
                        player2_win: p2WinKey,
                        // Preserve judge-set time extensions from pre-read (app-managed field)
                        time_extension_minutes: existingData.time_extension_minutes || 0
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

                await supabase.from('matches').delete().in('id', orphanIds);
            }
        } else {
            // DB-003: No matches in XML — only delete existing matches if force flag is set.
            // A TDF with no match data may be a partial/Stage-1 export; deleting matches here
            // destroyed completed tournament data in production (see incident fd0237b9).
            if (forceSync) {
                console.log(`[TOM Sync] Force-deleting all matches for tournament ${tournamentId} (empty TDF + force flag)`);
                await supabase.from('matches').delete().eq('tournament_id', tournamentId);
            } else {
                console.warn(`[TOM Sync] TDF contains no match data for tournament ${tournamentId}. Existing matches preserved.`);
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
                if (category === "10") divisionName = isGO ? "Open" : "Junior/Senior/Master";
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

                }
            }
        }

        // Final Touch: Update updated_at to trigger Realtime listeners (even if no other data changed)
        await supabase
            .from('tournaments')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', tournamentId);

        // --- Step E: Archive original TDF file to Storage ---
        try {
            const storagePath = `${tournamentId}/latest.tdf`;
            const { error: storageError } = await supabase.storage
                .from('tdf-files')
                .upload(storagePath, xmlData, {
                    contentType: 'text/xml',
                    upsert: true,
                });

            if (storageError) {
                console.error(`[TDF Archive] Failed to store TDF for tournament ${tournamentId}:`, storageError);
            } else {
                console.log(`[TDF Archive] Stored TDF for tournament ${tournamentId} at tdf-files/${storagePath}`);
            }
        } catch (archiveErr) {
            // Non-blocking — don't fail the upload if archival fails
            console.error('[TDF Archive] Unexpected error:', archiveErr);
        }

        return NextResponse.json({
            success: true,
            tournamentId,
            sync: {
                mode: syncMode,
                players_upserted: tournamentPlayersToInsert.length,
                players_protected: playersProtectedCount,
                force_used: forceSync
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
