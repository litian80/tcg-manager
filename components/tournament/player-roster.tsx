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

interface Player {
    id: string;
    first_name: string | null;
    last_name: string | null;
    tom_player_id: string | null;
    registration_status?: string;
}

interface PlayerRosterProps {
    players: Player[];
    canManage?: boolean;
    tournamentId?: string;
}

export function PlayerRoster({ players, canManage, tournamentId }: PlayerRosterProps) {
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Player Roster ({players.length})</CardTitle>
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
                                        {player.first_name || "Unknown"} {player.last_name || "Unknown"}
                                    </TableCell>
                                    <TableCell>
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
