"use client";

import { cn } from "@/lib/utils";
import { Check, Handshake, Gavel, Search, Clock } from "lucide-react";
import { type Match } from "@/app/tournament/[id]/tournament-view";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
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
}

export function MatchCard({ match, stats, canEdit, myPlayerId, isJudge, onPlayerClick, onExtensionClick, p1Penalties = 0, p2Penalties = 0 }: MatchCardProps) {
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
    const [myTomId, setMyTomId] = useState<string | null>(null);
    const [isGameOpen, setIsGameOpen] = useState(false);
    const [gameData, setGameData] = useState<any>(null);
    const { trigger: triggerSecret, reset: resetSecret } = useSecretTrigger(async () => {
        if (!myTomId) return;

        // Determine if valid player
        if (myTomId !== p1Id && myTomId !== p2Id) return;

        // Fetch or create game
        try {
            const { game, error } = await createOrJoinGame(match.id, myTomId);
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

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('pokemon_player_id').eq('id', user.id).single();
            if (profile?.pokemon_player_id) {
                setMyTomId(profile.pokemon_player_id);
            }
        };
        fetchUser();
    }, []);

    const isMyOpponent = (targetId: string | undefined) => {
        if (!myTomId || !targetId) return false;
        // If I am P1, opponent is P2. Target must be P2.
        if (myTomId === p1Id && targetId === p2Id) return true;
        // If I am P2, opponent is P1. Target must be P1.
        if (myTomId === p2Id && targetId === p1Id) return true;
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
    const renderPlayerBlock = (player: typeof match.p1, tomId: string | undefined, record: string | undefined, styleClass: string, penalties: number = 0) => {
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
                    <span className="text-xs text-muted-foreground font-mono truncate">
                        {record || "0-0-0"}
                    </span>
                    {penalties > 0 && (
                        <span className="mt-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded border border-red-200">
                            {penalties} Penalty
                        </span>
                    )}
                </div>

            </div>
        );
    };

    return (
        <div
            id={isMe ? "current-user-row" : undefined}
            className={cn(
                "grid grid-cols-[3rem_minmax(0,1fr)_4rem_minmax(0,1fr)] items-center gap-2 border-b py-2 px-4 transition-colors group",
                isMe ? "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500 pl-3" : "hover:bg-muted/50"
            )}
        >
            {/* Table Number */}
            <div className="font-bold text-center text-muted-foreground text-lg flex flex-col items-center justify-center gap-0.5">
                <span>{match.table_number}</span>
                {match.time_extension_minutes && match.time_extension_minutes > 0 && (
                    <span className="text-[10px] uppercase font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-500 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        +{match.time_extension_minutes}m
                    </span>
                )}
                {/* Judge Extension Button */}
                {isJudge && onExtensionClick && !isFinished && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onExtensionClick(match.id, match.time_extension_minutes || 0);
                        }}
                        className="mt-1 p-1 rounded hover:bg-muted transition-colors group/ext"
                        title="Manage Time Extension"
                    >
                        <Clock className="w-3.5 h-3.5 text-muted-foreground group-hover/ext:text-foreground" />
                    </button>
                )}
            </div>

            {/* Player 1 - STRICT LEFT ALIGN */}
            <div className="flex items-center gap-2 min-w-0 pr-2">
                {renderPlayerBlock(match.p1, match.player1_tom_id, match.p1_display_record, p1Style, p1Penalties)}
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
                        {renderPlayerBlock(match.p2, match.player2_tom_id, match.p2_display_record, p2Style, p2Penalties)}
                        {isFinished && winnerId === p2Id && !isTie && (
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                    </>
                )}
            </div>

            {/* Easter Egg Modal */}
            {myTomId && (
                <ConnectFourModal
                    isOpen={isGameOpen}
                    onClose={() => setIsGameOpen(false)}
                    matchId={match.id}
                    currentUserTomId={myTomId}
                    p1Id={p1Id || ""}
                    p2Id={p2Id || ""}
                    startPlayerId={match.outcome === 1 ? match.player2_tom_id! : (match.outcome === 2 ? match.player1_tom_id! : (match.player1_tom_id!))}
                    gameData={gameData}
                />
            )}
        </div>
    );
}
