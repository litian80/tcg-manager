"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Swords, Star, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { submitGOTeamAction } from "@/actions/go/submission";
import type { GOPokemon, GOValidationResult } from "@/lib/go/types";
import { createEmptyGOPokemon } from "@/lib/go/types";

interface GOTeamSubmitFormProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  initialTeam?: GOPokemon[];
  initialPlayerName?: string;
  initialInGameNickname?: string;
  onSuccess?: (team: GOPokemon[], playerInfo: { playerName: string; inGameNickname: string }) => void;
}

function PokemonFormCard({
  index,
  pokemon,
  onChange,
  errors,
}: {
  index: number;
  pokemon: GOPokemon;
  onChange: (updated: GOPokemon) => void;
  errors: string[];
}) {
  const hasErrors = errors.length > 0;

  return (
    <div className={`rounded-lg border p-3 space-y-3 ${hasErrors ? 'border-destructive/50 bg-destructive/5' : 'bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Pokémon #{index + 1}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={pokemon.isBestBuddy}
              onCheckedChange={(checked) => onChange({ ...pokemon, isBestBuddy: !!checked })}
            />
            <Star className="h-3 w-3 text-amber-500" />
            <span>Best Buddy</span>
          </label>
        </div>
      </div>

      {/* Row 1: Species + Nickname */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Species *</Label>
          <Input
            placeholder="e.g. Shadow Feraligatr"
            value={pokemon.species}
            onChange={(e) => onChange({ ...pokemon, species: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Nickname</Label>
          <Input
            placeholder="(optional)"
            value={pokemon.nickname}
            onChange={(e) => onChange({ ...pokemon, nickname: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Row 2: CP + HP */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">CP *</Label>
          <Input
            type="number"
            placeholder="0"
            min={1}
            max={1500}
            value={pokemon.cp || ''}
            onChange={(e) => onChange({ ...pokemon, cp: parseInt(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">HP *</Label>
          <Input
            type="number"
            placeholder="0"
            min={1}
            value={pokemon.hp || ''}
            onChange={(e) => onChange({ ...pokemon, hp: parseInt(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Row 3: Moves */}
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Fast Attack *</Label>
          <Input
            placeholder="e.g. Mud Shot"
            value={pokemon.fastAttack}
            onChange={(e) => onChange({ ...pokemon, fastAttack: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Charged Attack 1 *</Label>
            <Input
              placeholder="e.g. Hydro Cannon"
              value={pokemon.chargedAttack1}
              onChange={(e) => onChange({ ...pokemon, chargedAttack1: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Charged Attack 2</Label>
            <Input
              placeholder="(optional)"
              value={pokemon.chargedAttack2}
              onChange={(e) => onChange({ ...pokemon, chargedAttack2: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Inline errors */}
      {hasErrors && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function GOTeamSubmitForm({
  isOpen,
  onClose,
  tournamentId,
  initialTeam,
  initialPlayerName = '',
  initialInGameNickname = '',
  onSuccess,
}: GOTeamSubmitFormProps) {
  const [team, setTeam] = useState<GOPokemon[]>(
    initialTeam && initialTeam.length === 6
      ? initialTeam
      : Array.from({ length: 6 }, () => createEmptyGOPokemon())
  );
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [inGameNickname, setInGameNickname] = useState(initialInGameNickname);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<GOValidationResult | null>(null);

  const handlePokemonChange = useCallback((index: number, updated: GOPokemon) => {
    setTeam(prev => {
      const newTeam = [...prev];
      newTeam[index] = updated;
      return newTeam;
    });
    // Clear validation on change
    setValidationResult(null);
  }, []);

  const getFieldErrors = useCallback((pokemonIndex: number): string[] => {
    if (!validationResult || validationResult.isValid) return [];
    return validationResult.errors
      .filter(e => e.pokemonIndex === pokemonIndex)
      .map(e => e.message);
  }, [validationResult]);

  const handleSubmit = async () => {
    if (!playerName.trim()) {
      toast.error("Player name is required.");
      return;
    }
    if (!inGameNickname.trim()) {
      toast.error("In-game nickname is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitGOTeamAction(tournamentId, team, {
        playerName: playerName.trim(),
        inGameNickname: inGameNickname.trim(),
      });

      setValidationResult(result);

      if (result.isValid) {
        toast.success("Team list submitted successfully!");
        onSuccess?.(team, { playerName: playerName.trim(), inGameNickname: inGameNickname.trim() });
        onClose();
      } else {
        const teamErrors = result.errors.filter(e => e.pokemonIndex === undefined);
        if (teamErrors.length > 0) {
          toast.error(teamErrors.map(e => e.message).join(', '));
        } else {
          toast.error("Please fix the errors below.");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const bestBuddyCount = team.filter(p => p.isBestBuddy).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Swords className="h-5 w-5 text-muted-foreground" />
            GO Team List
          </DialogTitle>
          <DialogDescription className="text-xs">
            Submit your 6-Pokémon roster for this tournament. All fields marked * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <ScrollArea className="h-[65vh] max-h-[600px]">
            <div className="space-y-4 pr-3">
              {/* Player Info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Player Name *</Label>
                    <Input
                      placeholder="Full Name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">In-game Nickname *</Label>
                    <Input
                      placeholder="GO Trainer Name"
                      value={inGameNickname}
                      onChange={(e) => setInGameNickname(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Best Buddy Warning */}
              {bestBuddyCount > 1 && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  <span>Only 1 Best Buddy is allowed per team (currently {bestBuddyCount} selected).</span>
                </div>
              )}

              {/* Team-level errors */}
              {validationResult && !validationResult.isValid && (
                <>
                  {validationResult.errors
                    .filter(e => e.pokemonIndex === undefined)
                    .map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>{e.message}</span>
                      </div>
                    ))}
                </>
              )}

              {/* Warnings */}
              {validationResult?.warnings && validationResult.warnings.length > 0 && (
                <>
                  {validationResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </>
              )}

              {/* 6 Pokémon cards */}
              {team.map((pokemon, index) => (
                <PokemonFormCard
                  key={index}
                  index={index}
                  pokemon={pokemon}
                  onChange={(updated) => handlePokemonChange(index, updated)}
                  errors={getFieldErrors(index)}
                />
              ))}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2 pb-4">
                <Badge variant="outline" className="text-xs">
                  {team.filter(p => p.species.trim()).length}/6 Pokémon
                </Badge>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Team List
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
