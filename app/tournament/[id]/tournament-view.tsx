"use client";

import { useState } from "react";
import { Search, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export interface Player {
    first_name: string;
    last_name: string;
}

export interface Match {
    id: string;
    round_number: number;
    table_number: number;
    player1_tom_id: string;
    player2_tom_id: string;
    p1?: Player;
    p2?: Player;
    winner_tom_id?: string | null;
    division?: string | null;
    is_finished: boolean;
}

export interface Tournament {
    id: string;
    name: string;
    status: string;
    total_rounds: number;
    date: string;
}

interface TournamentViewProps {
    tournament: Tournament;
    matches: Match[];
    currentRound: number;
    stats: Record<string, { wins: number; losses: number; ties: number }>;
}

export default function TournamentView({
    tournament,
    matches,
    currentRound,
    stats,
}: TournamentViewProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // extract unique divisions, default to first one found or "Masters" if none specific
    const divisions = Array.from(new Set(matches.map(m => m.division).filter(Boolean))) as string[];
    // If no divisions found in matches, we might fallback to a default or just hide the selector
    // But for now let's assume if divisions exist we use them.

    // Sort divisions to ensure Masters is first if present, otherwise alphabetical
    const sortedDivisions = divisions.sort((a, b) => {
        const order = ["Masters", "Seniors", "Juniors"];
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    const [selectedDivision, setSelectedDivision] = useState<string>(sortedDivisions[0] || "");

    // Filter matches by selected division
    const divisionMatches = selectedDivision
        ? matches.filter(m => m.division === selectedDivision)
        : matches;

    // Calculate available rounds for this division
    const maxRound = divisionMatches.length > 0
        ? Math.max(...divisionMatches.map(m => m.round_number))
        : (tournament.total_rounds || 1);

    const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

    const getRoundMatches = (round: number) => {
        return divisionMatches.filter(m => m.round_number === round && (
            !searchQuery ||
            (m.p1 ? `${m.p1.first_name} ${m.p1.last_name}`.toLowerCase() : "").includes(searchQuery.toLowerCase()) ||
            (m.p2 ? `${m.p2.first_name} ${m.p2.last_name}`.toLowerCase() : "").includes(searchQuery.toLowerCase())
        ));
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Sticky Header & Search */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
                <div className="p-4 pb-2 max-w-md mx-auto w-full space-y-3">
                    {/* Top Navigation & Title */}
                    <div className="flex items-center justify-between">
                        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="text-center flex flex-col items-center">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold leading-tight line-clamp-1">{tournament.name}</h1>
                                {tournament.status === 'running' && (
                                    <Badge className="bg-green-600 hover:bg-green-700 animate-pulse border-transparent text-white">
                                        Live
                                    </Badge>
                                )}
                                {tournament.status === 'completed' && (
                                    <Badge variant="secondary">
                                        Finalized
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                                Round {currentRound} of {tournament.total_rounds}
                            </p>
                        </div>
                        <div className="w-5" /> {/* Spacer for centering */}
                    </div>

                    {/* Sticky Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find your name..."
                            className="pl-9 h-9 text-base shadow-none bg-muted/50 focus-visible:bg-background rounded-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs and Matches List */}
            <div className="flex-1 max-w-md mx-auto w-full pb-8">
                {/* Division Selector */}
                {sortedDivisions.length > 0 && (
                    <div className="px-4 py-2 sticky top-[125px] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="flex p-1 bg-muted rounded-lg">
                            {sortedDivisions.map((division) => (
                                <button
                                    key={division}
                                    onClick={() => setSelectedDivision(division)}
                                    className={cn(
                                        "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                        selectedDivision === division
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                >
                                    {division}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <Tabs defaultValue={String(currentRound)} className="w-full">
                    <div className={cn("sticky z-10 bg-background border-b px-4", sortedDivisions.length > 0 ? "top-[180px]" : "top-[125px]")}>
                        <TabsList className="w-full flex overflow-x-auto justify-start h-auto p-1 bg-transparent hide-scrollbar">
                            {rounds.map((round) => (
                                <TabsTrigger
                                    key={round}
                                    value={String(round)}
                                    className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-shrink-0 mr-2"
                                >
                                    Round {round}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {rounds.map((round) => {
                        const roundMatches = getRoundMatches(round);

                        return (
                            <TabsContent key={round} value={String(round)} className="mt-0">
                                {roundMatches.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No matches found for &quot;{searchQuery}&quot; in Round {round}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border border-b">
                                        {roundMatches.map((match) => {
                                            const isFinished = match.is_finished;
                                            const winnerId = match.winner_tom_id;
                                            const p1Id = match.player1_tom_id;
                                            const p2Id = match.player2_tom_id;
                                            const isTie = isFinished && !winnerId;

                                            // Determine styles based on result
                                            const getPlayerStyle = (playerId: string | undefined, otherPlayerId: string | undefined) => {
                                                // Unfinished matches: Use font-medium to allow Bold to stand out more
                                                if (!isFinished) return "text-foreground font-medium";

                                                if (isTie) {
                                                    // Tie: Light Gray background (lighter than loser), standard text
                                                    return "bg-gray-50 dark:bg-gray-900/50 text-foreground";
                                                }

                                                if (winnerId === playerId) {
                                                    // Winner: Bold, standard text, subtle/no background
                                                    return "font-bold text-foreground";
                                                }

                                                if (winnerId === otherPlayerId) {
                                                    // Loser: Gray text, Gray background (more visible than muted/50)
                                                    return "text-muted-foreground bg-gray-100 dark:bg-gray-800";
                                                }

                                                return "text-foreground";
                                            };

                                            const p1Style = getPlayerStyle(p1Id, p2Id);
                                            const p2Style = getPlayerStyle(p2Id, p1Id);

                                            return (
                                                <div key={match.id} className="flex items-stretch bg-card hover:bg-muted/50 transition-colors py-2">
                                                    {/* Left: Table Number (Anchor) */}
                                                    <div className="flex-none w-12 sm:w-16 flex items-center justify-center border-r border-border/50 mr-2 sm:mr-4">
                                                        <span className="text-xl sm:text-2xl font-bold text-muted-foreground/40">
                                                            {match.table_number}
                                                        </span>
                                                    </div>

                                                    {/* Right: The Match */}
                                                    <div className="flex-1 pr-4 py-1 flex items-center">
                                                        <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:gap-4 items-center gap-2">
                                                            {/* Player 1 */}
                                                            <div className={cn(
                                                                "flex items-center justify-between md:justify-end gap-2 p-2 rounded-md transition-colors",
                                                                p1Style
                                                            )}>
                                                                <div className="flex flex-col items-start md:items-end min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 w-full md:justify-end">
                                                                        {isFinished && winnerId === p1Id && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                                                                        <span className="truncate">
                                                                            {match.p1 ? `${match.p1.first_name} ${match.p1.last_name}` : <span className="text-muted-foreground italic">Bye</span>}
                                                                        </span>
                                                                    </div>
                                                                    {match.p1 && match.player1_tom_id && (
                                                                        <span className="text-xs text-muted-foreground font-normal opacity-80">
                                                                            {match.player1_tom_id} • ({stats[match.player1_tom_id]?.wins ?? 0}-{stats[match.player1_tom_id]?.losses ?? 0}-{stats[match.player1_tom_id]?.ties ?? 0})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* VS Separator */}
                                                            <div className="flex justify-center items-center py-1 md:py-0">
                                                                <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest bg-muted/10 px-2 py-0.5 rounded-full">
                                                                    VS
                                                                </span>
                                                            </div>

                                                            {/* Player 2 */}
                                                            <div className={cn(
                                                                "flex items-center justify-between md:justify-start gap-2 p-2 rounded-md transition-colors",
                                                                p2Style
                                                            )}>
                                                                <div className="flex flex-col items-start min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 w-full md:justify-start">
                                                                        <span className="truncate order-2 md:order-1">
                                                                            {match.p2 ? `${match.p2.first_name} ${match.p2.last_name}` : <span className="text-muted-foreground italic">Bye</span>}
                                                                        </span>
                                                                        {isFinished && winnerId === p2Id && <Check className="w-4 h-4 text-green-500 shrink-0 order-1 md:order-2" />}
                                                                    </div>
                                                                    {match.p2 && match.player2_tom_id && (
                                                                        <span className="text-xs text-muted-foreground font-normal opacity-80">
                                                                            {match.player2_tom_id} • ({stats[match.player2_tom_id]?.wins ?? 0}-{stats[match.player2_tom_id]?.losses ?? 0}-{stats[match.player2_tom_id]?.ties ?? 0})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </div>
        </div>
    );
}
