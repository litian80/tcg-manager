"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Loader2, Play, Shuffle, Square, Trophy, Users, ArrowRight, ChevronRight, Eye, Flag, Zap } from "lucide-react";
import { startRound, endRound, generatePairings, generateTopCutPairings, advanceTopCutRound, getTopCutStandings, finishTournamentWithoutTopCut, startSingleElimination } from "@/actions/core-ops";
import type { TopCutStandingEntry } from "@/actions/core-ops";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface RoundControlPanelProps {
  tournamentId: string;
  currentRound: number | null;
  roundStatus: string | null;
  totalRounds: number;
  tournamentStatus: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: React.ReactNode;
}> = {
  PAIRING_GENERATED: {
    label: "Pairings Ready",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: <Shuffle className="w-3.5 h-3.5" />,
  },
  ACTIVE: {
    label: "Round Active",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: <Play className="w-3.5 h-3.5" />,
  },
  FINALIZING: {
    label: "Finalizing",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  FINISHED: {
    label: "Finished",
    color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

export function RoundControlPanel({
  tournamentId,
  currentRound,
  roundStatus,
  totalRounds,
  tournamentStatus,
}: RoundControlPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Top Cut Options
  const [topCutBase, setTopCutBase] = useState<"2" | "4" | "8">("8");
  const [isAsym, setIsAsym] = useState<boolean>(false);
  const [asymSize, setAsymSize] = useState<number>(5);
  const [standings, setStandings] = useState<TopCutStandingEntry[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [topCutDialogOpen, setTopCutDialogOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);

  const finalTopCutSize = isAsym ? asymSize : parseInt(topCutBase);

  const loadStandings = useCallback(async () => {
    if (!currentRound) return;
    setStandingsLoading(true);
    const result = await getTopCutStandings(tournamentId, currentRound);
    if (result.success) {
      setStandings(result.success);
    }
    setStandingsLoading(false);
  }, [tournamentId, currentRound]);

  const nextRound = currentRound
    ? roundStatus === "FINISHED"
      ? currentRound + 1
      : currentRound
    : 1;

  const isLastRound = totalRounds > 0 && currentRound !== null && currentRound >= totalRounds;
  const isSingleElimMode = totalRounds === 0;
  const canGeneratePairings =
    !isSingleElimMode && (!currentRound || roundStatus === "FINISHED") && (totalRounds === 0 || nextRound <= totalRounds);
  const canStartSingleElim = isSingleElimMode && !currentRound;
  const canStartRound = roundStatus === "PAIRING_GENERATED";
  const canEndRound = roundStatus === "ACTIVE";
  
  const isTournamentCompleted = tournamentStatus === "completed";
  const isTopCut = totalRounds > 0 && currentRound !== null && currentRound > totalRounds;
  const isBracketMode = isSingleElimMode && currentRound !== null;
  const canGenerateTopCut = totalRounds > 0 && currentRound === totalRounds && roundStatus === "FINISHED" && !isTournamentCompleted;
  const canFinishWithoutTopCut = canGenerateTopCut; // same condition: last Swiss round finished
  const canAdvanceTopCut = (isTopCut || isBracketMode) && roundStatus === "FINISHED" && !isTournamentCompleted;
  const canPublishStandings = roundStatus === "FINISHED" && !isTournamentCompleted;

  function handleAction(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const statusInfo = roundStatus ? STATUS_CONFIG[roundStatus] : null;

  return (
    <Card id="round-control-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Round Control</CardTitle>
            <CardDescription>
              {currentRound
                ? isTopCut
                  ? `Top Cut — Round ${currentRound}`
                  : `Round ${currentRound} of ${totalRounds}`
                : "No rounds started yet"}
            </CardDescription>
          </div>
          {statusInfo && (
            <Badge
              variant="outline"
              className={`gap-1.5 px-3 py-1 ${statusInfo.color}`}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Start Single Elimination */}
          {canStartSingleElim && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={isPending}
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                  id="btn-start-single-elim"
                >
                  <Zap className="w-4 h-4" />
                  Start Single Elimination
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start Single Elimination?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will randomly seed all players into a single-elimination bracket.
                    The bracket size will be determined automatically from the player count.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-violet-600 hover:bg-violet-700"
                    onClick={() =>
                      handleAction(() => startSingleElimination(tournamentId))
                    }
                  >
                    Start
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Generate Pairings */}
          {canGeneratePairings && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={isPending}
                  className="gap-2"
                  id="btn-generate-pairings"
                >
                  <Shuffle className="w-4 h-4" />
                  Generate Round {nextRound} Pairings
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Generate Pairings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will use the Swiss pairing algorithm to generate
                    pairings for Round {nextRound}. Previous opponents will not
                    be re-matched.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      handleAction(() => generatePairings(tournamentId, nextRound))
                    }
                  >
                    Generate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Start Round */}
          {canStartRound && (
            <Button
              variant="default"
              disabled={isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              id="btn-start-round"
              onClick={() =>
                handleAction(() => startRound(tournamentId, currentRound!))
              }
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Round {currentRound}
            </Button>
          )}

          {/* End Round */}
          {canEndRound && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isPending}
                  className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  id="btn-end-round"
                >
                  <Square className="w-4 h-4" />
                  End Round {currentRound}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End Round {currentRound}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will lock all player submissions and open the
                    finalization screen. You&apos;ll review and confirm all match
                    results before they&apos;re finalized.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() =>
                      handleAction(() => endRound(tournamentId, currentRound!))
                    }
                  >
                    End Round
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Generate Top Cut */}
          {canGenerateTopCut && (
            <AlertDialog open={topCutDialogOpen} onOpenChange={(open) => {
              setTopCutDialogOpen(open);
              if (open) loadStandings();
            }}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={isPending}
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                  id="btn-generate-top-cut"
                >
                  <Trophy className="w-4 h-4" />
                  Generate Top Cut
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Generate Top Cut Pairings</AlertDialogTitle>
                  <AlertDialogDescription>
                    Review current standings, then configure your top cut.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                {/* Standings Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {standingsLoading ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading standings…
                      </div>
                    ) : standings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No standings available.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium w-10">#</th>
                            <th className="px-3 py-2 font-medium">Player</th>
                            <th className="px-3 py-2 font-medium text-right">Record</th>
                            <th className="px-3 py-2 font-medium text-right">Pts</th>
                            <th className="px-3 py-2 font-medium text-right" title="Opponents' Win Rate">OWR%</th>
                            <th className="px-3 py-2 font-medium text-right" title="Opponents' Opponents' Win Rate">OOWR%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s, idx) => {
                            const isCutLine = idx + 1 === finalTopCutSize;
                            const isAboveCut = idx < finalTopCutSize;
                            return (
                              <tr
                                key={s.playerId}
                                className={`border-t ${
                                  isAboveCut
                                    ? "bg-violet-500/5 font-medium"
                                    : "text-muted-foreground"
                                } ${isCutLine ? "border-b-2 border-b-violet-500" : ""}`}
                              >
                                <td className="px-3 py-1.5">{s.rank}</td>
                                <td className="px-3 py-1.5">
                                  {s.playerName}{" "}
                                  <span className="text-xs text-muted-foreground font-normal">({s.playerId})</span>
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono">{s.record}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{s.matchPoints}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{(s.omwp * 100).toFixed(1)}%</td>
                                <td className="px-3 py-1.5 text-right font-mono">{(s.oomwp * 100).toFixed(1)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Config */}
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Base Bracket Size</Label>
                      <Select value={topCutBase} onValueChange={(val: "2" | "4" | "8") => setTopCutBase(val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">Top 2 (Finals)</SelectItem>
                          <SelectItem value="4">Top 4</SelectItem>
                          <SelectItem value="8">Top 8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {topCutBase !== "2" && (
                      <div className="flex items-end gap-3 pb-1">
                        <div className="space-y-0.5">
                          <Label>Asymmetric</Label>
                          <div className="text-xs text-muted-foreground">Non-standard cut size</div>
                        </div>
                        <Switch checked={isAsym} onCheckedChange={setIsAsym} />
                      </div>
                    )}
                  </div>

                  {isAsym && (
                    <div className="space-y-2">
                      <Label>Actual Player Count</Label>
                      <Input 
                        type="number" 
                        min={2}
                        max={topCutBase === "4" ? 4 : 8}
                        value={asymSize} 
                        onChange={(e) => setAsymSize(parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        {parseInt(topCutBase) - asymSize > 0
                          ? `Top ${asymSize} seeds advance. Seeds 1–${parseInt(topCutBase) - asymSize} receive a first-round bye.`
                          : `All ${asymSize} players will play in the first round.`}
                      </p>
                    </div>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-violet-600 hover:bg-violet-700"
                    onClick={() =>
                      handleAction(() => generateTopCutPairings(tournamentId, currentRound!, finalTopCutSize))
                    }
                  >
                    Generate {isAsym ? `Top ${asymSize}` : `Top ${topCutBase}`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Finish Tournament (No Top Cut) */}
          {canFinishWithoutTopCut && (
            <AlertDialog open={finishDialogOpen} onOpenChange={(open) => {
              setFinishDialogOpen(open);
              if (open) loadStandings();
            }}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isPending}
                  className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  id="btn-finish-tournament"
                >
                  <Flag className="w-4 h-4" />
                  Finish Tournament
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Finish Tournament Without Top Cut?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will end the tournament. The #1 ranked player wins. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Final Standings Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {standingsLoading ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading standings…
                      </div>
                    ) : standings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No standings available.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium w-10">#</th>
                            <th className="px-3 py-2 font-medium">Player</th>
                            <th className="px-3 py-2 font-medium text-right">Record</th>
                            <th className="px-3 py-2 font-medium text-right">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.slice(0, 10).map((s, idx) => (
                            <tr key={s.playerId} className={`border-t ${idx === 0 ? "bg-amber-500/10 font-semibold" : ""}`}>
                              <td className="px-3 py-1.5">{s.rank}</td>
                              <td className="px-3 py-1.5">{s.playerName}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{s.record}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{s.matchPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() =>
                      handleAction(() => finishTournamentWithoutTopCut(tournamentId))
                    }
                  >
                    Finish Tournament
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Advance Top Cut */}
          {canAdvanceTopCut && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={isPending}
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                  id="btn-advance-top-cut"
                >
                  <ArrowRight className="w-4 h-4" />
                  Advance Bracket
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Advance Bracket?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will generate the matches for the next round of the Top Cut bracket (e.g. Semi-Finals).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-violet-600 hover:bg-violet-700"
                    onClick={() =>
                      handleAction(() => advanceTopCutRound(tournamentId, currentRound!))
                    }
                  >
                    Advance
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Publish Standings */}
          {canPublishStandings && (
            <Button
              variant="outline"
              disabled={isPending}
              className="gap-2"
              id="btn-publish-standings"
              onClick={() => router.refresh()}
            >
              <Eye className="w-4 h-4" />
              Refresh Standings
            </Button>
          )}
        </div>

        {/* Tournament Completed Banner */}
        {isTournamentCompleted && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
              <Trophy className="w-5 h-5" />
              Tournament Completed
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              The bracket has concluded. Final standings are published.
            </p>
          </div>
        )}

        {/* Round progression indicator */}
        <div className="flex items-center gap-1.5 pt-2">
          {/* Swiss rounds */}
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
            const isComplete = currentRound !== null && round < currentRound;
            const isCurrent = round === currentRound;
            const isFuture = currentRound === null || round > currentRound;

            return (
              <div key={round} className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                    ${isComplete ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30" : ""}
                    ${isCurrent ? "bg-primary text-primary-foreground shadow-sm" : ""}
                    ${isFuture ? "bg-muted text-muted-foreground" : ""}
                  `}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    round
                  )}
                </div>
                {round < totalRounds && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                )}
              </div>
            );
          })}

          {/* Top Cut rounds (if any) */}
          {currentRound !== null && currentRound > totalRounds && (
            <>
              <ChevronRight className="w-3 h-3 text-violet-400" />
              {Array.from({ length: currentRound - totalRounds }, (_, i) => totalRounds + 1 + i).map((round) => {
                const isComplete = round < currentRound!;
                const isCurrent = round === currentRound;
                return (
                  <div key={round} className="flex items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                        ${isComplete ? "bg-violet-500/20 text-violet-600 border border-violet-500/30" : ""}
                        ${isCurrent ? "bg-violet-600 text-white shadow-sm" : ""}
                      `}
                    >
                      {isComplete ? (
                        <Trophy className="w-3.5 h-3.5" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5" />
                      )}
                    </div>
                    {round < currentRound! && (
                      <ChevronRight className="w-3 h-3 text-violet-400/50" />
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
