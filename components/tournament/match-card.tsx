"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Handshake, Gavel, Search, Clock, AlertOctagon, Ticket } from "lucide-react";
import { type Match } from "@/types";
import { getMatchReportingStatus } from "@/utils/match-reporting";
import { useState, useEffect } from "react";

import { useSecretTrigger } from "@/hooks/use-secret-trigger";
import { createOrJoinGame } from "@/actions/minigame";
import { toast } from "sonner";
import { ConnectFourModal } from "./connect-four-modal";
interface MatchCardProps {
    match: Match;
    stats: Record<string, { wins: number; losses: number; ties: number }>;
    canEdit?: boolean;
    myPlayerId?: string;
    isJudge?: boolean;
    onPlayerClick?: (player: { id: string; name: string; tomId: string; matchId?: string; extension?: number }) => void;
    onExtensionClick?: (matchId: string, currentExtension: number) => void;
    p1Penalties?: number;
    p2Penalties?: number;
    p1DeckChecks?: number;
    p2DeckChecks?: number;
}

export function MatchCard({ match, stats, canEdit, myPlayerId, isJudge, onPlayerClick, onExtensionClick, p1Penalties = 0, p2Penalties = 0, p1DeckChecks = 0, p2DeckChecks = 0 }: MatchCardProps) {
    const isFinished = match.is_finished;
    const winnerId = match.winner_tom_id;
    const p1Id = match.player1_tom_id;
    const p2Id = match.player2_tom_id;

    // Is this my match?
    const isMe = (p1Id === myPlayerId || p2Id === myPlayerId);

    // Auto-scroll effect
    useEffect(() => {
        if (isMe) {
            const element = document.getElementById("current-user-row");
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [isMe]);

    // Easter Egg Logic
    const [isGameOpen, setIsGameOpen] = useState(false);
    const [gameData, setGameData] = useState<unknown>(null);
    const { trigger: triggerSecret, reset: resetSecret } = useSecretTrigger(async () => {
        if (!myPlayerId) return;

        // Determine if valid player
        if (myPlayerId !== p1Id && myPlayerId !== p2Id) return;

        // Fetch or create game
        try {
            const { game, error } = await createOrJoinGame(match.id, myPlayerId);
            if (error) {
                toast.error("Failed to start secret game");
                return;
            }
            setGameData(game);
            setIsGameOpen(true);
            toast.success("Secret Unlocked: Connect 4!");
        } catch (e) {
            console.error(e);
        }
    });

    const isMyOpponent = (targetId: string | undefined) => {
        if (!myPlayerId || !targetId) return false;
        // If I am P1, opponent is P2. Target must be P2.
        if (myPlayerId === p1Id && targetId === p2Id) return true;
        // If I am P2, opponent is P1. Target must be P1.
        if (myPlayerId === p2Id && targetId === p1Id) return true;
        return false;
    };

    // Outcome 3 is Tie/Draw. Fallback to 'tie' check for backward compat if outcome missing.
    const isTie = match.outcome === 3 || winnerId === 'tie' || winnerId === 'draw';

    // Determine styles based on result
    const getPlayerStyle = (playerId: string | undefined, otherPlayerId: string | undefined) => {
        const isSelf = playerId === myPlayerId;
        const baseClass = isSelf ? "font-bold text-foreground" : "text-foreground";

        // Unfinished matches: Use standard text (High Contrast)
        if (!isFinished) return isSelf ? "text-foreground font-black" : "text-foreground font-medium";

        if (isTie) {
            // Draw: Gray / Muted (Opacity 0.6)
            return isSelf ? "text-muted-foreground font-bold" : "text-muted-foreground opacity-60";
        }

        if (winnerId === playerId) {
            // Winner: Bold, standard text
            return "font-bold text-foreground";
        }

        if (winnerId === otherPlayerId) {
            // Loser: Dimmed text
            return isSelf ? "text-muted-foreground font-semibold" : "text-muted-foreground opacity-60";
        }

        return baseClass;
    };

    const p1Style = getPlayerStyle(p1Id, p2Id);
    const p2Style = getPlayerStyle(p2Id, p1Id);

    // Helper to render player block
    const renderPlayerBlock = (player: typeof match.p1, tomId: string | undefined, record: string | undefined, styleClass: string, penalties: number = 0, deckChecks: number = 0) => {
        if (!player) return <span className="text-muted-foreground italic">Bye</span>;

        const isTarget = isFinished && isMyOpponent(tomId);
        // Interactive for Judges
        const isJudgeInteractable = canEdit && isJudge && tomId && onPlayerClick;

        return (
            <div className="flex items-center gap-2 max-w-full">
                <div
                    className={cn(
                        "flex flex-col items-start justify-center min-w-0 select-none flex-1 px-1 -mx-1 rounded",
                        styleClass,
                        isTarget && "cursor-pointer active:scale-95 transition-transform",
                        isJudgeInteractable && "cursor-pointer hover:bg-muted/80 active:bg-muted"
                    )}
                    onClick={(e) => {
                        if (isTarget) {
                            e.preventDefault(); triggerSecret();
                        } else if (isJudgeInteractable) {
                            e.preventDefault();
                            onPlayerClick({
                                id: tomId!,
                                name: `${player.first_name} ${player.last_name}`,
                                tomId: tomId!,
                                matchId: match.id,
                                extension: match.time_extension_minutes || 0
                            });
                        }
                    }}
                >
                    <span className="truncate text-base leading-tight">
                        {player.first_name} {player.last_name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono truncate">
                            {record || "0-0-0"}
                        </span>
                        {deckChecks > 0 && (
                            <span className="px-1 py-[1px] bg-blue-100 text-blue-700 text-[9px] font-bold uppercase rounded border border-blue-200 leading-none dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" title={`Latest Deck Check in Round ${deckChecks}`}>
                                DC R{deckChecks}
                            </span>
                        )}
                    </div>
                    {penalties > 0 && (
                        <span className="mt-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                            {penalties} Penalty
                        </span>
                    )}
                </div>

            </div>
        );
    };

    const reportingStatus = getMatchReportingStatus(match.p1_reported_result, match.p2_reported_result);
    const isConfirmed = reportingStatus === 'confirmed';
    const isConflict = reportingStatus === 'conflict';
    const hasStatus = match.p1_reported_result || match.p2_reported_result;

    const hasConfirmedResult = isConfirmed && !isFinished && isJudge && !!match.p1_reported_result;

    return (
        <div className={cn("flex flex-col border-b group transition-colors", isMe ? "" : "hover:bg-muted/50", hasConfirmedResult && "bg-green-50/30 dark:bg-green-950/10")}>
            <div
                id={isMe ? "current-user-row" : undefined}
                className={cn(
                    "grid grid-cols-[3rem_minmax(0,1fr)_4rem_minmax(0,1fr)] items-center gap-2 py-2 px-4 transition-colors",
                    isMe && "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500 pl-3"
                )}
            >
            {/* Table Number */}
            <div className="font-bold text-center text-muted-foreground text-lg flex flex-col items-center justify-center gap-0.5">
                <span>{match.table_number}</span>
                {/* Judge Extension Button */}
                {isJudge && onExtensionClick && !isFinished && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExtensionClick(match.id, match.time_extension_minutes || 0);
                        }}
                        className="mt-1 h-6 w-6 group/ext"
                        title="Manage Time Extension"
                    >
                        <Clock className="w-3.5 h-3.5 text-muted-foreground group-hover/ext:text-foreground" />
                    </Button>
                )}
            </div>

            {/* Player 1 - STRICT LEFT ALIGN */}
            <div className="flex items-center gap-2 min-w-0 pr-2">
                {renderPlayerBlock(match.p1, match.player1_tom_id, match.p1_display_record, p1Style, p1Penalties, p1DeckChecks)}
                {isFinished && winnerId === p1Id && !isTie && (
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                )}
            </div>

            {/* Middle Status (VS / Tie Badge / Score / BYE) */}
            <div className="flex flex-col justify-center items-center gap-1">
                {(match.time_extension_minutes ?? 0) > 0 && (
                    <div className="flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-full px-2 py-0.5 whitespace-nowrap shadow-sm shadow-indigo-100/50 dark:shadow-none" title={`+${match.time_extension_minutes} minutes extension`}>
                        <span className="text-[10px] font-bold tracking-wider flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            +{match.time_extension_minutes}
                        </span>
                    </div>
                )}
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
                        {renderPlayerBlock(match.p2, match.player2_tom_id, match.p2_display_record, p2Style, p2Penalties, p2DeckChecks)}
                        {isFinished && winnerId === p2Id && !isTie && (
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                    </>
                )}
            </div>

            {/* Easter Egg Modal */}
            {myPlayerId && (
                <ConnectFourModal
                    isOpen={isGameOpen}
                    onClose={() => setIsGameOpen(false)}
                    matchId={match.id}
                    currentUserTomId={myPlayerId}
                    p1Id={p1Id || ""}
                    p2Id={p2Id || ""}
                    startPlayerId={match.outcome === 1 ? match.player2_tom_id! : (match.outcome === 2 ? match.player1_tom_id! : (match.player1_tom_id!))}
                    gameData={gameData}
                />
            )}
            </div>

            {/* Match Reporting Judge Info */}
            {!isFinished && isJudge && hasStatus && (
                <div className="px-4 pb-2 -mt-1 ml-12">
                    {hasConfirmedResult && (
                        <div className="flex flex-col items-center gap-1 mt-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800 shadow-sm max-w-fit">
                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <Check className="h-3.5 w-3.5" />
                                <span>
                                    {match.p1_reported_result === 'win' && `${match.p1?.first_name} ${match.p1?.last_name || ''} Wins`}
                                    {match.p1_reported_result === 'loss' && `${match.p2?.first_name} ${match.p2?.last_name || ''} Wins`}
                                    {match.p1_reported_result === 'tie' && 'Match Tied'}
                                </span>
                            </div>
                        </div>
                    )}
                    {isConflict && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-semibold rounded-md border border-red-200 dark:border-red-800 animate-pulse shadow-sm">
                            <AlertOctagon className="h-3.5 w-3.5" />
                            Conflict! Players reported differing results.
                        </div>
                    )}
                    {reportingStatus === 'pending_opponent' && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500 text-xs font-medium rounded-md border border-amber-200/50 dark:border-amber-900/50">
                            <Clock className="h-3 w-3" />
                            One player reported. Waiting for opponent.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
