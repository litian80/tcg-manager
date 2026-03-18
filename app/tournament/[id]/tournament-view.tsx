"use client";

import { UserResult } from "@/app/tournament/actions";
import { useState, useEffect, useMemo } from "react";
import { Search, ArrowLeft, Settings, ScrollText, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { hasPermission, Role } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/tournament/match-card";
import { StandingsView } from "@/components/tournament/standings-view";
import { PlayerRoster } from "@/components/tournament/player-roster";
import { PenaltyModal } from "@/components/judge/penalty-modal";
import { JudgePlayerDetailModal } from "@/components/judge/judge-player-detail-modal";
import { TimeExtensionModal } from "@/components/judge/time-extension-modal";
import { RegisterButton } from "@/components/registration/RegisterButton";
import { DeckSubmissionModal } from "@/components/tournament/DeckSubmissionModal";
import { toast } from "sonner";
import type { ParsedCard } from "@/utils/deck-validator";

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
    time_extension_minutes?: number;
}

export interface Tournament {
    id: string;
    name: string;
    status: string;
    total_rounds: number;
    date: string;
    registration_open?: boolean;
    registration_opens_at?: string | null;
    registration_closes_at?: string | null;
    publish_roster?: boolean;
    requires_deck_list?: boolean;
    deck_list_submission_deadline?: string | null;
}

export interface RosterPlayer {
    id: string;
    first_name: string | null;
    last_name: string | null;
    tom_player_id: string | null;
    registration_status?: string;
}

interface TournamentViewProps {
    tournament: Tournament;
    matches: Match[];
    currentRound: number;
    stats: Record<string, { wins: number; losses: number; ties: number }>;
    userRole?: Role;
    canManageStaff: boolean;
    rosterPlayers?: RosterPlayer[];
    myPlayerId?: string;
    myRegistrationStatus?: string | null;
    penaltyCounts?: Record<string, number>;
    deckList?: any;
}

export default function TournamentView({
    tournament,
    matches,
    currentRound,
    stats,
    userRole,
    canManageStaff,
    rosterPlayers = [],
    myPlayerId,
    myRegistrationStatus,
    penaltyCounts = {},
    deckList,
}: TournamentViewProps) {
    const canEditMatch = hasPermission(userRole, 'match.edit_result');
    const [searchQuery, setSearchQuery] = useState("");
    const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
    const [deckListState, setDeckListState] = useState(deckList);
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isClose: boolean; isPast: boolean } | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Determine if we have matches to decide view mode
    const hasMatches = matches.length > 0;

    // extract unique divisions, default to first one found or "Masters" if none specific
    const divisions = Array.from(new Set(matches.map(m => m.division).filter(Boolean))) as string[];

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

    const [viewMode, setViewMode] = useState<'pairings' | 'standings'>('pairings');

    // Judge Actions Logic
    const isJudge = hasPermission(userRole, 'match.edit_result');
    const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string; tomId: string; matchId?: string; extension?: number } | null>(null);

    // Time Extension Modal State
    const [extensionModalOpen, setExtensionModalOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<{ id: string; tableNumber: number; extension: number } | null>(null);

    const onPenalty = (player: { id: string; name: string; tomId: string; matchId?: string; extension?: number }) => {
        setSelectedPlayer(player);
        setPenaltyModalOpen(true);
    };

    const onExtension = (matchId: string, currentExtension: number, tableNumber: number) => {
        setSelectedMatch({ id: matchId, tableNumber, extension: currentExtension });
        setExtensionModalOpen(true);
    };

    // Deck submission logic
    const memoizedDeadline = useMemo(() => {
        return tournament.deck_list_submission_deadline ? new Date(tournament.deck_list_submission_deadline) : null;
    }, [tournament.deck_list_submission_deadline]);

    const isDeadlinePassed = !!(memoizedDeadline && memoizedDeadline < new Date());
    
    // Calculate time left to deadline
    useEffect(() => {
        if (!memoizedDeadline) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = memoizedDeadline.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeLeft(prev => {
                    if (prev?.isPast) return prev;
                    return {
                        hours: 0,
                        minutes: 0,
                        seconds: 0,
                        isClose: false,
                        isPast: true
                    };
                });
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            const isClose = hours < 1; // Less than 1 hour remaining
            
            setTimeLeft(prev => {
                if (!prev || prev.hours !== hours || prev.minutes !== minutes || prev.seconds !== seconds || prev.isPast) {
                    return { hours, minutes, seconds, isClose, isPast: false };
                }
                return prev;
            });
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        
        return () => clearInterval(interval);
    }, [memoizedDeadline]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Keep deckListState in sync with prop from server
    useEffect(() => {
        setDeckListState(deckList);
    }, [deckList]);

    // Show deck submission button only if:
    // 1. Tournament requires deck list
    // 2. User is registered or checked in
    // 3. Deadline hasn't passed (or show disabled if passed)
    // 4. Tournament is not completed
    const shouldShowDeckSubmission = tournament.requires_deck_list && 
        (myRegistrationStatus === 'registered' || myRegistrationStatus === 'checked_in') &&
        tournament.status !== 'completed';
    
    const deckSubmissionButtonText = deckListState ? "Edit Deck List" : "Submit Deck List";

    // Handle deck submission success
    const handleDeckSubmissionSuccess = (newDeckText: string) => {
        // Update local state to avoid full page reload
        setDeckListState((prev: any) => ({ 
            ...prev, 
            raw_text: newDeckText,
            submitted_at: new Date().toISOString()
        }));
        // toast.success inside modal handled it, but we can do more here if needed
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Sticky Header & Search */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
                <div className="p-4 pb-2 max-w-md mx-auto w-full space-y-3">
                    {/* Top Navigation & Title */}
                    <div className="flex items-center justify-between gap-4 w-full">
                        {/* Left Side: Back Button + Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-xl font-bold truncate leading-tight">{tournament.name}</h1>
                                {!hasMatches ? (
                                    <p className="text-xs text-muted-foreground font-medium truncate">
                                        Pre-Tournament Roster
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground font-medium truncate">
                                        Round {currentRound} of {tournament.total_rounds}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Badge + Action Button */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Deck Submission Status Badge */}
                            {shouldShowDeckSubmission && (
                                <Badge 
                                    variant={deckListState ? "default" : "destructive"} 
                                    className={deckListState ? "bg-green-100 text-green-700 border-green-200" : ""}
                                >
                                    {deckListState ? "Deck Submitted" : "Deck Missing"}
                                </Badge>
                            )}
                            
                            {!hasMatches ? (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                                    Pre-Tournament
                                </Badge>
                            ) : (
                                <>
                                    {tournament.status === 'running' && (
                                        <Badge className="bg-green-600 hover:bg-green-700 animate-pulse border-transparent text-white">
                                            Live
                                        </Badge>
                                    )}
                                    {tournament.status === 'completed' && (
                                        <Badge variant="secondary">
                                            Completed
                                        </Badge>
                                    )}
                                </>
                            )}
                            {canManageStaff && (
                                <Link href={`/organizer/tournaments/${tournament.id}`}>
                                    <Button variant="ghost" size="icon">
                                        <Settings className="h-5 w-5" />
                                        <span className="sr-only">Manage Tournament</span>
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Registration Button (Visible if Registration is Enabled or User is Registered) */}
                    {(!hasMatches && (tournament.registration_open || myRegistrationStatus)) && (
                        <div className="pt-2">
                            <RegisterButton 
                                tournamentId={tournament.id}
                                status={myRegistrationStatus}
                                registrationOpen={!!tournament.registration_open}
                                opensAt={tournament.registration_opens_at}
                                closesAt={tournament.registration_closes_at}
                            />
                        </div>
                    )}

                    {/* Deck Submission Button with Deadline Warning */}
                    {shouldShowDeckSubmission && (
                        <div className="pt-2 space-y-2">
                            <Button
                                onClick={() => setIsDeckModalOpen(true)}
                                disabled={isDeadlinePassed}
                                variant={deckListState ? "outline" : "default"}
                                className={cn(
                                    "w-full justify-start gap-2",
                                    timeLeft?.isClose && !isDeadlinePassed && "border-amber-500 text-amber-700 hover:bg-amber-50"
                                )}
                            >
                                <ScrollText className="h-4 w-4" />
                                {deckSubmissionButtonText}
                                {isDeadlinePassed && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        Deadline Passed
                                    </span>
                                )}
                                {timeLeft?.isClose && !isDeadlinePassed && (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
                                        <Clock className="h-3 w-3" />
                                        {timeLeft.hours}h {timeLeft.minutes}m
                                    </span>
                                )}
                            </Button>
                            
                            {/* Deadline Information */}
                            {memoizedDeadline && (
                                <div className="flex items-start gap-2 text-xs">
                                    <Clock className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">
                                            Deck list submission {isDeadlinePassed ? "closed" : "closes"} on {isMounted ? memoizedDeadline.toLocaleDateString() : '...'} at {isMounted ? memoizedDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                        </p>
                                        
                                        {timeLeft && !timeLeft.isPast && (
                                            <p className={cn(
                                                "font-medium",
                                                timeLeft.isClose ? "text-amber-600" : "text-green-600"
                                            )}>
                                                {timeLeft.isClose ? (
                                                    <span className="flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        {timeLeft.hours === 0 
                                                            ? `${timeLeft.minutes}m ${timeLeft.seconds}s remaining`
                                                            : `${timeLeft.hours}h ${timeLeft.minutes}m remaining`
                                                        }
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {timeLeft.hours} hours {timeLeft.minutes} minutes remaining
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View Toggle - Only show if completed AND has matches */}
                    {hasMatches && tournament.status === 'completed' && (
                        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
                            <button
                                onClick={() => setViewMode('pairings')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                    viewMode === 'pairings'
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Pairings
                            </button>
                            <button
                                onClick={() => setViewMode('standings')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                    viewMode === 'standings'
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Standings
                            </button>
                        </div>
                    )}

                    {/* Sticky Search (Only for Pairings AND has matches) */}
                    {hasMatches && viewMode === 'pairings' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Find your name..."
                                className="pl-9 h-9 text-base shadow-none bg-muted/50 focus-visible:bg-background rounded-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-md mx-auto w-full pb-8">
                {!hasMatches ? (
                    <div className="p-4">
                        {(canManageStaff || tournament.publish_roster) ? (
                            <PlayerRoster 
                                players={rosterPlayers} 
                                canManage={canManageStaff} 
                                tournamentId={tournament.id} 
                            />
                        ) : (
                            <div className="text-center p-8 bg-muted/50 rounded-lg text-muted-foreground">
                                Player roster is currently hidden for this event.
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {viewMode === 'standings' ? (
                            <div className="p-4">
                                <StandingsView tournamentId={tournament.id} myPlayerId={myPlayerId} />
                            </div>
                        ) : (
                            <>
                                {/* Division Selector */}
                                {sortedDivisions.length > 0 && (
                                    <div className={cn(
                                        "px-4 py-2 sticky z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                                        tournament.status === 'completed' ? "top-[125px]" : "top-[80px]"
                                    )}>
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
                                    <div className={cn(
                                        "sticky z-10 bg-background border-b px-4",
                                        sortedDivisions.length > 0
                                            ? (tournament.status === 'completed' ? "top-[180px]" : "top-[135px]")
                                            : (tournament.status === 'completed' ? "top-[125px]" : "top-[80px]")
                                    )}>
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
                                                                myPlayerId={myPlayerId}
                                                                isJudge={isJudge} // Pass Judge Status
                                                                onPlayerClick={(player) => {
                                                                    setSelectedPlayer(player);
                                                                    setPenaltyModalOpen(true);
                                                                }}
                                                                onExtensionClick={(matchId, currentExt) => {
                                                                    onExtension(matchId, currentExt, match.table_number);
                                                                }}
                                                                p1Penalties={penaltyCounts[match.player1_tom_id || ""] || 0}
                                                                p2Penalties={penaltyCounts[match.player2_tom_id || ""] || 0}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </TabsContent>
                                        );
                                    })}
                                </Tabs>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Deck Submission Modal */}
            <DeckSubmissionModal
                isOpen={isDeckModalOpen}
                onClose={() => setIsDeckModalOpen(false)}
                tournamentId={tournament.id}
                initialDeckText={deckListState?.raw_text || ""}
                onSuccess={handleDeckSubmissionSuccess}
            />

            {/* Judge Actions Modals */}
            {/* Penalty Modal -> Judge Player Detail Modal */}
            {selectedPlayer && (
                <JudgePlayerDetailModal
                    isOpen={penaltyModalOpen}
                    onClose={() => {
                        setPenaltyModalOpen(false);
                        setSelectedPlayer(null);
                    }}
                    tournamentId={tournament.id}
                    player={selectedPlayer}
                    roundNumber={currentRound}
                    canEditPenalties={canManageStaff}
                />
            )}

            {/* Time Extension Modal */}
            {selectedMatch && (
                <TimeExtensionModal
                    isOpen={extensionModalOpen}
                    onClose={() => {
                        setExtensionModalOpen(false);
                        setSelectedMatch(null);
                    }}
                    matchId={selectedMatch.id}
                    tableNumber={selectedMatch.tableNumber}
                    currentExtension={selectedMatch.extension}
                />
            )}
        </div>
    );
}


