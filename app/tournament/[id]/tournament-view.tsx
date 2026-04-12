"use client";

import { UserResult } from "@/actions/tournament/staff";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, ArrowLeft, Settings, ScrollText, AlertTriangle, Clock, Users, Ban } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDateTimeCompact } from "@/lib/utils";
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
import type { ParsedCard } from "@/types/deck";
import { getMatchReportingStatus } from "@/utils/match-reporting";
import { AnnouncementBanner, Announcement } from "@/components/tournament/announcement-banner";

/** Track the rendered height of an element via ResizeObserver. */
function useStickyHeight() {
    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const ro = new ResizeObserver(([entry]) => {
            setHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return { ref, height };
}

import { Match, ExtendedTournament as Tournament, RosterPlayer, MatchPlayer as Player } from '@/types'
import { PlayerDashboard } from "@/components/tournament/player-dashboard"

interface TournamentViewProps {
    tomStage: number;
    tournament: Tournament;
    matches: Match[];
    currentRound: number;
    stats: Record<string, { wins: number; losses: number; ties: number }>;
    isJudge: boolean;
    canManageStaff: boolean;
    rosterPlayers?: RosterPlayer[];
    myPlayerId?: string;
    myRegistrationStatus?: string | null;
    myWaitlistPosition?: number | null;
    myPaymentUrl?: string | null;
    myPaymentPendingSince?: string | null;
    myDivision?: string | null;
    penaltyCounts?: Record<string, number>;
    deckCheckCounts?: Record<string, number>;
    deckList?: any;
    myPenalties?: any[];
    myDeckChecks?: any[];
    isLoggedIn?: boolean;
    activeAnnouncement?: Announcement | null;
}

export default function TournamentView({
    tomStage,
    tournament,
    matches,
    currentRound,
    stats,
    isJudge,
    canManageStaff,
    rosterPlayers = [],
    myPlayerId,
    myRegistrationStatus,
    myWaitlistPosition,
    myPaymentUrl,
    myPaymentPendingSince,
    myDivision,
    penaltyCounts = {},
    deckCheckCounts = {},
    deckList,
    myPenalties = [],
    myDeckChecks = [],
    isLoggedIn = true,
    activeAnnouncement = null,
}: TournamentViewProps) {
    const canEditMatch = isJudge;
    const [searchQuery, setSearchQuery] = useState("");
    const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
    const [deckListState, setDeckListState] = useState(deckList);
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isWarning: boolean; isCritical: boolean; isPast: boolean } | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Dynamic sticky offset measurement (UX-005)
    const { ref: headerRef, height: headerHeight } = useStickyHeight();
    const { ref: divisionSelectorRef, height: divisionSelectorHeight } = useStickyHeight();

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
        const roundMatches = divisionMatches.filter(m => m.round_number === round && (
            !searchQuery ||
            (m.p1 ? `${m.p1.first_name} ${m.p1.last_name}`.toLowerCase() : "").includes(searchQuery.toLowerCase()) ||
            (m.p2 ? `${m.p2.first_name} ${m.p2.last_name}`.toLowerCase() : "").includes(searchQuery.toLowerCase())
        ));

        // If judge and online reporting is allowed, sort confirmed results with barcodes to the top
        if (isJudge && tournament.allow_online_match_reporting) {
            roundMatches.sort((a, b) => {
                const aStatus = getMatchReportingStatus(a.p1_reported_result, a.p2_reported_result);
                const bStatus = getMatchReportingStatus(b.p1_reported_result, b.p2_reported_result);
                
                const aHasBarcode = aStatus === 'confirmed' && !a.is_finished;
                const bHasBarcode = bStatus === 'confirmed' && !b.is_finished;
                
                if (aHasBarcode && !bHasBarcode) return -1;
                if (!aHasBarcode && bHasBarcode) return 1;
                
                // Fallback to table number
                return (a.table_number || 0) - (b.table_number || 0);
            });
        }

        return roundMatches;
    };

    const isEnrolledPlayer = !!myPlayerId && (myRegistrationStatus === 'registered' || myRegistrationStatus === 'checked_in' || myRegistrationStatus === 'dropped' || myRegistrationStatus === 'finished');
    const [viewMode, setViewMode] = useState<'dashboard' | 'pairings' | 'standings' | 'roster'>(isEnrolledPlayer ? 'dashboard' : 'pairings');

    // Judge Actions Logic
    const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; tomId?: string; dbId?: string; name: string; record?: string } | null>(null);

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

    const isTournamentStarted = hasMatches || tomStage >= 3;
    const isDeadlinePassed = !!(memoizedDeadline && memoizedDeadline < new Date()) || isTournamentStarted;
    
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
                        isWarning: false,
                        isCritical: false,
                        isPast: true
                    };
                });
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            const totalHoursFloat = diff / (1000 * 60 * 60);
            const isCritical = totalHoursFloat < 6; // Less than 6 hours remaining
            const isWarning = totalHoursFloat >= 6 && totalHoursFloat <= 24; // Between 6 and 24 hours remaining
            
            setTimeLeft(prev => {
                if (!prev || prev.hours !== hours || prev.minutes !== minutes || prev.seconds !== seconds || prev.isPast) {
                    return { hours, minutes, seconds, isWarning, isCritical, isPast: false };
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

    const deckSubmissionElement = shouldShowDeckSubmission ? (
        <div className="pt-2 space-y-2">
            <Button
                onClick={() => setIsDeckModalOpen(true)}
                disabled={isDeadlinePassed}
                variant={deckListState ? "outline" : "default"}
                className={cn(
                    "w-full justify-start gap-2",
                    !isDeadlinePassed && timeLeft?.isCritical && !deckListState && "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive",
                    !isDeadlinePassed && timeLeft?.isWarning && !deckListState && "border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                )}
            >
                <ScrollText className="h-4 w-4" />
                {deckSubmissionButtonText}
                {isDeadlinePassed && (
                    <span className="ml-auto text-xs text-muted-foreground">
                        {isTournamentStarted ? "Tournament Started" : "Deadline Passed"}
                    </span>
                )}
                {!isDeadlinePassed && !deckListState && (timeLeft?.isCritical || timeLeft?.isWarning) && (
                    <span className={cn(
                        "ml-auto flex items-center gap-1 text-xs",
                        timeLeft.isCritical ? "text-destructive" : "text-amber-600"
                    )}>
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
                            Deck list submission {isDeadlinePassed ? "closed" : "closes"} {memoizedDeadline ? `at ${isMounted ? formatDateTimeCompact(memoizedDeadline) : '...'}` : ''}
                        </p>
                        
                        {timeLeft && !timeLeft.isPast && (
                            <p className={cn(
                                "font-medium",
                                timeLeft.isCritical ? "text-destructive" : timeLeft.isWarning ? "text-amber-600" : "text-green-600"
                            )}>
                                {(timeLeft.isCritical || timeLeft.isWarning) ? (
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
    ) : null;

    const userRoleContext = {
        isParticipant: isEnrolledPlayer,
        isStaff: isJudge || canManageStaff,
        isOrganizer: canManageStaff,
        isSpectator: !isEnrolledPlayer && !isJudge && !canManageStaff,
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Announcement Banner */}
            <AnnouncementBanner announcement={activeAnnouncement} userRoleContext={userRoleContext} />

            {/* Sticky Header & Search */}
            <div ref={headerRef} className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
                <div className="p-4 pb-2 max-w-md mx-auto w-full space-y-3">
                    {/* Top Navigation & Title */}
                    <div className="flex items-center justify-between gap-4 w-full">
                        {/* Left Side: Back Button + Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-xl font-bold break-words text-balance leading-tight">{tournament.name}</h1>
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
                                tournament.status === 'cancelled' ? (
                                    <Badge className="bg-red-600 hover:bg-red-700 border-transparent text-white">
                                        Cancelled
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                                        Pre-Tournament
                                    </Badge>
                                )
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
                                    {tournament.status === 'cancelled' && (
                                        <Badge className="bg-red-600 hover:bg-red-700 border-transparent text-white">
                                            Cancelled
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

                    {/* Cancelled Banner */}
                    {tournament.status === 'cancelled' && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            <Ban className="h-4 w-4 shrink-0" />
                            <span>This tournament has been cancelled. All existing information is preserved.</span>
                        </div>
                    )}

                    {/* Registration Button (Visible if Registration is Enabled or User is Registered) */}
                    {(!hasMatches && tournament.status !== 'cancelled' && (tournament.registration_open || myRegistrationStatus)) && (
                        <div className="pt-2 space-y-2">
                            {/* Payment Required display */}
                            {tournament.payment_required && (
                                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                    <span>💳</span>
                                    <span>Payment is required for registration</span>
                                </div>
                            )}

                            <RegisterButton 
                                tournamentId={tournament.id}
                                status={myRegistrationStatus}
                                waitlistPosition={myWaitlistPosition}
                                registrationOpen={!!tournament.registration_open}
                                opensAt={tournament.registration_opens_at}
                                closesAt={tournament.registration_closes_at}
                                lockedDown={tomStage >= 3}
                                paymentUrl={myPaymentUrl}
                                paymentPendingSince={myPaymentPendingSince}
                                playerId={myPlayerId}
                                division={myDivision}
                                paymentRequired={!!tournament.payment_required}
                                isLoggedIn={isLoggedIn}
                            />
                        </div>
                    )}

                    {/* Deck Submission Button with Deadline Warning */}
                    {(!hasMatches || viewMode !== 'dashboard') && deckSubmissionElement}

                    {/* View Toggle - Show to staff, or to enrolled active players, or to everyone when completed */}
                    {hasMatches && (tournament.status === 'completed' || isJudge || canManageStaff || isEnrolledPlayer) && (
                        <div className={cn(
                            "grid gap-1 p-1 bg-muted rounded-lg",
                            isEnrolledPlayer && (isJudge || canManageStaff) && tournament.requires_deck_list ? "grid-cols-4" : 
                            ((isJudge || canManageStaff) && tournament.requires_deck_list) || (isEnrolledPlayer && (isJudge || canManageStaff || tournament.status === 'completed')) ? "grid-cols-3" : 
                            isEnrolledPlayer && tournament.status !== 'completed' && !isJudge && !canManageStaff ? "grid-cols-2" : "grid-cols-2"
                        )}>
                            {isEnrolledPlayer && (
                                <button
                                    onClick={() => setViewMode('dashboard')}
                                    className={cn(
                                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                                        viewMode === 'dashboard'
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Dashboard
                                </button>
                            )}
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
                            {(tournament.status === 'completed' || isJudge || canManageStaff) && (
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
                            )}
                            {(isJudge || canManageStaff) && tournament.requires_deck_list && (
                                <button
                                    onClick={() => setViewMode('roster')}
                                    className={cn(
                                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1",
                                        viewMode === 'roster'
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    Roster
                                </button>
                            )}
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
                        {(canManageStaff || isJudge || tomStage >= 3) ? (
                            <PlayerRoster 
                                players={rosterPlayers} 
                                canManage={canManageStaff} 
                                canCheckIn={isJudge}
                                tournamentId={tournament.id}
                                requiresDeckList={!!tournament.requires_deck_list}
                                myPlayerId={myPlayerId}
                                onPlayerClick={isJudge || canManageStaff ? (player) => {
                                    setSelectedPlayer({ ...player, tomId: player.id, dbId: player.dbId || player.id });
                                    setPenaltyModalOpen(true);
                                } : undefined}
                            />
                        ) : (
                            <div className="text-center p-8 bg-muted/50 rounded-lg text-muted-foreground">
                                Player roster is currently hidden for this event.
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {viewMode === 'dashboard' && isEnrolledPlayer ? (
                            <PlayerDashboard
                                tournamentName={tournament.name}
                                playerName={rosterPlayers?.find(p => p.id === myPlayerId) ? `${rosterPlayers.find(p => p.id === myPlayerId)!.first_name} ${rosterPlayers.find(p => p.id === myPlayerId)!.last_name}` : 'Player'}
                                myPlayerId={myPlayerId!}
                                myMatches={matches.filter(m => m.player1_tom_id === myPlayerId || m.player2_tom_id === myPlayerId)}
                                currentRound={currentRound}
                                myPenalties={myPenalties}
                                myDeckChecks={myDeckChecks}
                                deckListStatusElement={deckSubmissionElement}
                                isDropped={myRegistrationStatus === 'dropped'}
                                isFinished={myRegistrationStatus === 'finished'}
                                tournamentStatus={tournament.status || 'running'}
                                registrationStatus={myRegistrationStatus}
                                allowOnlineReporting={tournament.allow_online_match_reporting ?? false}
                            />
                        ) : viewMode === 'standings' ? (
                            <div className="p-4">
                                <StandingsView tournamentId={tournament.id} myPlayerId={myPlayerId} />
                            </div>
                        ) : viewMode === 'roster' ? (
                            <RosterTabContent
                                rosterPlayers={rosterPlayers}
                                onPlayerClick={(player) => {
                                    setSelectedPlayer({ ...player, tomId: player.id, dbId: player.dbId || player.id });
                                    setPenaltyModalOpen(true);
                                }}
                            />
                        ) : (
                            <>
                                {/* Division Selector */}
                                {sortedDivisions.length > 0 && (
                                    <div
                                        ref={divisionSelectorRef}
                                        style={{ top: headerHeight }}
                                        className="px-4 py-2 sticky z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                                    >
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
                                    <div
                                        style={{ top: headerHeight + divisionSelectorHeight }}
                                        className="sticky z-10 bg-background border-b px-4"
                                    >
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
                                                                    setSelectedPlayer({
                                                                        ...player,
                                                                        dbId: rosterPlayers?.find(rp => rp.id === player.id)?.dbId
                                                                    });
                                                                    setPenaltyModalOpen(true);
                                                                }}
                                                                onExtensionClick={(matchId, currentExt) => {
                                                                    onExtension(matchId, currentExt, match.table_number);
                                                                }}
                                                                p1Penalties={penaltyCounts[match.player1_tom_id || ""] || 0}
                                                                p2Penalties={penaltyCounts[match.player2_tom_id || ""] || 0}
                                                                p1DeckChecks={deckCheckCounts[match.player1_tom_id || ""] || 0}
                                                                p2DeckChecks={deckCheckCounts[match.player2_tom_id || ""] || 0}
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
                    requiresDeckList={!!tournament.requires_deck_list}
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


// --- Roster Tab Content ---

interface RosterTabContentProps {
    rosterPlayers: RosterPlayer[];
    onPlayerClick: (player: { id: string; name: string; dbId?: string }) => void;
}

function RosterTabContent({ rosterPlayers, onPlayerClick }: RosterTabContentProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const onlineCount = rosterPlayers.filter(p => p.deck_list_status === 'online').length;
    const paperCount = rosterPlayers.filter(p => p.deck_list_status === 'paper').length;
    const totalSubmitted = onlineCount + paperCount;

    const getDivisionWeight = (div: string | null | undefined) => {
        if (!div) return 4;
        const d = div.toLowerCase();
        if (d === 'juniors' || d === 'junior' || d === 'jr') return 1;
        if (d === 'seniors' || d === 'senior' || d === 'sr') return 2;
        if (d === 'masters' || d === 'master' || d === 'mr') return 3;
        return 4;
    };

    const filteredPlayers = [...rosterPlayers]
        .filter(p => {
            if (!searchQuery) return true;
            const name = `${p.first_name} ${p.last_name}`.toLowerCase();
            return name.includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => {
            const weightA = getDivisionWeight(a.division);
            const weightB = getDivisionWeight(b.division);

            if (weightA !== weightB) {
                return weightA - weightB;
            }

            const nameA = (a.first_name || "").toLowerCase();
            const nameB = (b.first_name || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });

    return (
        <div className="p-4 space-y-3">
            {/* Summary */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{rosterPlayers.length} players</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="gap-1 text-xs">
                        <ScrollText className="h-3 w-3" />
                        {totalSubmitted}/{rosterPlayers.length}
                    </Badge>
                    {onlineCount > 0 && <span className="text-green-600">{onlineCount} online</span>}
                    {paperCount > 0 && <span className="text-blue-600">{paperCount} paper</span>}
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search players..."
                    className="pl-9 h-9 text-base shadow-none bg-muted/50 focus-visible:bg-background rounded-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Player List */}
            <div className="divide-y rounded-lg border bg-card">
                {filteredPlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 gap-2">
                        <div className="flex-1 min-w-0">
                            <button
                                onClick={() => onPlayerClick({
                                    id: player.tom_player_id || player.id,
                                    name: `${player.first_name || "Unknown"} ${player.last_name || "Unknown"}`,
                                    dbId: player.player_id || player.id
                                })}
                                className="text-sm font-medium text-left hover:underline truncate flex items-center gap-2 w-full"
                            >
                                {player.division ? (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted py-0.5 rounded-sm flex-shrink-0 w-7 text-center">
                                        {['masters', 'master'].includes(player.division.toLowerCase()) ? 'MR' : 
                                         ['seniors', 'senior'].includes(player.division.toLowerCase()) ? 'SR' : 
                                         ['juniors', 'junior'].includes(player.division.toLowerCase()) ? 'JR' : 
                                         player.division}
                                    </span>
                                ) : (
                                    <div className="w-7 flex-shrink-0" />
                                )}
                                <span className="truncate">{player.first_name || "Unknown"} {player.last_name || "Unknown"}</span>
                            </button>
                        </div>

                        {/* Status Badge */}
                        {player.deck_list_status === 'online' ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">
                                Online ✓
                            </Badge>
                        ) : player.deck_list_status === 'paper' ? (
                            <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                                Paper ✓
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="text-xs">
                                No deck
                            </Badge>
                        )}
                    </div>
                ))}
                {filteredPlayers.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        {searchQuery ? "No players match your search." : "No players in roster."}
                    </div>
                )}
            </div>
        </div>
    );
}

