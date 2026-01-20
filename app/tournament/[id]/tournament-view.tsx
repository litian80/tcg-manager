"use client";

import { useState } from "react";
import { Search, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { hasPermission, Role } from "@/lib/rbac";

import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/tournament/match-card";

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
    outcome?: number;
    p1_display_record?: string;
    p2_display_record?: string;
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
    userRole?: Role;
}

export default function TournamentView({
    tournament,
    matches,
    currentRound,
    stats,
    userRole,
}: TournamentViewProps) {
    const canEditMatch = hasPermission(userRole, 'match.edit_result');
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
                                        {roundMatches.map((match) => (
                                            <MatchCard
                                                key={match.id}
                                                match={match}
                                                stats={stats}
                                                canEdit={canEditMatch}
                                            />
                                        ))}
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
