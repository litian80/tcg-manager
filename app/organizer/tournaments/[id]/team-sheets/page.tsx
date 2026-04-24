import { createClient } from "@/utils/supabase/server";
import { authorizeTournamentManagement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseShowdownPaste } from "@/lib/vgc/parser";
import { PrintTeamSheetsButton } from "./print-button";
import type { VGCPokemon } from "@/lib/vgc/types";

interface PlayerTeamSheet {
    playerName: string;
    division: string;
    trainerName: string | null;
    battleTeamName: string | null;
    switchProfileName: string | null;
    team: VGCPokemon[];
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

    return (
        <div className="min-h-screen bg-background">
            {/* Print-specific styles: suppress browser header/footer, force clean pages */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        margin: 12mm;
                        size: A4 portrait;
                    }
                    html, body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-size: 14pt !important;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    /* Hide Next.js root-level nav/footer if any */
                    header, footer, nav { display: none !important; }
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
                            <h1 className="text-xl font-bold">Open Team Sheets — For Opponents</h1>
                            <p className="text-sm text-muted-foreground">{tournament.name} · {sheets.length} team{sheets.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <PrintTeamSheetsButton />
                </div>
            </div>

            {/* Team Sheets */}
            <div className="max-w-5xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
                {sheets.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground print:hidden">
                        <p className="text-lg">No team lists have been submitted yet.</p>
                    </div>
                ) : (
                    <div className="space-y-8 print:space-y-0">
                        {sheets.map((sheet, idx) => (
                            <OTSCard key={idx} sheet={sheet} isLast={idx === sheets.length - 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function OTSCard({ sheet, isLast }: { sheet: PlayerTeamSheet; isLast: boolean }) {
    const divisionLabel = sheet.division.charAt(0).toUpperCase() + sheet.division.slice(1);

    return (
        <div className={`bg-white dark:bg-card border rounded-lg p-6 print:border-none print:rounded-none print:p-0 print:shadow-none ${!isLast ? 'print:break-after-page' : ''}`}>
            {/* Player Header */}
            <div className="border-b pb-3 mb-4 print:pb-4 print:mb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold print:text-2xl">{sheet.playerName}</h2>
                        <p className="text-sm text-muted-foreground print:text-base print:mt-1">
                            Division: <span className="font-semibold text-foreground">{divisionLabel}</span>
                        </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground print:text-sm">
                        <p className="font-medium text-foreground">For Opponents</p>
                        <p>Open Team Sheet</p>
                    </div>
                </div>

                {/* Game Profile Fields */}
                <div className="grid grid-cols-3 gap-3 mt-2 text-sm print:text-base print:mt-3 print:gap-4">
                    <div>
                        <span className="text-muted-foreground">Trainer Name: </span>
                        <span className="font-medium">{sheet.trainerName || '—'}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Battle Team: </span>
                        <span className="font-medium">{sheet.battleTeamName || '—'}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Switch Profile: </span>
                        <span className="font-medium">{sheet.switchProfileName || '—'}</span>
                    </div>
                </div>
            </div>

            {/* Pokémon Grid — 2 columns × 3 rows */}
            <div className="grid grid-cols-2 gap-3 print:gap-4">
                {sheet.team.map((pokemon, i) => (
                    <OTSPokemonCard key={i} pokemon={pokemon} index={i} />
                ))}
                {/* Fill empty slots to always show 6 */}
                {Array.from({ length: Math.max(0, 6 - sheet.team.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="rounded-lg border border-dashed p-3 flex items-center justify-center text-muted-foreground text-xs print:text-sm print:p-4">
                        (empty slot)
                    </div>
                ))}
            </div>
        </div>
    );
}

function OTSPokemonCard({ pokemon, index }: { pokemon: VGCPokemon; index: number }) {
    return (
        <div className="rounded-lg border p-3 space-y-1.5 print:p-4 print:space-y-2">
            {/* Species + Item */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground print:text-sm">#{index + 1}</span>
                    <span className="font-semibold text-sm truncate print:text-base">
                        {pokemon.nickname ? `${pokemon.nickname} (${pokemon.species})` : pokemon.species}
                    </span>
                    {pokemon.gender && (
                        <span className={`text-xs font-bold print:text-sm ${pokemon.gender === "M" ? "text-blue-500" : "text-pink-500"}`}>
                            {pokemon.gender === "M" ? "♂" : "♀"}
                        </span>
                    )}
                </div>
                {pokemon.item && (
                    <span className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5 flex-shrink-0 print:text-sm print:px-2 print:py-1">
                        {pokemon.item}
                    </span>
                )}
            </div>

            {/* Tera Type + Ability (NO Level, NO stats for OTS) */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground print:text-sm print:gap-x-4">
                <span><strong>Ability:</strong> {pokemon.ability}</span>
                {pokemon.teraType && <span><strong>Tera:</strong> {pokemon.teraType}</span>}
            </div>

            {/* Moves */}
            <div className="flex flex-wrap gap-1 print:gap-2">
                {pokemon.moves.map((move, i) => (
                    <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded print:text-sm print:px-2 print:py-1">
                        {move}
                    </span>
                ))}
            </div>
        </div>
    );
}
