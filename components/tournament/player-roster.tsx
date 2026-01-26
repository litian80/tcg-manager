import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Player {
    id: string;
    first_name: string | null;
    last_name: string | null;
    tom_player_id: string | null;
}

interface PlayerRosterProps {
    players: Player[];
}

export function PlayerRoster({ players }: PlayerRosterProps) {
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPlayers.map((player) => (
                                <TableRow key={player.id}>
                                    <TableCell className="font-medium">
                                        {player.first_name || "Unknown"} {player.last_name || "Unknown"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
