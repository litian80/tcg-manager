"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { updateGameState } from "@/actions/minigame";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ConnectFourModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchId: string;
    currentUserTomId: string;
    p1Id: string;
    p2Id: string;
    startPlayerId: string; // New Prop
    gameData: any;
}

const ROWS = 6;
const COLS = 7;

export function ConnectFourModal({ isOpen, onClose, matchId, currentUserTomId, p1Id, p2Id, startPlayerId, gameData }: ConnectFourModalProps) {
    const supabase = createClient();
    const [board, setBoard] = useState<string[][]>(gameData?.board || Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    const [turn, setTurn] = useState<string>(gameData?.turn || "");
    const [winner, setWinner] = useState<string | null>(gameData?.winner || null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Color Logic: Start Player (Loser) = Red, Second (Winner) = Yellow
    const getCellColor = (playerId: string) => {
        if (!playerId) return "bg-blue-900/50 hover:bg-white/10 cursor-pointer";
        return playerId === startPlayerId ? "bg-red-500" : "bg-yellow-400";
    };

    // My Color Helper
    const myColor = currentUserTomId === startPlayerId ? "Red" : "Yellow";

    // Sync state with incoming gameData prop (initial load)
    useEffect(() => {
        if (gameData) {
            setBoard(gameData.board);
            setTurn(gameData.turn);
            setWinner(gameData.winner);
        }
    }, [gameData]);

    // Realtime subscription
    useEffect(() => {
        if (!isOpen || !matchId) return;

        const channel = supabase
            .channel(`minigame-${matchId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "mini_games",
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    console.log("[Connect4] Realtime Update Received:", payload);
                    const newData = payload.new;
                    setBoard(newData.board);
                    setTurn(newData.turn);
                    setWinner(newData.winner);
                }
            )
            .subscribe((status) => {
                console.log("[Connect4] Subscription Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, matchId, isOpen]);

    const checkWin = (board: string[][], row: number, col: number, player: string) => {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            let count = 1;
            for (let i = 1; i < 4; i++) {
                const r = row + (dr * i), c = col + (dc * i);
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
                else break;
            }
            for (let i = 1; i < 4; i++) {
                const r = row - (dr * i), c = col - (dc * i);
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
                else break;
            }
            if (count >= 4) return true;
        }
        return false;
    };

    const handleDrop = async (colIndex: number) => {
        if (winner || isSubmitting || turn !== currentUserTomId) return;

        let rowIndex = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!board[r][colIndex]) {
                rowIndex = r;
                break;
            }
        }
        if (rowIndex === -1) return;

        setIsSubmitting(true);
        const newBoard = board.map(row => [...row]);
        newBoard[rowIndex][colIndex] = currentUserTomId;

        // Immediate local update
        setBoard(newBoard);

        const isWin = checkWin(newBoard, rowIndex, colIndex, currentUserTomId);
        const nextWinner = isWin ? currentUserTomId : null;

        const nextTurn = isWin ? turn : (turn === p1Id ? p2Id : p1Id);
        setTurn(nextTurn);
        if (isWin) setWinner(nextWinner);

        try {
            await updateGameState(matchId, newBoard, nextTurn, nextWinner);
        } catch (error) {
            console.error("Failed to update game:", error);
            toast.error("Failed to make move.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-opacity-95 backdrop-blur-xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-black bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                        CONNECT 4
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {winner ? (
                            winner === currentUserTomId ?
                                <span className="text-green-500 font-bold">YOU WIN!</span> :
                                <span className="text-red-500 font-bold">GAME OVER</span>
                        ) : (
                            turn === currentUserTomId ?
                                <span className={cn("font-bold animate-pulse", myColor === "Red" ? "text-red-500" : "text-yellow-500")}>
                                    YOUR TURN ({myColor})
                                </span> :
                                <span className="text-muted-foreground">Waiting for opponent...</span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center p-4">
                    <div className="grid grid-cols-7 gap-2 p-4 bg-blue-800 rounded-lg shadow-inner border-4 border-blue-900">
                        {board.map((row, rIndex) => (
                            row.map((cell, cIndex) => (
                                <div
                                    key={`${rIndex}-${cIndex}`}
                                    onClick={() => handleDrop(cIndex)}
                                    className={cn(
                                        "w-8 h-8 rounded-full transition-all duration-300 shadow-md",
                                        getCellColor(cell)
                                    )}
                                />
                            ))
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
