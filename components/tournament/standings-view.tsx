'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { User, Trophy } from 'lucide-react';

interface Standing {
    player_id: string;
    rank: number;
    division: string | null;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    player: {
        first_name: string;
        last_name: string;
    } | null;
}

interface StandingsViewProps {
    tournamentId: string;
}

export function StandingsView({ tournamentId }: StandingsViewProps) {
    const [standings, setStandings] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>("Master");

    useEffect(() => {
        const fetchStandings = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('tournament_players')
                .select(`
                    player_id,
                    rank,
                    division,
                    wins,
                    losses,
                    ties,
                    points,
                    player:players(first_name, last_name)
                `)
                .eq('tournament_id', tournamentId)
                .not('rank', 'is', null) // Only show players with a rank
                .order('rank', { ascending: true });

            if (error) {
                console.error('Error fetching standings:', error);
            } else {
                setStandings(data as any);
            }
            setLoading(false);
        };

        fetchStandings();
    }, [tournamentId]);

    if (loading) return <div className="p-4 text-center">Loading Standings...</div>;

    if (standings.length === 0) return <div className="p-4 text-center text-muted-foreground">No standings available yet.</div>;

    // Group by Division
    const divisions = {
        Junior: standings.filter(s => s.division === 'Junior'),
        Senior: standings.filter(s => s.division === 'Senior'),
        Master: standings.filter(s => s.division === 'Master'),
    };

    const hasJuniors = divisions.Junior.length > 0;
    const hasSeniors = divisions.Senior.length > 0;
    const hasMasters = divisions.Master.length > 0;

    // Determine default tab if currently active one is empty
    // (Managed by Tabs component logic usually, but good to be safe)

    // Sort logic within groups is already handled by SQL .order('rank')

    return (
        <Card className="w-full">
            <CardContent className="p-6">
                <Tabs defaultValue="Master" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="Junior" disabled={!hasJuniors}>Junior ({divisions.Junior.length})</TabsTrigger>
                        <TabsTrigger value="Senior" disabled={!hasSeniors}>Senior ({divisions.Senior.length})</TabsTrigger>
                        <TabsTrigger value="Master" disabled={!hasMasters}>Master ({divisions.Master.length})</TabsTrigger>
                    </TabsList>

                    {Object.entries(divisions).map(([divName, players]) => (
                        <TabsContent key={divName} value={divName}>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Rank</TableHead>
                                            <TableHead>Player</TableHead>
                                            <TableHead className="text-right">Record</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {players.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center h-24">
                                                    No players in this division.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            players.map((s) => (
                                                <TableRow key={s.player_id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {s.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                                            {s.rank}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold">
                                                            {s.player?.first_name} {s.player?.last_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="font-mono">
                                                            {s.wins}-{s.losses}-{s.ties}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {s.points} pts
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
}
