"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Loader2, UserMinus, Search, Users } from "lucide-react";
import { dropPlayer } from "@/actions/core-ops";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ActivePlayer {
  player_id: string;
  first_name: string | null;
  last_name: string | null;
  wins: number;
  losses: number;
  ties: number;
  registration_status: string | null;
  division?: string | null;
}

interface ActivePlayerListProps {
  tournamentId: string;
  players: ActivePlayer[];
  currentRound: number | null;
  totalRounds: number;
}

export function ActivePlayerList({
  tournamentId,
  players,
  currentRound,
  totalRounds,
}: ActivePlayerListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isTopCut = totalRounds > 0 && currentRound !== null && currentRound > totalRounds;

  const activePlayers = players.filter(
    (p) => p.registration_status !== "dropped" && p.registration_status !== "cancelled"
  );
  const droppedPlayers = players.filter(
    (p) => p.registration_status === "dropped"
  );

  const filteredActive = searchQuery
    ? activePlayers.filter((p) => {
        const name = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : activePlayers;

  const filteredDropped = searchQuery
    ? droppedPlayers.filter((p) => {
        const name = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : droppedPlayers;

  function handleDrop(playerId: string) {
    setDroppingId(playerId);
    startTransition(async () => {
      const result = await dropPlayer(tournamentId, playerId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Player dropped successfully");
        router.refresh();
      }
      setDroppingId(null);
    });
  }

  const getDivisionLabel = (div: string | null | undefined) => {
    if (!div) return "";
    const d = div.toLowerCase();
    if (d === "juniors" || d === "junior") return "JR";
    if (d === "seniors" || d === "senior") return "SR";
    if (d === "masters" || d === "master") return "MA";
    return div;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Players ({activePlayers.length} active{droppedPlayers.length > 0 ? `, ${droppedPlayers.length} dropped` : ""})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        {players.length > 8 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        )}

        {/* Active Players */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {filteredActive.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {searchQuery ? "No matching active players." : "No active players."}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Player</th>
                    <th className="px-3 py-2 font-medium text-right">Record</th>
                    {!isTopCut && <th className="px-3 py-2 font-medium text-right w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredActive.map((player) => {
                    const isDropping = droppingId === player.player_id;
                    return (
                      <tr key={player.player_id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            {player.division && (
                              <span className="text-[10px] text-muted-foreground bg-muted py-0.5 rounded-sm w-7 text-center flex-shrink-0">
                                {getDivisionLabel(player.division)}
                              </span>
                            )}
                            <span>{player.first_name || "Unknown"} {player.last_name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs">
                          {player.wins}-{player.losses}-{player.ties}
                        </td>
                        {!isTopCut && (
                          <td className="px-3 py-1.5 text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isPending || isDropping}
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  {isDropping ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserMinus className="w-3 h-3" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Drop {player.first_name} {player.last_name}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <strong>{player.first_name} {player.last_name}</strong> ({player.wins}-{player.losses}-{player.ties}) will be dropped from the tournament.
                                    If they have an active match, their opponent will receive a win.
                                    This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleDrop(player.player_id)}
                                  >
                                    Drop Player
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Dropped Players */}
        {filteredDropped.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Dropped</p>
            <div className="border rounded-lg overflow-hidden opacity-60">
              <table className="w-full text-sm">
                <tbody>
                  {filteredDropped.map((player) => (
                    <tr key={player.player_id} className="border-t first:border-t-0">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          {player.division && (
                            <span className="text-[10px] text-muted-foreground bg-muted py-0.5 rounded-sm w-7 text-center flex-shrink-0">
                              {getDivisionLabel(player.division)}
                            </span>
                          )}
                          <span className="line-through">{player.first_name || "Unknown"} {player.last_name || "Unknown"}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 text-destructive border-destructive/30">
                            Dropped
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs">
                        {player.wins}-{player.losses}-{player.ties}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
