"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, Swords } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, cn } from "@/lib/utils";
import { parseShowdownPaste } from "@/lib/vgc/parser";
import type { VGCPokemon } from "@/lib/vgc/types";

interface VGCTeamViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  submittedAt?: string;
}

function formatStats(stats: VGCPokemon["evs"]): string {
  const parts: string[] = [];
  if (stats.hp > 0) parts.push(`${stats.hp} HP`);
  if (stats.atk > 0) parts.push(`${stats.atk} Atk`);
  if (stats.def > 0) parts.push(`${stats.def} Def`);
  if (stats.spa > 0) parts.push(`${stats.spa} SpA`);
  if (stats.spd > 0) parts.push(`${stats.spd} SpD`);
  if (stats.spe > 0) parts.push(`${stats.spe} Spe`);
  return parts.join(" / ") || "None";
}

function PokemonCard({ pokemon, index }: { pokemon: VGCPokemon; index: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-muted-foreground w-4 text-right">#{index + 1}</span>
          <span className="font-semibold text-sm truncate">
            {pokemon.nickname ? `${pokemon.nickname} (${pokemon.species})` : pokemon.species}
          </span>
          {pokemon.gender && (
            <span className={cn("text-xs font-bold", pokemon.gender === "M" ? "text-blue-500" : "text-pink-500")}>
              {pokemon.gender === "M" ? "♂" : "♀"}
            </span>
          )}
          {pokemon.shiny && <span className="text-xs">✨</span>}
        </div>
        {pokemon.item && (
          <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
            {pokemon.item}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span><strong>Ability:</strong> {pokemon.ability}</span>
        {pokemon.teraType && <span><strong>Tera:</strong> {pokemon.teraType}</span>}
        {pokemon.nature && <span><strong>Nature:</strong> {pokemon.nature}</span>}
        <span><strong>Lv:</strong> {pokemon.level}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {pokemon.moves.map((move, i) => (
          <Badge key={i} variant="secondary" className="text-[10px] font-normal">
            {move}
          </Badge>
        ))}
      </div>

      {(pokemon.evs.hp + pokemon.evs.atk + pokemon.evs.def + pokemon.evs.spa + pokemon.evs.spd + pokemon.evs.spe) > 0 && (
        <div className="text-[10px] font-mono text-muted-foreground">
          EVs: {formatStats(pokemon.evs)}
        </div>
      )}
    </div>
  );
}

export function VGCTeamViewerModal({
  isOpen,
  onClose,
  rawText,
  submittedAt,
}: VGCTeamViewerModalProps) {
  const parsedTeam = useMemo(() => {
    if (!rawText) return [];
    try {
      const result = parseShowdownPaste(rawText);
      return result.pokemon;
    } catch {
      return [];
    }
  }, [rawText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    toast.success("Team list copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Swords className="h-5 w-5 text-muted-foreground" />
            My Submitted Team
          </DialogTitle>
          {submittedAt && (
            <p className="text-xs text-muted-foreground">
              Submitted: {formatDateTime(submittedAt)}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <Tabs defaultValue="structured" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="structured">Structured</TabsTrigger>
                <TabsTrigger value="raw">Raw Text</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="structured" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-[55vh] max-h-[500px]">
                {parsedTeam.length > 0 ? (
                  <div className="space-y-2 pb-4 pr-3">
                    <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                      <span className="font-semibold text-sm">Team Size</span>
                      <Badge variant="default" className="text-sm px-3 shadow-sm">
                        {parsedTeam.length} Pokémon
                      </Badge>
                    </div>
                    {parsedTeam.map((pokemon, i) => (
                      <PokemonCard key={i} pokemon={pokemon} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                    Unable to parse team list.
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="raw" className="flex-1 mt-0">
              <div className="relative h-[55vh] max-h-[500px]">
                <ScrollArea className="h-full w-full border rounded-md p-3 bg-muted/30 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {rawText}
                </ScrollArea>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 h-7 text-[10px] gap-1"
                  onClick={handleCopy}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
