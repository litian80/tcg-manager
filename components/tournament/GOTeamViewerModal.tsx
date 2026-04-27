"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Swords, Star } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { GOPokemon } from "@/lib/go/types";

interface GOTeamViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: GOPokemon[];
  playerName?: string;
  inGameNickname?: string;
  submittedAt?: string;
  /** When true, renders opponent preview (no HP, no nickname, no Best Buddy) */
  opponentPreview?: boolean;
}

function GOPokemonCard({
  pokemon,
  index,
  showStaffFields = true,
}: {
  pokemon: GOPokemon;
  index: number;
  showStaffFields?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-muted-foreground w-4 text-right">#{index + 1}</span>
          <span className="font-semibold text-sm truncate">
            {pokemon.species || 'Unknown'}
          </span>
          {showStaffFields && pokemon.nickname && (
            <span className="text-xs text-muted-foreground truncate">
              &ldquo;{pokemon.nickname}&rdquo;
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showStaffFields && pokemon.isBestBuddy && (
            <Badge variant="outline" className="text-[10px] font-mono border-amber-400 text-amber-600 gap-0.5">
              <Star className="h-2.5 w-2.5" />
              BB
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] font-mono">
            CP {pokemon.cp}
          </Badge>
          {showStaffFields && (
            <Badge variant="outline" className="text-[10px] font-mono">
              HP {pokemon.hp}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 pt-0.5">
        <Badge variant="default" className="text-[10px] font-normal bg-blue-600">
          {pokemon.fastAttack || '—'}
        </Badge>
        <Badge variant="secondary" className="text-[10px] font-normal">
          {pokemon.chargedAttack1 || '—'}
        </Badge>
        {pokemon.chargedAttack2 && (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {pokemon.chargedAttack2}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function GOTeamViewerModal({
  isOpen,
  onClose,
  team,
  playerName,
  inGameNickname,
  submittedAt,
  opponentPreview = false,
}: GOTeamViewerModalProps) {
  const showStaffFields = !opponentPreview;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Swords className="h-5 w-5 text-muted-foreground" />
            {opponentPreview ? 'Team Preview' : 'GO Team List'}
          </DialogTitle>
          {(playerName || inGameNickname) && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {playerName && <p><strong>Player:</strong> {playerName}</p>}
              {inGameNickname && <p><strong>IGN:</strong> {inGameNickname}</p>}
              {submittedAt && <p>Submitted: {formatDateTime(submittedAt)}</p>}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <ScrollArea className="h-[55vh] max-h-[500px]">
            {team.length > 0 ? (
              <div className="space-y-2 pb-4 pr-3">
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                  <span className="font-semibold text-sm">Roster</span>
                  <Badge variant="default" className="text-sm px-3 shadow-sm">
                    {team.length} Pokémon
                  </Badge>
                </div>
                {team.map((pokemon, i) => (
                  <GOPokemonCard
                    key={i}
                    pokemon={pokemon}
                    index={i}
                    showStaffFields={showStaffFields}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                No team data available.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
