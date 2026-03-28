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
import { updateRegistrationStatus } from "@/actions/roster-management";
import { useState } from "react";
import { ScrollText } from "lucide-react";

interface Player {
    id: string;
    player_id?: string;
    first_name: string | null;
    last_name: string | null;
    tom_player_id: string | null;
    registration_status?: string;
    deck_list_status?: 'online' | 'paper' | 'missing';
}

interface PlayerRosterProps {
    players: Player[];
    canManage?: boolean;
    tournamentId?: string;
    requiresDeckList?: boolean;
    onPlayerClick?: (player: { id: string; name: string; dbId?: string }) => void;
}

export function PlayerRoster({ players, canManage, tournamentId, requiresDeckList, onPlayerClick }: PlayerRosterProps) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const handleStatusChange = async (playerId: string, newStatus: string) => {
        if (!tournamentId || !playerId) return;
        
        setLoadingMap(prev => ({ ...prev, [playerId]: true }));
        try {
            const result = await updateRegistrationStatus(tournamentId, playerId, newStatus);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Player marked as ${newStatus.replace('_', ' ')}`);
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setLoadingMap(prev => ({ ...prev, [playerId]: false }));
        }
    };

    // Sort players alphabetically by First Name
    const sortedPlayers = [...players].sort((a, b) => {
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
                                <TableHead>Status</TableHead>
                                {canManage && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPlayers.map((player) => (
                                <TableRow key={player.id}>
                                    <TableCell className="font-medium">
                                        {canManage && onPlayerClick ? (
                                            <button
                                                onClick={() => onPlayerClick({
                                                    id: player.tom_player_id || player.id,
                                                    name: `${player.first_name || "Unknown"} ${player.last_name || "Unknown"}`,
                                                    dbId: player.player_id || player.id
                                                })}
                                                className="text-left hover:underline"
                                            >
                                                {player.first_name || "Unknown"} {player.last_name || "Unknown"}
                                            </button>
                                        ) : (
                                            <>{player.first_name || "Unknown"} {player.last_name || "Unknown"}</>
                                        )}
                                    </TableCell>
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
                                    {canManage && (
                                        <TableCell className="text-right space-x-2">
                                            {(player.registration_status === 'registered' || !player.registration_status) && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(player.id, 'checked_in')}
                                                    disabled={loadingMap[player.id]}
                                                    className="border-green-600 text-green-600 hover:bg-green-50"
                                                >
                                                    Check In
                                                </Button>
                                            )}
                                            {player.registration_status === 'waitlisted' && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleStatusChange(player.id, 'registered')}
                                                    disabled={loadingMap[player.id]}
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
