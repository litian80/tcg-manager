"use client";

import { useState } from "react";
import { Search, Trophy, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
                        <div className="text-center">
                            <h1 className="text-lg font-bold leading-tight line-clamp-1">{tournament.name}</h1>
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
                                        <p>No matches found for "{searchQuery}" in Round {round}</p>
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
                                            const p1Style = isFinished
                                                ? (winnerId === p1Id ? "text-foreground font-bold" : (isTie ? "text-foreground" : "text-muted-foreground/60"))
                                                : "text-foreground font-semibold";

                                            const p2Style = isFinished
                                                ? (winnerId === p2Id ? "text-foreground font-bold" : (isTie ? "text-foreground" : "text-muted-foreground/60"))
                                                : "text-foreground font-semibold";

                                            return (
                                                <div key={match.id} className="flex items-stretch bg-card hover:bg-muted/50 transition-colors">
                                                    {/* Left: Table Number (Anchor) */}
                                                    <div className="flex-none w-16 flex items-center justify-center bg-muted/5">
                                                        <span className="text-2xl font-bold text-muted-foreground/40">
                                                            {match.table_number}
                                                        </span>
                                                    </div>

                                                    {/* Right: The Match */}
                                                    <div className="flex-1 p-3 flex flex-col justify-center min-w-0 py-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-tight">
                                                            <span className={cn("truncate flex flex-col items-start transition-colors", p1Style)}>
                                                                <span className="flex items-center gap-1">
                                                                    {match.p1 ? `${match.p1.first_name} ${match.p1.last_name}` : <span className="text-muted-foreground italic">Bye</span>}
                                                                    {isFinished && winnerId === p1Id && <Check className="w-4 h-4 text-green-500" />}
                                                                </span>
                                                                {match.p1 && match.player1_tom_id && (
                                                                    <span className="text-xs text-muted-foreground font-normal">
                                                                        {match.player1_tom_id} • ({stats[match.player1_tom_id]?.wins ?? 0}-{stats[match.player1_tom_id]?.losses ?? 0}-{stats[match.player1_tom_id]?.ties ?? 0})
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="hidden sm:inline text-xs text-muted-foreground">vs</span>
                                                            <span className="sm:hidden text-xs text-muted-foreground py-0.5">vs</span>
                                                            <span className={cn("truncate flex flex-col items-end sm:items-start text-right sm:text-left transition-colors", p2Style)}>
                                                                <span className="flex items-center gap-1 flex-row-reverse sm:flex-row">
                                                                    {match.p2 ? `${match.p2.first_name} ${match.p2.last_name}` : <span className="text-muted-foreground italic">Bye</span>}
                                                                    {isFinished && winnerId === p2Id && <Check className="w-4 h-4 text-green-500" />}
                                                                </span>
                                                                {match.p2 && match.player2_tom_id && (
                                                                    <span className="text-xs text-muted-foreground font-normal">
                                                                        {match.player2_tom_id} • ({stats[match.player2_tom_id]?.wins ?? 0}-{stats[match.player2_tom_id]?.losses ?? 0}-{stats[match.player2_tom_id]?.ties ?? 0})
                                                                    </span>
                                                                )}
                                                            </span>
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
