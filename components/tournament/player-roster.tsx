import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { ScrollText } from "lucide-react";

interface Player {
    id: string;
    player_id?: string;
    first_name: string | null;
    last_name: string | null;
    tom_player_id: string | null;
    registration_status?: string;
    division?: string | null;
    deck_list_status?: 'online' | 'paper' | 'missing';
}

interface PlayerRosterProps {
    players: Player[];
    canManage?: boolean;
    tournamentId?: string;
    requiresDeckList?: boolean;
    myPlayerId?: string;
    onPlayerClick?: (player: { id: string; name: string; dbId?: string }) => void;
}

export function PlayerRoster({ players, canManage, tournamentId, requiresDeckList, myPlayerId, onPlayerClick }: PlayerRosterProps) {
    // Sort players alphabetically by First Name
    const sortedPlayers = [...players].sort((a, b) => {
        const isMeA = myPlayerId && (a.id === myPlayerId || a.tom_player_id === myPlayerId);
        const isMeB = myPlayerId && (b.id === myPlayerId || b.tom_player_id === myPlayerId);
        
        if (isMeA && !isMeB) return -1;
        if (!isMeA && isMeB) return 1;

        const nameA = (a.first_name || "").toLowerCase();
        const nameB = (b.first_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
    });

    // Count deck submissions
    const onlineCount = requiresDeckList ? players.filter(p => p.deck_list_status === 'online').length : 0;
    const paperCount = requiresDeckList ? players.filter(p => p.deck_list_status === 'paper').length : 0;
    const totalSubmitted = onlineCount + paperCount;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Player Roster ({players.length})</CardTitle>
                    {requiresDeckList && players.length > 0 && (
                        <Badge variant="outline" className="gap-1 text-xs">
                            <ScrollText className="h-3 w-3" />
                            {totalSubmitted}/{players.length} decks
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {players.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        No players currently registered.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                {canManage && <TableHead>Status</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPlayers.map((player) => {
                                const isMe = (myPlayerId) && (player.id === myPlayerId || player.tom_player_id === myPlayerId);
                                
                                return (
                                <TableRow key={player.id} className={isMe ? "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40" : ""}>
                                    <TableCell className="font-medium">
                                        {canManage && onPlayerClick ? (
                                            <button
                                                onClick={() => onPlayerClick({
                                                    id: player.tom_player_id || player.id,
                                                    name: `${player.first_name || "Unknown"} ${player.last_name || "Unknown"}`,
                                                    dbId: player.player_id || player.id
                                                })}
                                                className="text-left hover:underline flex items-center gap-2"
                                            >
                                                <span>{player.first_name || "Unknown"} {player.last_name || "Unknown"}</span>
                                                {isMe && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 mt-0.5">You</Badge>}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>{player.first_name || "Unknown"} {player.last_name || "Unknown"}</span>
                                                {isMe && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">You</Badge>}
                                            </div>
                                        )}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                <Badge 
                                                    variant={
                                                        player.registration_status === 'checked_in' ? 'default' : 
                                                        player.registration_status === 'waitlisted' ? 'secondary' : 
                                                        player.registration_status === 'withdrawn' || player.registration_status === 'cancelled' ? 'destructive' : 
                                                        'outline'
                                                    }
                                                    className={player.registration_status === 'checked_in' ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                                >
                                                    {player.registration_status ? player.registration_status.replace('_', ' ').toUpperCase() : 'REGISTERED'}
                                                </Badge>
                                                {requiresDeckList && (
                                                    player.deck_list_status === 'online' ? (
                                                        <span className="text-xs text-green-600 flex items-center gap-0.5">
                                                            <ScrollText className="h-3 w-3" />
                                                            Online ✓
                                                        </span>
                                                    ) : player.deck_list_status === 'paper' ? (
                                                        <span className="text-xs text-blue-600 flex items-center gap-0.5">
                                                            <ScrollText className="h-3 w-3" />
                                                            Paper ✓
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-destructive flex items-center gap-0.5">
                                                            <ScrollText className="h-3 w-3" />
                                                            No deck
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
