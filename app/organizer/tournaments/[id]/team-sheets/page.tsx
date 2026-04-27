import { createClient } from "@/utils/supabase/server";
import { authorizeTournamentManagement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseShowdownPaste } from "@/lib/vgc/parser";
import { PrintTeamSheetsButton } from "./print-button";
import type { VGCPokemon } from "@/lib/vgc/types";
import type { GOPokemon } from "@/lib/go/types";
import { isGOGameType } from "@/lib/utils";

interface PlayerTeamSheet {
    playerName: string;
    division: string;
    trainerName: string | null;
    battleTeamName: string | null;
    switchProfileName: string | null;
    team: VGCPokemon[];
}

interface GOPlayerTeamSheet {
    playerName: string;
    inGameNickname: string;
    team: GOPokemon[];
    submittedAt: string | null;
}

export default async function TeamSheetsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let authResult;
    try {
        authResult = await authorizeTournamentManagement(id);
    } catch (error) {
        if (error instanceof Error && error.message === 'Tournament not found') {
            notFound();
        }
        throw error;
    }

    if (!authResult || !authResult.isAuthorized) {
        redirect("/?error=unauthorized");
    }

    const { tournament } = authResult;
    const supabase = await createClient();
    const isGO = isGOGameType(tournament.game_type);

    // Fetch all VGC team lists for this tournament
    const { data: teamLists, error: teamError } = await supabase
        .from('vgc_team_lists')
        .select('*')
        .eq('tournament_id', id)
        .order('submitted_at', { ascending: true });

    // Fetch all tournament players with player names
    const { data: tournamentPlayers } = await supabase
        .from('tournament_players')
        .select('player_id, division, player:players(first_name, last_name)')
        .eq('tournament_id', id)
        .in('registration_status', ['registered', 'checked_in']);

    // Build a player lookup map: player_id -> { name, division }
    const playerMap = new Map<string, { name: string; division: string }>();
    if (tournamentPlayers) {
        for (const tp of tournamentPlayers) {
            const player = tp.player as any;
            const name = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : tp.player_id;
            playerMap.set(tp.player_id, { name, division: tp.division || 'master' });
        }
    }

    // Build the team sheets
    const sheets: PlayerTeamSheet[] = [];
    if (teamLists) {
        for (const tl of teamLists) {
            const playerInfo = playerMap.get(tl.player_id);
            let team: VGCPokemon[] = [];
            
            // Try parsed_team first (already stored), fall back to re-parsing
            if (tl.parsed_team && Array.isArray(tl.parsed_team) && tl.parsed_team.length > 0) {
                team = tl.parsed_team as unknown as VGCPokemon[];
            } else if (tl.raw_paste) {
                try {
                    team = parseShowdownPaste(tl.raw_paste).pokemon;
                } catch { /* skip */ }
            }

            sheets.push({
                playerName: playerInfo?.name || tl.player_id,
                division: playerInfo?.division || 'master',
                trainerName: tl.trainer_name,
                battleTeamName: tl.battle_team_name,
                switchProfileName: tl.switch_profile_name,
                team,
            });
        }
    }

    // Fetch GO team lists if applicable
    const goSheets: GOPlayerTeamSheet[] = [];
    if (isGO) {
        const { data: goTeamLists } = await supabase
            .from('go_team_lists' as any)
            .select('*')
            .eq('tournament_id', id)
            .order('submitted_at', { ascending: true });

        if (goTeamLists) {
            for (const tl of goTeamLists as any[]) {
                goSheets.push({
                    playerName: tl.player_name || 'Unknown',
                    inGameNickname: tl.in_game_nickname || '',
                    team: (tl.parsed_team as unknown as GOPokemon[]) || [],
                    submittedAt: tl.submitted_at,
                });
            }
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Print-specific styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        margin: 10mm 12mm;
                        size: A4 portrait;
                    }
                    html, body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-size: 12pt !important;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    header, footer, nav { display: none !important; }
                    .ots-sheet {
                        page-break-after: always;
                        page-break-inside: avoid;
                    }
                    .ots-sheet:last-child {
                        page-break-after: auto;
                    }
                }
            `}} />

            {/* Header — hidden during print */}
            <div className="print:hidden border-b bg-muted/30">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/organizer/tournaments/${id}`}>
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold">{isGO ? 'GO Team Sheets — For Staff' : 'Team Sheets — For Opponents'}</h1>
                            <p className="text-sm text-muted-foreground">{tournament.name} · {isGO ? goSheets.length : sheets.length} team{(isGO ? goSheets.length : sheets.length) !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <PrintTeamSheetsButton />
                </div>
            </div>

            {/* Team Sheets */}
            <div className="print:px-0 print:py-0 print:max-w-none">
                {isGO ? (
                    goSheets.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground print:hidden max-w-5xl mx-auto px-4">
                            <p className="text-lg">No GO team lists have been submitted yet.</p>
                        </div>
                    ) : (
                        <div>
                            {goSheets.map((sheet, idx) => (
                                <GOOTSSheet key={idx} sheet={sheet} />
                            ))}
                        </div>
                    )
                ) : (
                    sheets.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground print:hidden max-w-5xl mx-auto px-4">
                            <p className="text-lg">No team lists have been submitted yet.</p>
                        </div>
                    ) : (
                        <div>
                            {sheets.map((sheet, idx) => (
                                <OTSSheet key={idx} sheet={sheet} />
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

/* ── Official-style OTS Sheet (one per page) ── */

function OTSSheet({ sheet }: { sheet: PlayerTeamSheet }) {
    const padded = [...sheet.team];
    while (padded.length < 6) padded.push(null as any);

    return (
        <div className="ots-sheet max-w-4xl mx-auto px-6 py-6 print:max-w-none print:px-0 print:py-0">
            <div className="border-2 border-black rounded-none p-6 print:border-0 print:p-0 bg-white text-black" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>

                {/* Title */}
                <div className="text-center mb-1">
                    <h1 className="text-[17pt] font-bold leading-tight">Pokémon Video Game Team List</h1>
                    <p className="text-[13pt] font-bold">2 of 2: <em>For Opponents</em></p>
                    <p className="text-[9pt] italic mt-0.5">Do not lose this page! Keep it throughout the tournament, sharing it with your opponent each round.</p>
                </div>

                {/* Player Info Block */}
                <div className="mt-4 space-y-[6px] text-[11pt]">
                    {/* Row 1: Player Name + Age Division */}
                    <div className="flex items-end gap-6">
                        <div className="flex items-end gap-1 flex-1">
                            <span className="font-bold whitespace-nowrap">Player Name:</span>
                            <span className="flex-1 border-b border-black pb-0.5 min-h-[1.4em] pl-1">{sheet.playerName}</span>
                        </div>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                            <span className="font-bold">Age Division:</span>
                            <label className="flex items-center gap-1">
                                <span className="inline-block w-[14px] h-[14px] border-2 border-black text-center text-[9px] leading-[12px]">
                                    {sheet.division === 'junior' ? '✓' : ''}
                                </span>
                                Juniors
                            </label>
                            <label className="flex items-center gap-1">
                                <span className="inline-block w-[14px] h-[14px] border-2 border-black text-center text-[9px] leading-[12px]">
                                    {sheet.division === 'senior' ? '✓' : ''}
                                </span>
                                Seniors
                            </label>
                            <label className="flex items-center gap-1">
                                <span className="inline-block w-[14px] h-[14px] border-2 border-black text-center text-[9px] leading-[12px]">
                                    {sheet.division === 'master' ? '✓' : ''}
                                </span>
                                Masters
                            </label>
                        </div>
                    </div>

                    {/* Row 2: Trainer Name in Game */}
                    <div className="flex items-end gap-1">
                        <span className="font-bold whitespace-nowrap text-[10pt]">Trainer Name in Game:</span>
                        <span className="flex-1 border-b border-black pb-0.5 min-h-[1.4em] pl-1">{sheet.trainerName || ''}</span>
                    </div>

                    {/* Row 3: Battle Team Number / Name */}
                    <div className="flex items-end gap-1">
                        <span className="font-bold whitespace-nowrap text-[10pt]">Battle Team Number / Name:</span>
                        <span className="flex-1 border-b border-black pb-0.5 min-h-[1.4em] pl-1">{sheet.battleTeamName || ''}</span>
                    </div>

                    {/* Row 4: Switch Profile Name */}
                    <div className="flex items-end gap-1">
                        <span className="font-bold whitespace-nowrap text-[10pt] text-red-700">Switch Profile Name:</span>
                        <span className="flex-1 border-b border-black pb-0.5 min-h-[1.4em] pl-1">{sheet.switchProfileName || ''}</span>
                    </div>
                </div>

                {/* Pokémon Grid: 2 columns × 3 rows */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
                    {padded.map((pokemon, i) => (
                        <PokemonTable key={i} pokemon={pokemon} />
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                    <p className="text-[8pt] italic">All Pokémon must be listed exactly as they appear in the Battle Team, at the level they are in the game.</p>
                </div>
            </div>
        </div>
    );
}

/* ── Table-style Pokémon card matching official form ── */

function PokemonTable({ pokemon }: { pokemon: VGCPokemon | null }) {
    const rows = [
        { label: 'Pokémon', value: pokemon ? (pokemon.nickname ? `${pokemon.nickname} (${pokemon.species})` : pokemon.species) : '' },
        { label: 'Tera Type', value: pokemon?.teraType || '' },
        { label: 'Ability', value: pokemon?.ability || '' },
        { label: 'Held Item', value: pokemon?.item || '' },
        { label: 'Move 1', value: pokemon?.moves?.[0] || '' },
        { label: 'Move 2', value: pokemon?.moves?.[1] || '' },
        { label: 'Move 3', value: pokemon?.moves?.[2] || '' },
        { label: 'Move 4', value: pokemon?.moves?.[3] || '' },
    ];

    return (
        <table className="w-full border-collapse border-2 border-black text-[10pt]">
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border border-black">
                        <td className="font-bold px-2 py-[3px] border-r border-black w-[95px] whitespace-nowrap bg-white">
                            {row.label}
                        </td>
                        <td className="px-2 py-[3px] min-h-[1.5em]">
                            {row.value}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ── GO Official-style Team Sheet (one per page) ── */

function GOOTSSheet({ sheet }: { sheet: GOPlayerTeamSheet }) {
    const padded = [...sheet.team];
    while (padded.length < 6) padded.push(null as any);

    return (
        <div className="ots-sheet max-w-4xl mx-auto px-6 py-6 print:max-w-none print:px-0 print:py-0">
            <div className="border-2 border-black rounded-none p-6 print:border-0 print:p-0 bg-white text-black" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>

                {/* Title */}
                <div className="text-center mb-1">
                    <h1 className="text-[17pt] font-bold leading-tight">Pokémon GO Team List</h1>
                    <p className="text-[13pt] font-bold">1 of 2: <em>For Tournament Staff</em></p>
                    <p className="text-[9pt] italic mt-0.5">This page contains sensitive team information. Do not share with opponents.</p>
                </div>

                {/* Player Info Block */}
                <div className="mt-4 space-y-[6px] text-[11pt]">
                    <div className="flex items-end gap-1 flex-1">
                        <span className="font-bold whitespace-nowrap">Player Name:</span>
                        <span className="flex-1 border-b border-black pb-0.5 min-h-[1.4em] pl-1">{sheet.playerName}</span>
                    </div>
                    <div className="flex items-end gap-1 flex-1">
                        <span className="font-bold whitespace-nowrap">In-Game Nickname:</span>
                        <span className="flex-1 border-b border-black pb-0.5 min-h-[1.4em] pl-1">{sheet.inGameNickname}</span>
                    </div>
                </div>

                {/* Pokémon Grid: 2 columns × 3 rows */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
                    {padded.map((pokemon, i) => (
                        <GOPokemonTable key={i} pokemon={pokemon} />
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                    <p className="text-[8pt] italic">Team must remain unchanged for the entire tournament. Great League format (CP ≤ 1500).</p>
                </div>
            </div>
        </div>
    );
}

/* ── Table-style GO Pokémon card matching official staff form ── */

function GOPokemonTable({ pokemon }: { pokemon: GOPokemon | null }) {
    const rows = [
        { label: 'Pokémon', value: pokemon?.species || '' },
        { label: 'Nickname', value: pokemon?.nickname || '' },
        { label: 'CP / HP', value: pokemon ? `${pokemon.cp} / ${pokemon.hp}` : '' },
        { label: 'Fast Attack', value: pokemon?.fastAttack || '' },
        { label: 'Charged 1', value: pokemon?.chargedAttack1 || '' },
        { label: 'Charged 2', value: pokemon?.chargedAttack2 || '' },
        { label: 'Best Buddy', value: pokemon?.isBestBuddy ? '★ Yes' : '' },
    ];

    return (
        <table className="w-full border-collapse border-2 border-black text-[10pt]">
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border border-black">
                        <td className="font-bold px-2 py-[3px] border-r border-black w-[95px] whitespace-nowrap bg-white">
                            {row.label}
                        </td>
                        <td className="px-2 py-[3px] min-h-[1.5em]">
                            {row.value}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
