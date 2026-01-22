"use client";

import { cn } from "@/lib/utils";
import { Check, Handshake } from "lucide-react";
import { type Match } from "@/app/tournament/[id]/tournament-view";

interface MatchCardProps {
    match: Match;
    stats: Record<string, { wins: number; losses: number; ties: number }>;
    canEdit?: boolean;
}

export function MatchCard({ match, stats, canEdit }: MatchCardProps) {
    const isFinished = match.is_finished;
    const winnerId = match.winner_tom_id;
    const p1Id = match.player1_tom_id;
    const p2Id = match.player2_tom_id;

    // Outcome 3 is Tie/Draw. Fallback to 'tie' check for backward compat if outcome missing.
    const isTie = match.outcome === 3 || winnerId === 'tie' || winnerId === 'draw';

    // Determine styles based on result
    const getPlayerStyle = (playerId: string | undefined, otherPlayerId: string | undefined) => {
        // Unfinished matches: Use standard text (High Contrast)
        if (!isFinished) return "text-foreground font-bold";

        if (isTie) {
            // Draw: Gray / Muted (Opacity 0.6)
            return "text-muted-foreground opacity-60";
        }

        if (winnerId === playerId) {
            // Winner: Bold, standard text
            return "font-bold text-foreground";
        }

        if (winnerId === otherPlayerId) {
            // Loser: Dimmed text
            return "text-muted-foreground opacity-60";
        }

        return "text-foreground";
    };

    const p1Style = getPlayerStyle(p1Id, p2Id);
    const p2Style = getPlayerStyle(p2Id, p1Id);

    // Helper to render player block
    const renderPlayerBlock = (player: typeof match.p1, tomId: string | undefined, record: string | undefined, styleClass: string) => {
        if (!player) return <span className="text-muted-foreground italic">Bye</span>;

        return (
            <div className={cn("flex flex-col items-start justify-center min-w-0", styleClass)}>
                <span className="truncate text-base leading-tight">
                    {player.first_name} {player.last_name}
                </span>
                <span className="text-xs text-muted-foreground font-mono truncate">
                    {record || "0-0-0"}
                </span>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_4rem_minmax(0,1fr)] items-center gap-2 border-b py-2 px-4 hover:bg-muted/50 transition-colors">
            {/* Table Number */}
            <div className="font-bold text-center text-muted-foreground text-lg">
                {match.table_number}
            </div>

            {/* Player 1 - STRICT LEFT ALIGN */}
            <div className="flex items-center gap-2 min-w-0 pr-2">
                {renderPlayerBlock(match.p1, match.player1_tom_id, match.p1_display_record, p1Style)}
                {isFinished && winnerId === p1Id && !isTie && (
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                )}
            </div>

            {/* Middle Status (VS / Tie Badge / Score / BYE) */}
            <div className="flex justify-center items-center">
                {match.outcome === 5 ? (
                    // BYE Badge
                    <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider">BYE</span>
                    </div>
                ) : isTie ? (
                    // TIE Badge
                    <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full border border-border/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TIE</span>
                    </div>
                ) : !isFinished ? (
                    // Playing - standard VS or empty
                    <span className="text-xs text-muted-foreground/50 font-medium">VS</span>
                ) : (
                    // Finished Decided - Vertical Divider
                    <div className="w-px h-5 bg-border/50" />
                )}
            </div>

            {/* Player 2 - STRICT LEFT ALIGN */}
            <div className="flex items-center gap-2 min-w-0 pl-2">
                {match.outcome !== 5 && (
                    <>
                        {renderPlayerBlock(match.p2, match.player2_tom_id, match.p2_display_record, p2Style)}
                        {isFinished && winnerId === p2Id && !isTie && (
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
