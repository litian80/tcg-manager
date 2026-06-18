"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { getFinalizationSummary, finalizeRound } from "@/actions/core-ops";
import { useRouter } from "next/navigation";

interface FinalizationMatch {
  id: string;
  player1_tom_id: string;
  player2_tom_id: string | null;
  p1_reported_result: string | null;
  p2_reported_result: string | null;
  is_finished: boolean;
  category: "auto" | "penalty" | "conflict" | "missing";
  has_penalty: boolean;
  p1_name?: string;
  p2_name?: string;
}

interface Resolution {
  matchId: string;
  outcome: number;
  winnerTomId: string | null;
}

interface RoundFinalizationProps {
  tournamentId: string;
  roundNumber: number;
  totalRounds: number;
}

const CATEGORY_CONFIG = {
  auto: {
    label: "Auto-confirm",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    color: "border-emerald-500/20 bg-emerald-500/5",
  },
  penalty: {
    label: "Penalty Review",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    color: "border-amber-500/20 bg-amber-500/5",
  },
  conflict: {
    label: "Conflict",
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    color: "border-red-500/20 bg-red-500/5",
  },
  missing: {
    label: "Missing",
    icon: <HelpCircle className="w-4 h-4 text-zinc-400" />,
    color: "border-zinc-500/20 bg-zinc-500/5",
  },
};

export function RoundFinalization({
  tournamentId,
  roundNumber,
  totalRounds,
}: RoundFinalizationProps) {
  const router = useRouter();
  const isTopCut = totalRounds > 0 && roundNumber > totalRounds;
  const [matches, setMatches] = useState<FinalizationMatch[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const result = await getFinalizationSummary(tournamentId, roundNumber);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setMatches(result.success);

        // Auto-populate resolutions for "auto" matches
        const autoResolutions: Record<string, Resolution> = {};
        for (const m of result.success) {
          if (m.category === "auto" && m.p1_reported_result) {
            autoResolutions[m.id] = {
              matchId: m.id,
              outcome: m.p1_reported_result === "win" ? 1 : m.p1_reported_result === "loss" ? 2 : 3,
              winnerTomId:
                m.p1_reported_result === "win"
                  ? m.player1_tom_id
                  : m.p1_reported_result === "loss"
                    ? m.player2_tom_id
                    : null,
            };
          }
        }
        setResolutions(autoResolutions);
      }
      setLoading(false);
    }
    load();
  }, [tournamentId, roundNumber]);

  function setMatchResult(matchId: string, outcome: string, match: FinalizationMatch) {
    const res: Resolution = {
      matchId,
      outcome: outcome === "p1_win" ? 1 : outcome === "p2_win" ? 2 : 3,
      winnerTomId:
        outcome === "p1_win"
          ? match.player1_tom_id
          : outcome === "p2_win"
            ? match.player2_tom_id
            : null,
    };
    setResolutions((prev) => ({ ...prev, [matchId]: res }));
  }

  function handleFinalize() {
    const allResolved = matches.every((m) => resolutions[m.id]);
    if (!allResolved) {
      setError("Please resolve all matches before finalizing.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await finalizeRound(
        tournamentId,
        roundNumber,
        Object.values(resolutions)
      );
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const categories = {
    auto: matches.filter((m) => m.category === "auto"),
    penalty: matches.filter((m) => m.category === "penalty"),
    conflict: matches.filter((m) => m.category === "conflict"),
    missing: matches.filter((m) => m.category === "missing"),
  };

  const resolvedCount = Object.keys(resolutions).length;
  const totalCount = matches.length;

  return (
    <Card id="round-finalization">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Finalize Round {roundNumber}</CardTitle>
          <Badge variant="outline" className="text-sm">
            {resolvedCount}/{totalCount} Resolved
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((cat) => (
            <div
              key={cat}
              className={`p-3 rounded-lg border ${CATEGORY_CONFIG[cat].color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {CATEGORY_CONFIG[cat].icon}
                <span className="text-xs font-medium">
                  {CATEGORY_CONFIG[cat].label}
                </span>
              </div>
              <span className="text-2xl font-bold">{categories[cat].length}</span>
            </div>
          ))}
        </div>

        {/* Matches requiring manual resolution */}
        {(categories.penalty.length > 0 ||
          categories.conflict.length > 0 ||
          categories.missing.length > 0) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Requires Your Input
            </h3>
            {[...categories.penalty, ...categories.conflict, ...categories.missing].map(
              (match) => (
                <div
                  key={match.id}
                  className={`p-4 rounded-lg border ${CATEGORY_CONFIG[match.category].color} space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {CATEGORY_CONFIG[match.category].icon}
                      <span className="font-medium">
                        {match.p1_name} <span className="text-muted-foreground font-normal text-sm">({match.player1_tom_id})</span> vs {match.p2_name} {match.player2_tom_id && <span className="text-muted-foreground font-normal text-sm">({match.player2_tom_id})</span>}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_CONFIG[match.category].label}
                    </Badge>
                  </div>

                  {/* Show reports */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">P1 reports: </span>
                      <span className="font-medium">
                        {match.p1_reported_result || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P2 reports: </span>
                      <span className="font-medium">
                        {match.p2_reported_result || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Resolution selector */}
                  <Select
                    value={
                      resolutions[match.id]
                        ? resolutions[match.id].outcome === 1
                          ? "p1_win"
                          : resolutions[match.id].outcome === 2
                            ? "p2_win"
                            : "tie"
                        : undefined
                    }
                    onValueChange={(val) => setMatchResult(match.id, val, match)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select result..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="p1_win">
                        {match.p1_name} ({match.player1_tom_id}) wins
                      </SelectItem>
                      <SelectItem value="p2_win">
                        {match.p2_name} {match.player2_tom_id && `(${match.player2_tom_id})`} wins
                      </SelectItem>
                      {!isTopCut && (
                        <SelectItem value="tie">Tie / Draw</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}
          </div>
        )}

        {/* Auto-confirmed matches */}
        {categories.auto.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Auto-Confirmed ({categories.auto.length})
            </h3>
            <div className="space-y-1.5">
              {categories.auto.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-sm"
                >
                  <span>
                    {match.p1_name} <span className="text-muted-foreground font-normal text-xs">({match.player1_tom_id})</span> vs {match.p2_name} {match.player2_tom_id && <span className="text-muted-foreground font-normal text-xs">({match.player2_tom_id})</span>}
                  </span>
                  <span className="text-emerald-600 font-medium">
                    {match.p1_reported_result === "win"
                      ? `${match.p1_name} wins`
                      : match.p1_reported_result === "loss"
                        ? `${match.p2_name} wins`
                        : "Tie"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finalize button */}
        <Button
          onClick={handleFinalize}
          disabled={isPending || resolvedCount < totalCount}
          className="w-full gap-2"
          size="lg"
          id="btn-finalize-round"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Finalize Round {roundNumber}
          {resolvedCount < totalCount && ` (${totalCount - resolvedCount} remaining)`}
        </Button>
      </CardContent>
    </Card>
  );
}
