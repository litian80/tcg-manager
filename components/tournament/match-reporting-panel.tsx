"use client";

import { useState } from "react";
import { MatchReportingStatus, getMatchReportingStatus, MatchReportValue } from "@/utils/match-reporting";
import { Match } from "@/types";
import { reportMatchResult } from "@/actions/match-reporting";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchReportingPanelProps {
  match: Match;
  myPlayerId: string;
}

export function MatchReportingPanel({ match, myPlayerId }: MatchReportingPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPlayer1 = match.player1_tom_id === myPlayerId;
  const isPlayer2 = match.player2_tom_id === myPlayerId;
  
  if (!isPlayer1 && !isPlayer2) return null;
  
  const myReport = isPlayer1 ? match.p1_reported_result : match.p2_reported_result;
  const oppReport = isPlayer1 ? match.p2_reported_result : match.p1_reported_result;

  const status = getMatchReportingStatus(myReport, oppReport);
  const isFinished = match.is_finished;

  const handleReport = async (result: MatchReportValue | null) => {
    setIsSubmitting(true);
    try {
      const res = await reportMatchResult(match.id, result);
      if (res?.error) {
        toast.error(res.error);
      } else {
        if (result === null) {
          toast.success("Result retracted");
        } else {
          toast.success(`Result submitted: ${result.toUpperCase()}`);
        }
      }
    } catch (err) {
        console.error(err);
      toast.error("Failed to submit result");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFinished) {
    if (status === 'confirmed') {
         return (
            <div className="mt-4 p-4 text-center rounded-lg border border-green-200 bg-green-50/50 text-green-700 text-sm flex flex-col items-center">
              <CheckCircle2 className="h-5 w-5 mb-2 opacity-80" />
              <span className="font-medium">Match Results Confirmed & Locked</span>
            </div>
          );
    }
    return (
      <div className="mt-4 p-4 text-center rounded-lg border bg-muted/30 text-muted-foreground text-sm flex flex-col items-center">
        <CheckCircle2 className="h-5 w-5 mb-2 opacity-50" />
        This match has been finalized by the organizer.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm pb-2 border-b">
        <span className="font-medium text-muted-foreground">Current Status</span>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-4">
        {status === 'conflict' && (
          <div className="p-3 bg-red-500/10 border-red-500/20 border text-red-600 dark:text-red-400 rounded-lg flex gap-3 text-sm">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Result Mismatch</p>
              <p className="font-medium text-red-600/80 dark:text-red-400/80 leading-relaxed mt-0.5">Your reported result disagrees with your opponent. Please discuss and update your result below, or call a judge.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant={myReport === 'win' ? 'default' : 'outline'} 
            className={cn("w-full transition-all font-medium h-12 shadow-sm rounded-lg", myReport === 'win' && "bg-green-600 hover:bg-green-700 text-white border-transparent ring-2 ring-green-600 ring-offset-1")}
            disabled={isSubmitting}
            onClick={() => handleReport(myReport === 'win' ? null : 'win')}
          >
            I Won
          </Button>
          <Button 
            variant={myReport === 'loss' ? 'default' : 'outline'} 
            className={cn("w-full transition-all font-medium h-12 shadow-sm rounded-lg", myReport === 'loss' && "bg-red-600 hover:bg-red-700 text-white border-transparent ring-2 ring-red-600 ring-offset-1")}
            disabled={isSubmitting}
            onClick={() => handleReport(myReport === 'loss' ? null : 'loss')}
          >
            I Lost
          </Button>
          <Button 
            variant={myReport === 'tie' ? 'default' : 'outline'} 
            className={cn("w-full transition-all font-medium h-12 shadow-sm rounded-lg", myReport === 'tie' && "bg-blue-600 hover:bg-blue-700 text-white border-transparent ring-2 ring-blue-600 ring-offset-1")}
            disabled={isSubmitting}
            onClick={() => handleReport(myReport === 'tie' ? null : 'tie')}
          >
             Tie
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MatchReportingStatus }) {
  switch (status) {
    case 'confirmed':
      return (
        <span className="flex items-center text-green-600 dark:text-green-500 text-xs font-bold gap-1 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmed
        </span>
      );
    case 'conflict':
      return (
        <span className="flex items-center text-red-600 dark:text-red-500 text-xs font-bold gap-1 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 animate-pulse">
          <AlertCircle className="h-3.5 w-3.5" />
          Conflict
        </span>
      );
    case 'pending_opponent':
      return (
        <span className="flex items-center text-amber-600 dark:text-amber-500 text-xs font-bold gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          <Clock className="h-3.5 w-3.5" />
          Awaiting Opponent
        </span>
      );
    case 'unreported':
    default:
      return (
        <span className="flex items-center text-muted-foreground text-xs font-bold gap-1 bg-muted px-2.5 py-1 rounded-full border">
          Pending Submission
        </span>
      );
  }
}
