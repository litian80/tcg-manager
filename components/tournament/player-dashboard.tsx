"use client";

import { Match } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, FileWarning, SearchX, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MatchReportingPanel } from "@/components/tournament/match-reporting-panel";
import { Button } from "@/components/ui/button";

interface PlayerDashboardProps {
    tournamentName: string;
    playerName: string;
    myPlayerId: string;
    myMatches: Match[];
    currentRound: number;
    myPenalties: any[];
    myDeckChecks: any[];
    deckListStatusElement?: React.ReactNode;
    isDropped?: boolean;
    isFinished?: boolean;
    tournamentStatus?: string;
    registrationStatus?: string | null;
    allowOnlineReporting?: boolean;
}

export function PlayerDashboard({
    tournamentName,
    playerName,
    myPlayerId,
    myMatches,
    currentRound,
    myPenalties,
    myDeckChecks,
    deckListStatusElement,
    isDropped = false,
    isFinished = false,
    tournamentStatus = 'running',
    registrationStatus = null,
    allowOnlineReporting = false
}: PlayerDashboardProps) {
    // Determine the current match (if any)
    const currentMatch = tournamentStatus === 'completed' 
        ? undefined 
        : myMatches.find(m => m.round_number === currentRound && !m.is_finished);

    const isPlayer1 = currentMatch && currentMatch.player1_tom_id === myPlayerId;
    const myReport = currentMatch ? (isPlayer1 ? currentMatch.p1_reported_result : currentMatch.p2_reported_result) : null;

    // Sort history matches descending
    const historyMatches = myMatches
        .filter(m => m.round_number < currentRound || m.is_finished)
        .sort((a, b) => b.round_number - a.round_number);

    let currentMatchResultNode: React.ReactNode = null;
    if (currentMatch && currentMatch.is_finished) {
        let resultStr = "Completed";
        let statusColor = "bg-muted text-muted-foreground border-muted-foreground/20";
        
        const isBye = currentMatch.player1_tom_id === 'BYE' || currentMatch.player2_tom_id === 'BYE';
        if (currentMatch.winner_tom_id === myPlayerId || isBye) {
            resultStr = "Win";
            statusColor = "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20";
        } else if (currentMatch.winner_tom_id === 'tie' || currentMatch.winner_tom_id === 'draw' || currentMatch.outcome === 3) {
            resultStr = "Tie";
            statusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20";
        } else if (currentMatch.winner_tom_id) {
            resultStr = "Loss";
            statusColor = "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20";
        }

        currentMatchResultNode = (
            <Badge variant="outline" className={cn("ml-2 font-bold shadow-sm", statusColor)}>
                {resultStr}
            </Badge>
        );
    }

    return (
        <div className="space-y-6 pb-8 px-4 mt-4">
            {/* Current Match Section */}
            <section className="space-y-3">
                {currentMatch ? (
                    <>
                        <Card className="border-2 border-primary/20 shadow-sm relative overflow-hidden bg-primary/5">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex justify-between items-center">
                                <div className="flex items-center">
                                    <span>Round {currentMatch.round_number}</span>
                                    {currentMatchResultNode}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {((currentMatch.player1_tom_id === myPlayerId && currentMatch.player2_tom_id === 'BYE') || 
                              (currentMatch.player2_tom_id === myPlayerId && currentMatch.player1_tom_id === 'BYE')) ? (
                                <div className="flex flex-col items-center justify-center py-8 bg-background rounded-lg border text-center">
                                    <span className="text-4xl mb-2">😴</span>
                                    <span className="text-xl font-bold">You have a BYE</span>
                                    <span className="text-sm text-muted-foreground mt-1 px-4">Take a break! You automatically win this round.</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center justify-center py-4 bg-background rounded-lg border">
                                        <span className="text-sm font-medium text-muted-foreground mb-1">Table Number</span>
                                        <span className="text-6xl font-black">{currentMatch.table_number || "-"}</span>
                                    </div>

                                    <div className="flex flex-col items-center justify-center py-3 bg-secondary/20 rounded-lg border mt-2">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Opponent</span>
                                        <span className="font-bold text-lg text-center px-4">
                                            {currentMatch.player1_tom_id === myPlayerId
                                                ? (currentMatch.p2 ? `${currentMatch.p2.first_name} ${currentMatch.p2.last_name}` : currentMatch.player2_tom_id)
                                                : (currentMatch.p1 ? `${currentMatch.p1.first_name} ${currentMatch.p1.last_name}` : currentMatch.player1_tom_id)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    
                    {allowOnlineReporting && currentMatch && currentMatch.player1_tom_id !== 'BYE' && currentMatch.player2_tom_id !== 'BYE' && !currentMatch.is_finished && (
                        myReport ? (
                            <div className="mt-4">
                                <MatchReportingPanel match={currentMatch} myPlayerId={myPlayerId} />
                            </div>
                        ) : (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="w-full mt-4" variant="outline" size="lg">
                                        <Trophy className="mr-2 h-4 w-4" />
                                        Report Match Result
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Match Result</DialogTitle>
                                    </DialogHeader>
                                    <MatchReportingPanel match={currentMatch} myPlayerId={myPlayerId} />
                                </DialogContent>
                            </Dialog>
                        )
                    )}
                    </>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            {isDropped ? (
                                <>
                                    <XCircle className="h-8 w-8 mb-2 opacity-50 text-destructive" />
                                    <p>You have dropped from this tournament.</p>
                                    <p className="text-xs mt-1">Thanks for playing!</p>
                                </>
                            ) : isFinished ? (
                                <>
                                    <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-green-500" />
                                    <p>Your involvement in this tournament has concluded.</p>
                                    <p className="text-xs mt-1">Thanks for playing!</p>
                                </>
                            ) : tournamentStatus === 'completed' ? (
                                <>
                                    <Trophy className="h-8 w-8 mb-2 opacity-50 text-amber-500" />
                                    <p>The tournament has concluded.</p>
                                    <p className="text-xs mt-1">Check out the final standings!</p>
                                </>
                            ) : currentRound === 0 || myMatches.length === 0 ? (
                                <>
                                    <div className="text-4xl mb-3">👋</div>
                                    <p className="font-medium text-foreground">Welcome to the tournament!</p>
                                    <p className="text-xs mt-1">Pairings will be posted here when the event begins.</p>
                                </>
                            ) : registrationStatus === 'registered' ? (
                                <>
                                    <div className="text-4xl mb-3 opacity-80">⏳</div>
                                    <p className="font-medium text-foreground">Registration confirmed.</p>
                                    <p className="text-xs mt-1">Please see a judge to formally check in before the tournament starts.</p>
                                </>
                            ) : myMatches.some(m => m.round_number === currentRound && m.is_finished) ? (
                                <>
                                    <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-green-500" />
                                    <p className="font-medium text-foreground">Match completed.</p>
                                    <p className="text-xs mt-1">Please wait for the next round to be posted.</p>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-8 w-8 mb-2 opacity-50" />
                                    <p>No pairing for the current round.</p>
                                    <p className="text-xs mt-1">Please wait for the next round to be posted.</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </section>

            {/* Tournament History Section */}
            <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tournament History</h3>
                <div className="space-y-2">
                    {historyMatches.length > 0 ? (
                        historyMatches.map(match => {
                            const isP1 = match.player1_tom_id === myPlayerId;
                            const opponentName = isP1 
                                ? (match.p2 ? `${match.p2.first_name} ${match.p2.last_name}` : match.player2_tom_id) 
                                : (match.p1 ? `${match.p1.first_name} ${match.p1.last_name}` : match.player1_tom_id);
                            
                            let resultStr = "In Progress";
                            let statusColor = "text-muted-foreground";

                            if (match.is_finished) {
                                if (match.winner_tom_id === myPlayerId) {
                                    resultStr = "Win";
                                    statusColor = "text-green-600 dark:text-green-400 font-bold";
                                } else if (match.winner_tom_id === 'tie' || match.winner_tom_id === 'draw' || match.outcome === 3) {
                                    resultStr = "Tie";
                                    statusColor = "text-amber-600 dark:text-amber-400 font-bold";
                                } else if (match.winner_tom_id) {
                                    resultStr = "Loss";
                                    statusColor = "text-red-600 dark:text-red-400 font-bold";
                                } else {
                                    resultStr = "Finished";
                                }
                            }

                            return (
                                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">R{match.round_number}</Badge>
                                        <div className="text-sm flex flex-col">
                                            <span className="font-medium">{opponentName}</span>
                                            <span className="text-muted-foreground text-xs mt-0.5">Table {match.table_number}</span>
                                        </div>
                                    </div>
                                    <div className={`font-medium text-sm ${statusColor}`}>
                                        {resultStr}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center p-6 bg-muted/30 rounded-lg text-sm text-muted-foreground border border-dashed">
                            No past matches yet.
                        </div>
                    )}
                </div>
            </section>

            {/* Histories (Penalties & Deck Checks) */}
            {(myPenalties.length > 0 || myDeckChecks.length > 0) && (
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Player Record</h3>
                    
                    {myPenalties.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground ml-1">Penalties</h4>
                            {myPenalties.map(pen => (
                                <div key={pen.id} className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50 flex gap-3">
                                    <FileWarning className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm text-orange-800 dark:text-orange-300">{pen.penalty_type}</p>
                                        <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">Round {pen.round_number}</p>
                                        {pen.reason && <p className="text-xs mt-1 italic opacity-80">{pen.reason}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {myDeckChecks.length > 0 && (
                        <div className="space-y-2 mt-4">
                            <h4 className="text-xs font-medium text-muted-foreground ml-1">Deck Checks</h4>
                            {myDeckChecks.map(check => (
                                <div key={check.id} className="p-3 rounded-lg border bg-card flex justify-between items-center">
                                    <div className="text-sm">
                                        <span className="font-medium">Round {check.round_number}</span>
                                        <span className="text-muted-foreground block text-xs mt-0.5">Checked at table</span>
                                    </div>
                                    <Badge variant={check.status === 'Pass' ? 'default' : 'destructive'} 
                                           className={check.status === 'Pass' ? 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/40' : ''}>
                                        {check.status === 'Pass' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                        {check.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Deck Submission Status UI */}
            {deckListStatusElement}
        </div>
    );
}
